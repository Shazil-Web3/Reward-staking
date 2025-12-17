require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
const { generateEpoch } = require('./reward-calculator');

const app = express();
const PORT = process.env.PORT || 3001;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

app.use(cors());
app.use(express.json());

// --- ENDPOINTS ---

/**
 * GET /api/rewards/eligible
 * Returns list of currently eligible addresses and their potential rewards
 */
app.get('/api/rewards/eligible', async (req, res) => {
    try {
        const { data: stakes, error } = await supabase
            .from('stakes')
            .select(`
                *,
                users (
                    wallet_address,
                    direct_referrals_count,
                    total_staked
                )
            `)
            .eq('status', 'active');

        if (error) throw error;

        // Helper function: Calculate referral requirement based on total staked
        const getReferralRequirement = (totalStaked) => {
            if (totalStaked >= 1000) return 0;  // $1000+ = No referrals needed
            if (totalStaked >= 100) return 5;   // $100-$1000 = 5 referrals
            return 10;                           // $0-$100 = 10 referrals
        };

        // Filter eligible based on total staked amount
        const eligible = stakes.filter(stake => {
            const user = stake.users;
            const requiredReferrals = getReferralRequirement(user.total_staked);
            return user.direct_referrals_count >= requiredReferrals;
        });

        res.json({
            total: eligible.length,
            eligible: eligible.map(s => ({
                address: s.users.wallet_address,
                stake: s.amount,
                totalStaked: s.users.total_staked,
                referrals: s.users.direct_referrals_count,
                requiredReferrals: getReferralRequirement(s.users.total_staked),
                package: s.package_id
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Resolve referral code to wallet address
app.get('/api/referral/resolve/:code', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        
        const { data: user, error } = await supabase
            .from('users')
            .select('wallet_address, referral_code')
            .eq('referral_code', code)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'Referral code not found' });
        }

        res.json({ 
            referralCode: user.referral_code,
            walletAddress: user.wallet_address 
        });
    } catch (error) {
        console.error('Error resolving referral code:', error);
        res.status(500).json({ error: error.message });
    }
});

// Register wallet address (create user entry if doesn't exist)
app.post('/api/wallet/register', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }

        const address = walletAddress.toLowerCase();
        
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('wallet_address, referral_code')
            .eq('wallet_address', address)
            .single();

        if (existingUser) {
            return res.json({ 
                exists: true,
                referralCode: existingUser.referral_code,
                walletAddress: existingUser.wallet_address 
            });
        }

        // Create new user entry
        const referralCode = walletAddress.substring(2, 8).toUpperCase();
        
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                wallet_address: address,
                referral_code: referralCode,
                total_staked: 0,
                direct_referrals_count: 0
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            return res.status(500).json({ error: 'Failed to register wallet' });
        }

        res.json({ 
            exists: false,
            created: true,
            referralCode: newUser.referral_code,
            walletAddress: newUser.wallet_address 
        });
    } catch (error) {
        console.error('Error registering wallet:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/rewards/proof/:address/:epochId
 * Returns Merkle proof for a specific address and epoch
 */
app.get('/api/rewards/proof/:address/:epochId', async (req, res) => {
    try {
        const { address, epochId } = req.params;
        
        console.log(`🔍 Fetching proof for address: ${address}, epoch: ${epochId}`);

        let query = supabase
            .from('epoch_data')
            .select('*');

        if (epochId === 'latest') {
            query = query.order('created_at', { ascending: false }).limit(1);
        } else {
            query = query.eq('id', epochId);
        }

        const { data: epochs, error } = await query;
        const epoch = epochs && epochs.length > 0 ? epochs[0] : null;

        console.log(`📊 Found epoch:`, epoch ? `ID ${epoch.id}` : 'None');

        if (error || !epoch) {
            console.log('❌ Epoch not found');
            return res.status(404).json({ error: 'Epoch not found' });
        }

        // Parse JSON data
        const proofs = typeof epoch.proofs === 'string' ? JSON.parse(epoch.proofs) : epoch.proofs;
        const recipients = typeof epoch.recipients === 'string' ? JSON.parse(epoch.recipients) : epoch.recipients;

        console.log(`📦 Proofs keys:`, Object.keys(proofs).slice(0, 5));
        console.log(`👥 Recipients:`, recipients.map(r => r.address).slice(0, 5));

        const userProof = proofs[address.toLowerCase()];
        const userReward = recipients.find(r => r.address.toLowerCase() === address.toLowerCase());

        console.log(`🎯 User proof found:`, !!userProof, `Reward found:`, !!userReward);

        if (!userProof || !userReward) {
            return res.status(404).json({ error: 'Address not eligible for this epoch' });
        }

        // Check if already claimed - PRIMARY SOURCE: CONTRACT
        const checkEpochId = epoch.blockchain_epoch_id || epoch.id;
        console.log(`🔍 Checking claim status from contract: epoch_id=${checkEpochId}, user=${address.toLowerCase()}`);
        
        let hasClaimed = false;
        try {
            // Read directly from contract (source of truth)
            const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
            const RPC_URL = process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            
            const contractABI = [
                "function claimed(uint256 epochId, address user) view returns (bool)"
            ];
            const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
            
            hasClaimed = await contract.claimed(checkEpochId, address.toLowerCase());
            console.log(`✅ Contract claim status: ${hasClaimed}`);
            
        } catch (contractErr) {
            console.warn('⚠️ Contract read failed, falling back to database:', contractErr.message);
            
            // Fallback to database check
            const { data: claim } = await supabase
                .from('reward_claims')
                .select('*')
                .eq('user_address', address.toLowerCase())
                .eq('epoch_id', checkEpochId)
                .maybeSingle();
                
            hasClaimed = !!claim;
            console.log(`📋 Database claim status (fallback): ${hasClaimed}`);
        }

        res.json({
            epochId: epoch.blockchain_epoch_id || epoch.id,
            address: address,
            amount: userReward.amount,
            proof: userProof,
            merkleRoot: epoch.merkle_root,
            claimed: hasClaimed
        });

    } catch (error) {
        console.error('❌ Proof endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/generate-epoch
 * Generates a new reward epoch
 * Body: { totalAmount: "1000000000000000000" } // in wei
 */
app.post('/api/admin/generate-epoch', async (req, res) => {
    try {
        const { totalAmount } = req.body;

        if (!totalAmount) {
            return res.status(400).json({ error: 'totalAmount required' });
        }

        const result = await generateEpoch(totalAmount);

        res.json({
            success: true,
            epochId: result.epochId,
            merkleRoot: result.root,
            recipients: result.recipients.length,
            data: result
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Update epoch with blockchain ID
app.post('/api/admin/update-epoch-id', async (req, res) => {
    try {
        const { databaseEpochId, blockchainEpochId } = req.body;
        
        console.log(`🔄 Updating epoch ${databaseEpochId} with blockchain ID ${blockchainEpochId}`);
        
        const { error } = await supabase
            .from('epoch_data')
            .update({ blockchain_epoch_id: blockchainEpochId })
            .eq('id', databaseEpochId);
            
        if (error) throw error;
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating epoch ID:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/pool-stats
 * Returns current pool balance and accrued fees from the contract
 */
app.get('/api/admin/pool-stats', async (req, res) => {
    try {
        const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
        const RPC_URL = process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';
        
        if (!CONTRACT_ADDRESS) throw new Error("Contract address not configured");

        const provider = new ethers.JsonRpcProvider(RPC_URL);
        
        // Minimal ABI for stats
        const ABI = [
            "function usdtFeesAccrued() view returns (uint256)",
            "function yourToken() view returns (address)",
            "function fundRewardTokens(address token, uint256 amount) external" // Just for reference
        ];
        
        // ERC20 ABI for balance
        const ERC20_ABI = [
            "function balanceOf(address account) view returns (uint256)"
        ];

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        
        // 1. Get Accrued Fees
        const fees = await contract.usdtFeesAccrued();
        
        // 2. Get Token Address & Balance
        const tokenAddress = await contract.yourToken();
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const balance = await tokenContract.balanceOf(CONTRACT_ADDRESS);

        res.json({
            fees: fees.toString(),
            poolBalance: balance.toString(),
            tokenAddress: tokenAddress
        });

    } catch (error) {
        console.error("Pool Stats Error:", error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

/**
 * GET /api/epochs
 * Returns all epochs
 */
app.get('/api/epochs', async (req, res) => {
    try {
        const { data: epochs, error } = await supabase
            .from('epoch_data')
            .select('id, merkle_root, total_amount, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ epochs });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// --- VIP REWARD POOL ENDPOINTS ---

const { generateVIPEpoch, VIP_REFERRAL_REQUIREMENT } = require('./vip-reward-calculator');

/**
 * GET /api/vip/eligible
 * Returns list of VIP-eligible users (100+ total referrals)
 */
app.get('/api/vip/eligible', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .gte('total_referrals_count', VIP_REFERRAL_REQUIREMENT)
            .order('total_referrals_count', { ascending: false });

        if (error) throw error;

        res.json({
            total: users?.length || 0,
            requirement: VIP_REFERRAL_REQUIREMENT,
            eligible: users?.map(u => ({
                address: u.wallet_address,
                totalReferrals: u.total_referrals_count,
                directReferrals: u.direct_referrals_count,
                indirectReferrals: u.indirect_referrals_count,
                totalStaked: u.total_staked
            })) || []
        });

    } catch (error) {
        console.error('VIP eligible error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/vip/proof/:address/:epochId
 * Returns Merkle proof for VIP reward claim
 */
app.get('/api/vip/proof/:address/:epochId', async (req, res) => {
    try {
        const { address, epochId } = req.params;
        
        console.log(`🔍 Fetching VIP proof for address: ${address}, epoch: ${epochId}`);

        let query = supabase
            .from('vip_epoch_data')
            .select('*');

        if (epochId === 'latest') {
            query = query.order('created_at', { ascending: false }).limit(1);
        } else {
            query = query.eq('id', epochId);
        }

        const { data: epochs, error } = await query;
        const epoch = epochs && epochs.length > 0 ? epochs[0] : null;

        if (error || !epoch) {
            return res.status(404).json({ error: 'VIP epoch not found' });
        }

        // Parse JSON data
        const proofs = typeof epoch.proofs === 'string' ? JSON.parse(epoch.proofs) : epoch.proofs;
        const recipients = typeof epoch.recipients === 'string' ? JSON.parse(epoch.recipients) : epoch.recipients;

        const userProof = proofs[address.toLowerCase()];
        const userReward = recipients.find(r => r.address.toLowerCase() === address.toLowerCase());

        if (!userProof || !userReward) {
            return res.status(404).json({ error: 'Address not eligible for this VIP epoch' });
        }

        // Check if already claimed - PRIMARY SOURCE: CONTRACT
        const checkEpochId = epoch.blockchain_epoch_id || epoch.id;
        console.log(`🔍 Checking VIP claim status from contract: epoch_id=${checkEpochId}, user=${address.toLowerCase()}`);
        
        let hasClaimed = false;
        try {
            // Read directly from contract (source of truth)
            const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
            const RPC_URL = process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            
            const contractABI = [
                "function vipClaimed(uint256 epochId, address user) view returns (bool)"
            ];
            const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
            
            hasClaimed = await contract.vipClaimed(checkEpochId, address.toLowerCase());
            console.log(`✅ Contract VIP claim status: ${hasClaimed}`);
            
        } catch (contractErr) {
            console.warn('⚠️ VIP contract read failed, falling back to database:', contractErr.message);
            
            // Fallback to database check
            const { data: claim } = await supabase
                .from('vip_reward_claims')
                .select('*')
                .eq('user_address', address.toLowerCase())
                .eq('epoch_id', checkEpochId)
                .maybeSingle();
                
            hasClaimed = !!claim;
            console.log(`📋 VIP database claim status (fallback): ${hasClaimed}`);
        }

        res.json({
            epochId: epoch.blockchain_epoch_id || epoch.id,
            address: address,
            amount: userReward.amount,
            proof: userProof,
            merkleRoot: epoch.merkle_root,
            claimed: hasClaimed,
            totalReferrals: userReward.totalReferrals,
            directReferrals: userReward.directReferrals,
            indirectReferrals: userReward.indirectReferrals
        });

    } catch (error) {
        console.error('❌ VIP proof endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/generate-vip-epoch
 * Generates a new VIP reward epoch
 */
app.post('/api/admin/generate-vip-epoch', async (req, res) => {
    try {
        const { totalAmount } = req.body;

        if (!totalAmount) {
            return res.status(400).json({ error: 'totalAmount required' });
        }

        const result = await generateVIPEpoch(totalAmount);

        res.json({
            success: true,
            epochId: result.epochId,
            merkleRoot: result.root,
            recipients: result.recipients.length,
            data: result
        });

    } catch (error) {
        console.error('VIP epoch generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/update-vip-epoch-id
 * Update VIP epoch with blockchain ID
 */
app.post('/api/admin/update-vip-epoch-id', async (req, res) => {
    try {
       const { databaseEpochId, blockchainEpochId } = req.body;
        
        console.log(`🔄 Updating VIP epoch ${databaseEpochId} with blockchain ID ${blockchainEpochId}`);
        
        const { error } = await supabase
            .from('vip_epoch_data')
            .update({ blockchain_epoch_id: blockchainEpochId })
            .eq('id', databaseEpochId);
            
        if (error) throw error;
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating VIP epoch ID:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/vip-pool-stats
 * Returns VIP pool balance from the contract
 */
app.get('/api/admin/vip-pool-stats', async (req, res) => {
    try {
        const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
        const RPC_URL = process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';
        
        if (!CONTRACT_ADDRESS) throw new Error("Contract address not configured");

        const provider = new ethers.JsonRpcProvider(RPC_URL);
        
        // Note: This will work once contract is updated with VIP functions
        const ABI = [
            "function vipPoolBalance() view returns (uint256)",
            "function yourToken() view returns (address)"
        ];

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        
        try {
            // Get VIP Pool Balance
            const vipBalance = await contract.vipPoolBalance();
            
            // Get Token Address
            const tokenAddress = await contract.yourToken();

            res.json({
                vipPoolBalance: vipBalance.toString(),
                tokenAddress: tokenAddress
            });
        } catch (contractError) {
            // If contract doesn't have VIP functions yet, return zeros
            console.log('VIP functions not yet deployed, returning zeros');
            res.json({
                vipPoolBalance: '0',
                tokenAddress: null,
                note: 'Contract not yet updated with VIP functions'
            });
        }

    } catch (error) {
        console.error("VIP Pool Stats Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const { startListening } = require('./indexer');

app.listen(PORT, () => {
    console.log(`\n🚀 Reward API Server running on http://localhost:${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   GET /api/rewards/eligible`);
    console.log(`   GET /api/rewards/proof/:address/:epochId`);
    console.log(`   GET /api/referral/resolve/:code`);
    console.log(`   POST /api/wallet/register`);
    console.log(`   POST /api/admin/generate-epoch`);
    console.log(`   GET /api/epochs`);
    console.log(`\n👑 VIP Endpoints:`);
    console.log(`   GET /api/vip/eligible`);
    console.log(`   GET /api/vip/proof/:address/:epochId`);
    console.log(`   POST /api/admin/generate-vip-epoch`);
    console.log(`   GET /api/admin/vip-pool-stats\n`);

    // Start Indexer
    console.log(`\n🔄 Starting Blockchain Indexer...`);
    startListening();
});

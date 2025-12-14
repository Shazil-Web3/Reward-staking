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

        // Filter eligible based on referral requirements
        const PACKAGE_REQUIREMENTS = {
            0: { requiredReferrals: 10 },
            1: { requiredReferrals: 5 },
            2: { requiredReferrals: 0 },
            3: { requiredReferrals: 10 }
        };

        const eligible = stakes.filter(stake => {
            const user = stake.users;
            const pkg = PACKAGE_REQUIREMENTS[stake.package_id];
            return user.direct_referrals_count >= pkg.requiredReferrals;
        });

        res.json({
            total: eligible.length,
            eligible: eligible.map(s => ({
                address: s.users.wallet_address,
                stake: s.amount,
                referrals: s.users.direct_referrals_count,
                package: s.package_id
            }))
        });

    } catch (error) {
        console.error(error);
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

        if (error || !epoch) {
            return res.status(404).json({ error: 'Epoch not found' });
        }

        const proofs = JSON.parse(epoch.proofs);
        const recipients = JSON.parse(epoch.recipients);

        const userProof = proofs[address.toLowerCase()];
        const userReward = recipients.find(r => r.address.toLowerCase() === address.toLowerCase());

        if (!userProof || !userReward) {
            return res.status(404).json({ error: 'Address not eligible for this epoch' });
        }

        // Check if already claimed
        const { data: claim } = await supabase
            .from('reward_claims')
            .select('id')
            .eq('user_address', address.toLowerCase())
            .eq('epoch_id', epoch.id)
            .single();

        res.json({
            epochId: epoch.id,
            address: address,
            amount: userReward.amount,
            proof: userProof,
            merkleRoot: epoch.merkle_root,
            claimed: !!claim
        });

    } catch (error) {
        console.error(error);
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

app.listen(PORT, () => {
    console.log(`\n🚀 Reward API Server running on http://localhost:${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   GET /api/rewards/eligible`);
    console.log(`   GET /api/rewards/proof/:address/:epochId`);
    console.log(`   POST /api/admin/generate-epoch`);
    console.log(`   GET /api/epochs\n`);
});

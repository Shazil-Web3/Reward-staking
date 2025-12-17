require('dotenv').config();
const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURATION ---
const RPC_URL = process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'; // BSC Testnet default
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Minimal ABI for events we care about
const ABI = [
    "event Locked(address indexed user, uint256 indexed lockId, uint8 packageId, uint256 tokenAmount, uint64 end)",
    "event ReferrerSet(address indexed user, address indexed referrer)",
    "event Withdrawn(address indexed user, uint256 indexed lockId, uint256 tokenAmount)",
    "event RewardTokensFunded(address indexed token, uint256 amount)",
    "event VIPRewardTokensFunded(address indexed token, uint256 amount)",
    "event RewardClaimed(uint256 indexed epochId, address indexed user, uint256 amount)",
    "event VipRewardClaimed(uint256 indexed epochId, address indexed user, uint256 amount)",
    "function getLocks(address user) external view returns (tuple(uint256 amountToken, uint64 start, uint64 end, uint8 packageId, bool withdrawn)[])"
];

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing Supabase credentials in .env");
    process.exit(1);
}

// --- INITIALIZATION ---
// Use StaticJsonRpcProvider or configure polling for stability
const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
    staticNetwork: true,
    polling: true,
    pollingInterval: 4000
});

// Resilient contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log(`🚀 Staking Indexer v1.0`);
console.log(`📡 Connected to RPC: ${RPC_URL}`);
console.log(`📝 Watching Contract: ${CONTRACT_ADDRESS}`);

// --- HELPER FUNCTIONS ---

const generateReferralCode = (address) => {
    return address.substring(2, 8).toUpperCase();
};

const getOrCreateUser = async (address) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .single();

    if (data) return data;

    // Create new user
    const newUser = {
        wallet_address: address.toLowerCase(),
        referral_code: generateReferralCode(address),
        total_staked: 0,
        direct_referrals_count: 0
    };

    const { data: created, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

    if (createError) console.error(`Error creating user ${address}:`, createError);
    return created;
};

// --- EVENT HANDLERS ---

const handleLocked = async (user, lockId, packageId, amount, end, event) => {
    console.log(`🔒 New Lock: ${user} - Amount: ${ethers.formatEther(amount)}`);

    try {
        await getOrCreateUser(user);

        // Update User Total Staked
        // Note: For simplicity, we increment. In prod, maybe fetch fresh total from chain or sum DB.
        const { error: updateError } = await supabase.rpc('increment_total_staked', { 
            row_id: user.toLowerCase(), 
            amount_k: parseFloat(ethers.formatEther(amount)) 
        });
        
        // Use standard update if RPC function not set up
        if (updateError) {
             const { data: u } = await supabase.from('users').select('total_staked').eq('wallet_address', user.toLowerCase()).single();
             const newTotal = (u?.total_staked || 0) + parseFloat(ethers.formatEther(amount));
             await supabase.from('users').update({ total_staked: newTotal }).eq('wallet_address', user.toLowerCase());
        }

        // Insert Stake Record
        await supabase.from('stakes').insert({
            user_address: user.toLowerCase(),
            lock_id: Number(lockId),
            amount: parseFloat(ethers.formatEther(amount)),
            package_id: Number(packageId),
            start_time: new Date().toISOString(),
            end_time: new Date(Number(end) * 1000).toISOString(),
            status: 'active',
            tx_hash: event.log.transactionHash
        });

    } catch (err) {
        console.error("Error handling Locked:", err);
    }
};

const handleReferrerSet = async (user, referrer) => {
    console.log(`🤝 Referral: ${user} referred by ${referrer}`);
    try {
        await getOrCreateUser(user);
        await getOrCreateUser(referrer);

        // Update user's referrer
        await supabase
            .from('users')
            .update({ referrer_address: referrer.toLowerCase() })
            .eq('wallet_address', user.toLowerCase());

        // Increment referrer's direct count
        const { data: refUser } = await supabase.from('users').select('direct_referrals_count').eq('wallet_address', referrer.toLowerCase()).single();
        if (refUser) {
             await supabase
                .from('users')
                .update({ direct_referrals_count: refUser.direct_referrals_count + 1 })
                .eq('wallet_address', referrer.toLowerCase());
        }

        // Update indirect referrals for upline (2 levels max)
        const { updateReferralCounts } = require('./referral-tree');
        
        // This will update indirect counts for:
        // - The new user
        // - The referrer (1 level up)
        // - The referrer's referrer (2 levels up)
        await updateReferralCounts(user.toLowerCase());

    } catch (err) {
        console.error("Error handling ReferrerSet:", err);
    }
};

const handleWithdrawn = async (user, lockId, amount) => {
    console.log(`🔓 Withdrawn: ${user} - LockID: ${lockId}`);
    try {
        await supabase
            .from('stakes')
            .update({ status: 'withdrawn' })
            .match({ user_address: user.toLowerCase(), lock_id: Number(lockId) });
            
        // Optionally decrease total staked
    } catch (err) {
        console.error("Error handling Withdrawn:", err);
    }
};

const handleClaimed = async (epochId, user, amount, event) => {
    console.log(`🎁 Claimed: ${user} - Epoch: ${epochId} - Amount: ${ethers.formatEther(amount)}`);
    try {
        const txHash = event?.log?.transactionHash || event?.transactionHash;
        
        const claimData = {
            user_address: user.toLowerCase(),
            epoch_id: Number(epochId),
            amount: parseFloat(ethers.formatEther(amount)),
            tx_hash: txHash
        };
        
        console.log('📝 Writing claim to database:', JSON.stringify(claimData));
        
        const { error } = await supabase.from('reward_claims').insert(claimData);
        
        if (error) {
            console.error('❌ Database error inserting claim:', error);
        } else {
            console.log('✅ Claim successfully written to database');
        }
    } catch (err) {
        console.error("Error handling Claimed:", err);
    }
};

const handleVipClaimed = async (epochId, user, amount, event) => {
    console.log(`👑 VIP Claimed: ${user} - Epoch: ${epochId} - Amount: ${ethers.formatEther(amount)}`);
    try {
        const txHash = event?.log?.transactionHash || event?.transactionHash;
        
        const claimData = {
            user_address: user.toLowerCase(),
            epoch_id: Number(epochId),
            amount: parseFloat(ethers.formatEther(amount)),
            tx_hash: txHash
        };
        
        console.log('📝 Writing VIP claim to database:', JSON.stringify(claimData));
        
        const { error } = await supabase.from('vip_reward_claims').insert(claimData);
        
        if (error) {
            console.error('❌ Database error inserting VIP claim:', error);
        } else {
            console.log('✅ VIP claim successfully written to database');
        }
    } catch (err) {
        console.error("Error handling VIP Claimed:", err);
    }
};

const handleVIPRewardTokensFunded = async (token, amount, event) => {
    console.log(`💎 VIP Pool Funded: ${ethers.formatEther(amount)} tokens from ${token}`);
    try {
        const txHash = event?.log?.transactionHash || event?.transactionHash;
        console.log(`📝 VIP funding TX: ${txHash}`);
        // Optional: Store in database for tracking
    } catch (err) {
        console.error("Error handling VIP Reward Tokens Funded:", err);
    }
};

// --- POLLING-BASED INDEXER ---

let lastProcessedBlock = null;

// Load last processed block from a file or start from a recent block
const getStartingBlock = async () => {
    try {
        const currentBlock = await provider.getBlockNumber();
        // Start from 1000 blocks ago to catch recent events
        return currentBlock -1000;
    } catch (e) {
        console.error('Error getting starting block:', e);
        return 0;
    }
};

const processEvent = async (event, eventName) => {
    try {
        const parsedLog = contract.interface.parseLog(event);
        
        if (eventName === 'Locked') {
            const { user, lockId, packageId, tokenAmount, end } = parsedLog.args;
            await handleLocked(user, lockId, packageId, tokenAmount, end, { log: event });
        } else if (eventName === 'ReferrerSet') {
            const { user, referrer } = parsedLog.args;
            await handleReferrerSet(user, referrer);
        } else if (eventName === 'Withdrawn') {
            const { user, lockId, tokenAmount } = parsedLog.args;
            await handleWithdrawn(user, lockId, tokenAmount);
        } else if (eventName === 'RewardClaimed') {
            const { epochId, user, amount } = parsedLog.args;
            await handleClaimed(epochId, user, amount, { log: event });
        } else if (eventName === 'VipRewardClaimed') {
            const { epochId, user, amount } = parsedLog.args;
            await handleVipClaimed(epochId, user, amount, { log: event });
        } else if (eventName === 'VIPRewardTokensFunded') {
            const { token, amount } = parsedLog.args;
            await handleVIPRewardTokensFunded(token, amount, { log: event });
        }
    } catch (e) {
        console.error(`Error processing ${eventName} event:`, e);
    }
};

const pollEvents = async () => {
    try {
        const currentBlock = await provider.getBlockNumber();
        
        if (!lastProcessedBlock) {
            lastProcessedBlock = await getStartingBlock();
            console.log(`📍 Starting indexer from block ${lastProcessedBlock}`);
        }
        
        // Don't query too many blocks at once (max 10000 to avoid rate limits)
        const toBlock = Math.min(lastProcessedBlock + 10000, currentBlock);
        
        if (toBlock > lastProcessedBlock) {
            console.log(`🔍 Scanning blocks ${lastProcessedBlock} to ${toBlock}...`);
            
            // Query all events in parallel
            const [locked, referrerSet, withdrawn, rewardClaimed, vipRewardClaimed, vipFunded] = await Promise.all([
                contract.queryFilter(contract.filters.Locked(), lastProcessedBlock, toBlock),
                contract.queryFilter(contract.filters.ReferrerSet(), lastProcessedBlock, toBlock),
                contract.queryFilter(contract.filters.Withdrawn(), lastProcessedBlock, toBlock),
                contract.queryFilter(contract.filters.RewardClaimed(), lastProcessedBlock, toBlock),
                contract.queryFilter(contract.filters.VipRewardClaimed(), lastProcessedBlock, toBlock),
                contract.queryFilter(contract.filters.VIPRewardTokensFunded(), lastProcessedBlock, toBlock)
            ]);
            
            // Process all events in order by block number
            const allEvents = [
                ...locked.map(e => ({ event: e, name: 'Locked' })),
                ...referrerSet.map(e => ({ event: e, name: 'ReferrerSet' })),
                ...withdrawn.map(e => ({ event: e, name: 'Withdrawn' })),
                ...rewardClaimed.map(e => ({ event: e, name: 'RewardClaimed' })),
                ...vipRewardClaimed.map(e => ({ event: e, name: 'VipRewardClaimed' })),
                ...vipFunded.map(e => ({ event: e, name: 'VIPRewardTokensFunded' }))
            ].sort((a, b) => a.event.blockNumber - b.event.blockNumber);
            
            if (allEvents.length > 0) {
                console.log(`📦 Found ${allEvents.length} events to process`);
                
                for (const { event, name } of allEvents) {
                    await processEvent(event, name);
                }
            }
            
            lastProcessedBlock = toBlock + 1;
        }
        
    } catch (e) {
        console.error('❌ Error polling events:', e.message);
    }
};

const startListening = async () => {
    console.log('🔄 Starting polling-based indexer...');
    
    // Initial scan
    await pollEvents();
    
    // Poll every 5 seconds
    setInterval(pollEvents, 5000);
    
    // Keep process alive if running standalone
    if (require.main === module) {
        process.stdin.resume();
    }
};

// Only auto-start if run directly
if (require.main === module) {
    startListening();
}

module.exports = { startListening };

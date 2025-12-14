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
    "event Claimed(uint256 indexed epochId, address indexed user, uint256 amount)",
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

        // Increment referrer's count
        // Simplified: Fetch -> Increment -> Save (Concurrency risk in high load, OK for MVP)
        const { data: refUser } = await supabase.from('users').select('direct_referrals_count').eq('wallet_address', referrer.toLowerCase()).single();
        if (refUser) {
             await supabase
                .from('users')
                .update({ direct_referrals_count: refUser.direct_referrals_count + 1 })
                .eq('wallet_address', referrer.toLowerCase());
        }

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
        await supabase.from('reward_claims').insert({
            user_address: user.toLowerCase(),
            epoch_id: Number(epochId),
            amount: parseFloat(ethers.formatEther(amount)),
            tx_hash: event.log.transactionHash
        });
    } catch (err) {
        console.error("Error handling Claimed:", err);
    }
};

// --- LISTENERS ---

const startListening = () => {
    contract.on('Locked', handleLocked);
    contract.on('ReferrerSet', handleReferrerSet);
    contract.on('Withdrawn', handleWithdrawn);
    contract.on('Claimed', handleClaimed);
    
    // contract.on('RewardTokensFunded', ...) - Add logic to update reward_pool table

    // Keep process alive
    process.stdin.resume();
};

startListening();

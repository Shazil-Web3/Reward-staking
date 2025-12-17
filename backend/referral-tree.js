require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Calculate indirect referrals for a user (2 levels deep max)
 * 
 * Level 1: Direct referrals (children)
 * Level 2: Referrals of direct referrals (grandchildren)
 * 
 * Example:
 * A -> B -> C -> D
 * A has: 1 direct (B), 2 indirect (C from B, D from C)
 * B has: 1 direct (C), 1 indirect (D from C)
 * C has: 1 direct (D), 0 indirect
 */
async function calculateIndirectReferrals(userAddress) {
    try {
        let indirectCount = 0;
        
        // Level 1: Get all direct referrals of this user
        const level1Refs = await getDirectReferrals(userAddress);
        
        for (const level1User of level1Refs) {
            // Level 2: Get direct referrals of level 1 users (grandchildren)
            const level2Refs = await getDirectReferrals(level1User.wallet_address);
            indirectCount += level2Refs.length; // Count as indirect for original user
            
            // Level 3: Get direct referrals of level 2 users (great-grandchildren)
            for (const level2User of level2Refs) {
                const level3Refs = await getDirectReferrals(level2User.wallet_address);
                indirectCount += level3Refs.length; // Count as indirect for original user
            }
        }
        
        return indirectCount;
    } catch (error) {
        console.error(`Error calculating indirect referrals for ${userAddress}:`, error);
        return 0;
    }
}

/**
 * Get all direct referrals for a user
 */
async function getDirectReferrals(userAddress) {
    const { data, error } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('referrer_address', userAddress.toLowerCase());
    
    if (error) {
        console.error('Error fetching direct referrals:', error);
        return [];
    }
    
    return data || [];
}

/**
 * Update referral counts for a user and their upline (2 levels)
 */
async function updateReferralCounts(userAddress) {
    try {
        const address = userAddress.toLowerCase();
        
        // Get user data
        const { data: user } = await supabase
            .from('users')
            .select('wallet_address, referrer_address, direct_referrals_count')
            .eq('wallet_address', address)
            .single();
        
        if (!user) return;
        
        // Calculate and update this user's indirect count
        const indirectCount = await calculateIndirectReferrals(address);
        await supabase
            .from('users')
            .update({
                indirect_referrals_count: indirectCount,
                total_referrals_count: (user.direct_referrals_count || 0) + indirectCount
            })
            .eq('wallet_address', address);
        
        console.log(`✅ Updated ${address}: ${indirectCount} indirect, ${(user.direct_referrals_count || 0) + indirectCount} total`);
        
        // Update referrer (level 1 up)
        if (user.referrer_address) {
            await updateSingleUserCounts(user.referrer_address);
            
            // Update referrer's referrer (level 2 up)
            const { data: referrer } = await supabase
                .from('users')
                .select('referrer_address')
                .eq('wallet_address', user.referrer_address)
                .single();
            
            if (referrer?.referrer_address) {
                await updateSingleUserCounts(referrer.referrer_address);
            }
        }
    } catch (error) {
        console.error(`Error updating referral counts for ${userAddress}:`, error);
    }
}

/**
 * Update a single user's indirect and total counts
 */
async function updateSingleUserCounts(userAddress) {
    const { data: user } = await supabase
        .from('users')
        .select('direct_referrals_count')
        .eq('wallet_address', userAddress.toLowerCase())
        .single();
    
    if (!user) return;
    
    const indirectCount = await calculateIndirectReferrals(userAddress.toLowerCase());
    await supabase
        .from('users')
        .update({
            indirect_referrals_count: indirectCount,
            total_referrals_count: (user.direct_referrals_count || 0) + indirectCount
        })
        .eq('wallet_address', userAddress.toLowerCase());
    
    console.log(`✅ Updated ${userAddress}: ${indirectCount} indirect, ${(user.direct_referrals_count || 0) + indirectCount} total`);
}

/**
 * Recalculate all referral counts for all users (maintenance function)
 */
async function recalculateAllReferralCounts() {
    console.log('🔄 Recalculating all referral counts...');
    
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('wallet_address, direct_referrals_count');
        
        if (error) throw error;
        
        for (const user of users) {
            const indirectCount = await calculateIndirectReferrals(user.wallet_address);
            await supabase
                .from('users')
                .update({
                    indirect_referrals_count: indirectCount,
                    total_referrals_count: (user.direct_referrals_count || 0) + indirectCount
                })
                .eq('wallet_address', user.wallet_address);
            
            console.log(`Updated ${user.wallet_address}: ${user.direct_referrals_count} direct + ${indirectCount} indirect = ${(user.direct_referrals_count || 0) + indirectCount} total`);
        }
        
        console.log(`✅ Recalculation complete for ${users.length} users`);
    } catch (error) {
        console.error('Error recalculating referral counts:', error);
    }
}

module.exports = {
    calculateIndirectReferrals,
    updateReferralCounts,
    recalculateAllReferralCounts
};

// CLI usage
if (require.main === module) {
    const command = process.argv[2];
    const address = process.argv[3];
    
    if (command === 'recalculate-all') {
        recalculateAllReferralCounts().then(() => process.exit(0));
    } else if (command === 'update' && address) {
        updateReferralCounts(address).then(() => process.exit(0));
    } else if (command === 'calculate' && address) {
        calculateIndirectReferrals(address).then(count => {
            console.log(`Indirect referrals for ${address}: ${count}`);
            process.exit(0);
        });
    } else {
        console.log('Usage:');
        console.log('  node referral-tree.js recalculate-all');
        console.log('  node referral-tree.js update <address>');
        console.log('  node referral-tree.js calculate <address>');
        process.exit(1);
    }
}

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
const { generateMerkleTree } = require('./merkle-utils');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Package Requirements:
 * Starter ($50+): 10 referrals
 * Pro ($100+): 5 referrals
 * Elite ($1000+): 0 referrals
 */
const PACKAGE_REQUIREMENTS = {
    0: { minUsd: 50, requiredReferrals: 10 },   // Starter
    1: { minUsd: 100, requiredReferrals: 5 },   // Pro
    2: { minUsd: 1000, requiredReferrals: 0 },  // Elite
    3: { minUsd: 50, requiredReferrals: 10 }    // Custom (maps to Starter rules)
};

/**
 * Fetches all eligible users for reward distribution
 * @param {number} rewardPoolTokens - Total tokens to distribute (in token units, e.g., "1000000000000000000" for 1 ETH)
 * @returns {Array} - [{address, amount, stake}]
 */
async function calculateRewardDistribution(rewardPoolTokens) {
    try {
        // 1. Get all active stakes
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

        // 2. Filter eligible stakers
        const eligible = stakes.filter(stake => {
            const user = stake.users;
            const pkg = PACKAGE_REQUIREMENTS[stake.package_id];
            
            // Check if user meets referral requirements
            const meetsReferrals = user.direct_referrals_count >= pkg.requiredReferrals;
            
            return meetsReferrals;
        });

        if (eligible.length === 0) {
            console.log('⚠️  No eligible stakers found');
            return [];
        }

        // 3. Calculate total stake of eligible users
        const totalEligibleStake = eligible.reduce((sum, s) => sum + parseFloat(s.amount), 0);

        // 4. Distribute rewards proportionally
        const recipients = eligible.map(stake => {
            const userStake = parseFloat(stake.amount);
            const share = userStake / totalEligibleStake;
            const reward = BigInt(Math.floor(share * Number(rewardPoolTokens)));

            return {
                address: stake.users.wallet_address,
                amount: reward.toString(),
                stake: userStake,
                share: (share * 100).toFixed(2) + '%'
            };
        });

        return recipients;

    } catch (error) {
        console.error('Error calculating distribution:', error);
        throw error;
    }
}

/**
 * Generates a new reward epoch
 * @param {string} rewardPoolAmount - Amount in token units (e.g., ethers.parseEther("1000"))
 * @returns {Object} - Epoch data including root and proofs
 */
async function generateEpoch(rewardPoolAmount) {
    console.log(`\n🎁 Generating Reward Epoch...`);
    console.log(`💰 Total Pool: ${ethers.formatEther(rewardPoolAmount)} tokens\n`);

    // 1. Calculate distribution
    const recipients = await calculateRewardDistribution(rewardPoolAmount);

    if (recipients.length === 0) {
        throw new Error('No eligible recipients');
    }

    console.log(`✅ Found ${recipients.length} eligible recipients\n`);

    recipients.forEach((r, i) => {
        console.log(`${i + 1}. ${r.address} - ${ethers.formatEther(r.amount)} tokens (${r.share})`);
    });

    // 2. Generate Merkle Tree
    const { root, proofs } = generateMerkleTree(recipients);

    console.log(`\n🌲 Merkle Root: ${root}`);

    // 3. Save to database
    const { data: epochData, error } = await supabase
        .from('epoch_data')
        .insert({
            merkle_root: root,
            total_amount: rewardPoolAmount,
            recipients: JSON.stringify(recipients),
            proofs: JSON.stringify(proofs)
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving epoch:', error);
        throw error;
    }

    console.log(`\n✅ Epoch saved to database (ID: ${epochData.id})\n`);

    return {
        epochId: epochData.id,
        root,
        recipients,
        proofs
    };
}

module.exports = {
    calculateRewardDistribution,
    generateEpoch
};

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
const { generateMerkleTree } = require('./merkle-utils');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * VIP Pool Eligibility:
 * Users with 100+ total referrals (direct + indirect with 2-level limit)
 */
const VIP_REFERRAL_REQUIREMENT = 100;

/**
 * Fetches all eligible users for VIP reward distribution
 * @param {number} rewardPoolTokens - Total tokens to distribute (in token units)
 * @returns {Array} - [{address, amount, stake, totalReferrals}]
 */
async function calculateVIPRewardDistribution(rewardPoolTokens) {
    try {
        console.log(`\n💎 Calculating VIP Reward Distribution...`);
        console.log(`📊 Requirement: ${VIP_REFERRAL_REQUIREMENT}+ total referrals\n`);

        // 1. Get all active stakes from VIP-eligible users
        const { data: stakes, error } = await supabase
            .from('stakes')
            .select(`
                *,
                users (
                    wallet_address,
                    direct_referrals_count,
                    indirect_referrals_count,
                    total_referrals_count,
                    total_staked
                )
            `)
            .eq('status', 'active')
            .gte('users.total_referrals_count', VIP_REFERRAL_REQUIREMENT);

        if (error) throw error;
        if (!stakes || stakes.length === 0) {
            console.log('⚠️  No VIP-eligible stakers found');
            return [];
        }

        console.log(`✅ Found ${stakes.length} VIP-eligible stakes\n`);

        // 2. Group stakes by user (one user may have multiple stakes)
        const userStakes = new Map();
        stakes.forEach(stake => {
            const address = stake.users.wallet_address;
            if (!userStakes.has(address)) {
                userStakes.set(address, {
                    address,
                    totalStake: 0,
                    totalReferrals: stake.users.total_referrals_count,
                    directReferrals: stake.users.direct_referrals_count,
                    indirectReferrals: stake.users.indirect_referrals_count
                });
            }
            userStakes.get(address).totalStake += parseFloat(stake.amount);
        });

        // 3. Calculate total eligible stake
        let totalEligibleStake = 0;
        userStakes.forEach(user => {
            totalEligibleStake += user.totalStake;
        });

        if (totalEligibleStake === 0) {
            console.log('⚠️  Total eligible stake is 0');
            return [];
        }

        console.log(`💰 Total VIP Eligible Stake: $${totalEligibleStake.toLocaleString()}\n`);

        // 4. Distribute rewards proportionally by stake amount
        const recipients = [];
        userStakes.forEach(user => {
            const share = user.totalStake / totalEligibleStake;
            const reward = BigInt(Math.floor(share * Number(rewardPoolTokens)));

            recipients.push({
                address: user.address,
                amount: reward.toString(),
                stake: user.totalStake,
                totalReferrals: user.totalReferrals,
                directReferrals: user.directReferrals,
                indirectReferrals: user.indirectReferrals,
                share: (share * 100).toFixed(2) + '%'
            });
        });

        // Sort by reward amount descending
        recipients.sort((a, b) => BigInt(b.amount) - BigInt(a.amount));

        return recipients;

    } catch (error) {
        console.error('Error calculating VIP distribution:', error);
        throw error;
    }
}

/**
 * Generates a new VIP reward epoch
 * @param {string} rewardPoolAmount - Amount in token units (e.g., ethers.parseEther("1000"))
 * @returns {Object} - Epoch data including root and proofs
 */
async function generateVIPEpoch(rewardPoolAmount) {
    console.log(`\n👑 Generating VIP Reward Epoch...`);
    console.log(`💰 Total VIP Pool: ${ethers.formatEther(rewardPoolAmount)} tokens\n`);

    // 1. Calculate distribution
    const recipients = await calculateVIPRewardDistribution(rewardPoolAmount);

    if (recipients.length === 0) {
        throw new Error('No VIP-eligible recipients');
    }

    console.log(`✅ Found ${recipients.length} VIP-eligible recipients\n`);

    recipients.forEach((r, i) => {
        console.log(`${i + 1}. ${r.address}`);
        console.log(`   💰 Reward: ${ethers.formatEther(r.amount)} tokens (${r.share})`);
        console.log(`   📈 Stake: $${r.stake.toLocaleString()}`);
        console.log(`   👥 Referrals: ${r.totalReferrals} (${r.directReferrals} direct + ${r.indirectReferrals} indirect)\n`);
    });

    // 2. Generate Merkle Tree
    const { root, proofs } = generateMerkleTree(recipients);

    console.log(`🌲 VIP Merkle Root: ${root}`);

    // 3. Save to database
    const { data: epochData, error } = await supabase
        .from('vip_epoch_data')
        .insert({
            merkle_root: root,
            total_amount: rewardPoolAmount,
            recipients: JSON.stringify(recipients),
            proofs: JSON.stringify(proofs)
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving VIP epoch:', error);
        throw error;
    }

    console.log(`\n✅ VIP Epoch saved to database (ID: ${epochData.id})\n`);

    return {
        epochId: epochData.id,
        root,
        recipients,
        proofs
    };
}

module.exports = {
    calculateVIPRewardDistribution,
    generateVIPEpoch,
    VIP_REFERRAL_REQUIREMENT
};

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

        const { data: epoch, error } = await supabase
            .from('epoch_data')
            .select('*')
            .eq('id', epochId)
            .single();

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

        res.json({
            epochId: epoch.id,
            address: address,
            amount: userReward.amount,
            proof: userProof,
            merkleRoot: epoch.merkle_root
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

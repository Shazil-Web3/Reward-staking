require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
const moralisService = require('./services/moralis-service');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

app.use(cors());
app.use(express.json());

// Initialize Moralis Service
moralisService.initialize();

// --- API ENDPOINTS ---

/**
 * POST /api/deposits/create
 * Creates a pending deposit order. 
 * Frontend calls this BEFORE user sends transaction to get a unique Order ID.
 */
app.post('/api/deposits/create', async (req, res) => {
    try {
        const { walletAddress, amount, referralCode } = req.body;

        if (!walletAddress || !amount) {
            return res.status(400).json({ error: 'Wallet address and amount required' });
        }

        // Generate unique Order ID (random hex string that fits in bytes32)
        const orderIdBytes = crypto.randomBytes(32).toString('hex');
        const orderId = '0x' + orderIdBytes;

        const { data, error } = await supabase
            .from('deposits')
            .insert({
                order_id: orderId,
                user_address: walletAddress.toLowerCase(),
                amount: amount,
                referral_code: referralCode,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, orderId: orderId });

    } catch (error) {
        console.error('Error creating deposit:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/deposits/verify
 * Verifies a transaction hash submitted by the user.
 * 1. Checks transaction via Moralis
 * 2. Matches with Order ID
 * 3. Updates database status to 'verified'
 * 4. Records referral connection
 */
app.post('/api/deposits/verify', async (req, res) => {
    try {
        const { orderId, txHash } = req.body;

        if (!orderId || !txHash) {
            return res.status(400).json({ error: 'Order ID and Transaction Hash required' });
        }

        // 1. Verify via Moralis (One API Call)
        const verification = await moralisService.verifyDepositTransaction(txHash, orderId);

        if (!verification.verified) {
            return res.status(400).json({ verified: false, error: verification.error });
        }

        // 2. Verified! Update Database
        const { data: deposit, error: dbError } = await supabase
            .from('deposits')
            .update({
                status: 'verified', // Verified by blockchain, needs admin approval
                tx_hash: txHash,
                verified_at: new Date().toISOString(),
                block_number: verification.blockNumber,
                amount: verification.amount // Update with actual verified amount
            })
            .eq('order_id', orderId)
            .select()
            .single();

        if (dbError) throw dbError;

        // 3. Handle Referrals (Backend Logic)
        if (verification.referralCode) {
            await handleReferral(verification.userAddress, verification.referralCode, orderId);
        }

        res.json({ 
            success: true, 
            verified: true, 
            deposit: deposit 
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/admin/deposits/pending
 * Returns all verified deposits waiting for admin approval
 */
app.get('/api/admin/deposits/pending', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('deposits')
            .select('*')
            .eq('status', 'verified')
            .order('verified_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/deposits/approve/:orderId
 * Admin approves the deposit.
 * - Updates status to 'approved'
 * - Calculates CCT token allocation
 * - (Optional) Triggers Escrow Contract to add stake
 */
app.post('/api/admin/deposits/approve/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { tokensAllocated } = req.body; 

        if (!tokensAllocated) return res.status(400).json({ error: 'Token allocation required' });

        // Update deposit status
        const { data, error } = await supabase
            .from('deposits')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                tokens_allocated: tokensAllocated
            })
            .eq('order_id', orderId)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, deposit: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/referrals/tree/:address
 * Get referral stats for a user
 */
app.get('/api/referrals/tree/:address', async (req, res) => {
    try {
        const address = req.params.address.toLowerCase();

        // Count level 1
        const { count: level1Count, error: err1 } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_address', address)
            .eq('level', 1);

        // Count level 2
        const { count: level2Count, error: err2 } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_address', address)
            .eq('level', 2);

        if (err1 || err2) throw err1 || err2;

        res.json({
            address: address,
            directReferrals: level1Count,
            indirectReferrals: level2Count,
            totalReferrals: level1Count + level2Count
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper: Handle Referral Logic
async function handleReferral(userAddress, referralCode, depositId) {
    try {
        // 1. Find Referrer by Code
        const { data: referrerUser } = await supabase
            .from('users')
            .select('wallet_address, referrer_address')
            .eq('referral_code', referralCode)
            .single();

        if (!referrerUser) return; // Invalid code, skip

        const referrerAddress = referrerUser.wallet_address;
        
        // Prevent self-referral
        if (referrerAddress.toLowerCase() === userAddress.toLowerCase()) return;

        // 2. Insert Level 1 Referral
        await supabase.from('referrals').insert({
            deposit_id: depositId,
            user_address: userAddress,
            referrer_address: referrerAddress,
            level: 1,
            status: 'pending'
        });

        // 3. Insert Level 2 Referral (if referrer has a referrer)
        if (referrerUser.referrer_address) {
            await supabase.from('referrals').insert({
                deposit_id: depositId,
                user_address: userAddress,
                referrer_address: referrerUser.referrer_address,
                level: 2,
                status: 'pending'
            });
        }
        
        // 4. Update Referrer Link in Users Table (if not set)
        await supabase
            .from('users')
            .update({ referrer_address: referrerAddress })
            .eq('wallet_address', userAddress)
            .is('referrer_address', null); // Only set if empty

    } catch (error) {
        console.error('Referral handling error:', error);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
    console.log(`✅ Manual Deposit System Active`);
});

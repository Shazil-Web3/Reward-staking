require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkClaims() {
    console.log('🔍 Checking all claims in database...\n');
    
    const { data: claims, error } = await supabase
        .from('reward_claims')
        .select('*')
        .order('claimed_at', { ascending: false })
        .limit(10);
    
    if (error) {
        console.error('❌ Error:', error);
        return;
    }
    
    if (!claims || claims.length === 0) {
        console.log('⚠️ No claims found in database!');
        return;
    }
    
    console.log(`✅ Found ${claims.length} claim(s):\n`);
    claims.forEach((claim, i) => {
        console.log(`${i + 1}. User: ${claim.user_address}`);
        console.log(`   Epoch ID: ${claim.epoch_id}`);
        console.log(`   Amount: ${claim.amount}`);
        console.log(`   TX Hash: ${claim.tx_hash}`);
        console.log(`   Claimed: ${claim.claimed_at}\n`);
    });
}

checkClaims().then(() => process.exit(0));

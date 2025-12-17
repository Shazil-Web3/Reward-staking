-- VIP Reward Pool Schema Migration
-- Add indirect referral tracking and VIP reward pool tables

-- 1. Add columns to users table for indirect referrals
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS indirect_referrals_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_referrals_count INTEGER DEFAULT 0;

-- 2. Create VIP reward pool table
CREATE TABLE IF NOT EXISTS public.vip_reward_pool (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  total_supply NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  from_claim_fees NUMERIC DEFAULT 0,  -- Track fees from normal claims (5%)
  from_manual_funding NUMERIC DEFAULT 0, -- Track manual admin funding
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create VIP epoch data table (similar to epoch_data but for VIP)
CREATE TABLE IF NOT EXISTS public.vip_epoch_data (
  id SERIAL PRIMARY KEY,
  merkle_root TEXT NOT NULL,
  total_amount TEXT NOT NULL,
  recipients JSONB NOT NULL,
  proofs JSONB NOT NULL,
  blockchain_epoch_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create VIP reward claims tracking
CREATE TABLE IF NOT EXISTS public.vip_reward_claims (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_address TEXT REFERENCES public.users(wallet_address) NOT NULL,
  epoch_id INTEGER,
  amount NUMERIC NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  tx_hash TEXT
);

-- 5. Insert initial VIP reward pool row
INSERT INTO public.vip_reward_pool (total_supply, current_balance, from_claim_fees, from_manual_funding) 
VALUES (0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- 6. Enable RLS on new tables
ALTER TABLE public.vip_reward_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_epoch_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_reward_claims ENABLE ROW LEVEL SECURITY;

-- 7. Allow public read access
CREATE POLICY "Allow public read vip_reward_pool" ON public.vip_reward_pool FOR SELECT USING (true);
CREATE POLICY "Allow public read vip_epoch_data" ON public.vip_epoch_data FOR SELECT USING (true);
CREATE POLICY "Allow public read vip_reward_claims" ON public.vip_reward_claims FOR SELECT USING (true);

-- 8. Update existing users to have default values
UPDATE public.users SET indirect_referrals_count = 0 WHERE indirect_referrals_count IS NULL;
UPDATE public.users SET total_referrals_count = direct_referrals_count WHERE total_referrals_count IS NULL;

COMMENT ON COLUMN public.users.indirect_referrals_count IS 'Count of indirect referrals (2 levels deep max)';
COMMENT ON COLUMN public.users.total_referrals_count IS 'Total referrals (direct + indirect)';
COMMENT ON TABLE public.vip_reward_pool IS 'VIP reward pool tracking (for users with 100+ total referrals)';
COMMENT ON TABLE public.vip_epoch_data IS 'VIP reward distribution epochs with Merkle trees';
COMMENT ON TABLE public.vip_reward_claims IS 'Tracking of VIP reward claims by users';

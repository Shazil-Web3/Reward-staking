-- Fix for foreign key constraint issue
-- The reward_claims table references epochs(id), but epochs are stored in epoch_data table
-- Solution: Remove the foreign key constraint

-- Drop the existing constraint
ALTER TABLE public.reward_claims DROP CONSTRAINT IF EXISTS reward_claims_epoch_id_fkey;

-- Make epoch_id nullable and remove the foreign key
ALTER TABLE public.reward_claims ALTER COLUMN epoch_id DROP NOT NULL;

-- Do the same for VIP rewards
ALTER TABLE public.vip_reward_claims DROP CONSTRAINT IF EXISTS vip_reward_claims_epoch_id_fkey;
ALTER TABLE public.vip_reward_claims ALTER COLUMN epoch_id DROP NOT NULL;

-- Now claims can be inserted with any epoch_id value

-- Add epoch_data table to store Merkle trees and proofs
CREATE TABLE IF NOT EXISTS public.epoch_data (
  id SERIAL PRIMARY KEY,
  merkle_root TEXT NOT NULL,
  total_amount TEXT NOT NULL, -- stored as string to handle BigInt
  recipients JSONB NOT NULL,  -- array of {address, amount, stake, share}
  proofs JSONB NOT NULL,      -- map of address -> proof array
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.epoch_data ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read epoch_data" ON public.epoch_data FOR SELECT USING (true);

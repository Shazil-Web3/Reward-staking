-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table public.users (
  wallet_address text primary key,
  referral_code text unique not null,
  referrer_address text references public.users(wallet_address),
  total_staked numeric default 0,
  direct_referrals_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- STAKES TABLE
create table public.stakes (
  id uuid default uuid_generate_v4() primary key,
  user_address text references public.users(wallet_address) not null,
  lock_id numeric, -- ID from smart contract
  amount numeric not null,
  package_id integer not null, -- 0=Starter, 1=Pro, 2=Elite, 3=Custom
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text default 'active', -- active, withdrawn
  tx_hash text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- REWARD POOL TABLE
create table public.reward_pool (
  id integer primary key generated always as identity,
  total_supply numeric default 0,
  current_balance numeric default 0,
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EPOCHS TABLE (For history)
create table public.epochs (
  id integer primary key, -- epochId from contract
  merkle_root text not null,
  total_distributed numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- REWARD CLAIMS TABLE
create table public.reward_claims (
  id uuid default uuid_generate_v4() primary key,
  user_address text references public.users(wallet_address) not null,
  epoch_id integer references public.epochs(id),
  amount numeric not null,
  claimed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  tx_hash text
);

-- Insert initial reward pool row
insert into public.reward_pool (total_supply, current_balance) values (0, 0);

-- POLICIES (Row Level Security)
alter table public.users enable row level security;
alter table public.stakes enable row level security;
alter table public.reward_pool enable row level security;
alter table public.reward_claims enable row level security;

-- Allow public read access
create policy "Allow public read users" on public.users for select using (true);
create policy "Allow public read stakes" on public.stakes for select using (true);
create policy "Allow public read reward_pool" on public.reward_pool for select using (true);
create policy "Allow public read reward_claims" on public.reward_claims for select using (true);

-- Backend (Service Role) typically bypasses RLS

alter table public.profiles
  add column if not exists bio text,
  add column if not exists website text,
  add column if not exists cover_url text,
  add column if not exists updated_at timestamptz default now();

alter table public.badges
  add column if not exists nft_contract text,
  add column if not exists nft_token_id text,
  add column if not exists mint_tx_hash text;

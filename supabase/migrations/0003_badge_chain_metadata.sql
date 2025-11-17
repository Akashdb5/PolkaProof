alter table public.badges
  add column if not exists collection_id text,
  add column if not exists metadata_cid text,
  add column if not exists image_cid text,
  add column if not exists block_hash text;

comment on column public.badges.collection_id is 'Chain-specific collection identifier for the minted badge';
comment on column public.badges.metadata_cid is 'IPFS CID that stores badge metadata JSON';
comment on column public.badges.image_cid is 'IPFS CID for the rendered badge image or artwork';
comment on column public.badges.block_hash is 'Block hash returned when the badge mint transaction was finalized';

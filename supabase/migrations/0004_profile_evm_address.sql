alter table public.profiles
  add column if not exists evm_address text;

comment on column public.profiles.evm_address is 'Optional EVM/MetaMask address provided during attendance for EVM NFT drops.';

alter table public.stores
  add column if not exists public_access_token_expires_at timestamptz;

update public.stores
set public_access_token_expires_at = now() + interval '24 hours'
where public_access_token_expires_at is null;

alter table public.stores
  alter column public_access_token_expires_at set default now() + interval '24 hours',
  alter column public_access_token_expires_at set not null;

create index if not exists stores_public_access_token_expires_idx
  on public.stores(public_access_token_expires_at);

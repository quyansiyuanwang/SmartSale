alter table public.stores
  add column if not exists public_access_token text;

update public.stores
set public_access_token = encode(gen_random_bytes(24), 'hex')
where public_access_token is null;

alter table public.stores
  alter column public_access_token set default encode(gen_random_bytes(24), 'hex'),
  alter column public_access_token set not null;

create unique index if not exists stores_public_access_token_idx on public.stores(public_access_token);

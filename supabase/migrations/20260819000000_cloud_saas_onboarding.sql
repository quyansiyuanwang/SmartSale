alter table public.stores
  add column if not exists service_status text not null default 'active' check (service_status in ('active', 'suspended')),
  add column if not exists public_enabled boolean not null default true;

create index if not exists stores_public_slug_idx on public.stores(slug) where service_status = 'active' and public_enabled = true;

create or replace function public.is_public_store(target_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.stores
    where id = target_store_id and service_status = 'active' and public_enabled = true
  )
$$;

create or replace function public.slugify_store_name(input text)
returns text language sql immutable set search_path = public as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, 'store')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.reserve_store_slug(input_name text)
returns text language plpgsql security definer set search_path = public as $$
declare
  base_slug text := left(nullif(public.slugify_store_name(input_name), ''), 48);
  candidate text;
  attempt integer := 0;
begin
  if base_slug is null or char_length(base_slug) < 3 then
    base_slug := 'store';
  end if;
  loop
    candidate := case when attempt = 0 then base_slug else left(base_slug, 56) || '-' || substr(gen_random_uuid()::text, 1, 7) end;
    exit when not exists(select 1 from public.stores where slug = candidate);
    attempt := attempt + 1;
  end loop;
  return candidate;
end $$;

grant execute on function public.reserve_store_slug(text) to service_role;

create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.store_role as enum ('owner', 'manager', 'staff');
create type public.knowledge_status as enum ('processing', 'draft', 'published', 'failed', 'withdrawn');

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,64}$'),
  address text not null default '', phone text not null default '', hours text not null default '',
  welcome text not null default '', default_model_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.store_role not null default 'staff', created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
  name text not null, barcode text not null default '', category text not null default '',
  buy_price numeric(12,2) not null default 0 check (buy_price >= 0), price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0), safe_stock integer not null default 0 check (safe_stock >= 0),
  location text not null default '', description text not null default '', is_published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (store_id, barcode)
);
create table public.sales (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id), product_name text not null, quantity integer not null check(quantity > 0),
  unit_price numeric(12,2) not null, cost numeric(12,2) not null, total numeric(12,2) not null,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.promotions (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
  title text not null, detail text not null default '', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.customer_queries (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
  content text not null, answer text, source_document_ids uuid[] not null default '{}', provider text, model text,
  latency_ms integer, input_tokens integer, output_tokens integer, error text, created_at timestamptz not null default now()
);
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
  file_name text not null, storage_path text not null unique, mime_type text not null, size_bytes integer not null check(size_bytes <= 10485760),
  status public.knowledge_status not null default 'processing', error text, uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade, chunk_index integer not null,
  content text not null, embedding vector(1536), created_at timestamptz not null default now(), unique(document_id, chunk_index)
);
create table public.ai_model_configs (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null check(provider in ('deepseek', 'openai-compatible')), model text not null, enabled boolean not null default true,
  is_default boolean not null default false, base_url text, created_at timestamptz not null default now(),
  unique(store_id, provider, model)
);
alter table public.stores add constraint stores_default_model_fk foreign key(default_model_id) references public.ai_model_configs(id) on delete set null;
create table public.audit_events (id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id) on delete cascade, actor_id uuid references auth.users(id), action text not null, entity_type text, entity_id uuid, metadata jsonb not null default '{}', created_at timestamptz not null default now());
create table public.rate_limit_events (id uuid primary key default gen_random_uuid(), store_id uuid references public.stores(id) on delete cascade, key text not null, endpoint text not null, created_at timestamptz not null default now());
create index products_store_id_idx on public.products(store_id); create index sales_store_created_idx on public.sales(store_id, created_at desc); create index chunks_store_document_idx on public.knowledge_chunks(store_id, document_id); create index query_store_created_idx on public.customer_queries(store_id, created_at desc); create index rate_limit_key_created_idx on public.rate_limit_events(key, created_at);

create or replace function public.is_store_member(target_store_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.store_members where store_id = target_store_id and user_id = auth.uid()) $$;
create or replace function public.has_store_role(target_store_id uuid, roles public.store_role[]) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.store_members where store_id = target_store_id and user_id = auth.uid() and role = any(roles)) $$;
create or replace function public.is_public_store(target_store_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.stores where id = target_store_id) $$;
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger stores_updated before update on public.stores for each row execute function public.touch_updated_at(); create trigger products_updated before update on public.products for each row execute function public.touch_updated_at(); create trigger promotions_updated before update on public.promotions for each row execute function public.touch_updated_at(); create trigger documents_updated before update on public.knowledge_documents for each row execute function public.touch_updated_at();

create or replace function public.record_sale(target_product_id uuid, requested_quantity integer) returns public.sales language plpgsql security definer set search_path = public as $$ declare p public.products; inserted public.sales; begin
  select * into p from public.products where id = target_product_id for update;
  if not found or not public.has_store_role(p.store_id, array['owner','manager','staff']::public.store_role[]) then raise exception 'product not found or not permitted'; end if;
  if requested_quantity <= 0 or p.stock < requested_quantity then raise exception 'insufficient stock'; end if;
  update public.products set stock = stock - requested_quantity where id = p.id;
  insert into public.sales(store_id, product_id, product_name, quantity, unit_price, cost, total, created_by) values(p.store_id,p.id,p.name,requested_quantity,p.price,p.buy_price,p.price*requested_quantity,auth.uid()) returning * into inserted;
  insert into public.audit_events(store_id,actor_id,action,entity_type,entity_id,metadata) values(p.store_id,auth.uid(),'sale.recorded','sale',inserted.id,jsonb_build_object('quantity',requested_quantity)); return inserted;
end $$;

create or replace function public.match_knowledge_chunks(target_store_id uuid, query_embedding vector(1536), match_count integer default 6) returns table(id uuid, document_id uuid, content text, similarity float) language sql stable security definer set search_path = public as $$ select c.id,c.document_id,c.content,1-(c.embedding <=> query_embedding) from public.knowledge_chunks c join public.knowledge_documents d on d.id=c.document_id where c.store_id=target_store_id and d.status='published' and c.embedding is not null order by c.embedding <=> query_embedding limit least(greatest(match_count,1),12) $$;

alter table public.stores enable row level security; alter table public.store_members enable row level security; alter table public.products enable row level security; alter table public.sales enable row level security; alter table public.promotions enable row level security; alter table public.customer_queries enable row level security; alter table public.knowledge_documents enable row level security; alter table public.knowledge_chunks enable row level security; alter table public.ai_model_configs enable row level security; alter table public.audit_events enable row level security; alter table public.rate_limit_events enable row level security;
create policy "members read stores" on public.stores for select using (public.is_store_member(id)); create policy "owners update stores" on public.stores for update using(public.has_store_role(id,array['owner']::public.store_role[]));
create policy "members read members" on public.store_members for select using(public.is_store_member(store_id)); create policy "owners manage members" on public.store_members for all using(public.has_store_role(store_id,array['owner']::public.store_role[])) with check(public.has_store_role(store_id,array['owner']::public.store_role[]));
create policy "members read products" on public.products for select using(public.is_store_member(store_id)); create policy "operators manage products" on public.products for all using(public.has_store_role(store_id,array['owner','manager','staff']::public.store_role[])) with check(public.has_store_role(store_id,array['owner','manager','staff']::public.store_role[]));
create policy "members read sales" on public.sales for select using(public.is_store_member(store_id)); create policy "operators insert sales" on public.sales for insert with check(public.has_store_role(store_id,array['owner','manager','staff']::public.store_role[]));
create policy "members read promotions" on public.promotions for select using(public.is_store_member(store_id)); create policy "managers manage promotions" on public.promotions for all using(public.has_store_role(store_id,array['owner','manager']::public.store_role[])) with check(public.has_store_role(store_id,array['owner','manager']::public.store_role[]));
create policy "members read queries" on public.customer_queries for select using(public.is_store_member(store_id));
create policy "managers read documents" on public.knowledge_documents for select using(public.has_store_role(store_id,array['owner','manager']::public.store_role[])); create policy "managers manage documents" on public.knowledge_documents for all using(public.has_store_role(store_id,array['owner','manager']::public.store_role[])) with check(public.has_store_role(store_id,array['owner','manager']::public.store_role[]));
create policy "managers read chunks" on public.knowledge_chunks for select using(public.has_store_role(store_id,array['owner','manager']::public.store_role[])); create policy "managers manage chunks" on public.knowledge_chunks for all using(public.has_store_role(store_id,array['owner','manager']::public.store_role[])) with check(public.has_store_role(store_id,array['owner','manager']::public.store_role[]));
create policy "members read models" on public.ai_model_configs for select using(public.is_store_member(store_id)); create policy "owners manage models" on public.ai_model_configs for all using(public.has_store_role(store_id,array['owner']::public.store_role[])) with check(public.has_store_role(store_id,array['owner']::public.store_role[]));
create policy "owners read audit" on public.audit_events for select using(public.has_store_role(store_id,array['owner']::public.store_role[]));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('knowledge','knowledge',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown']) on conflict(id) do update set file_size_limit=excluded.file_size_limit;
create policy "managers upload knowledge" on storage.objects for insert to authenticated with check(bucket_id='knowledge' and public.has_store_role((storage.foldername(name))[1]::uuid,array['owner','manager']::public.store_role[]));
create policy "managers read knowledge" on storage.objects for select to authenticated using(bucket_id='knowledge' and public.has_store_role((storage.foldername(name))[1]::uuid,array['owner','manager']::public.store_role[]));
create policy "managers delete knowledge" on storage.objects for delete to authenticated using(bucket_id='knowledge' and public.has_store_role((storage.foldername(name))[1]::uuid,array['owner','manager']::public.store_role[]));
grant execute on function public.record_sale(uuid,integer) to authenticated; grant execute on function public.match_knowledge_chunks(uuid,vector,integer) to service_role;

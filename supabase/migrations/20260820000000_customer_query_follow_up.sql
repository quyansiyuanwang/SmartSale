alter table public.customer_queries
  add column if not exists status text not null default 'new' check (status in ('new', 'followed')),
  add column if not exists followed_at timestamptz;

create policy "managers follow queries"
on public.customer_queries
for update
using (public.has_store_role(store_id, array['owner', 'manager']::public.store_role[]))
with check (public.has_store_role(store_id, array['owner', 'manager']::public.store_role[]));

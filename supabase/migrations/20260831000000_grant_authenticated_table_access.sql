-- PostgREST requires table privileges in addition to RLS policies.
-- Row-level policies below the grants still enforce per-store access.
grant usage on schema public to authenticated;

grant select on table public.stores, public.store_members, public.products, public.sales,
  public.promotions, public.customer_queries, public.knowledge_documents,
  public.knowledge_chunks, public.ai_model_configs, public.audit_events
  to authenticated;

grant update on table public.stores to authenticated;
grant insert, update, delete on table public.products to authenticated;
grant insert on table public.sales to authenticated;
grant insert, update, delete on table public.promotions to authenticated;
grant update on table public.customer_queries to authenticated;
grant insert, update, delete on table public.knowledge_documents, public.knowledge_chunks to authenticated;
grant insert, update, delete on table public.ai_model_configs to authenticated;

grant execute on function public.is_store_member(uuid) to authenticated;
grant execute on function public.has_store_role(uuid, public.store_role[]) to authenticated;

-- Edge Functions use the service role for trusted cross-table operations.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant usage on schema public to service_role;

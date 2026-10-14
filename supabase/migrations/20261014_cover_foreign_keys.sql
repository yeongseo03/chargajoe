create index if not exists organization_members_user_idx on public.organization_members (user_id);
create index if not exists found_items_creator_idx on public.found_items (created_by);
create index if not exists claims_user_idx on public.claims (user_id, created_at desc);
create index if not exists item_reports_user_idx on public.item_reports (user_id);

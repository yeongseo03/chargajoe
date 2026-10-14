-- RLS helpers must be callable by the policy roles but unavailable as public RPCs.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.organization_members where org_id = target_org and user_id = (select auth.uid())); $$;

create or replace function private.is_platform_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.platform_staff where user_id = (select auth.uid())); $$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.is_platform_staff() from public;
grant execute on function private.is_org_member(uuid) to anon, authenticated;
grant execute on function private.is_platform_staff() to anon, authenticated;

alter policy "members read own membership" on public.organization_members
  using (user_id = (select auth.uid()) or private.is_platform_staff());
alter policy "read public or assigned found items" on public.found_items
  using ((visibility = 'public' and status = '보관 중') or private.is_org_member(org_id) or private.is_platform_staff());
alter policy "members create pending found items" on public.found_items
  with check (private.is_org_member(org_id) and created_by = (select auth.uid()) and visibility = 'pending');
alter policy "members or staff update found items" on public.found_items
  using (private.is_org_member(org_id) or private.is_platform_staff())
  with check (private.is_org_member(org_id) or private.is_platform_staff());
alter policy "owner or staff read case" on public.lost_cases
  using (user_id = (select auth.uid()) or private.is_platform_staff());
alter policy "staff updates case" on public.lost_cases
  using (private.is_platform_staff()) with check (private.is_platform_staff());
alter policy "owner or partner reads claim" on public.claims
  using (user_id = (select auth.uid()) or exists (select 1 from public.found_items f where f.id = item_id and private.is_org_member(f.org_id)) or private.is_platform_staff());
alter policy "partner updates claim" on public.claims
  using (exists (select 1 from public.found_items f where f.id = item_id and private.is_org_member(f.org_id)) or private.is_platform_staff())
  with check (exists (select 1 from public.found_items f where f.id = item_id and private.is_org_member(f.org_id)) or private.is_platform_staff());
alter policy "staff reads reports" on public.item_reports
  using (private.is_platform_staff());
alter policy "staff resolves reports" on public.item_reports
  using (private.is_platform_staff()) with check (private.is_platform_staff());

create or replace function public.guard_found_item_update()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  if new.org_id <> old.org_id or new.created_by is distinct from old.created_by then
    raise exception 'Ownership cannot change';
  end if;
  if new.visibility <> old.visibility and not private.is_platform_staff() then
    raise exception 'Only platform staff can publish or hide an item';
  end if;
  if old.visibility = 'public' and not private.is_platform_staff()
     and (to_jsonb(new) - 'status') <> (to_jsonb(old) - 'status') then
    raise exception 'Published item details require staff review';
  end if;
  return new;
end; $$;

drop function public.is_org_member(uuid);
drop function public.is_platform_staff();

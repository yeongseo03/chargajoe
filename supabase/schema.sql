-- Run once in a new Supabase project. No sample records are inserted.
create extension if not exists pgcrypto;
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  primary key (org_id, user_id)
);

create table if not exists public.platform_staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);

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

create table if not exists public.found_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null check (length(title) between 2 and 100),
  category text not null check (category in ('전자기기', '지갑·가방', '의류·소품', '기타')),
  description text not null default '' check (length(description) <= 1000),
  found_at timestamptz not null default now(),
  place text not null check (length(place) between 2 and 200),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null default '보관 중' check (status in ('보관 중', '인계 완료')),
  visibility text not null default 'pending' check (visibility in ('pending', 'public', 'hidden')),
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.lost_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_type text not null check (case_type in ('탐색', '회수·배송')),
  title text not null check (length(title) between 2 and 100),
  category text not null check (category in ('전자기기', '지갑·가방', '의류·소품', '기타')),
  last_seen_at text not null default '',
  last_seen_place text not null check (length(last_seen_place) between 2 and 200),
  holding_place text,
  desired_at text,
  description text not null default '' check (length(description) <= 2000),
  status text not null default '접수' check (status in ('접수', '확인 중', '안내 완료', '종료')),
  created_at timestamptz not null default now()
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.found_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (length(message) between 8 and 1000),
  status text not null default '접수' check (status in ('접수', '확인 중', '인계 승인', '반려')),
  created_at timestamptz not null default now(),
  unique (item_id, user_id)
);

create table if not exists public.item_reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.found_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (length(reason) between 4 and 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  unique (item_id, user_id)
);

create table if not exists public.identity_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  verified_at timestamptz
);

create or replace function private.has_verified_identity()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.identity_verification_attempts where user_id = (select auth.uid()) and status = 'verified'); $$;
revoke all on function private.has_verified_identity() from public;
grant execute on function private.has_verified_identity() to authenticated;

create index if not exists found_items_public_idx on public.found_items (visibility, status, found_at desc);
create index if not exists found_items_org_idx on public.found_items (org_id, created_at desc);
create index if not exists lost_cases_user_idx on public.lost_cases (user_id, created_at desc);
create index if not exists claims_item_idx on public.claims (item_id, created_at desc);
create index if not exists organization_members_user_idx on public.organization_members (user_id);
create index if not exists found_items_creator_idx on public.found_items (created_by);
create index if not exists claims_user_idx on public.claims (user_id, created_at desc);
create index if not exists item_reports_user_idx on public.item_reports (user_id);
create index if not exists identity_verification_attempts_user_idx on public.identity_verification_attempts (user_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.platform_staff enable row level security;
alter table public.found_items enable row level security;
alter table public.lost_cases enable row level security;
alter table public.claims enable row level security;
alter table public.item_reports enable row level security;
alter table public.identity_verification_attempts enable row level security;

create policy "organization names are public" on public.organizations for select to anon, authenticated using (true);
create policy "members read own membership" on public.organization_members for select to authenticated using (user_id = (select auth.uid()) or private.is_platform_staff());
create policy "staff read own role" on public.platform_staff for select to authenticated using (user_id = (select auth.uid()));

create policy "read public or assigned found items" on public.found_items for select to anon, authenticated
  using ((visibility = 'public' and status = '보관 중') or private.is_org_member(org_id) or private.is_platform_staff());
create policy "members create pending found items" on public.found_items for insert to authenticated
  with check (private.is_org_member(org_id) and created_by = (select auth.uid()) and visibility = 'pending');
create policy "members or staff update found items" on public.found_items for update to authenticated
  using (private.is_org_member(org_id) or private.is_platform_staff())
  with check (private.is_org_member(org_id) or private.is_platform_staff());

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
drop trigger if exists found_item_update_guard on public.found_items;
create trigger found_item_update_guard before update on public.found_items
  for each row execute function public.guard_found_item_update();
revoke all on function public.guard_found_item_update() from public, anon, authenticated;

create policy "owner or staff read case" on public.lost_cases for select to authenticated using (user_id = (select auth.uid()) or private.is_platform_staff());
create policy "owner creates case" on public.lost_cases for insert to authenticated with check (user_id = (select auth.uid()) and status = '접수');
create policy "staff updates case" on public.lost_cases for update to authenticated using (private.is_platform_staff()) with check (private.is_platform_staff());

create policy "owner or partner reads claim" on public.claims for select to authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.found_items f where f.id = item_id and private.is_org_member(f.org_id)) or private.is_platform_staff());
create policy "owner creates claim" on public.claims for insert to authenticated
  with check (user_id = (select auth.uid()) and private.has_verified_identity() and exists (select 1 from public.found_items f where f.id = item_id and f.visibility = 'public' and f.status = '보관 중'));
create policy "partner updates claim" on public.claims for update to authenticated
  using (exists (select 1 from public.found_items f where f.id = item_id and private.is_org_member(f.org_id)) or private.is_platform_staff())
  with check (exists (select 1 from public.found_items f where f.id = item_id and private.is_org_member(f.org_id)) or private.is_platform_staff());

create policy "owner creates item report" on public.item_reports for insert to authenticated with check (user_id = (select auth.uid()));
create policy "staff reads reports" on public.item_reports for select to authenticated using (private.is_platform_staff());
create policy "staff resolves reports" on public.item_reports for update to authenticated using (private.is_platform_staff()) with check (private.is_platform_staff());
create policy "read own identity verification" on public.identity_verification_attempts for select to authenticated using (user_id = (select auth.uid()));


create or replace function public.guard_status_only()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  if (to_jsonb(new) - 'status') <> (to_jsonb(old) - 'status') then
    raise exception 'Only status may be changed';
  end if;
  return new;
end; $$;
drop trigger if exists claim_status_only on public.claims;
create trigger claim_status_only before update on public.claims for each row execute function public.guard_status_only();
drop trigger if exists case_status_only on public.lost_cases;
create trigger case_status_only before update on public.lost_cases for each row execute function public.guard_status_only();
drop trigger if exists report_status_only on public.item_reports;
create trigger report_status_only before update on public.item_reports for each row execute function public.guard_status_only();
revoke all on function public.guard_status_only() from public, anon, authenticated;

-- Restrict administrative tables: insert partners and staff only from the SQL editor/service role.
grant usage on schema public to anon, authenticated;
grant select on public.organizations to anon, authenticated;
grant select on public.organization_members, public.platform_staff to authenticated;
grant select on public.found_items to anon, authenticated;
grant insert, update on public.found_items to authenticated;
grant select, insert on public.lost_cases to authenticated;
grant update on public.lost_cases to authenticated;
grant select, insert, update on public.claims to authenticated;
grant select, insert, update on public.item_reports to authenticated;
revoke all on public.identity_verification_attempts from public, anon, authenticated;
grant select on public.identity_verification_attempts to authenticated;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = ''
as $$ begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  delete from auth.users where id = (select auth.uid());
end; $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

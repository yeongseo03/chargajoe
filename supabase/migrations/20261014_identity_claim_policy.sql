create or replace function private.has_verified_identity()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.identity_verification_attempts
  where user_id = (select auth.uid()) and status = 'verified'
); $$;
revoke all on function private.has_verified_identity() from public;
grant execute on function private.has_verified_identity() to authenticated;

alter policy "owner creates claim" on public.claims
  with check (user_id = (select auth.uid()) and private.has_verified_identity()
    and exists (select 1 from public.found_items f where f.id = item_id
      and f.visibility = 'public' and f.status = '보관 중'));

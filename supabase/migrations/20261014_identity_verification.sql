-- PASS/통신사 본인확인 시도. 인증 결과는 서버가 PortOne에서 재조회한 뒤에만 기록한다.
-- 이름, 전화번호, CI 등 민감한 원문은 저장하지 않는다.
create table if not exists public.identity_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  verified_at timestamptz
);

create index if not exists identity_verification_attempts_user_idx
  on public.identity_verification_attempts (user_id, created_at desc);

alter table public.identity_verification_attempts enable row level security;
revoke all on public.identity_verification_attempts from public, anon, authenticated;
grant select on public.identity_verification_attempts to authenticated;
create policy "read own identity verification"
  on public.identity_verification_attempts for select to authenticated
  using (user_id = (select auth.uid()));


-- SAI v1 stores the platform snapshot in one row per Supabase Auth user.
-- Clients can access only the row whose user_id matches auth.uid(); the JSON
-- document remains private even though the Supabase publishable key is public.
create table if not exists public.sai_platform_state (
    user_id uuid primary key references auth.users (id) on delete cascade,
    state jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint sai_platform_state_state_is_object check (jsonb_typeof(state) = 'object')
);

comment on table public.sai_platform_state is
    'SAI platform state, isolated to the owning Supabase Auth user by row-level security.';

alter table public.sai_platform_state enable row level security;

revoke all on table public.sai_platform_state from public, anon, authenticated;
grant select, insert, update on table public.sai_platform_state to authenticated;

drop policy if exists "sai_platform_state_select_own" on public.sai_platform_state;
create policy "sai_platform_state_select_own"
    on public.sai_platform_state
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "sai_platform_state_insert_own" on public.sai_platform_state;
create policy "sai_platform_state_insert_own"
    on public.sai_platform_state
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "sai_platform_state_update_own" on public.sai_platform_state;
create policy "sai_platform_state_update_own"
    on public.sai_platform_state
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

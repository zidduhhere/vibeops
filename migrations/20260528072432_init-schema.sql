-- Helper: extract Auth0 sub from JWT
create or replace function public.requesting_user_id()
returns text
language sql stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::text
$$;

-- User profiles
create table public.user_profiles (
  id           text primary key,
  email        text not null,
  name         text,
  picture      text,
  created_at   timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "users can manage their own profile"
  on public.user_profiles
  for all
  using (id = requesting_user_id())
  with check (id = requesting_user_id());

-- Onboarding
create table public.onboarding (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null references public.user_profiles(id) on delete cascade,
  selected_problems  text[] not null default '{}',
  voice_transcript   text not null default '',
  practice_reply     text not null default '',
  completed_at       timestamptz,
  created_at         timestamptz not null default now()
);

alter table public.onboarding enable row level security;

create policy "users can manage their own onboarding"
  on public.onboarding
  for all
  using (user_id = requesting_user_id())
  with check (user_id = requesting_user_id());

-- Channel connections (OAuth tokens for Gmail, X, etc.)
create table public.channel_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null references public.user_profiles(id) on delete cascade,
  channel          text not null,
  access_token     text not null,
  refresh_token    text,
  token_expires_at timestamptz,
  account_label    text,
  connected_at     timestamptz not null default now(),
  unique (user_id, channel)
);

alter table public.channel_connections enable row level security;

create policy "users can manage their own channel connections"
  on public.channel_connections
  for all
  using (user_id = requesting_user_id())
  with check (user_id = requesting_user_id());

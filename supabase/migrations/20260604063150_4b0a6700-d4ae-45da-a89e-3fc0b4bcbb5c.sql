
-- enum for roles
create type public.app_role as enum ('admin', 'viewer');

-- profiles table mapped 1:1 to auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles self read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = id);

-- separate user_roles table to avoid privilege escalation
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles self read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- audit log
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  username text,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_user_id_idx on public.audit_log (user_id);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit_log admins read all" on public.audit_log for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "audit_log users read own" on public.audit_log for select to authenticated using (user_id = auth.uid());

-- cached campaigns mirrored from Dograh
create table public.cached_campaigns (
  dograh_id bigint primary key,
  name text not null,
  status text not null,
  workflow_id bigint,
  total_contacts int not null default 0,
  completed_contacts int not null default 0,
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index cached_campaigns_fetched_at_idx on public.cached_campaigns (fetched_at desc);
grant select on public.cached_campaigns to authenticated;
grant all on public.cached_campaigns to service_role;
alter table public.cached_campaigns enable row level security;
create policy "cached_campaigns auth read" on public.cached_campaigns for select to authenticated using (true);

-- cached calls/runs mirrored from Dograh
create table public.cached_calls (
  dograh_id bigint primary key,
  campaign_id bigint,
  workflow_id bigint,
  workflow_name text,
  called_number text,
  disposition text,
  is_completed boolean not null default false,
  call_duration_seconds int,
  charge_usd numeric(10,4),
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index cached_calls_campaign_idx on public.cached_calls (campaign_id);
create index cached_calls_created_at_idx on public.cached_calls (created_at desc);
grant select on public.cached_calls to authenticated;
grant all on public.cached_calls to service_role;
alter table public.cached_calls enable row level security;
create policy "cached_calls auth read" on public.cached_calls for select to authenticated using (true);

-- shared updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'admin')
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

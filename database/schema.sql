create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.user_role as enum ('user', 'admin');
create type public.plant_status as enum ('active', 'graveyard');
create type public.care_log_type as enum ('water', 'mist', 'feed', 'prune', 'pest', 'note');
create type public.reminder_type as enum ('water', 'mist', 'feed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  reminders_enabled boolean not null default true,
  preferred_theme text not null default 'linen-light',
  timezone text not null default 'UTC',
  default_watering_hour smallint not null default 9,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id)
);

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  species_name text not null,
  nickname text,
  status public.plant_status not null default 'active',
  location text,
  watering_interval_days smallint not null default 7,
  last_watered_at timestamptz,
  next_water_due_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  width integer,
  height integer,
  taken_at timestamptz,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id)
);

create table if not exists public.care_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  log_type public.care_log_type not null,
  notes text,
  logged_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id)
);

create table if not exists public.care_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  reminder_type public.reminder_type not null,
  frequency_days smallint not null,
  enabled boolean not null default true,
  next_due_at timestamptz,
  last_triggered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id)
);

create table if not exists public.graveyard_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plant_id uuid not null unique references public.plants(id) on delete cascade,
  cause_of_passing text,
  memorial_note text,
  archived_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id)
);

create index if not exists idx_plants_user_id_created_at on public.plants (user_id, created_at desc);
create index if not exists idx_plants_user_id_status on public.plants (user_id, status);
create index if not exists idx_care_logs_plant_id_logged_at on public.care_logs (plant_id, logged_at desc);
create index if not exists idx_care_reminders_user_id_next_due_at on public.care_reminders (user_id, next_due_at asc);
create index if not exists idx_photos_plant_id_created_at on public.photos (plant_id, created_at desc);

create trigger set_users_updated_at before update on public.users for each row execute procedure public.set_updated_at();
create trigger set_user_preferences_updated_at before update on public.user_preferences for each row execute procedure public.set_updated_at();
create trigger set_plants_updated_at before update on public.plants for each row execute procedure public.set_updated_at();
create trigger set_photos_updated_at before update on public.photos for each row execute procedure public.set_updated_at();
create trigger set_care_logs_updated_at before update on public.care_logs for each row execute procedure public.set_updated_at();
create trigger set_care_reminders_updated_at before update on public.care_reminders for each row execute procedure public.set_updated_at();
create trigger set_graveyard_updated_at before update on public.graveyard_plants for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.plants enable row level security;
alter table public.photos enable row level security;
alter table public.care_logs enable row level security;
alter table public.care_reminders enable row level security;
alter table public.graveyard_plants enable row level security;

create policy "users select own or admin" on public.users for select using (auth.uid() = id or public.is_admin());
create policy "users insert own or admin" on public.users for insert with check (auth.uid() = id or public.is_admin());
create policy "users update own or admin" on public.users for update using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());
create policy "user_preferences own or admin" on public.user_preferences for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
create policy "plants own or admin" on public.plants for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
create policy "photos own or admin" on public.photos for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
create policy "care_logs own or admin" on public.care_logs for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
create policy "care_reminders own or admin" on public.care_reminders for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
create policy "graveyard own or admin" on public.graveyard_plants for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "photo objects own folder read"
on storage.objects for select
using (bucket_id = 'photos' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()));

create policy "photo objects own folder write"
on storage.objects for insert
with check (bucket_id = 'photos' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()));

create policy "photo objects own folder update"
on storage.objects for update
using (bucket_id = 'photos' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()))
with check (bucket_id = 'photos' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()));

create policy "photo objects own folder delete"
on storage.objects for delete
using (bucket_id = 'photos' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()));
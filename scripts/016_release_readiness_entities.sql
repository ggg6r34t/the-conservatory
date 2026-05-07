do $$
begin
  if not exists (select 1 from pg_type where typname = 'plant_health_status') then
    create type public.plant_health_status as enum ('thriving', 'stable', 'needs_water');
  end if;
end $$;

create table if not exists public.care_log_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  care_log_id uuid not null references public.care_logs(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id),
  unique (care_log_id, tag)
);

create table if not exists public.plant_status_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  status public.plant_health_status not null,
  reason text,
  captured_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id)
);

create table if not exists public.specimen_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  code text not null,
  payload text not null,
  qr_matrix text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id),
  unique (plant_id, user_id)
);

create table if not exists public.archive_curation_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  before_photo_id uuid not null references public.photos(id) on delete cascade,
  after_photo_id uuid not null references public.photos(id) on delete cascade,
  caption text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id),
  unique (user_id, plant_id, before_photo_id, after_photo_id)
);

create unique index if not exists idx_care_reminders_unique_plant_user_type
  on public.care_reminders (plant_id, user_id, reminder_type);
drop index if exists public.idx_care_reminders_unique_plant_user;

create index if not exists idx_care_log_tags_user_id on public.care_log_tags (user_id);
create index if not exists idx_plant_status_snapshots_plant_id
  on public.plant_status_snapshots (plant_id, captured_at desc);

alter table public.care_log_tags enable row level security;
alter table public.plant_status_snapshots enable row level security;
alter table public.specimen_tags enable row level security;
alter table public.archive_curation_overrides enable row level security;

drop policy if exists "care_log_tags own or admin" on public.care_log_tags;
create policy "care_log_tags own or admin" on public.care_log_tags
for all using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "plant_status_snapshots own or admin" on public.plant_status_snapshots;
create policy "plant_status_snapshots own or admin" on public.plant_status_snapshots
for all using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "specimen_tags own or admin" on public.specimen_tags;
create policy "specimen_tags own or admin" on public.specimen_tags
for all using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "archive_curation_overrides own or admin" on public.archive_curation_overrides;
create policy "archive_curation_overrides own or admin" on public.archive_curation_overrides
for all using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

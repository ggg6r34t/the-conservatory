-- Local-first client identifiers: app-owned ids live in client_id; id stays uuid.

alter table public.plants
  add column if not exists client_id text;

alter table public.photos
  add column if not exists client_id text;

alter table public.care_logs
  add column if not exists client_id text;

alter table public.care_log_tags
  add column if not exists client_id text;

alter table public.care_reminders
  add column if not exists client_id text;

alter table public.plant_status_snapshots
  add column if not exists client_id text;

alter table public.specimen_tags
  add column if not exists client_id text;

alter table public.archive_curation_overrides
  add column if not exists client_id text;

alter table public.graveyard_plants
  add column if not exists client_id text;

alter table public.feature_usage
  add column if not exists client_id text;

-- Non-partial indexes: PostgREST/Supabase onConflict cannot target partial unique indexes
-- (see supabase/postgrest-js#403). Legacy rows may keep client_id NULL; Postgres allows
-- multiple (user_id, NULL) under a composite unique index.
create unique index if not exists idx_plants_user_client_id
  on public.plants (user_id, client_id);

create unique index if not exists idx_photos_user_client_id
  on public.photos (user_id, client_id);

create unique index if not exists idx_care_logs_user_client_id
  on public.care_logs (user_id, client_id);

create unique index if not exists idx_care_log_tags_user_client_id
  on public.care_log_tags (user_id, client_id);

create unique index if not exists idx_care_reminders_user_client_id
  on public.care_reminders (user_id, client_id);

create unique index if not exists idx_plant_status_snapshots_user_client_id
  on public.plant_status_snapshots (user_id, client_id);

create unique index if not exists idx_specimen_tags_user_client_id
  on public.specimen_tags (user_id, client_id);

create unique index if not exists idx_archive_curation_overrides_user_client_id
  on public.archive_curation_overrides (user_id, client_id);

create unique index if not exists idx_graveyard_plants_user_client_id
  on public.graveyard_plants (user_id, client_id);

create unique index if not exists idx_feature_usage_user_client_id
  on public.feature_usage (user_id, client_id);

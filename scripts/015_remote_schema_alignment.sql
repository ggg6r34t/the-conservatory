alter type public.care_log_type add value if not exists 'repot';
alter type public.care_log_type add value if not exists 'inspect';

alter table public.user_preferences
  add column if not exists auto_sync_enabled boolean not null default true;

alter table public.photos
  add column if not exists remote_url text;

alter table public.photos
  add column if not exists photo_role text not null default 'progress';

alter table public.photos
  add column if not exists captured_at timestamptz;

alter table public.photos
  add column if not exists caption text;

alter table public.care_logs
  add column if not exists tags text;

update public.photos
set photo_role = case when is_primary is true then 'primary' else 'progress' end
where photo_role is null or trim(photo_role) = '';

update public.photos
set captured_at = coalesce(captured_at, taken_at, created_at)
where captured_at is null;

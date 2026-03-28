alter table photos
  add column if not exists remote_url text;

alter table photos
  add column if not exists photo_role text not null default 'progress';

alter table photos
  add column if not exists captured_at text;

alter table photos
  add column if not exists caption text;

update photos
set photo_role = case when is_primary is true then 'primary' else 'progress' end
where photo_role is null or trim(photo_role) = '';

update photos
set captured_at = coalesce(captured_at, taken_at::text, created_at::text)
where captured_at is null;

alter table user_preferences
  add column if not exists auto_sync_enabled boolean not null default true;

update user_preferences
set auto_sync_enabled = true
where auto_sync_enabled is null;

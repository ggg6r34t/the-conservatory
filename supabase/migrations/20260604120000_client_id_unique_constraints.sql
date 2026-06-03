-- Table-level UNIQUE constraints for (user_id, client_id).
-- PostgREST onConflict requires a matching constraint; unique indexes alone are not always inferred.
-- Skips tables that already have the constraint. If 20260603160000 created duplicate unique
-- indexes, drop idx_*_user_client_id before running when Postgres reports a duplicate index.

do $$
declare
  tables text[] := array[
    'plants',
    'photos',
    'care_logs',
    'care_log_tags',
    'care_reminders',
    'plant_status_snapshots',
    'specimen_tags',
    'archive_curation_overrides',
    'graveyard_plants',
    'feature_usage'
  ];
  t text;
  con_name text;
begin
  foreach t in array tables loop
    con_name := t || '_user_id_client_id_key';

    if exists (
      select 1
      from pg_constraint c
      join pg_class rel on rel.oid = c.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where nsp.nspname = 'public'
        and rel.relname = t
        and c.conname = con_name
    ) then
      continue;
    end if;

    execute format(
      'alter table public.%I add constraint %I unique (user_id, client_id)',
      t,
      con_name
    );
  end loop;
end $$;
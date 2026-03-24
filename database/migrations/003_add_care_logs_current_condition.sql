begin;

alter table public.care_logs
add column if not exists current_condition text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'care_logs_current_condition_check'
      and conrelid = 'public.care_logs'::regclass
  ) then
    alter table public.care_logs
      add constraint care_logs_current_condition_check
      check (
        current_condition is null
        or current_condition in ('Healthy', 'Needs Attention', 'Declining')
      );
  end if;
end $$;

commit;

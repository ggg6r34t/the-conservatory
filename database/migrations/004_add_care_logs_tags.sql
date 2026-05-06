begin;

alter table public.care_logs
add column if not exists tags text;

commit;

alter table users
add column if not exists onboarding_completed_at timestamptz;

create index if not exists idx_users_onboarding_completed_at
on users (onboarding_completed_at);

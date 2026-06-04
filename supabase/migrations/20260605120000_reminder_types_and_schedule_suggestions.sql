-- Extend reminder types for repot / prune / inspect care rhythms.
ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'repot';
ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'prune';
ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'inspect';

CREATE TABLE IF NOT EXISTS public.care_schedule_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  care_type text NOT NULL,
  frequency_days smallint NOT NULL,
  next_due_at timestamptz NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  reason text,
  confidence text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (plant_id, user_id, care_type)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_care_schedule_suggestions_client_id
  ON public.care_schedule_suggestions (client_id)
  WHERE client_id IS NOT NULL;

CREATE TRIGGER set_care_schedule_suggestions_updated_at
  BEFORE UPDATE ON public.care_schedule_suggestions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.care_schedule_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "care_schedule_suggestions own or admin" ON public.care_schedule_suggestions;
CREATE POLICY "care_schedule_suggestions own or admin"
  ON public.care_schedule_suggestions
  FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'care_schedule_suggestions'
      AND c.conname = 'care_schedule_suggestions_user_id_client_id_key'
  ) THEN
    ALTER TABLE public.care_schedule_suggestions
      ADD CONSTRAINT care_schedule_suggestions_user_id_client_id_key
      UNIQUE (user_id, client_id);
  END IF;
END $$;

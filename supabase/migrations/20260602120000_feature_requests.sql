-- Feature Request & Product Feedback System

CREATE TYPE public.feature_request_status AS ENUM (
  'submitted',
  'under_review',
  'planned',
  'in_progress',
  'released',
  'declined'
);

CREATE TYPE public.roadmap_item_status AS ENUM (
  'planned',
  'in_progress',
  'released'
);

CREATE TABLE IF NOT EXISTS public.feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 120),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 4000),
  category text NOT NULL,
  status public.feature_request_status NOT NULL DEFAULT 'submitted',
  plant_id text,
  contact_preference text NOT NULL DEFAULT 'in_app' CHECK (contact_preference IN ('in_app', 'email', 'none')),
  screenshot_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  vote_count integer NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  archived boolean NOT NULL DEFAULT false,
  merged_into_id uuid REFERENCES public.feature_requests(id) ON DELETE SET NULL,
  release_version text,
  release_notes text,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_request_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.feature_request_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  update_text text NOT NULL CHECK (char_length(trim(update_text)) BETWEEN 1 AND 2000),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 120),
  description text,
  status public.roadmap_item_status NOT NULL DEFAULT 'planned',
  release_version text,
  release_notes text,
  linked_request_ids uuid[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_request_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.feature_requests(id) ON DELETE SET NULL,
  roadmap_item_id uuid REFERENCES public.roadmap_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_request_feedback_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.beta_program_consents (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  opted_in boolean NOT NULL DEFAULT false,
  early_access boolean NOT NULL DEFAULT false,
  beta_releases boolean NOT NULL DEFAULT false,
  feedback_program boolean NOT NULL DEFAULT false,
  consented_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status_created
  ON public.feature_requests(status, created_at DESC)
  WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_feature_requests_user
  ON public.feature_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_requests_vote_count
  ON public.feature_requests(vote_count DESC, created_at DESC)
  WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_feature_requests_search
  ON public.feature_requests USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_feature_request_votes_request
  ON public.feature_request_votes(request_id);

CREATE INDEX IF NOT EXISTS idx_feature_request_updates_request
  ON public.feature_request_updates(request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_status
  ON public.roadmap_items(status, sort_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_request_notifications_user
  ON public.feature_request_notifications(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_feature_request_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_feature_request_updated_at();

CREATE TRIGGER trg_roadmap_items_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_feature_request_updated_at();

CREATE OR REPLACE FUNCTION public.sync_feature_request_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_requests
    SET vote_count = vote_count + 1, updated_at = now()
    WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_requests
    SET vote_count = GREATEST(vote_count - 1, 0), updated_at = now()
    WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_feature_request_votes_count
  AFTER INSERT OR DELETE ON public.feature_request_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_feature_request_vote_count();

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_feedback_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_program_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY feature_requests_select_public
  ON public.feature_requests FOR SELECT
  TO authenticated
  USING (archived = false OR user_id = auth.uid());

CREATE POLICY feature_requests_insert_own
  ON public.feature_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY feature_requests_update_own_draft
  ON public.feature_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'submitted')
  WITH CHECK (user_id = auth.uid() AND status = 'submitted');

CREATE POLICY feature_request_votes_select
  ON public.feature_request_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY feature_request_votes_insert_own
  ON public.feature_request_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY feature_request_votes_delete_own
  ON public.feature_request_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY feature_request_updates_select
  ON public.feature_request_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY roadmap_items_select
  ON public.roadmap_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY feature_request_notifications_select_own
  ON public.feature_request_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY feature_request_notifications_update_own
  ON public.feature_request_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY feature_request_feedback_scores_select
  ON public.feature_request_feedback_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY feature_request_feedback_scores_upsert_own
  ON public.feature_request_feedback_scores FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY feature_request_feedback_scores_update_own
  ON public.feature_request_feedback_scores FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY beta_program_consents_select_own
  ON public.beta_program_consents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY beta_program_consents_upsert_own
  ON public.beta_program_consents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY beta_program_consents_update_own
  ON public.beta_program_consents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

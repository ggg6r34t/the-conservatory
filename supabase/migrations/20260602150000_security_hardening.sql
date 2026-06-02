-- Security hardening: quota tables, AI telemetry lockdown, function grants, user delete policy.

CREATE TABLE IF NOT EXISTS public.feature_usage (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  period text NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_usage_unique
  ON public.feature_usage(user_id, feature, period);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user_period
  ON public.feature_usage(user_id, period);

ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_usage_select_own ON public.feature_usage;
CREATE POLICY feature_usage_select_own
  ON public.feature_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS feature_usage_insert_own ON public.feature_usage;
CREATE POLICY feature_usage_insert_own
  ON public.feature_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS feature_usage_update_own ON public.feature_usage;
CREATE POLICY feature_usage_update_own
  ON public.feature_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS feature_usage_delete_own ON public.feature_usage;
CREATE POLICY feature_usage_delete_own
  ON public.feature_usage FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

ALTER TABLE public.edge_ai_usage ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.edge_ai_request_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS edge_ai_request_log_select_own ON public.edge_ai_request_log;
CREATE POLICY edge_ai_request_log_select_own
  ON public.edge_ai_request_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.edge_ai_usage FROM anon, authenticated;
REVOKE ALL ON TABLE public.edge_ai_request_log FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.edge_ai_request_log FROM authenticated;

GRANT SELECT ON TABLE public.edge_ai_request_log TO authenticated;

DROP POLICY IF EXISTS "users delete own or admin" ON public.users;
CREATE POLICY "users delete own or admin"
  ON public.users FOR DELETE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

REVOKE ALL ON FUNCTION public.consume_ai_usage(uuid, text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_ai_usage(uuid, text, text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_usage(uuid, text, text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.record_edge_ai_request(
  uuid, text, text, text, integer, integer, numeric, integer, boolean, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_edge_ai_request(
  uuid, text, text, text, integer, integer, numeric, integer, boolean, text
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_edge_ai_request(
  uuid, text, text, text, integer, integer, numeric, integer, boolean, text
) TO service_role;

REVOKE ALL ON FUNCTION public.sync_feature_request_vote_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_feature_request_vote_count() TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

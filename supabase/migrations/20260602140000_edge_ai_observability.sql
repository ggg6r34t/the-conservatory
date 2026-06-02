CREATE TABLE IF NOT EXISTS public.edge_ai_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_ai_request_log_user_created
  ON public.edge_ai_request_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_ai_request_log_feature_created
  ON public.edge_ai_request_log(feature, created_at DESC);

ALTER TABLE public.edge_ai_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY edge_ai_request_log_select_own
  ON public.edge_ai_request_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_edge_ai_request(
  p_user_id uuid,
  p_feature text,
  p_provider text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_estimated_cost_usd numeric,
  p_latency_ms integer,
  p_success boolean,
  p_error_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.edge_ai_request_log (
    user_id,
    feature,
    provider,
    model,
    input_tokens,
    output_tokens,
    estimated_cost_usd,
    latency_ms,
    success,
    error_code
  )
  VALUES (
    p_user_id,
    p_feature,
    p_provider,
    p_model,
    GREATEST(COALESCE(p_input_tokens, 0), 0),
    GREATEST(COALESCE(p_output_tokens, 0), 0),
    GREATEST(COALESCE(p_estimated_cost_usd, 0), 0),
    GREATEST(COALESCE(p_latency_ms, 0), 0),
    COALESCE(p_success, false),
    p_error_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_edge_ai_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_edge_ai_request TO service_role;

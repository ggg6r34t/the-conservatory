CREATE TABLE IF NOT EXISTS public.edge_ai_usage (
  user_id uuid NOT NULL,
  feature text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  period_day date NOT NULL,
  period_month text NOT NULL,
  daily_count integer NOT NULL DEFAULT 0,
  monthly_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature, entity_id, period_day)
);

CREATE INDEX IF NOT EXISTS idx_edge_ai_usage_user_month
  ON public.edge_ai_usage(user_id, feature, period_month);

CREATE OR REPLACE FUNCTION public.consume_ai_usage(
  p_user_id uuid,
  p_feature text,
  p_entity_id text,
  p_daily_limit integer,
  p_monthly_limit integer
)
RETURNS TABLE(allowed boolean, scope text, used integer, "limit" integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_id text := COALESCE(p_entity_id, '');
  v_day date := CURRENT_DATE;
  v_month text := to_char(CURRENT_DATE, 'YYYY-MM');
  v_daily_count integer;
  v_monthly_count integer;
BEGIN
  INSERT INTO public.edge_ai_usage (
    user_id,
    feature,
    entity_id,
    period_day,
    period_month,
    daily_count,
    monthly_count,
    updated_at
  )
  VALUES (
    p_user_id,
    p_feature,
    v_entity_id,
    v_day,
    v_month,
    0,
    0,
    now()
  )
  ON CONFLICT (user_id, feature, entity_id, period_day)
  DO UPDATE SET
    daily_count = GREATEST(public.edge_ai_usage.daily_count, 0),
    monthly_count = GREATEST(public.edge_ai_usage.monthly_count, 0),
    updated_at = now();

  SELECT
    public.edge_ai_usage.daily_count,
    COALESCE(SUM(month_usage.monthly_count), 0)
  INTO v_daily_count, v_monthly_count
  FROM public.edge_ai_usage
  LEFT JOIN public.edge_ai_usage AS month_usage
    ON month_usage.user_id = p_user_id
   AND month_usage.feature = p_feature
   AND month_usage.entity_id = v_entity_id
   AND month_usage.period_month = v_month
  WHERE public.edge_ai_usage.user_id = p_user_id
    AND public.edge_ai_usage.feature = p_feature
    AND public.edge_ai_usage.entity_id = v_entity_id
    AND public.edge_ai_usage.period_day = v_day
  GROUP BY public.edge_ai_usage.daily_count;

  IF v_daily_count >= p_daily_limit THEN
    RETURN QUERY SELECT false, 'daily', v_daily_count, p_daily_limit;
    RETURN;
  END IF;

  IF v_monthly_count >= p_monthly_limit THEN
    RETURN QUERY SELECT false, 'monthly', v_monthly_count, p_monthly_limit;
    RETURN;
  END IF;

  UPDATE public.edge_ai_usage
  SET
    daily_count = daily_count + 1,
    monthly_count = monthly_count + 1,
    updated_at = now()
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND entity_id = v_entity_id
    AND period_day = v_day
  RETURNING daily_count INTO v_daily_count;

  RETURN QUERY SELECT true, 'ok', v_daily_count, p_daily_limit;
END;
$$;

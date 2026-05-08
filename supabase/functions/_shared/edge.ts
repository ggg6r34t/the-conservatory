// @ts-ignore - Deno runtime import, not resolved by app tsc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { jsonResponse } from "./json.ts";

// @ts-ignore - Deno global available at runtime
const _Deno = Deno as typeof Deno & {
  env: { get(key: string): string | undefined };
};

export type EdgeFunctionErrorCode =
  | "auth_required"
  | "validation_error"
  | "premium_required"
  | "quota_exceeded"
  | "rate_limit_exceeded"
  | "payload_too_large"
  | "server_error";

export class EdgeFunctionError extends Error {
  code: EdgeFunctionErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: EdgeFunctionErrorCode,
    status: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "EdgeFunctionError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type EdgeContext = {
  requestId: string;
  functionName: string;
  userId: string;
  startedAt: number;
  supabaseAdmin: ReturnType<typeof createClient>;
};

function getEnv(name: string, fallback?: string) {
  return _Deno.env.get(name) ?? fallback;
}

function getRequiredEnv(name: string) {
  const value = getEnv(name);
  if (!value) {
    throw new EdgeFunctionError(
      "server_error",
      500,
      `Missing required environment variable: ${name}`,
    );
  }
  return value;
}

function extractBearerToken(request: Request) {
  return request.headers
    .get("Authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim();
}

function hashForLog(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

export function redactForLog(input: Record<string, unknown> = {}) {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (/note|photo|uri|url|prompt|body|name/i.test(key)) {
      redacted[key] = "[redacted]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function logEdgeEvent(
  context: Pick<
    EdgeContext,
    "functionName" | "requestId" | "userId" | "startedAt"
  >,
  event: string,
  fields: Record<string, unknown> = {},
) {
  const payload = {
    event,
    functionName: context.functionName,
    requestId: context.requestId,
    userHash: hashForLog(context.userId),
    latencyMs: Date.now() - context.startedAt,
    ...redactForLog(fields),
  };
  console.info(JSON.stringify(payload));
}

export async function readJsonWithLimit<T>(
  request: Request,
  maxBytes = Number(getEnv("EDGE_AI_MAX_PAYLOAD_BYTES", "12000")),
): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxBytes) {
    throw new EdgeFunctionError(
      "payload_too_large",
      413,
      "Request payload is too large.",
      { limit: maxBytes },
    );
  }

  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new EdgeFunctionError(
      "payload_too_large",
      413,
      "Request payload is too large.",
      { limit: maxBytes },
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new EdgeFunctionError(
      "validation_error",
      400,
      "Request body must be valid JSON.",
    );
  }
}

export async function createEdgeContext(
  request: Request,
  functionName: string,
): Promise<EdgeContext> {
  const requestId =
    request.headers.get("x-request-id") ??
    `${functionName}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startedAt = Date.now();
  const token = extractBearerToken(request);
  if (!token) {
    throw new EdgeFunctionError(
      "auth_required",
      401,
      "Authentication required.",
    );
  }

  const supabaseAdmin = createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new EdgeFunctionError(
      "auth_required",
      401,
      "Authentication required.",
    );
  }

  return {
    requestId,
    functionName,
    userId: user.id as string,
    startedAt,
    supabaseAdmin,
  };
}

export async function assertAiUsageQuota(
  context: EdgeContext,
  feature: string,
  options: { isPremium?: boolean; entityId?: string | null } = {},
) {
  const dailyLimit = Number(
    getEnv(
      options.isPremium
        ? "EDGE_AI_DAILY_LIMIT_PREMIUM"
        : "EDGE_AI_DAILY_LIMIT_FREE",
      options.isPremium ? "100" : "10",
    ),
  );
  const monthlyLimit = Number(
    getEnv(
      options.isPremium
        ? "EDGE_AI_MONTHLY_LIMIT_PREMIUM"
        : "EDGE_AI_MONTHLY_LIMIT_FREE",
      options.isPremium ? "1000" : "30",
    ),
  );

  const { data, error } = await context.supabaseAdmin.rpc("consume_ai_usage", {
    p_user_id: context.userId,
    p_feature: feature,
    p_entity_id: options.entityId ?? null,
    p_daily_limit: dailyLimit,
    p_monthly_limit: monthlyLimit,
  });

  if (error) {
    throw new EdgeFunctionError(
      "server_error",
      500,
      "Usage quota check failed.",
    );
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.allowed) {
    const scope =
      result?.scope === "monthly" ? "quota_exceeded" : "rate_limit_exceeded";
    throw new EdgeFunctionError(
      scope,
      scope === "quota_exceeded" ? 402 : 429,
      scope === "quota_exceeded"
        ? "Monthly AI quota exceeded."
        : "Daily AI rate limit exceeded.",
      {
        feature,
        used: result?.used,
        limit: result?.limit,
        scope: result?.scope,
      },
    );
  }

  logEdgeEvent(context, "quota_consumed", {
    feature,
    dailyLimit,
    monthlyLimit,
  });
}

export async function assertPlantOwnership(
  context: EdgeContext,
  plantIds: string[],
) {
  const uniquePlantIds = Array.from(new Set(plantIds.filter(Boolean)));
  if (uniquePlantIds.length === 0) {
    return;
  }

  const { data, error } = await context.supabaseAdmin
    .from("plants")
    .select("id")
    .eq("user_id", context.userId)
    .in("id", uniquePlantIds);

  if (error) {
    throw new EdgeFunctionError(
      "server_error",
      500,
      "Plant ownership check failed.",
    );
  }

  const ownedIds = new Set((data ?? []).map((row: { id: string }) => row.id));
  const hasCrossUserReference = uniquePlantIds.some(
    (plantId) => !ownedIds.has(plantId),
  );
  if (hasCrossUserReference) {
    throw new EdgeFunctionError(
      "auth_required",
      403,
      "Referenced plant was not found for this account.",
    );
  }
}

export function safeErrorResponse(
  error: unknown,
  context?: Pick<
    EdgeContext,
    "functionName" | "requestId" | "userId" | "startedAt"
  >,
) {
  if (error instanceof EdgeFunctionError) {
    if (context) {
      logEdgeEvent(context, "request_denied", {
        code: error.code,
        status: error.status,
      });
    }
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      error.status,
    );
  }

  if (context) {
    logEdgeEvent(context, "request_failed", {
      code: "server_error",
      status: 500,
    });
  }
  return jsonResponse(
    {
      error: {
        code: "server_error",
        message: "The request could not be completed.",
      },
    },
    500,
  );
}

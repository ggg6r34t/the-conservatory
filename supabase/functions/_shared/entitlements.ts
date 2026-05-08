// @ts-ignore - Deno runtime import, not resolved by app tsc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { EdgeFunctionError, safeErrorResponse } from "./edge.ts";

// @ts-ignore - Deno global available at runtime
const _Deno = Deno as typeof Deno & {
  env: { get(key: string): string | undefined };
};

type RevenueCatEntitlement = {
  expires_date?: string | null;
};

type RevenueCatSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement | undefined>;
  };
};

function getRequiredEnv(name: string): string {
  const value = _Deno.env.get(name);
  if (!value) {
    throw new EdgeFunctionError(
      "server_error",
      500,
      `Missing required environment variable: ${name}`,
    );
  }
  return value;
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isEntitlementActive(entitlement: RevenueCatEntitlement | undefined) {
  if (!entitlement) {
    return false;
  }

  if (!entitlement.expires_date) {
    return true;
  }

  return new Date(entitlement.expires_date).getTime() > Date.now();
}

async function getAuthenticatedUserId(jwt: string) {
  const supabaseAdmin = createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(jwt);

  if (error || !user) {
    return null;
  }

  return user.id as string;
}

async function hasRevenueCatPremiumEntitlement(userId: string) {
  const apiKey = getRequiredEnv("REVENUECAT_SECRET_API_KEY");
  const entitlementId =
    _Deno.env.get("REVENUECAT_PREMIUM_ENTITLEMENT_ID") ?? "premium";
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new EdgeFunctionError(
      "server_error",
      500,
      `RevenueCat entitlement lookup failed: ${response.status}`,
    );
  }

  const payload = (await response.json()) as RevenueCatSubscriberResponse;
  const entitlement = payload.subscriber?.entitlements?.[entitlementId];
  return isEntitlementActive(entitlement);
}

export async function assertPremiumEntitlement(
  request: Request,
): Promise<Response | null> {
  const jwt = extractBearerToken(request);
  if (!jwt) {
    return safeErrorResponse(
      new EdgeFunctionError("auth_required", 401, "Authentication required."),
    );
  }

  try {
    const userId = await getAuthenticatedUserId(jwt);
    if (!userId) {
      return safeErrorResponse(
        new EdgeFunctionError("auth_required", 401, "Authentication required."),
      );
    }

    const isPremium = await hasRevenueCatPremiumEntitlement(userId);
    if (!isPremium) {
      return safeErrorResponse(
        new EdgeFunctionError(
          "premium_required",
          403,
          "Premium entitlement required.",
        ),
      );
    }

    return null;
  } catch (error) {
    return safeErrorResponse(error);
  }
}

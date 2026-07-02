import Constants from "expo-constants";
import { z } from "zod";

const envSchema = z.object({
  expoPublicSupabaseUrl: z.string().url().optional(),
  expoPublicSupabaseAnonKey: z.string().min(1).optional(),
  expoPublicEnableAnalytics: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  expoPublicPosthogApiKey: z.string().min(1).optional(),
  expoPublicPosthogHost: z.string().url().optional(),
  expoPublicSentryDsn: z.string().url().optional(),
  expoPublicGoogleWebClientId: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse({
  expoPublicSupabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    Constants.expoConfig?.extra?.expoPublicSupabaseUrl,
  expoPublicSupabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    Constants.expoConfig?.extra?.expoPublicSupabaseAnonKey,
  expoPublicEnableAnalytics:
    process.env.EXPO_PUBLIC_ENABLE_ANALYTICS ??
    Constants.expoConfig?.extra?.expoPublicEnableAnalytics,
  expoPublicPosthogApiKey:
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY ??
    Constants.expoConfig?.extra?.expoPublicPosthogApiKey,
  expoPublicPosthogHost:
    process.env.EXPO_PUBLIC_POSTHOG_HOST ??
    Constants.expoConfig?.extra?.expoPublicPosthogHost,
  expoPublicSentryDsn:
    process.env.EXPO_PUBLIC_SENTRY_DSN ??
    Constants.expoConfig?.extra?.expoPublicSentryDsn,
  expoPublicGoogleWebClientId:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
    Constants.expoConfig?.extra?.expoPublicGoogleWebClientId,
});

const safeEnv: z.infer<typeof envSchema> = parsed.success
  ? parsed.data
  : {
      expoPublicSupabaseUrl: undefined,
      expoPublicSupabaseAnonKey: undefined,
      expoPublicEnableAnalytics: false,
      expoPublicPosthogApiKey: undefined,
      expoPublicPosthogHost: undefined,
      expoPublicSentryDsn: undefined,
      expoPublicGoogleWebClientId: undefined,
    };

const isDevelopmentBuild = __DEV__ || process.env.NODE_ENV === "test";
const missingSupabaseConfig = [
  !safeEnv.expoPublicSupabaseUrl ? "EXPO_PUBLIC_SUPABASE_URL" : null,
  !safeEnv.expoPublicSupabaseAnonKey ? "EXPO_PUBLIC_SUPABASE_ANON_KEY" : null,
].filter((value): value is string => Boolean(value));

export const env = {
  supabaseUrl: safeEnv.expoPublicSupabaseUrl,
  supabaseAnonKey: safeEnv.expoPublicSupabaseAnonKey,
  isDevelopmentBuild,
  isProductionBuild: !isDevelopmentBuild,
  missingSupabaseConfig,
  isSupabaseConfigured: Boolean(
    safeEnv.expoPublicSupabaseUrl && safeEnv.expoPublicSupabaseAnonKey,
  ),
  enableAnalytics: Boolean(safeEnv.expoPublicEnableAnalytics),
  posthogApiKey: safeEnv.expoPublicPosthogApiKey ?? null,
  posthogHost: safeEnv.expoPublicPosthogHost ?? 'https://app.posthog.com',
  sentryDsn: safeEnv.expoPublicSentryDsn ?? null,
  googleWebClientId: safeEnv.expoPublicGoogleWebClientId ?? null,
};

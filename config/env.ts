import Constants from "expo-constants";
import { z } from "zod";

const envSchema = z.object({
  expoPublicSupabaseUrl: z.string().url().optional(),
  expoPublicSupabaseAnonKey: z.string().min(1).optional(),
  expoPublicEnableSyncTrials: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

const parsed = envSchema.safeParse({
  expoPublicSupabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    Constants.expoConfig?.extra?.expoPublicSupabaseUrl,
  expoPublicSupabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    Constants.expoConfig?.extra?.expoPublicSupabaseAnonKey,
  expoPublicEnableSyncTrials:
    process.env.EXPO_PUBLIC_ENABLE_SYNC_TRIALS ??
    Constants.expoConfig?.extra?.expoPublicEnableSyncTrials,
});

const safeEnv: z.infer<typeof envSchema> = parsed.success
  ? parsed.data
  : {
      expoPublicSupabaseUrl: undefined,
      expoPublicSupabaseAnonKey: undefined,
      expoPublicEnableSyncTrials: false,
    };

export const env = {
  supabaseUrl: safeEnv.expoPublicSupabaseUrl,
  supabaseAnonKey: safeEnv.expoPublicSupabaseAnonKey,
  isSupabaseConfigured: Boolean(
    safeEnv.expoPublicSupabaseUrl && safeEnv.expoPublicSupabaseAnonKey,
  ),
  enableSyncTrials: Boolean(safeEnv.expoPublicEnableSyncTrials),
};

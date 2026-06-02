import { z } from "zod";

export const aiGenerationMetaSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string().min(1),
  latencyMs: z.number().nonnegative(),
  inputTokens: z.number().nonnegative().optional(),
  outputTokens: z.number().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
});

export type AiGenerationMeta = z.infer<typeof aiGenerationMetaSchema>;

export function parseAiGenerationMeta(
  payload: unknown,
): AiGenerationMeta | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const meta = (payload as { meta?: unknown }).meta;
  const parsed = aiGenerationMetaSchema.safeParse(meta);
  return parsed.success ? parsed.data : null;
}

export function hasVerifiedModelGeneration(payload: unknown): boolean {
  return parseAiGenerationMeta(payload) !== null;
}

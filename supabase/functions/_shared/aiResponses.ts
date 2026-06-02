import type { AiGenerationMeta } from "./aiProvider.ts";

export function attachAiMeta<T extends Record<string, unknown>>(
  payload: T,
  meta: AiGenerationMeta,
): T & { meta: AiGenerationMeta } {
  return { ...payload, meta };
}

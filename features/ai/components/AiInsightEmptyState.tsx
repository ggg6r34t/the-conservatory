import { useRouter } from "expo-router";

import { EmptyState } from "@/features/empty-states/components/EmptyState";
import { getEmptyStateForContext } from "@/features/empty-states/getEmptyStateForContext";
import type { EmptyStateContextKey } from "@/features/empty-states/types";

type AiInsightEmptyStateProps = {
  context: Extract<
    EmptyStateContextKey,
    | "ai.insufficientData"
    | "ai.premiumRequired"
    | "ai.quotaReached"
    | "ai.fallback"
    | "ai.offline"
    | "ai.error"
  >;
  screen: string;
  reason: string;
  onRetry?: () => void;
};

export function AiInsightEmptyState({
  context,
  screen,
  reason,
  onRetry,
}: AiInsightEmptyStateProps) {
  const router = useRouter();
  const content = getEmptyStateForContext({ context });
  const premiumAction =
    context === "ai.premiumRequired" || context === "ai.quotaReached";

  return (
    <EmptyState
      content={content}
      screen={screen}
      reason={reason}
      primaryHref={premiumAction ? "/premium" : undefined}
      onPrimaryAction={
        context === "ai.error"
          ? onRetry
          : premiumAction
            ? () => router.push("/premium")
            : undefined
      }
    />
  );
}

import { useQuery } from "@tanstack/react-query";

import { getJournalMonthlySummary } from "@/features/ai/services/journalSummaryService";
import type { CareLog, Plant } from "@/types/models";

export function useJournalSummary(input: {
  userId?: string;
  logs: CareLog[];
  plants: Plant[];
  photoCount: number;
}) {
  const monthKey = new Date().toISOString().slice(0, 7);

  return useQuery({
    queryKey: [
      "ai",
      "journal-summary",
      input.userId ?? "guest",
      monthKey,
      input.logs.length,
      input.photoCount,
      input.plants.length,
    ],
    enabled: Boolean(input.userId),
    staleTime: 1000 * 60 * 30,
    queryFn: () =>
      getJournalMonthlySummary({
        userId: input.userId!,
        logs: input.logs,
        plants: input.plants,
        photoCount: input.photoCount,
      }),
  });
}

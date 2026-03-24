import { useQuery } from "@tanstack/react-query";

import {
  buildJournalSummaryStateSignature,
  getJournalMonthlySummary,
} from "@/features/ai/services/journalSummaryService";
import type { CareLog, Plant } from "@/types/models";

export function useJournalSummary(input: {
  userId?: string;
  logs: CareLog[];
  plants: Plant[];
  photoCount: number;
}) {
  const monthKey = new Date().toISOString().slice(0, 7);
  const signature = buildJournalSummaryStateSignature({
    logs: input.logs,
    plants: input.plants,
    photoCount: input.photoCount,
  });

  return useQuery({
    queryKey: [
      "ai",
      "journal-summary",
      input.userId ?? "guest",
      monthKey,
      signature,
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

import { useMutation } from "@tanstack/react-query";

import { getCareLogAssistance } from "@/features/ai/services/observationTaggingService";
import type { CareLogType } from "@/types/models";

export function useObservationTagging() {
  return useMutation({
    mutationFn: (input: { note: string; logType: CareLogType }) =>
      getCareLogAssistance(input),
  });
}

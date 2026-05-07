import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import {
  exportCollectionData,
  getExportCollectionSummary,
  shareExportFile,
} from "@/features/export/services/exportService";

export function useExportCollectionData() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const summaryQuery = useQuery({
    queryKey: ["export-collection-summary", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => getExportCollectionSummary(user!.id),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You need to be signed in to export your collection.");
      }

      return exportCollectionData(user, { mode: isPremium ? "premium" : "basic" });
    },
  });

  return {
    summaryQuery,
    exportMutation,
    shareAgain: async (fileUri: string) => shareExportFile(fileUri),
  };
}

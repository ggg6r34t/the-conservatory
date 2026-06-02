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

  const exportMode = isPremium ? "premium" : "basic";

  const summaryQuery = useQuery({
    queryKey: ["export-collection-summary", user?.id, exportMode],
    enabled: Boolean(user?.id),
    queryFn: () => getExportCollectionSummary(user!.id, { mode: exportMode }),
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

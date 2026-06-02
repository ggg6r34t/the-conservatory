import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import {
  exportCollectionData,
  getExportCollectionSummary,
  shareExportFile,
} from "@/features/export/services/exportService";
import { trackMonetizationEvent } from "@/services/analytics/analyticsService";
import { measureAsync } from "@/services/observability/performanceMonitoringService";

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

      const mode = isPremium ? "premium" : "basic";
      trackMonetizationEvent("export_collection_started", { mode });

      try {
        const result = await measureAsync(
          "export_collection_data",
          () => exportCollectionData(user, { mode }),
          { mode },
        );
        trackMonetizationEvent("export_collection_completed", {
          mode,
          shared: result.shared,
        });
        return result;
      } catch (error) {
        trackMonetizationEvent("export_collection_failed", {
          mode,
          message: error instanceof Error ? error.message : "unknown",
        });
        throw error;
      }
    },
  });

  return {
    summaryQuery,
    exportMutation,
    shareAgain: async (fileUri: string) => shareExportFile(fileUri),
  };
}

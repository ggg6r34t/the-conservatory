import { EmptyState } from "@/features/empty-states/components/EmptyState";
import { getEmptyStateForContext } from "@/features/empty-states/getEmptyStateForContext";

export function PlantActivityEmptyState() {
  return (
    <EmptyState
      content={getEmptyStateForContext({ context: "plantActivity.noLogs" })}
      screen="plant_activity"
      reason="no_logs"
    />
  );
}

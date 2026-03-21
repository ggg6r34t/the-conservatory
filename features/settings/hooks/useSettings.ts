import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.preferences,
    enabled: Boolean(user?.id),
    queryFn: () => getUserPreferences(user!.id),
  });
}

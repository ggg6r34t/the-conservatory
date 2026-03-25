import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getUserPreferences } from "@/features/settings/api/settingsClient";

export function useSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.preferences, user?.id ?? "anonymous"],
    enabled: Boolean(user?.id),
    queryFn: () => getUserPreferences(user!.id),
  });
}

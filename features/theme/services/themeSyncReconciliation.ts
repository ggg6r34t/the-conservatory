import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import {
  readThemeSubscriptionSnapshot,
  reconcilePreferredTheme,
} from "@/features/theme/services/themeApplication";
import { writeCachedThemeId } from "@/features/theme/services/themeCacheStorage";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";

/** After remote sync, refresh preferences cache and align runtime theme with SQLite. */
export async function reconcileThemeAfterSync(input: {
  userId: string;
  queryClient: QueryClient;
  source: string;
}): Promise<void> {
  await input.queryClient.invalidateQueries({
    queryKey: queryKeys.preferences,
  });

  const subscription = await readThemeSubscriptionSnapshot();
  const preferences = await getUserPreferences(input.userId);
  const result = await reconcilePreferredTheme({
    userId: input.userId,
    preferredThemeId: preferences.preferredTheme,
    subscription,
    source: input.source,
  });

  await writeCachedThemeId(result.themeId);
  useThemeRuntimeStore.getState().setActiveThemeId(result.themeId);
}

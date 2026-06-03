import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/constants";
import { getUserPreferences } from "@/features/settings/api/settingsClient";
import {
  readThemeSubscriptionSnapshot,
  reconcilePreferredTheme,
} from "@/features/theme/services/themeApplication";
import { reconcileThemeAfterSync } from "@/features/theme/services/themeSyncReconciliation";
import { writeCachedThemeId } from "@/features/theme/services/themeCacheStorage";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";

jest.mock("@/features/settings/api/settingsClient");
jest.mock("@/features/theme/services/themeApplication");
jest.mock("@/features/theme/services/themeCacheStorage");

const getUserPreferencesMock = jest.mocked(getUserPreferences);
const readThemeSubscriptionSnapshotMock = jest.mocked(
  readThemeSubscriptionSnapshot,
);
const reconcilePreferredThemeMock = jest.mocked(reconcilePreferredTheme);
const writeCachedThemeIdMock = jest.mocked(writeCachedThemeId);

describe("reconcileThemeAfterSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useThemeRuntimeStore.setState({
      activeThemeId: "linen-light",
      hydrated: true,
      transitionProgress: 1,
    });
  });

  it("invalidates preferences, reconciles entitlement, and updates runtime", async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    getUserPreferencesMock.mockResolvedValue({
      preferredTheme: "deep-forest",
    } as Awaited<ReturnType<typeof getUserPreferences>>);
    readThemeSubscriptionSnapshotMock.mockResolvedValue({
      tier: "premium",
      period: "monthly",
    });
    reconcilePreferredThemeMock.mockResolvedValue({
      themeId: "deep-forest",
      corrected: false,
      previousThemeId: "deep-forest",
    });

    await reconcileThemeAfterSync({
      userId: "user-1",
      queryClient,
      source: "auto-foreground",
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.preferences,
    });
    expect(reconcilePreferredThemeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        preferredThemeId: "deep-forest",
        source: "auto-foreground",
      }),
    );
    expect(writeCachedThemeIdMock).toHaveBeenCalledWith("deep-forest");
    expect(useThemeRuntimeStore.getState().activeThemeId).toBe("deep-forest");
  });
});

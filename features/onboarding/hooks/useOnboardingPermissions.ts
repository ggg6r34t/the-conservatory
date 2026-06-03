import { useEffect, useMemo, useState } from "react";

import {
  getPermissionSnapshot,
  requestMediaPermissions,
  requestNotificationPermission,
  type OnboardingPermissionSnapshot,
} from "@/features/onboarding/services/permissionsService";
import type { PermissionState } from "@/features/onboarding/utils/permissionState";
import { trackEvent } from "@/services/analytics/analyticsService";

type PermissionKey = keyof OnboardingPermissionSnapshot;

const INITIAL_SNAPSHOT: OnboardingPermissionSnapshot = {
  notifications: "undetermined",
  media: "undetermined",
};

export function useOnboardingPermissions() {
  const [permissions, setPermissions] =
    useState<OnboardingPermissionSnapshot>(INITIAL_SNAPSHOT);
  const [isReady, setIsReady] = useState(false);
  const [activeKey, setActiveKey] = useState<PermissionKey | null>(null);
  const [continueLoading, setContinueLoading] = useState(false);

  useEffect(() => {
    let active = true;

    getPermissionSnapshot()
      .then((snapshot) => {
        if (active) {
          setPermissions(snapshot);
        }
      })
      .finally(() => {
        if (active) {
          setIsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const requestPermission = async (key: PermissionKey) => {
    setActiveKey(key);
    let nextState: PermissionState = "undetermined";

    try {
      if (key === "notifications") {
        nextState = await requestNotificationPermission();
      } else {
        nextState = await requestMediaPermissions();
      }

      setPermissions((current) => ({
        ...current,
        [key]: nextState,
      }));
      trackEvent("onboarding_permission_requested", {
        permission: key,
        status: nextState,
      });

      return nextState;
    } finally {
      setActiveKey(null);
    }
  };

  const refreshPermissions = async () => {
    const snapshot = await getPermissionSnapshot();
    setPermissions(snapshot);
    return snapshot;
  };

  const setContinueLoadingState = (loading: boolean) => {
    setContinueLoading(loading);
  };

  return useMemo(
    () => ({
      permissions,
      isReady,
      activeKey,
      continueLoading,
      requestPermission,
      refreshPermissions,
      setContinueLoadingState,
    }),
    [activeKey, continueLoading, isReady, permissions],
  );
}

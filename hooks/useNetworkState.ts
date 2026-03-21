import { useEffect, useState } from "react";

import { NETWORK_REFRESH_MS } from "@/config/constants";
import { getOfflineState } from "@/utils/offline";

export function useNetworkState() {
  const [state, setState] = useState({
    isConnected: true,
    isInternetReachable: true,
    isOffline: false,
  });

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const next = await getOfflineState();
      if (mounted) {
        setState(next);
      }
    };

    refresh().catch(() => undefined);
    const interval = setInterval(() => {
      refresh().catch(() => undefined);
    }, NETWORK_REFRESH_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return state;
}

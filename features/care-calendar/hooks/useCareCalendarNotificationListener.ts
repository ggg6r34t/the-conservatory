import { useEffect } from "react";

import { useRouter } from "expo-router";

export function useCareCalendarNotificationListener(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let subscription: { remove: () => void } | undefined;

    void (async () => {
      const notifications = await import("expo-notifications").catch(() => null);
      if (!notifications) {
        return;
      }

      const handleResponse = (
        response: Awaited<
          ReturnType<typeof notifications.getLastNotificationResponseAsync>
        >,
      ) => {
        const url = response?.notification.request.content.data?.url;
        if (typeof url === "string" && url.startsWith("/care-calendar")) {
          const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";
          const params = new URLSearchParams(query.replace(/^\?/, ""));
          router.push({
            pathname: "/care-calendar",
            params: {
              date: params.get("date") ?? undefined,
              plantId: params.get("plantId") ?? undefined,
            },
          });
        }
      };

      const last = await notifications.getLastNotificationResponseAsync();
      handleResponse(last);

      subscription = notifications.addNotificationResponseReceivedListener(
        (response) => handleResponse(response),
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, [enabled, router]);
}

import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { env } from "@/config/env";
import { completeOAuthSignInFromCallback } from "@/features/auth/api/authClient";
import { processOAuthCallbackUrl } from "@/features/auth/services/oauthSignIn";
import { isOAuthCancellation } from "@/features/auth/services/oauthErrors";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { useAlert } from "@/hooks/useAlert";

export function OAuthCallbackBridge() {
  const router = useRouter();
  const alert = useAlert();
  const handledUrls = useRef(new Set<string>());
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (!env.isSupabaseConfigured) {
      return;
    }

    const handleUrl = async (url: string | null) => {
      if (!url || handledUrls.current.has(url)) {
        return;
      }

      const isOAuthCallback = await processOAuthCallbackUrl(url).catch(() => false);
      if (!isOAuthCallback) {
        return;
      }

      handledUrls.current.add(url);

      try {
        const user = await completeOAuthSignInFromCallback();
        setUser(user);
        router.replace("/(tabs)");
      } catch (error) {
        if (isOAuthCancellation(error)) {
          router.replace("/(auth)/login");
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "We couldn't complete sign in. Please try again.";

        void alert.show({
          variant: "error",
          title: "Unable to sign in",
          message,
          primaryAction: { label: "Close", tone: "danger" },
        });
        router.replace("/(auth)/login");
      }
    };

    void Linking.getInitialURL().then((url) => handleUrl(url));

    const subscription = Linking.addEventListener("url", (event) => {
      void handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [alert, router, setUser]);

  return null;
}

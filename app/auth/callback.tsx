import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import {
  completeOAuthSignInFromCallback,
} from "@/features/auth/api/authClient";
import { processOAuthCallbackUrl } from "@/features/auth/services/oauthSignIn";
import { isOAuthCancellation } from "@/features/auth/services/oauthErrors";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { useAlert } from "@/hooks/useAlert";
import { logger } from "@/utils/logger";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const alert = useAlert();
  const { colors } = useTheme();
  const setUser = useAuthStore((state) => state.setUser);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function completeCallback() {
      try {
        const url = await Linking.getInitialURL();
        if (!url) {
          throw new Error("We couldn't finish signing you in. Please try again.");
        }

        const handled = await processOAuthCallbackUrl(url);
        if (!handled) {
          throw new Error("We couldn't finish signing you in. Please try again.");
        }

        const user = await completeOAuthSignInFromCallback();
        if (!mounted) {
          return;
        }

        setUser(user);
        router.replace("/(tabs)");
      } catch (error) {
        logger.warn("auth.oauth.callback_route_failed");
        if (!mounted) {
          return;
        }

        if (isOAuthCancellation(error)) {
          router.replace("/(auth)/login");
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "We couldn't complete sign in. Please try again.";

        setErrorMessage(message);
        void alert.show({
          variant: "error",
          title: "Unable to sign in",
          message,
          primaryAction: { label: "Close", tone: "danger" },
        });
      }
    }

    void completeCallback();

    return () => {
      mounted = false;
    };
  }, [alert, router, setUser]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={styles.content}>
        {errorMessage ? (
          <Text style={[styles.message, { color: colors.error }]}>
            {errorMessage}
          </Text>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.message, { color: colors.onSurface }]}>
              Preparing your conservatory…
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  message: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
});

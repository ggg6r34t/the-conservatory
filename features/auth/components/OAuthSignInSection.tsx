import { Platform, StyleSheet, View } from "react-native";

import { env } from "@/config/env";
import { AppleBrandIcon } from "@/features/auth/components/AppleBrandIcon";
import { GoogleBrandIcon } from "@/features/auth/components/GoogleBrandIcon";
import { OAuthDivider } from "@/features/auth/components/OAuthDivider";
import { OAuthProviderButton } from "@/features/auth/components/OAuthProviderButton";
import { useOAuthSignIn } from "@/features/auth/hooks/useOAuthSignIn";
import type { OAuthSignInScreen } from "@/features/auth/services/oauthSignIn";
import type { OAuthProvider } from "@/features/auth/services/oauthErrors";
import { useAlert } from "@/hooks/useAlert";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

interface OAuthSignInSectionProps {
  screen: OAuthSignInScreen;
  disabled?: boolean;
}

export function OAuthSignInSection({
  screen,
  disabled = false,
}: OAuthSignInSectionProps) {
  const alert = useAlert();
  const backend = getBackendConfigurationSummary();
  const { signInWithProvider, isPending, activeProvider, isOAuthCancellation, getErrorMessage } =
    useOAuthSignIn(screen);

  const oauthEnabled = backend.isSupabaseConfigured && env.isSupabaseConfigured;
  const showApple = Platform.OS === "ios";
  const showGoogle = true;

  if (!oauthEnabled || (!showApple && !showGoogle)) {
    return null;
  }

  const handleProviderPress = async (provider: OAuthProvider) => {
    if (disabled || isPending) {
      return;
    }

    try {
      await signInWithProvider(provider);
    } catch (error) {
      if (isOAuthCancellation(error)) {
        return;
      }

      void alert.show({
        variant: "error",
        title: "Unable to sign in",
        message: getErrorMessage(error),
        primaryAction: { label: "Close", tone: "danger" },
      });
    }
  };

  return (
    <View style={styles.container}>
      <OAuthDivider />
      {showApple ? (
        <OAuthProviderButton
          provider="apple"
          label="Continue with Apple"
          icon={<AppleBrandIcon />}
          accessibilityLabel="Continue with Apple"
          onPress={() => void handleProviderPress("apple")}
          loading={activeProvider === "apple"}
          disabled={disabled || isPending}
        />
      ) : null}
      {showGoogle ? (
        <OAuthProviderButton
          provider="google"
          label="Continue with Google"
          icon={<GoogleBrandIcon />}
          accessibilityLabel="Continue with Google"
          onPress={() => void handleProviderPress("google")}
          loading={activeProvider === "google"}
          disabled={disabled || isPending}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});

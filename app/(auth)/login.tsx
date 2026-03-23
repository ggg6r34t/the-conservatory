import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { AuthScreenScaffold } from "@/features/auth/components/AuthScreenScaffold";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginScreen() {
  const { colors } = useTheme();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();

  const signupHref = redirectTo
    ? { pathname: "/(auth)/signup" as const, params: { redirectTo } }
    : "/(auth)/signup";
  const forgotHref = redirectTo
    ? { pathname: "/(auth)/forgot-password" as const, params: { redirectTo } }
    : "/(auth)/forgot-password";

  return (
    <AuthScreenScaffold
      eyebrow="WELCOME BACK"
      title="Sign In to Your Conservatory"
      body="Return to your archive, revisit recent growth, and continue caring for your collection."
      footer={
        <View style={styles.inlineRow}>
          <Link
            href={signupHref}
            style={[styles.link, { color: colors.primary }]}
          >
            Create an account
          </Link>
          <Link
            href={forgotHref}
            style={[styles.mutedLink, { color: colors.secondary }]}
          >
            Forgot password?
          </Link>
        </View>
      }
    >
      <LoginForm />
    </AuthScreenScaffold>
  );
}

const styles = StyleSheet.create({
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  link: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  mutedLink: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
    lineHeight: 21,
  },
});

import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet } from "react-native";

import { AuthScreenScaffold } from "@/features/auth/components/AuthScreenScaffold";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { useTheme } from "@/components/design-system/useTheme";

export default function SignupScreen() {
  const { colors } = useTheme();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();

  const loginHref = redirectTo
    ? { pathname: "/(auth)/login" as const, params: { redirectTo } }
    : "/(auth)/login";

  return (
    <AuthScreenScaffold
      eyebrow="START YOUR JOURNEY"
      title="Create Your Account"
      body="Begin your digital conservatory and keep every ritual, memory, and lesson in one place."
      footer={
        <Link href={loginHref} style={[styles.footerLink, { color: colors.primary }]}>
          Already have an account? Sign in
        </Link>
      }
    >
      <SignupForm />
    </AuthScreenScaffold>
  );
}

const styles = StyleSheet.create({
  footerLink: {
    alignSelf: "center",
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
});

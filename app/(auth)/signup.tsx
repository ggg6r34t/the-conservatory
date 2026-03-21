import { Link } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignupForm } from "@/features/auth/components/SignupForm";
import { useTheme } from "@/components/design-system/useTheme";

export default function SignupScreen() {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.xl }]}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Link
              href="/(auth)/login"
              style={[styles.brand, { color: colors.primary }]}
            >
              The Conservatory
            </Link>
            <View style={{ gap: spacing.md }}>
              <Link
                href="/(auth)/signup"
                style={[styles.eyebrow, { color: colors.secondary }]}
              >
                START YOUR JOURNEY
              </Link>
              <Link
                href="/(auth)/signup"
                style={[styles.title, { color: colors.onSurface }]}
              >
                Create Your Account
              </Link>
            </View>
          </View>
          <SignupForm />
          <View style={styles.footer}>
            <Link
              href="/(auth)/login"
              style={[styles.footerLink, { color: colors.primary }]}
            >
              Already have an account? Sign in
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  container: {
    gap: 32,
  },
  header: {
    gap: 24,
  },
  brand: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 26,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 3,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 48,
    lineHeight: 58,
  },
  footer: {
    alignItems: "center",
  },
  footerLink: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
  },
});

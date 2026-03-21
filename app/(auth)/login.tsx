import { Link } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoginForm } from "@/features/auth/components/LoginForm";
import { useTheme } from "@/components/design-system/useTheme";

export default function LoginScreen() {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.xl }]}
      >
        <View style={styles.copyBlock}>
          <View>
            <View
              style={[styles.eyebrowSpacer, { marginBottom: spacing.lg }]}
            />
            <View style={styles.heroCopy}>
              <View>
                <Link
                  href="/(tabs)"
                  style={[styles.brand, { color: colors.primary }]}
                >
                  The Conservatory
                </Link>
              </View>
              <View style={{ gap: spacing.md }}>
                <View>
                  <Link
                    href="/(auth)/login"
                    style={[styles.eyebrow, { color: colors.secondary }]}
                  >
                    WELCOME BACK
                  </Link>
                </View>
                <View>
                  <Link
                    href="/(auth)/login"
                    style={[styles.title, { color: colors.onSurface }]}
                  >
                    Sign In to Your Conservatory
                  </Link>
                </View>
              </View>
            </View>
          </View>
          <LoginForm />
          <View style={[styles.inlineRow, { marginTop: spacing.lg }]}>
            <Link
              href="/(auth)/signup"
              style={[styles.link, { color: colors.primary }]}
            >
              Create an account
            </Link>
            <Link
              href="/(auth)/forgot-password"
              style={[styles.mutedLink, { color: colors.secondary }]}
            >
              Forgot password?
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
    justifyContent: "center",
  },
  copyBlock: {
    gap: 32,
  },
  eyebrowSpacer: {
    height: 12,
  },
  heroCopy: {
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
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  link: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
  },
  mutedLink: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
  },
});

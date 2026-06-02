import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { env } from "@/config/env";
import {
  collectReleaseValidationIssues,
  isReleaseConfigurationValid,
} from "@/services/startup/releaseValidation";

export function ReleaseConfigGate({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  if (!env.isProductionBuild || isReleaseConfigurationValid()) {
    return children;
  }

  const issues = collectReleaseValidationIssues();

  return (
    <View style={[styles.centered, { backgroundColor: colors.surfaceBright }]}>
      <Text style={[styles.title, { color: colors.primary }]}>
        Release configuration incomplete
      </Text>
      {issues.map((issue) => (
        <Text
          key={issue.code}
          style={[styles.body, { color: colors.onSurfaceVariant }]}
        >
          {issue.message}
        </Text>
      ))}
      <Text style={[styles.detail, { color: colors.onSurfaceVariant }]}>
        Configure Supabase and RevenueCat secrets in EAS before shipping this
        production build to the App Store or Play Store.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 26,
    lineHeight: 32,
    textAlign: "center",
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  detail: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});

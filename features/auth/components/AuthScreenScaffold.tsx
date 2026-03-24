import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/components/design-system/useTheme";
import { getBackendConfigurationSummary } from "@/services/supabase/backendReadiness";

interface AuthScreenScaffoldProps {
  eyebrow: string;
  title: string;
  body?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthScreenScaffold({
  eyebrow,
  title,
  body,
  children,
  footer,
}: AuthScreenScaffoldProps) {
  const { colors, spacing } = useTheme();
  const backend = getBackendConfigurationSummary();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { padding: spacing.xl }]}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.brand, { color: colors.primary }]}>
              The Conservatory
            </Text>
            <View style={styles.copyBlock}>
              <Text style={[styles.eyebrow, { color: colors.secondary }]}>
                {eyebrow}
              </Text>
              <Text style={[styles.title, { color: colors.onSurface }]}>
                {title}
              </Text>
              {body ? (
                <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
                  {body}
                </Text>
              ) : null}
            </View>
          </View>

          {backend.mode !== "cloud" ? (
            <View
              style={[
                styles.notice,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            >
              <Text style={[styles.noticeTitle, { color: colors.primary }]}>
                {backend.title}
              </Text>
              <Text
                style={[styles.noticeBody, { color: colors.onSurfaceVariant }]}
              >
                {backend.description}
              </Text>
            </View>
          ) : null}

          {children}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
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
  container: {
    gap: 32,
  },
  header: {
    gap: 26,
  },
  brand: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 26,
    lineHeight: 32,
  },
  copyBlock: {
    gap: 14,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 3.4,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 44,
    lineHeight: 54,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 340,
  },
  footer: {
    gap: 18,
  },
  notice: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
  },
  noticeTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    lineHeight: 18,
  },
  noticeBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
});

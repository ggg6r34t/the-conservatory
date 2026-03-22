import type { ReactNode } from "react";

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";

interface ProfileScreenScaffoldProps {
  title: string;
  subtitle: string;
  description?: string;
  children: ReactNode;
}

export function ProfileScreenScaffold({
  title,
  subtitle,
  description,
  children,
}: ProfileScreenScaffoldProps) {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: 112,
          },
        ]}
      >
        <AppHeader title={title} subtitle={subtitle} showBackButton />
        {description ? (
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            {description}
          </Text>
        ) : null}
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 20,
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 28,
    maxWidth: 340,
  },
  body: {
    gap: 20,
  },
});

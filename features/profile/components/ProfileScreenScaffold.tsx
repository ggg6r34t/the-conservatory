import type { ReactNode } from "react";

import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/common/Icon/Icon";
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
  const router = useRouter();
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
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
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Icon
                family="MaterialCommunityIcons"
                name="arrow-left"
                size={24}
                color={colors.primary}
              />
            </Pressable>
            <Text style={[styles.topBarTitle, { color: colors.primary }]}>
              Settings
            </Text>
          </View>
        </View>
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.secondary }]}>
            {subtitle.toUpperCase()}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.primary }]}>
            {title}
          </Text>
          {description ? (
            <Text
              style={[styles.description, { color: colors.onSurfaceVariant }]}
            >
              {description}
            </Text>
          ) : null}
        </View>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  hero: {
    gap: 10,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
  },
  heroTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 40,
    lineHeight: 46,
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

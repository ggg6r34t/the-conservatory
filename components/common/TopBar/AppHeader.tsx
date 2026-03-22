import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  aside?: string;
}

export function AppHeader({
  title,
  subtitle,
  showBackButton = false,
  aside,
}: AppHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        {showBackButton ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.backButton}
        >
            <Icon color={colors.primary} name="arrow-left" size={20} />
          </Pressable>
        ) : (
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.secondaryContainer },
            ]}
          >
            <Icon name="sprout" size={16} color={colors.primary} />
          </View>
        )}
        <Text style={[styles.brand, { color: colors.primary }]}>
          The Conservatory
        </Text>
      </View>
      <View style={[styles.copy, aside ? styles.copyWithAside : undefined]}>
        <View style={styles.copyMain}>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              {subtitle.toUpperCase()}
            </Text>
          ) : null}
          <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
        </View>
        {aside ? (
          <Text style={[styles.aside, { color: colors.onSurface }]}>
            {aside}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
  },
  copy: {
    gap: 10,
  },
  copyWithAside: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  copyMain: {
    flex: 1,
    gap: 10,
  },
  subtitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 40,
  },
  aside: {
    fontFamily: "Manrope_500Medium",
    fontSize: 18,
    lineHeight: 26,
    textAlign: "right",
    marginTop: 54,
  },
});

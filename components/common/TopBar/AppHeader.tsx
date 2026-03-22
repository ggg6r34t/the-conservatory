import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface AppHeaderProps {
  title: string;
  subtitle: string;
  showBackButton?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  showBackButton = false,
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
            <MaterialCommunityIcons
              color={colors.primary}
              name="arrow-left"
              size={20}
            />
          </Pressable>
        ) : (
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.secondaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="sprout"
              size={16}
              color={colors.primary}
            />
          </View>
        )}
        <Text style={[styles.brand, { color: colors.primary }]}>
          The Conservatory
        </Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          {subtitle.toUpperCase()}
        </Text>
        <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
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
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  subtitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 40,
  },
});

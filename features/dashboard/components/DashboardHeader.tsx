import { StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/common/TopBar/AppHeader";
import { useTheme } from "@/components/design-system/useTheme";

interface DashboardHeaderProps {
  isOffline: boolean;
}

export function DashboardHeader({ isOffline }: DashboardHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <AppHeader title="Nature is thriving." subtitle="Your living gallery" />
      {isOffline ? (
        <Text style={[styles.badge, { color: colors.secondary }]}>
          OFFLINE MODE
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  badge: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
  },
});

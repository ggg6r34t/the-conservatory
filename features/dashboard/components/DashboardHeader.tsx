import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface DashboardHeaderProps {
  isOffline: boolean;
}

export function DashboardHeader({ isOffline }: DashboardHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.leftCluster}>
          <View
            style={[
              styles.brandIcon,
              { backgroundColor: colors.secondaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="sprout"
              size={16}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.brand, { color: colors.primary }]}>
            The Conservatory
          </Text>
        </View>
        <View style={styles.rightCluster}>
          {isOffline ? <View style={styles.offlineSpacer} /> : null}
          <Link href="/profile" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              hitSlop={10}
              style={[styles.avatar, { backgroundColor: "#bfd8d4" }]}
            >
              <View style={styles.avatarArt}>
                <View style={styles.hairBack} />
                <View style={styles.face} />
                <View style={styles.hairTop} />
                <View style={styles.bunLeft} />
                <View style={styles.bunRight} />
                <View style={styles.body} />
                <View style={styles.neck} />
                <View style={[styles.eye, styles.eyeLeft]} />
                <View style={[styles.eye, styles.eyeRight]} />
              </View>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  offlineSpacer: {
    width: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarArt: {
    width: 30,
    height: 30,
    position: "relative",
  },
  hairBack: {
    position: "absolute",
    top: 4,
    left: 6,
    width: 18,
    height: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#3a4c4b",
  },
  face: {
    position: "absolute",
    top: 6,
    left: 8,
    width: 14,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#f3d6c4",
  },
  hairTop: {
    position: "absolute",
    top: 3,
    left: 7,
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    backgroundColor: "#314443",
  },
  bunLeft: {
    position: "absolute",
    top: 5,
    left: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#314443",
  },
  bunRight: {
    position: "absolute",
    top: 5,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#314443",
  },
  neck: {
    position: "absolute",
    top: 20,
    left: 13,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#f0cdb8",
  },
  body: {
    position: "absolute",
    bottom: 2,
    left: 7,
    width: 16,
    height: 9,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    backgroundColor: "#de9b82",
  },
  eye: {
    position: "absolute",
    top: 12,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#314443",
  },
  eyeLeft: {
    left: 12,
  },
  eyeRight: {
    right: 12,
  },
});

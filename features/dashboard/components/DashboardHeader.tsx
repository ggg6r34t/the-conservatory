import { Image } from "expo-image";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface DashboardHeaderProps {
  isOffline: boolean;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "C";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DashboardHeader({ isOffline }: DashboardHeaderProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const displayName = user?.displayName ?? "Curator";
  const initials = getInitials(displayName);
  const avatarSource = useMemo(
    () =>
      user?.avatarUrl
        ? { uri: user.avatarUrl }
        : require("@/assets/images/placeholder-avatar.png"),
    [user?.avatarUrl],
  );

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarSource]);

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
            <Icon name="sprout" size={16} color={colors.primary} />
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
              <View style={styles.avatarImageWrap}>
                {avatarFailed ? (
                  <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                    {initials}
                  </Text>
                ) : (
                  <Image
                    source={avatarSource}
                    style={styles.avatarImage}
                    contentFit="contain"
                    onError={() => setAvatarFailed(true)}
                  />
                )}
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
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImageWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 42,
    height: 42,
  },
  avatarInitials: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
});

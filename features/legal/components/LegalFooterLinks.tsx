import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { LEGAL_ROUTES } from "@/features/legal/constants";

interface LegalFooterLinksProps {
  showRestore?: boolean;
  isRestoring?: boolean;
  onRestore?: () => void;
}

export function LegalFooterLinks({
  showRestore = false,
  isRestoring = false,
  onRestore,
}: LegalFooterLinksProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const links = [
    ...(showRestore
      ? [
          {
            key: "restore",
            label: isRestoring ? "Restoring..." : "Restore purchases",
            onPress: onRestore,
            disabled: isRestoring,
          },
        ]
      : []),
    {
      key: "terms",
      label: "Terms",
      onPress: () => router.push(LEGAL_ROUTES.terms),
    },
    {
      key: "privacy",
      label: "Privacy",
      onPress: () => router.push(LEGAL_ROUTES.privacy),
    },
  ];

  return (
    <View style={styles.footer}>
      {links.map((link, index) => (
        <View key={link.key} style={styles.footerItem}>
          {index > 0 ? (
            <Text style={[styles.footerDot, { color: colors.onSurfaceVariant }]}>
              ·
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={"disabled" in link ? link.disabled : false}
            onPress={link.onPress}
          >
            <Text
              style={[styles.footerLink, { color: colors.onSurfaceVariant }]}
            >
              {link.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerLink: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  footerDot: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
});

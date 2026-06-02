import { Pressable, StyleSheet, Text, View } from "react-native";

import { LEGAL_CONTACT } from "@/features/legal/constants";
import { useTheme } from "@/components/design-system/useTheme";

export function ProductFeedbackUnavailable() {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceContainerLow },
      ]}
    >
      <Text style={[styles.title, { color: colors.primary }]}>
        Cloud feedback is unavailable
      </Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        Feature requests require an online account with cloud services enabled.
        You can still reach us at {LEGAL_CONTACT.supportEmail}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
});

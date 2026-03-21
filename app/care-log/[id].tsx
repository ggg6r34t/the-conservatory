import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { CareLogForm } from "@/features/care-logs/components/CareLogForm";

export default function CareLogRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.overlay, { backgroundColor: colors.backdrop }]}>
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surfaceContainerLowest,
            padding: spacing.lg,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.primary }]}>Log Care</Text>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          Capture today&apos;s ritual for specimen {id}.
        </Text>
        <CareLogForm plantId={id ?? ""} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    gap: 12,
    minHeight: 260,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 36,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
});

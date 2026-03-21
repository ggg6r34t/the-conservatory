import { StyleSheet, Switch, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface PreferenceControlProps {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}

export function PreferenceControl({
  label,
  description,
  value,
  onValueChange,
}: PreferenceControlProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceContainerLowest },
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text>
        <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          true: colors.primaryContainer,
          false: colors.surfaceContainerHigh,
        }}
        thumbColor={value ? colors.primary : colors.surfaceBright}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
});

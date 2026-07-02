import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import type { PasswordStrengthLevel } from "@/features/auth/services/evaluateSignupPassword";

interface PasswordRequirementsFeedbackProps {
  strength: PasswordStrengthLevel;
  requirements: Array<{ key: string; label: string; met: boolean }>;
}

const STRENGTH_LABEL: Record<PasswordStrengthLevel, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

export function PasswordRequirementsFeedback({
  strength,
  requirements,
}: PasswordRequirementsFeedbackProps) {
  const { colors } = useTheme();
  const strengthColor =
    strength === "strong"
      ? colors.primary
      : strength === "medium"
        ? colors.secondary
        : colors.error;

  return (
    <View style={styles.container}>
      <View style={styles.strengthRow}>
        <Text
          style={[
            styles.requirementIcon,
            { color: strength === "strong" ? colors.primary : colors.error },
          ]}
          accessibilityRole="text"
          accessibilityLabel={`Password strength: ${STRENGTH_LABEL[strength]}`}
        >
          {strength === "strong" ? "✓" : "✕"}
        </Text>
        <Text style={[styles.strengthLabel, { color: colors.onSurfaceVariant }]}>
          Password strength
        </Text>
        <Text style={[styles.strengthValue, { color: strengthColor }]}>
          {STRENGTH_LABEL[strength]}
        </Text>
      </View>
      <View style={styles.requirementList}>
        {requirements.map((requirement) => (
          <View
            key={requirement.key}
            style={styles.requirementItem}
            accessibilityRole="text"
            accessibilityLabel={`${requirement.label}. ${
              requirement.met ? "Met" : "Not met"
            }`}
          >
            <Text
              style={[
                styles.requirementIcon,
                { color: requirement.met ? colors.primary : colors.error },
              ]}
            >
              {requirement.met ? "✓" : "✕"}
            </Text>
            <Text style={[styles.requirementText, { color: colors.onSurfaceVariant }]}>
              {requirement.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: -6,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  strengthLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
  },
  strengthValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
  },
  requirementList: {
    gap: 6,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requirementIcon: {
    width: 16,
    textAlign: "center",
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  requirementText: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
});

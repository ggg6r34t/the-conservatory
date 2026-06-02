import { StyleSheet, Text, View } from "react-native";

import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface MemorialFooterProps {
  onEdit: () => void;
  onRestoreToCollection?: () => void;
  restoreLoading?: boolean;
  onToggleFeatured?: () => void;
  isFeatured?: boolean;
  featureLoading?: boolean;
}

export function MemorialFooter({
  onEdit,
  onRestoreToCollection,
  restoreLoading = false,
  onToggleFeatured,
  isFeatured = false,
  featureLoading = false,
}: MemorialFooterProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.footer,
        { marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
      ]}
    >
      <View
        style={[
          styles.footerRule,
          { backgroundColor: colors.surfaceContainerHigh },
        ]}
      />
      <View style={styles.footerRememberedRow}>
        <Icon name="heart" size={16} color={colors.onSurfaceVariant + 90} />
        <Text
          style={[styles.footerRemembered, { color: colors.onSurfaceVariant }]}
        >
          Gently Remembered
        </Text>
      </View>
      {onRestoreToCollection ? (
        <SecondaryButton
          label={restoreLoading ? "Restoring..." : "Return to Collection"}
          backgroundColor={colors.surfaceContainerLow}
          textColor={colors.primary}
          onPress={restoreLoading ? undefined : onRestoreToCollection}
        />
      ) : null}
      <SecondaryButton
        label="Edit Memorial"
        backgroundColor={colors.surfaceContainerLow}
        textColor={colors.primary}
        onPress={onEdit}
      />
      {onToggleFeatured ? (
        <SecondaryButton
          label={
            featureLoading
              ? "Saving..."
              : isFeatured
                ? "Featured on Graveyard"
                : "Feature on Graveyard"
          }
          backgroundColor={colors.surfaceContainerLow}
          textColor={colors.primary}
          onPress={featureLoading ? undefined : onToggleFeatured}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingBottom: 24,
    alignItems: "center",
    gap: 24,
  },
  footerRule: {
    width: "100%",
    height: 1,
    opacity: 0.55,
  },
  footerRememberedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerRemembered: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.6,
  },
});

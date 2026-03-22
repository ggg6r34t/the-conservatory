import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useSettings } from "@/features/settings/hooks/useSettings";

export default function InterfaceThemeScreen() {
  const { colors } = useTheme();
  const settingsQuery = useSettings();
  const preferredTheme = settingsQuery.data?.preferredTheme ?? "linen-light";

  return (
    <ProfileScreenScaffold
      title="Interface Theme"
      subtitle="Visual environment"
      description="Your conservatory currently uses the linen-light editorial theme designed to complement plant photography and readable long-form care notes."
    >
      <View
        style={[
          styles.themeCard,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <View
          style={[
            styles.preview,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
        >
          <View
            style={[
              styles.previewHeader,
              { backgroundColor: colors.surface },
            ]}
          />
          <View style={styles.previewBody}>
            <View
              style={[
                styles.previewPanel,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            />
            <View
              style={[
                styles.previewButton,
                { backgroundColor: colors.primary },
              ]}
            />
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={[styles.name, { color: colors.primary }]}>
            Linen Light
          </Text>
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            The current release ships with one polished theme tuned for the
            editorial Conservatory experience.
          </Text>
        </View>

        <View
          style={[
            styles.selectedChip,
            { backgroundColor: colors.primary },
          ]}
        >
          <Icon name="check" size={16} color={colors.surfaceBright} />
          <Text style={[styles.selectedLabel, { color: colors.surfaceBright }]}>
            {preferredTheme === "linen-light" ? "Selected" : "Active"}
          </Text>
        </View>
      </View>
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  themeCard: {
    borderRadius: 28,
    padding: 18,
    gap: 16,
  },
  preview: {
    borderRadius: 22,
    overflow: "hidden",
    height: 180,
  },
  previewHeader: {
    height: 28,
  },
  previewBody: {
    flex: 1,
    padding: 18,
    justifyContent: "space-between",
  },
  previewPanel: {
    height: 82,
    borderRadius: 18,
  },
  previewButton: {
    width: 134,
    height: 40,
    borderRadius: 999,
  },
  copy: {
    gap: 6,
  },
  name: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  selectedChip: {
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
});

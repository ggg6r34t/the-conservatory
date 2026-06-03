import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";

function Row({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceContainerLow }]}>
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        {body}
      </Text>
    </View>
  );
}

export default function DowngradeScreen() {
  return (
    <ProfileScreenScaffold
      title="After Premium"
      subtitle="Subscription changes"
      description="Your collection remains yours. Downgrading changes future premium actions; it does not remove your plants, care history, memorials, notes, or existing photos."
    >
      <Row
        title="What stays available"
        body="Plant records, care logs, basic reminders, graveyard and memorial entries, local photos, existing uploaded photo links, and basic JSON export remain accessible."
      />
      <Row
        title="What pauses"
        body="New premium photo backup, unlimited photo uploads, premium AI, specimen tag creation, archive curation, and enhanced export pause until Premium is active again."
      />
      <Row
        title="What is not deleted"
        body="Downgrading does not delete local photos, cloud photo URLs already created, memorial notes, care history, or archived specimens."
      />
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
});

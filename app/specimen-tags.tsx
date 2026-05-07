import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";

import { useTheme } from "@/components/design-system/useTheme";
import { UpgradePrompt } from "@/features/billing/components/UpgradePrompt";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { useSpecimenTags } from "@/features/plants/hooks/useSpecimenTags";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";

export default function SpecimenTagsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPremium } = useSubscription();
  const { plants, tags } = useSpecimenTags();
  const tagsByPlantId = new Map(tags.map((tag) => [tag.plantId, tag]));

  return (
    <ProfileScreenScaffold
      title="Specimen Tags"
      subtitle="Collection registry"
      description="Use these specimen identifiers to keep your collection labeled consistently across care notes, archives, and physical tags."
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/specimen-scan" as Href)}
        style={[styles.scanButton, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.scanLabel, { color: colors.surface }]}>
          Scan Tag
        </Text>
      </Pressable>

      {isPremium ? (
        plants.length ? (
          plants.map((plant) => {
            const tag = tagsByPlantId.get(plant.id);
            return (
              <View
                key={plant.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surfaceContainerLowest },
                ]}
              >
                <View style={styles.copy}>
                  <Text style={[styles.name, { color: colors.primary }]}>
                    {plant.name}
                  </Text>
                  <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
                    {plant.speciesName}
                    {plant.location ? ` - ${plant.location}` : ""}
                  </Text>
                </View>

                <View
                  style={[
                    styles.tagChip,
                    { backgroundColor: colors.surfaceContainerLow },
                  ]}
                >
                  <Text style={[styles.tagLabel, { color: colors.secondary }]}>
                    {tag?.code ?? "Preparing"}
                  </Text>
                </View>
                {tag ? (
                  <View style={styles.tagActions}>
                    <View style={styles.qrWrap}>
                      <QRCode
                        value={tag.payload}
                        size={72}
                        color={colors.primary}
                        backgroundColor={colors.surfaceContainerLow}
                        ecl="M"
                      />
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void Share.share({
                          title: `${plant.name} specimen tag`,
                          message: tag.payload,
                        });
                      }}
                      style={[
                        styles.shareButton,
                        { backgroundColor: colors.surfaceContainerLow },
                      ]}
                    >
                      <Text
                        style={[styles.shareLabel, { color: colors.primary }]}
                      >
                        Share
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surfaceContainerLow },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.primary }]}>
              No active specimens
            </Text>
            <Text style={[styles.emptyBody, { color: colors.onSurfaceVariant }]}>
              Add a plant to generate specimen identifiers for your collection.
            </Text>
          </View>
        )
      ) : (
        <UpgradePrompt
          message="Generate botanical QR labels for your collection and keep your plants consistently identified across care notes and archives."
          cta="Explore Premium"
        />
      )}
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  scanButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  scanLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  tagChip: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  qrWrap: {
    width: 72,
    height: 72,
    overflow: "hidden",
  },
  tagActions: {
    alignItems: "center",
    gap: 8,
  },
  shareButton: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  shareLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  tagLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  emptyCard: {
    borderRadius: 26,
    padding: 22,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
});

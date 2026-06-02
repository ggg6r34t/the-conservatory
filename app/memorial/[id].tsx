import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { MemorialEntrySheet } from "@/features/plants/components/MemorialEntrySheet";
import { MemorialFilmstrip } from "@/features/plants/components/MemorialFilmstrip";
import { MemorialFooter } from "@/features/plants/components/MemorialFooter";
import { MemorialHero } from "@/features/plants/components/MemorialHero";
import { MemorialLesson } from "@/features/plants/components/MemorialLesson";
import { MemorialStatsCard } from "@/features/plants/components/MemorialStatsCard";
import { useGraveyard } from "@/features/plants/hooks/useGraveyard";
import { useMemorialLayoutPreferences } from "@/features/plants/hooks/useMemorialLayoutPreferences";
import { usePlant } from "@/features/plants/hooks/usePlant";
import { useRestorePlant } from "@/features/plants/hooks/useRestorePlant";
import { useUpdateGraveyardMemorial } from "@/features/plants/hooks/useUpdateGraveyardMemorial";
import { FREE_PLANT_LIMIT } from "@/features/billing/constants";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { useAlert } from "@/hooks/useAlert";
import { useSnackbar } from "@/hooks/useSnackbar";

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "255, 255, 255";
}

function formatYearRange(createdAt: string, archivedAt: string) {
  const start = new Date(createdAt).getFullYear();
  const end = new Date(archivedAt).getFullYear();

  return start === end ? String(start) : `${start} - ${end}`;
}

function buildMemorialQuote(
  memorialNote: string | null | undefined,
  plantNotes: string | null | undefined,
) {
  return (
    memorialNote?.trim() ??
    plantNotes?.trim() ??
    "Quietly remembered as part of your conservatory."
  );
}

export default function MemorialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const { user } = useAuth();
  const graveyardQuery = useGraveyard();
  const memorial = (graveyardQuery.data ?? []).find((entry) => entry.id === id) ?? null;
  const layoutPreferences = useMemorialLayoutPreferences(user?.id);
  const isFeatured =
    memorial?.id != null &&
    layoutPreferences.preferences?.featuredMemorialId === memorial.id;

  const plantQuery = usePlant(memorial?.plantId ?? "");
  const photos = plantQuery.data?.photos ?? [];

  const { isPremium } = useSubscription();
  const updateMemorial = useUpdateGraveyardMemorial();
  const restorePlant = useRestorePlant(memorial?.plantId ?? "");
  const alert = useAlert();
  const snackbar = useSnackbar();
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const displayName = memorial?.nickname ?? memorial?.name ?? "-";
  const speciesLabel = memorial?.speciesName ?? "";
  const yearRange = memorial
    ? formatYearRange(memorial.createdAt, memorial.archivedAt)
    : "";
  const causeLabel = memorial?.causeOfPassing?.trim() || null;
  const memorialQuote = memorial
    ? buildMemorialQuote(memorial.memorialNote, memorial.plantNotes)
    : "";
  const heroGradientColors = [
    "transparent",
    `rgba(${hexToRgb(colors.surface)}, 0.5)`,
    colors.surface,
  ] as const;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      {memorial ? (
        <MemorialEntrySheet
          visible={editSheetOpen}
          memorial={memorial}
          loading={updateMemorial.isPending}
          onClose={() => {
            if (!updateMemorial.isPending) {
              setEditSheetOpen(false);
            }
          }}
          onConfirm={async (input) => {
            try {
              await updateMemorial.mutateAsync(input);
              setEditSheetOpen(false);
              snackbar.success("Memorial saved.");
            } catch (error) {
              await alert.show({
                variant: "error",
                title: "Unable to save memorial",
                message: error instanceof Error ? error.message : "Try again.",
                primaryAction: { label: "Close", tone: "danger" },
              });
            }
          }}
        />
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <MemorialHero
          photoUri={memorial?.primaryPhotoUri}
          displayName={displayName}
          speciesLabel={speciesLabel}
          heroGradientColors={heroGradientColors}
          onBack={() => router.back()}
        />

        {memorial ? (
          <MemorialStatsCard yearRange={yearRange} causeLabel={causeLabel} />
        ) : null}

        {memorialQuote ? <MemorialLesson quote={memorialQuote} /> : null}

        {photos.length > 0 ? <MemorialFilmstrip photos={photos} /> : null}

        {memorial ? (
          <MemorialFooter
            onEdit={() => setEditSheetOpen(true)}
            onRestoreToCollection={() => {
              void (async () => {
                const confirmed = await alert.confirm({
                  title: "Return to collection?",
                  message:
                    "This plant will leave the graveyard and appear in your active library again. Memorial notes stay in your care history.",
                  primaryAction: { label: "Restore", tone: "primary" },
                  secondaryAction: { label: "Cancel" },
                });

                if (!confirmed) {
                  return;
                }

                try {
                  await restorePlant.mutateAsync();
                  snackbar.success("Plant restored to your collection.");
                  router.replace(`/plant/${memorial.plantId}` as const);
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "This plant could not be restored.";
                  const isLimit =
                    typeof error === "object" &&
                    error !== null &&
                    "code" in error &&
                    error.code === "PLANT_LIMIT_REACHED";

                  await alert.show({
                    variant: "error",
                    title: isLimit
                      ? "Plant limit reached"
                      : "Unable to restore plant",
                    message: isLimit
                      ? isPremium
                        ? `You already have ${FREE_PLANT_LIMIT} active plants in this archive.`
                        : `Free accounts can hold up to ${FREE_PLANT_LIMIT} active plants. Upgrade to Premium for unlimited plants.`
                      : message,
                    primaryAction: {
                      label: isLimit && !isPremium ? "View Premium" : "Close",
                      tone: isLimit && !isPremium ? "primary" : "danger",
                      onPress:
                        isLimit && !isPremium
                          ? () => router.push("/premium")
                          : undefined,
                    },
                  });
                }
              })();
            }}
            restoreLoading={restorePlant.isPending}
            isFeatured={isFeatured}
            featureLoading={layoutPreferences.setFeaturedMemorial.isPending}
            onToggleFeatured={() => {
              void layoutPreferences.setFeaturedMemorial
                .mutateAsync(isFeatured ? null : memorial.id)
                .then(() => {
                  snackbar.success(
                    isFeatured
                      ? "Memorial removed from graveyard feature."
                      : "Memorial featured on graveyard.",
                  );
                })
                .catch(async (error) => {
                  await alert.show({
                    variant: "error",
                    title: "Unable to update memorial layout",
                    message:
                      error instanceof Error ? error.message : "Try again.",
                    primaryAction: { label: "Close", tone: "danger" },
                  });
                });
            }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
});

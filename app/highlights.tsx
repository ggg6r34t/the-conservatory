import { useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import { EmptyState } from "@/features/empty-states/components/EmptyState";
import { getEmptyStateForContext } from "@/features/empty-states/getEmptyStateForContext";
import { resolveHighlightsEmptyContext } from "@/features/empty-states/resolveHighlightsEmptyContext";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { MonthlyHighlightMonthSection } from "@/features/journal/components/MonthlyHighlightMonthSection";
import { MonthlyHighlightsHero } from "@/features/journal/components/MonthlyHighlightsHero";
import { useMonthlyHighlights } from "@/features/journal/hooks/useMonthlyHighlights";
import { usePullToRefreshSync } from "@/hooks/usePullToRefreshSync";

export default function MonthlyHighlightsScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { onRefresh, refreshing } = usePullToRefreshSync();
  const { sections, isError: hasError, plantsQuery, photosQuery } =
    useMonthlyHighlights();
  const plantCount = plantsQuery?.data?.length ?? 0;
  const progressPhotoCount = photosQuery?.data?.length ?? 0;
  const highlightsEmptyContext = resolveHighlightsEmptyContext({
    plantCount,
    progressPhotoCount,
  });

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.lg,
            paddingBottom: 96,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
          <View style={styles.topBarLeft}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={10}
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Icon
                family="MaterialCommunityIcons"
                name="arrow-left"
                size={24}
                color={colors.primary}
              />
            </Pressable>

            <Text style={[styles.topBarTitle, { color: colors.primary }]}>
              Highlights
            </Text>
          </View>
        </View>

        <View style={[styles.introWrap, { paddingHorizontal: spacing.lg }]}>
          <MonthlyHighlightsHero />
        </View>

        {hasError ? (
          <EmptyState
            content={getEmptyStateForContext({ context: "highlights.error" })}
            screen="highlights"
            reason="query_error"
            onPrimaryAction={onRefresh}
            style={StyleSheet.flatten([
              styles.emptyCard,
              { marginHorizontal: spacing.lg },
            ])}
          />
        ) : sections.length ? (
          <View style={[styles.sections, { paddingHorizontal: spacing.lg }]}>
            {sections.map((section) => (
              <MonthlyHighlightMonthSection
                key={section.key}
                section={section}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            content={getEmptyStateForContext({
              context: highlightsEmptyContext,
            })}
            screen="highlights"
            reason={
              plantCount === 0
                ? "no_plants"
                : progressPhotoCount === 0
                  ? "no_progress_photos"
                  : "no_qualifying_highlights"
            }
            primaryHref={
              plantCount === 0 || progressPhotoCount === 0
                ? "/plant/add"
                : undefined
            }
            style={StyleSheet.flatten([
              styles.emptyCard,
              { marginHorizontal: spacing.lg },
            ])}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  introWrap: {
    paddingTop: 4,
  },
  sections: {
    paddingTop: 4,
    gap: 40,
  },
  emptyCard: {
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 25,
  },
});

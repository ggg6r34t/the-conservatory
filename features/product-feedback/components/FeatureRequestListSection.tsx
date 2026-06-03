import type { Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { EmptyState } from "@/features/empty-states/components/EmptyState";
import type { EmptyStateContent } from "@/features/empty-states/types";
import { FeatureRequestCard } from "@/features/product-feedback/components/FeatureRequestCard";
import type { FeatureRequest } from "@/features/product-feedback/types";

type FeatureRequestListSectionProps = {
  title: string;
  subtitle?: string;
  requests: FeatureRequest[];
  onRequestPress: (requestId: string) => void;
  onVotePress?: (request: FeatureRequest) => void;
  emptyMessage?: string;
  emptyContent?: EmptyStateContent;
  emptyScreen?: string;
  emptyReason?: string;
  emptyPrimaryHref?: Href;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
};

export function FeatureRequestListSection({
  title,
  subtitle,
  requests,
  onRequestPress,
  onVotePress,
  emptyMessage = "Nothing here yet.",
  emptyContent,
  emptyScreen = "feature_requests",
  emptyReason = "list_empty",
  emptyPrimaryHref,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: FeatureRequestListSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {requests.length ? (
        requests.map((request) => (
          <FeatureRequestCard
            key={request.id}
            request={request}
            onPress={() => onRequestPress(request.id)}
            onVotePress={
              onVotePress ? () => onVotePress(request) : undefined
            }
          />
        ))
      ) : emptyContent ? (
        <EmptyState
          content={emptyContent}
          screen={emptyScreen}
          reason={emptyReason}
          primaryHref={emptyPrimaryHref}
          style={styles.emptyCard}
        />
      ) : (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
        >
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            {emptyMessage}
          </Text>
        </View>
      )}
      {hasMore && onLoadMore ? (
        <PrimaryButton
          label={isLoadingMore ? "Loading..." : "Load More"}
          disabled={isLoadingMore}
          onPress={onLoadMore}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  header: {
    gap: 4,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 18,
  },
  emptyText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
});

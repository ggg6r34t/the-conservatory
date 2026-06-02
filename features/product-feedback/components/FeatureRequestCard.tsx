import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import {
  formatFeatureRequestDate,
  getFeatureRequestStatusPresentation,
} from "@/features/product-feedback/services/featureRequestStatusPresentation";
import type { FeatureRequest } from "@/features/product-feedback/types";

type FeatureRequestCardProps = {
  request: FeatureRequest;
  onPress: () => void;
  onVotePress?: () => void;
};

export function FeatureRequestCard({
  request,
  onPress,
  onVotePress,
}: FeatureRequestCardProps) {
  const { colors } = useTheme();
  const status = getFeatureRequestStatusPresentation(request.status);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${request.title}, ${status.accessibilityLabel}, ${request.voteCount} votes`}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.surfaceContainerLow },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.primary }]}>
            {request.title}
          </Text>
          <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
            {request.category} · {formatFeatureRequestDate(request.createdAt)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            request.hasVoted
              ? `Remove support, ${request.voteCount} votes`
              : `Support this request, ${request.voteCount} votes`
          }
          disabled={!onVotePress}
          onPress={onVotePress}
          style={[
            styles.votePill,
            {
              backgroundColor: request.hasVoted
                ? colors.primaryContainer
                : colors.surfaceContainerHigh,
            },
          ]}
        >
          <Icon
            family="MaterialCommunityIcons"
            name={request.hasVoted ? "heart" : "heart-outline"}
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.voteCount, { color: colors.primary }]}>
            {request.voteCount}
          </Text>
        </Pressable>
      </View>
      <Text
        numberOfLines={2}
        style={[styles.description, { color: colors.onSurfaceVariant }]}
      >
        {request.description}
      </Text>
      <View style={styles.statusRow}>
        <Icon
          family="MaterialCommunityIcons"
          name={status.icon}
          size={16}
          color={colors[status.colorToken]}
        />
        <Text style={[styles.statusLabel, { color: colors[status.colorToken] }]}>
          {status.label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  votePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  voteCount: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

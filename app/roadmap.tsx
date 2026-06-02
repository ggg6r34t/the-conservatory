import { useRouter, type Href } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { isFeatureRequestBackendAvailable } from "@/features/product-feedback/api/featureRequestsClient";
import { ProductFeedbackUnavailable } from "@/features/product-feedback/components/ProductFeedbackUnavailable";
import { RoadmapSection } from "@/features/product-feedback/components/RoadmapSection";
import { useRoadmap } from "@/features/product-feedback/hooks/useRoadmap";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";

export default function RoadmapScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const roadmapQuery = useRoadmap();

  if (!isFeatureRequestBackendAvailable()) {
    return (
      <ProfileScreenScaffold
        title="Roadmap"
        subtitle="Product direction"
        description="See what is planned, in progress, and recently released."
      >
        <ProductFeedbackUnavailable />
      </ProfileScreenScaffold>
    );
  }

  if (roadmapQuery.isLoading) {
    return (
      <ProfileScreenScaffold
        title="Roadmap"
        subtitle="Product direction"
        description="See what is planned, in progress, and recently released."
      >
        <ActivityIndicator color={colors.primary} />
      </ProfileScreenScaffold>
    );
  }

  const items = roadmapQuery.data ?? [];
  const planned = items.filter((item) => item.status === "planned");
  const inProgress = items.filter((item) => item.status === "in_progress");
  const released = items.filter((item) => item.status === "released");

  return (
    <ProfileScreenScaffold
      title="Roadmap"
      subtitle="Product direction"
      description="A calm view of where The Conservatory is heading next."
    >
      <View style={styles.sections}>
        <RoadmapSection
          title="Planned"
          items={planned}
          onItemPress={(item) => {
            const requestId = item.linkedRequestIds[0];
            if (requestId) {
              router.push(`/feature-requests/${requestId}` as Href);
            }
          }}
        />
        <RoadmapSection
          title="In Progress"
          items={inProgress}
          onItemPress={(item) => {
            const requestId = item.linkedRequestIds[0];
            if (requestId) {
              router.push(`/feature-requests/${requestId}` as Href);
            }
          }}
        />
        <RoadmapSection
          title="Recently Released"
          items={released}
          onItemPress={(item) => {
            const requestId = item.linkedRequestIds[0];
            if (requestId) {
              router.push(`/feature-requests/${requestId}` as Href);
            }
          }}
        />
      </View>
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: 24,
  },
});

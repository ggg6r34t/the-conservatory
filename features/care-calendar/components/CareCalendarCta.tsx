import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { trackCareCalendarOpened } from "@/features/care-calendar/analytics";
import { dashboardEditorialEntryCardStyles } from "@/styles/dashboardEntryCards";

interface CareCalendarCtaProps {
  body: string;
}

export function CareCalendarCta({ body }: CareCalendarCtaProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View care calendar"
      onPress={() => {
        trackCareCalendarOpened("dashboard");
        router.push("/care-calendar" as const);
      }}
      style={[
        dashboardEditorialEntryCardStyles.card,
        { backgroundColor: colors.surfaceContainerLow },
      ]}
    >
      <View style={dashboardEditorialEntryCardStyles.copy}>
        <Text style={[dashboardEditorialEntryCardStyles.eyebrow, { color: colors.secondary }]}>
          Care rhythm
        </Text>
        <Text style={[dashboardEditorialEntryCardStyles.title, { color: colors.primary }]}>
          View care calendar
        </Text>
        <Text style={[dashboardEditorialEntryCardStyles.body, { color: colors.onSurfaceVariant }]}>
          {body}
        </Text>
      </View>
      <Icon
        family="MaterialCommunityIcons"
        name="calendar-month-outline"
        size={22}
        color={colors.primary}
      />
    </Pressable>
  );
}

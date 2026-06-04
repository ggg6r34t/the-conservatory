import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { getCareCalendarCareTypeIcon } from "@/features/care-calendar/services/careCalendarCareTypeIcons";
import type { CareCalendarDayMarkers } from "@/features/care-calendar/services/careCalendarDayMarkers";

interface CareCalendarDayMarkersProps {
  markers: CareCalendarDayMarkers;
  selected?: boolean;
  onPlantLongPress?: (plantId: string) => void;
}

const AVATAR_SIZE = 14;
const AVATAR_OVERLAP = 5;
const CARE_ICON_SIZE = 11;

export function CareCalendarDayMarkers({
  markers,
  selected = false,
  onPlantLongPress,
}: CareCalendarDayMarkersProps) {
  const { colors } = useTheme();

  if (markers.activeTaskCount === 0) {
    return <View style={styles.spacer} />;
  }

  const iconColor = markers.hasOverdue
    ? colors.error
    : selected
      ? colors.onPrimary
      : colors.secondary;
  const avatarBorderColor = selected ? colors.primary : colors.surface;

  return (
    <View style={styles.wrap}>
      {markers.careTypes.length > 0 ? (
        <View style={styles.iconRow}>
          {markers.careTypes.map((careType) => {
            const icon = getCareCalendarCareTypeIcon(careType);
            return (
              <Icon
                key={careType}
                family={icon.family}
                name={icon.name}
                size={CARE_ICON_SIZE}
                color={iconColor}
              />
            );
          })}
        </View>
      ) : null}

      {markers.plants.length > 0 ? (
        <View style={styles.avatarRow}>
          {markers.plants.map((plant, index) => (
            <Pressable
              key={plant.plantId}
              accessibilityRole="button"
              accessibilityLabel={`Open ${plant.plantName}`}
              onLongPress={
                onPlantLongPress
                  ? () => onPlantLongPress(plant.plantId)
                  : undefined
              }
              style={[
                styles.avatarWrap,
                {
                  marginLeft: index === 0 ? 0 : -AVATAR_OVERLAP,
                  borderColor: avatarBorderColor,
                  zIndex: markers.plants.length - index,
                },
              ]}
            >
              {plant.photoUri ? (
                <Image
                  source={{ uri: plant.photoUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.surfaceContainerHigh },
                  ]}
                >
                  <Icon
                    family="MaterialCommunityIcons"
                    name="sprout"
                    size={8}
                    color={colors.primary}
                  />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spacer: {
    minHeight: 22,
  },
  wrap: {
    minHeight: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

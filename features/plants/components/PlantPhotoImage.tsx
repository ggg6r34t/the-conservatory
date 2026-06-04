import { Image, type ImageProps } from "expo-image";
import { memo, useEffect, useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import {
  resolvePhotoDisplayUri,
  trackResolvedPlantListPhoto,
  type PhotoUriFields,
  type PlantPhotoDisplayContext,
  type PrimaryPhotoSummaryFields,
} from "@/features/plants/services/plantPhotoResolver";

type PlantPhotoImageProps = {
  photo?: PhotoUriFields | null;
  plant?: PrimaryPhotoSummaryFields | null;
  displayUri?: string | null;
  context?: PlantPhotoDisplayContext;
  analyticsScreen?: string;
  style?: ImageProps["style"];
  frameStyle?: StyleProp<ViewStyle>;
  fallbackStyle?: StyleProp<ViewStyle>;
  contentFit?: ImageProps["contentFit"];
  cachePolicy?: ImageProps["cachePolicy"];
};

export const PlantPhotoImage = memo(function PlantPhotoImage({
  photo,
  plant,
  displayUri,
  context = "card",
  analyticsScreen,
  style,
  frameStyle,
  fallbackStyle,
  contentFit = "cover",
  cachePolicy = "memory-disk",
}: PlantPhotoImageProps) {
  const { colors } = useTheme();

  const uri = useMemo(() => {
    if (displayUri) {
      return displayUri;
    }

    if (photo) {
      return resolvePhotoDisplayUri(photo, { context, analyticsScreen });
    }

    if (plant?.primaryPhotoUri) {
      return plant.primaryPhotoUri;
    }

    return null;
  }, [analyticsScreen, context, displayUri, photo, plant]);

  useEffect(() => {
    if (analyticsScreen && plant?.primaryPhotoUri && uri) {
      trackResolvedPlantListPhoto(analyticsScreen, plant, uri);
    }
  }, [analyticsScreen, plant, uri]);

  if (!uri) {
    return (
      <View
        style={[
          styles.fallback,
          { backgroundColor: colors.surfaceContainerHigh },
          fallbackStyle,
          frameStyle,
        ]}
      />
    );
  }

  return (
    <View style={frameStyle}>
      <Image
        source={{ uri }}
        style={[styles.image, style]}
        contentFit={contentFit}
        cachePolicy={cachePolicy}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    width: "100%",
    height: "100%",
  },
});

import { Image, type ImageProps } from "expo-image";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { getStorageAssetUrl } from "@/services/supabase/storage";
import {
  resolvePhotoDisplayFallbackUri,
  resolvePhotoDisplayUri,
  resolvePlantListPhotoFallbackUri,
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
  const [activeUri, setActiveUri] = useState<string | null>(null);
  const [failedUris, setFailedUris] = useState<string[]>([]);

  const initialUri = useMemo(() => {
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
    setActiveUri(initialUri);
    setFailedUris([]);
  }, [initialUri]);

  useEffect(() => {
    if (analyticsScreen && plant?.primaryPhotoUri && activeUri) {
      trackResolvedPlantListPhoto(analyticsScreen, plant, activeUri);
    }
  }, [activeUri, analyticsScreen, plant]);

  const handleError = useCallback(() => {
    if (!activeUri) {
      return;
    }

    const nextFailed = [...failedUris, activeUri];
    setFailedUris(nextFailed);

    const syncFallback = photo
      ? resolvePhotoDisplayFallbackUri(photo, activeUri, {
          context,
          failedUris: nextFailed,
        })
      : plant
        ? resolvePlantListPhotoFallbackUri(plant, activeUri, nextFailed)
        : null;

    if (syncFallback) {
      setActiveUri(syncFallback);
      return;
    }

    const storagePath = photo?.storagePath ?? plant?.primaryPhotoStoragePath;
    if (!storagePath) {
      setActiveUri(null);
      return;
    }

    void getStorageAssetUrl(storagePath).then((signedUri) => {
      if (!signedUri || nextFailed.includes(signedUri)) {
        setActiveUri(null);
        return;
      }

      setActiveUri(signedUri);
    });
  }, [activeUri, context, failedUris, photo, plant]);

  if (!activeUri) {
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
        source={{ uri: activeUri }}
        style={[styles.image, style]}
        contentFit={contentFit}
        cachePolicy={cachePolicy}
        onError={handleError}
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

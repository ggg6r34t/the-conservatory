import { useRouter } from "expo-router";
import { useEffect, useState, type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { isExpoCameraNativeAvailable } from "@/features/permissions/cameraAvailability";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";

export default function SpecimenScanEntry() {
  const router = useRouter();
  const { colors } = useTheme();
  const [CameraScreen, setCameraScreen] = useState<ComponentType | null>(null);
  const cameraNativeAvailable = isExpoCameraNativeAvailable();

  useEffect(() => {
    if (!cameraNativeAvailable) {
      return;
    }

    let cancelled = false;
    const cameraModule = require("@/features/plants/components/SpecimenScanCameraScreen") as {
      default: ComponentType;
    };
    if (!cancelled) {
      setCameraScreen(() => cameraModule.default);
    }

    return () => {
      cancelled = true;
    };
  }, [cameraNativeAvailable]);

  if (!cameraNativeAvailable) {
    return (
      <ProfileScreenScaffold
        title="Scan Specimen"
        subtitle="Development build required"
        description="Specimen scanning needs the native camera module, which is not available in Expo Go."
      >
        <View
          style={[
            styles.unavailableCard,
            { backgroundColor: colors.surfaceContainerLow },
          ]}
        >
          <Text style={[styles.unavailableTitle, { color: colors.primary }]}>
            Use a development build
          </Text>
          <Text
            style={[styles.unavailableBody, { color: colors.onSurfaceVariant }]}
          >
            Install an EAS development build of The Conservatory to scan specimen
            tags. Expo Go cannot load the camera native module required for this
            screen.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.backButtonLabel, { color: colors.surface }]}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </ProfileScreenScaffold>
    );
  }

  if (!CameraScreen) {
    return null;
  }

  return <CameraScreen />;
}

const styles = StyleSheet.create({
  unavailableCard: {
    borderRadius: 24,
    padding: 24,
    gap: 14,
  },
  unavailableTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  unavailableBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 23,
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  backButtonLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
});

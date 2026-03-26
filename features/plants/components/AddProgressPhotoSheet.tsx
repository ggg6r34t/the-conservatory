import { BlurView } from "expo-blur";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { shadowScale, shadowWithColor } from "@/styles/shadows";

interface AddProgressPhotoSheetProps {
  visible: boolean;
  onClose: () => void;
  onCapture: () => void;
  onPickFromLibrary: () => void;
}

export function AddProgressPhotoSheet({
  visible,
  onClose,
  onCapture,
  onPickFromLibrary,
}: AddProgressPhotoSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (!visible) {
      sheetOpacity.setValue(0);
      sheetTranslateY.setValue(24);
      return;
    }

    sheetOpacity.setValue(0);
    sheetTranslateY.setValue(24);

    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [sheetOpacity, sheetTranslateY, visible]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFill}>
          <View
            style={[
              styles.overlayTint,
              { backgroundColor: colors.backdrop },
            ]}
          />
        </BlurView>
        <Animated.View
          style={[
            styles.sheet,
            shadowWithColor(shadowScale.floatingSheet, colors.backdrop),
            {
              backgroundColor: colors.surfaceContainerLowest,
              paddingBottom: Math.max(20, insets.bottom + 8),
              borderColor: "rgba(255, 255, 255, 0.72)",
              opacity: sheetOpacity,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary }]}>
              Add Progress Photo
            </Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
              Capture a fresh milestone or choose one from your library.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCapture}
              style={({ pressed }) => [
                styles.actionCard,
                {
                  backgroundColor: colors.surfaceContainerLow,
                  borderColor: colors.surfaceContainerHigh,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.992 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.actionIconTile,
                  { backgroundColor: colors.secondaryContainer },
                ]}
              >
                <Icon
                  family="MaterialIcons"
                  name="photo-camera"
                  size={22}
                  color={colors.secondary}
                />
              </View>
              <Text style={[styles.actionTitle, { color: colors.onSurface }]}>
                Take Photo
              </Text>
              <Text style={[styles.actionBody, { color: colors.onSurfaceVariant }]}>
                Open the camera and capture today&apos;s growth.
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onPickFromLibrary}
              style={({ pressed }) => [
                styles.actionCard,
                {
                  backgroundColor: colors.surfaceContainerLow,
                  borderColor: colors.surfaceContainerHigh,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.992 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.actionIconTile,
                  { backgroundColor: colors.primaryFixed },
                ]}
              >
                <Icon
                  family="MaterialIcons"
                  name="photo-library"
                  size={22}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.actionTitle, { color: colors.onSurface }]}>
                Photo Library
              </Text>
              <Text style={[styles.actionBody, { color: colors.onSurfaceVariant }]}>
                Choose an existing image from your camera roll.
              </Text>
            </Pressable>
          </View>

          <SecondaryButton
            label="Cancel"
            fullWidth
            variant="surface"
            onPress={onClose}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 18,
    borderWidth: 1,
  },
  handle: {
    width: 64,
    height: 6,
    borderRadius: 999,
    alignSelf: "center",
  },
  header: {
    gap: 6,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  actionCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
    ...shadowScale.subtleSurface,
  },
  actionIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  actionBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
});

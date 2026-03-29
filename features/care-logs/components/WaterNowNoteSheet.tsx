import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { shadowScale, shadowWithColor } from "@/styles/shadows";

interface WaterNowNoteSheetProps {
  visible: boolean;
  initialValue?: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
}

export function WaterNowNoteSheet({
  visible,
  initialValue = "",
  saving = false,
  onClose,
  onSave,
}: WaterNowNoteSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState(initialValue);
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (!visible) {
      setNote(initialValue);
      sheetOpacity.setValue(0);
      sheetTranslateY.setValue(24);
      return;
    }

    setNote(initialValue);
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
  }, [initialValue, sheetOpacity, sheetTranslateY, visible]);

  const trimmedNote = note.trim();

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={saving ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={saving ? undefined : onClose}
        />
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
              Add a note
            </Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
              Your watering is already saved. Add a quick note if you want it on
              this same care entry.
            </Text>
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What changed today?"
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            textAlignVertical="top"
            editable={!saving}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderColor: colors.surfaceContainerHigh,
                color: colors.onSurface,
              },
            ]}
          />

          <View style={styles.actions}>
            <SecondaryButton
              label="Maybe later"
              fullWidth
              variant="surface"
              onPress={() => {
                if (!saving) {
                  onClose();
                }
              }}
            />
            <PrimaryButton
              label="Save Note"
              fullWidth
              onPress={() => onSave(trimmedNote)}
              disabled={trimmedNote.length === 0}
              loading={saving}
            />
          </View>
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
  input: {
    minHeight: 140,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    gap: 12,
  },
});

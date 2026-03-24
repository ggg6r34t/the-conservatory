import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import type { GraveyardPlantListItem } from "@/features/plants/api/plantsClient";
import { shadowScale, shadowWithColor } from "@/styles/shadows";

const CAUSE_OPTIONS = [
  "Overwatering",
  "Underwatering",
  "Pests or disease",
  "Root rot",
  "Propagation loss",
  "Unknown",
] as const;

interface MemorialEntrySheetProps {
  visible: boolean;
  memorial: GraveyardPlantListItem | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (input: {
    graveyardId: string;
    causeOfPassing?: string;
    memorialNote?: string;
  }) => Promise<void> | void;
}

export function MemorialEntrySheet({
  visible,
  memorial,
  loading = false,
  onClose,
  onConfirm,
}: MemorialEntrySheetProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [causeOfPassing, setCauseOfPassing] = useState("");
  const [memorialNote, setMemorialNote] = useState("");
  const [causeMenuVisible, setCauseMenuVisible] = useState(false);
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    if (!visible) {
      setCauseMenuVisible(false);
      sheetOpacity.setValue(0);
      sheetTranslateY.setValue(28);
      return;
    }

    setCauseOfPassing(memorial?.causeOfPassing?.trim() ?? "");
    setMemorialNote(memorial?.memorialNote?.trim() ?? "");
    sheetOpacity.setValue(0);
    sheetTranslateY.setValue(28);

    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [memorial, sheetOpacity, sheetTranslateY, visible]);

  const handleConfirm = async () => {
    if (!memorial) {
      return;
    }

    await onConfirm({
      graveyardId: memorial.id,
      causeOfPassing: causeOfPassing || undefined,
      memorialNote: memorialNote.trim() || undefined,
    });
  };

  const actionLabel = memorial?.memorialNote?.trim()
    ? "Update Memorial"
    : "Save Memorial";

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <BlurView intensity={54} tint="dark" style={StyleSheet.absoluteFill}>
          <View
            style={[styles.overlayTint, { backgroundColor: colors.backdrop }]}
          />
        </BlurView>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardWrap}
        >
          <Animated.View
            style={[
              styles.sheet,
              shadowWithColor(shadowScale.floatingSheet, colors.backdrop),
              {
                backgroundColor: colors.surfaceContainerLowest,
                paddingBottom: Math.max(24, insets.bottom + 12),
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

            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              <View style={styles.heroWrap}>
                <View
                  style={[
                    styles.heroImageShell,
                    { backgroundColor: colors.surfaceContainerLow },
                  ]}
                >
                  {memorial?.primaryPhotoUri ? (
                    <Image
                      source={{ uri: memorial.primaryPhotoUri }}
                      style={styles.heroImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.heroFallback}>
                      <Icon name="leaf" size={56} color={colors.primary} />
                    </View>
                  )}
                </View>

                <View style={styles.heroCopy}>
                  <Text style={[styles.eyebrow, { color: colors.secondary }]}>
                    MEMORIAL ENTRY
                  </Text>
                  <Text style={[styles.title, { color: colors.onSurface }]}>
                    {memorial?.name ?? "Remember this specimen"}
                  </Text>
                  <Text
                    style={[
                      styles.description,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Capture what this plant taught you so its memorial remains a
                    truthful part of your archive.
                  </Text>
                </View>
              </View>

              <View style={styles.formBlock}>
                <View style={styles.fieldBlock}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.onSurface }]}
                  >
                    CAUSE OF PASSING
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setCauseMenuVisible((current) => !current)}
                    style={({ pressed }) => [
                      styles.selectWrap,
                      {
                        backgroundColor: colors.surfaceContainerLow,
                        borderColor: colors.surfaceContainerHigh,
                        opacity: pressed ? 0.9 : 1,
                        transform: [{ scale: pressed ? 0.992 : 1 }],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectValue,
                        {
                          color: causeOfPassing ? colors.onSurface : "#9ea49f",
                        },
                      ]}
                    >
                      {causeOfPassing || "Select a cause..."}
                    </Text>
                    <Icon
                      name={causeMenuVisible ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.onSurfaceVariant}
                    />
                  </Pressable>
                  {causeMenuVisible ? (
                    <View
                      style={[
                        styles.menu,
                        {
                          backgroundColor: colors.surfaceContainerLow,
                          borderColor: colors.surfaceContainerHigh,
                        },
                      ]}
                    >
                      {CAUSE_OPTIONS.map((option) => (
                        <Pressable
                          key={option}
                          accessibilityRole="button"
                          onPress={() => {
                            setCauseOfPassing(option);
                            setCauseMenuVisible(false);
                          }}
                          style={({ pressed }) => [
                            styles.menuOption,
                            pressed && styles.menuOptionPressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.menuOptionLabel,
                              {
                                color:
                                  causeOfPassing === option
                                    ? colors.primary
                                    : colors.onSurface,
                              },
                            ]}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={styles.fieldBlock}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.onSurface }]}
                  >
                    MEMORIAL NOTE
                  </Text>
                  <View
                    style={[
                      styles.textAreaWrap,
                      {
                        backgroundColor: colors.surfaceContainerLow,
                        borderColor: colors.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <TextInput
                      multiline
                      placeholder="What do you want preserved in this memorial?"
                      placeholderTextColor="#c6cbc5"
                      style={[styles.textArea, { color: colors.onSurface }]}
                      textAlignVertical="top"
                      value={memorialNote}
                      onChangeText={setMemorialNote}
                    />
                  </View>
                </View>
              </View>

              <PrimaryButton
                label={actionLabel}
                onPress={handleConfirm}
                loading={loading}
                disabled={loading || !memorial}
                tone="memorial"
              />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
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
  keyboardWrap: {
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderWidth: 1,
  },
  handle: {
    width: 64,
    height: 6,
    borderRadius: 999,
    alignSelf: "center",
  },
  sheetContent: {
    gap: 24,
    paddingTop: 8,
  },
  heroWrap: {
    gap: 18,
  },
  heroImageShell: {
    height: 210,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.44)",
    ...shadowScale.elevatedCard,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    filter: [{ grayscale: 1 }, { sepia: 0.16 }, { brightness: 0.82 }],
  },
  heroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    gap: 8,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1.8,
  },
  title: {
    fontFamily: "NotoSerif_400Regular",
    fontSize: 28,
    lineHeight: 36,
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  formBlock: {
    gap: 20,
  },
  fieldBlock: {
    gap: 10,
  },
  fieldLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1.25,
  },
  selectWrap: {
    minHeight: 56,
    borderRadius: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
  },
  menu: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuOption: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuOptionPressed: {
    opacity: 0.92,
  },
  menuOptionLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
  },
  textAreaWrap: {
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 164,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 132,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
});

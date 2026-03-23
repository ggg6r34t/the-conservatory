import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { shadowScale, shadowWithColor } from "@/styles/shadows";

const CAUSE_OPTIONS = [
  "Overwatering",
  "Underwatering",
  "Pests or disease",
  "Root rot",
  "Propagation loss",
  "Unknown",
] as const;

interface MoveToGraveyardSheetProps {
  visible: boolean;
  plantName: string;
  photoUri?: string;
  initialMemorialNote?: string | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (input: {
    causeOfPassing?: string;
    memorialNote?: string;
  }) => Promise<void> | void;
}

function buildMemorialDescription(name: string, emphasisColor: string) {
  return (
    <>
      Once archived,{" "}
      <Text style={[styles.bodyEmphasis, { color: emphasisColor }]}>
        {name}
      </Text>{" "}
      will rest in the Memorial Garden. We acknowledge the journey and the
      lessons learned.
    </>
  );
}

export function MoveToGraveyardSheet({
  visible,
  plantName,
  photoUri,
  initialMemorialNote,
  loading = false,
  onClose,
  onConfirm,
}: MoveToGraveyardSheetProps) {
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

    setCauseOfPassing("");
    setMemorialNote(initialMemorialNote?.trim() ?? "");
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
  }, [initialMemorialNote, sheetOpacity, sheetTranslateY, visible]);

  const memorialDescription = useMemo(
    () => buildMemorialDescription(plantName, colors.onSurface),
    [colors.onSurface, plantName],
  );

  const handleConfirm = async () => {
    await onConfirm({
      causeOfPassing: causeOfPassing || undefined,
      memorialNote: memorialNote.trim() || undefined,
    });
  };

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
                  {photoUri ? (
                    <>
                      <Image
                        source={{ uri: photoUri }}
                        style={styles.heroImage}
                        contentFit="cover"
                      />
                      <LinearGradient
                        colors={[
                          "rgba(245, 242, 236, 0)",
                          "rgba(245, 242, 236, 0.86)",
                          colors.surfaceContainerLowest,
                        ]}
                        locations={[0, 0.58, 1]}
                        style={styles.heroFade}
                      />
                    </>
                  ) : (
                    <View style={styles.heroFallback}>
                      <Icon name="leaf" size={56} color={colors.primary} />
                    </View>
                  )}
                </View>

                <View style={styles.heroCopy}>
                  <Text style={[styles.eyebrow, { color: colors.secondary }]}>
                    FAREWELL CEREMONY
                  </Text>
                  <Text style={[styles.title, { color: colors.onSurface }]}>
                    Move to{"\n"}Graveyard?
                  </Text>
                  <Text
                    style={[
                      styles.description,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    {memorialDescription}
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
                    THE LESSON
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
                      placeholder="What did this specimen teach you about care or resilience?"
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
                label="Lay to Rest"
                onPress={handleConfirm}
                loading={loading}
                disabled={loading}
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
  heroFade: {
    ...StyleSheet.absoluteFillObject,
  },
  heroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    gap: 10,
    marginTop: -54,
    paddingHorizontal: 8,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.4,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 28,
  },
  bodyEmphasis: {
    fontFamily: "NotoSerif_400Regular_Italic",
    fontStyle: "italic",
  },
  formBlock: {
    gap: 18,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
  },
  selectWrap: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectValue: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  menu: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 8,
  },
  menuOption: {
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  menuOptionPressed: {
    opacity: 0.7,
  },
  menuOptionLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  textAreaWrap: {
    minHeight: 138,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  textArea: {
    minHeight: 106,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
});

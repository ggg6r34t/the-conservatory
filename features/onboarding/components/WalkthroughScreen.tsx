import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  type PressableStateCallbackType,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { WalkthroughProgress } from "@/features/onboarding/components/WalkthroughProgress";
import { WalkthroughSlidePanel } from "@/features/onboarding/components/WalkthroughSlidePanel";
import { walkthroughSlides } from "@/features/onboarding/constants/walkthroughSlides";
import {
  markOnboardingAction,
  markWalkthroughSlideViewed,
} from "@/features/onboarding/services/onboardingDebugStorage";
import { resolveWalkthroughTarget } from "@/features/onboarding/utils/resolveWalkthroughTarget";
import { trackEvent } from "@/services/analytics/analyticsService";

export function WalkthroughScreen({
  debugPreview = false,
}: {
  debugPreview?: boolean;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<(typeof walkthroughSlides)[number]>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const slide = walkthroughSlides[activeIndex] ?? walkthroughSlides[0];

  useFocusEffect(
    useCallback(() => {
      setActiveIndex(0);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }, []),
  );

  useEffect(() => {
    void markWalkthroughSlideViewed(slide.id);
  }, [slide.id]);

  const handleAction = async (action: "next" | "skip") => {
    if (isNavigating) {
      return;
    }

    setIsNavigating(true);

    try {
      await markOnboardingAction(`walkthrough_${action}_${slide.id}`);
      trackEvent("onboarding_walkthrough_action", {
        slide: slide.id,
        action,
      });

      const target = resolveWalkthroughTarget(slide.id, action);
      if (target === "next-slide") {
        const nextIndex = activeIndex + 1;
        setActiveIndex(nextIndex);
        listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return;
      }

      const resolvedTarget =
        debugPreview && target === "/onboarding/permissions"
          ? "/debug/onboarding-permissions"
          : target;

      router.replace(resolvedTarget);
    } catch (error) {
      Alert.alert(
        "Unable to continue",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setIsNavigating(false);
    }
  };

  const handleBack = useCallback(() => {
    if (isNavigating || activeIndex === 0) {
      return;
    }

    const previousIndex = activeIndex - 1;
    setActiveIndex(previousIndex);
    listRef.current?.scrollToIndex({ index: previousIndex, animated: true });
  }, [activeIndex, isNavigating]);

  const handleMomentumEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      if (
        nextIndex !== activeIndex &&
        nextIndex >= 0 &&
        nextIndex < walkthroughSlides.length
      ) {
        setActiveIndex(nextIndex);
      }
    },
    [activeIndex, width],
  );

  const getHeaderControlStyle = useCallback(
    (
      baseStyle: object,
      { pressed }: PressableStateCallbackType,
    ) => [
      baseStyle,
      styles.headerControl,
      pressed && styles.headerControlPressed,
    ],
    [],
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLead}>
            {activeIndex > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go to previous walkthrough slide"
                accessibilityState={{ disabled: isNavigating }}
                disabled={isNavigating}
                onPress={handleBack}
                style={(state) =>
                  getHeaderControlStyle(styles.headerIconButton, state)
                }
              >
                <Icon
                  family="MaterialIcons"
                  name="arrow-back"
                  size={22}
                  color={colors.primary}
                />
              </Pressable>
            ) : (
              <View style={styles.headerIconSpacer} />
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip walkthrough and continue to permissions"
            accessibilityState={{ disabled: isNavigating }}
            disabled={isNavigating}
            onPress={() => handleAction("skip")}
            style={(state) => getHeaderControlStyle(styles.skipAction, state)}
          >
            <Text
              style={[
                styles.skipText,
                { color: colors.primary },
              ]}
            >
              SKIP
            </Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={walkthroughSlides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          renderItem={({ item }) => (
            <View style={[styles.slideFrame, { width }]}>
              <WalkthroughSlidePanel slide={item} />
            </View>
          )}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          style={styles.slider}
        />

        <View style={styles.footerRow}>
          <WalkthroughProgress
            count={walkthroughSlides.length}
            activeIndex={activeIndex}
          />
          <PrimaryButton
            label={slide.buttonLabel}
            compact
            iconFamily="MaterialIcons"
            icon="arrow-forward"
            iconPosition="trailing"
            disabled={isNavigating}
            onPress={() => handleAction("next")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fbf9f4",
  },
  header: {
    position: "absolute",
    top: 18,
    left: 20,
    right: 20,
    zIndex: 4,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLead: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerControl: {
    backgroundColor: "rgba(255, 255, 255, 0.82)",
  },
  headerControlPressed: {
    opacity: 0.9,
  },
  headerIconSpacer: {
    width: 36,
    height: 36,
  },
  skipAction: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  skipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 2,
  },
  slider: {
    flex: 1,
  },
  slideFrame: {
    flex: 1,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 28,
  },
});

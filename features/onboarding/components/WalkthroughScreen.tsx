import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
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

export function WalkthroughScreen() {
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

      router.push(target);
    } catch (error) {
      Alert.alert(
        "Unable to continue",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setIsNavigating(false);
    }
  };

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

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <View style={styles.container}>
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
              <WalkthroughSlidePanel
                slide={item}
                onSkip={() => handleAction("skip")}
                isSkipDisabled={isNavigating}
              />
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

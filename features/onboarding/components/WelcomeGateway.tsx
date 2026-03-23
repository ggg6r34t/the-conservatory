import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import {
  markOnboardingAction,
  markWelcomeViewed,
} from "@/features/onboarding/services/onboardingDebugStorage";
import { trackEvent } from "@/services/analytics/analyticsService";

export function WelcomeGateway() {
  const router = useRouter();
  const { colors } = useTheme();
  const onboarding = useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void markWelcomeViewed();
  }, []);

  const handleBegin = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await markOnboardingAction("welcome_begin_collection");
      trackEvent("onboarding_welcome_cta_pressed", { target: "walkthrough" });
      router.push("/onboarding/walkthrough");
    } catch (error) {
      Alert.alert(
        "Unable to continue",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExistingAccount = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await markOnboardingAction("welcome_existing_account");
      trackEvent("onboarding_welcome_cta_pressed", { target: "login" });
      await onboarding.complete();
      router.push("/(auth)/login");
    } catch (error) {
      Alert.alert(
        "Unable to continue",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surfaceBright }]}
    >
      <View style={styles.container}>
        <View style={styles.heroArea}>
          <Image
            source={require("@/assets/images/macro-shot-of-a-large-monstera-leaf.png")}
            style={styles.heroImage}
            contentFit="cover"
            contentPosition={{ top: 10, left: -18 }}
            accessibilityIgnoresInvertColors
          />
          <LinearGradient
            colors={[
              "rgba(251,249,244,0)",
              "rgba(251,249,244,0.08)",
              "rgba(251,249,244,0.52)",
              "rgba(251,249,244,0.98)",
            ]}
            locations={[0, 0.3, 0.68, 1]}
            style={styles.heroFade}
          />
        </View>

        <View style={styles.sheetWrap}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: "rgba(230, 236, 228, 0.94)" },
            ]}
          >
            <View style={styles.sheetBloom} />
            <LinearGradient
              colors={["rgba(255,255,255,0.42)", "rgba(255,255,255,0.08)"]}
              start={{ x: 0.16, y: 0.1 }}
              end={{ x: 0.92, y: 0.9 }}
              style={styles.sheetGloss}
            />

            <View style={styles.copyBlock}>
              <Text style={[styles.eyebrow, { color: colors.secondary }]}>
                WELCOME TO
              </Text>
              <Text style={[styles.title, { color: colors.onSurface }]}>
                Your Digital{"\n"}Conservatory
              </Text>
              <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
                A living archive of every specimen you've ever loved.
              </Text>
            </View>

            <View style={styles.actions}>
              <PrimaryButton
                label="BEGIN YOUR COLLECTION"
                onPress={handleBegin}
                disabled={isSubmitting}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="I already have an account"
                accessibilityHint="Go to the sign in screen"
                onPress={handleExistingAccount}
                disabled={isSubmitting}
                style={styles.secondaryAction}
              >
                <Text
                  style={[
                    styles.secondaryActionText,
                    { color: colors.primary },
                  ]}
                >
                  I already have an account
                </Text>
              </Pressable>
            </View>
          </View>
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
  heroArea: {
    flex: 1,
    minHeight: 448,
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    width: "122%",
    height: "118%",
    opacity: 0.98,
  },
  heroFade: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrap: {
    marginTop: -118,
    paddingHorizontal: 0,
  },
  sheet: {
    position: "relative",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 42,
    gap: 30,
    minHeight: 478,
    shadowColor: "rgba(27, 28, 25, 0.05)",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  sheetGloss: {
    position: "absolute",
    right: -86,
    top: 12,
    width: 286,
    height: 286,
    borderRadius: 999,
    transform: [{ rotate: "16deg" }],
  },
  sheetBloom: {
    position: "absolute",
    right: -34,
    bottom: -42,
    width: 224,
    height: 224,
    borderRadius: 999,
    backgroundColor: "rgba(245, 248, 240, 0.72)",
  },
  copyBlock: {
    gap: 20,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 4.4,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 40,
    lineHeight: 50,
  },
  body: {
    maxWidth: 332,
    fontFamily: "Manrope_500Medium",
    fontSize: 18,
    lineHeight: 30,
  },
  actions: {
    gap: 24,
    marginTop: 6,
  },
  secondaryAction: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
});

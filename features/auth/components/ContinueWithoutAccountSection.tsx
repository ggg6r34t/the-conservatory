import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { SecondaryButton } from "@/components/common/Buttons/SecondaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";

type ContinueWithoutAccountSectionProps = {
  redirectTo?: "/(tabs)" | "/plant/add";
  disabled?: boolean;
};

export function ContinueWithoutAccountSection({
  redirectTo = "/(tabs)",
  disabled = false,
}: ContinueWithoutAccountSectionProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { continueAsGuest } = useAuth();
  const onboarding = useOnboarding();

  const handleContinue = async () => {
    await continueAsGuest();

    if (onboarding.status !== "completed") {
      await onboarding.complete();
    }

    router.replace(redirectTo);
  };

  return (
    <View style={styles.container}>
      <SecondaryButton
        label="Continue without an account"
        onPress={
          disabled
            ? undefined
            : () => {
                void handleContinue();
              }
        }
        fullWidth
      />
      <Text style={[styles.helper, { color: colors.onSurfaceVariant }]}>
        You can start locally now. Create an account later to back up and sync
        your conservatory.
      </Text>
      <Text style={[styles.localNote, { color: colors.secondary }]}>
        Stored only on this device
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginTop: 8,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  localNote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});

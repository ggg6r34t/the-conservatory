import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TertiaryButton } from "@/components/common/Buttons/TertiaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function ForgotPasswordScreen() {
  const { colors, spacing } = useTheme();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await requestPasswordReset(email);
      Alert.alert(
        "Reset email sent",
        "Check your inbox for reset instructions.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.xl }]}
      >
        <View style={styles.header}>
          <View style={{ gap: spacing.sm }}>
            <View>
              <TertiaryButton label="Back to sign in" href="/(auth)/login" />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.primary }]}>
                Reset Your Password
              </Text>
            </View>
          </View>
        </View>
        <View style={{ gap: spacing.lg }}>
          <TextInputField
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="botanist@conservatory.com"
          />
          <PrimaryButton
            label="Send Reset Link"
            onPress={handleSubmit}
            loading={isSubmitting}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 32,
  },
  header: {
    gap: 24,
  },
  copy: {
    gap: 12,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 42,
    lineHeight: 50,
  },
});

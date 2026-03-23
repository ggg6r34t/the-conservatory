import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useSignup } from "@/features/auth/hooks/useSignup";
import { signupSchema } from "@/features/auth/schemas/authValidation";

export function SignupForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const signupMutation = useSignup();

  const clearFieldError = (field: "displayName" | "email" | "password") => {
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  };

  const handleSubmit = async () => {
    if (signupMutation.isPending) {
      return;
    }

    const parsed = signupSchema.safeParse({
      displayName,
      email,
      password,
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        displayName: fieldErrors.displayName?.[0] ?? "",
        email: fieldErrors.email?.[0] ?? "",
        password: fieldErrors.password?.[0] ?? "",
      });
      return;
    }

    setErrors({});
    setSubmitError("");

    try {
      const result = await signupMutation.mutateAsync(parsed.data);

      if (result.requiresEmailVerification) {
        Alert.alert(
          "Verify your email",
          "Check your inbox to activate your account before signing in.",
        );
        return;
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : "Try again.";
      setSubmitError(message);
      Alert.alert("Unable to create account", message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInputField
        label="Full name"
        value={displayName}
        onChangeText={(value) => {
          setDisplayName(value);
          clearFieldError("displayName");
        }}
        textContentType="name"
        autoComplete="name"
        returnKeyType="next"
        placeholder="Elowen Thorne"
        error={errors.displayName}
      />
      <TextInputField
        label="Email address"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          clearFieldError("email");
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        placeholder="elowen@garden.io"
        error={errors.email}
      />
      <TextInputField
        label="Password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearFieldError("password");
        }}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        placeholder="Choose a secure password"
        error={errors.password}
      />
      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}
      <PrimaryButton
        label="Create Account"
        onPress={handleSubmit}
        loading={signupMutation.isPending}
        disabled={signupMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  submitError: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#ba1a1a",
  },
});

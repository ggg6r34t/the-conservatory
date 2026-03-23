import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { loginSchema } from "@/features/auth/schemas/authValidation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const loginMutation = useLogin();

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((current) => ({ ...current, email: "" }));
    setSubmitError("");
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((current) => ({ ...current, password: "" }));
    setSubmitError("");
  };

  const handleSubmit = async () => {
    if (loginMutation.isPending) {
      return;
    }

    const parsed = loginSchema.safeParse({
      email,
      password,
    });

    if (!parsed.success) {
      const nextErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        email: nextErrors.email?.[0] ?? "",
        password: nextErrors.password?.[0] ?? "",
      });
      return;
    }

    setErrors({});
    setSubmitError("");

    try {
      await loginMutation.mutateAsync(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try again.";
      setSubmitError(message);
      Alert.alert("Unable to sign in", message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInputField
        label="Email address"
        value={email}
        onChangeText={handleEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        placeholder="botanist@conservatory.com"
        error={errors.email}
      />
      <TextInputField
        label="Password"
        value={password}
        onChangeText={handlePasswordChange}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        placeholder="Enter your password"
        error={errors.password}
      />
      {submitError ? (
        <Text style={styles.submitError}>{submitError}</Text>
      ) : null}
      <PrimaryButton
        label="Sign In"
        onPress={handleSubmit}
        loading={loginMutation.isPending}
        disabled={loginMutation.isPending}
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

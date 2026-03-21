import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { loginSchema } from "@/features/auth/schemas/authValidation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const loginMutation = useLogin();

  const handleSubmit = async () => {
    const parsed = loginSchema.safeParse({
      email: email.trim().toLowerCase(),
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

    try {
      await loginMutation.mutateAsync(parsed.data);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Unable to sign in",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <TextInputField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="botanist@conservatory.com"
        error={errors.email}
      />
      <TextInputField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        error={errors.password}
      />
      <PrimaryButton
        label="Sign In"
        onPress={handleSubmit}
        loading={loginMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
});

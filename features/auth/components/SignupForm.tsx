import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/common/Buttons/PrimaryButton';
import { TextInputField } from '@/components/common/Forms/TextInput';
import { useSignup } from '@/features/auth/hooks/useSignup';
import { signupSchema } from '@/features/auth/schemas/authValidation';

export function SignupForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const signupMutation = useSignup();

  const handleSubmit = async () => {
    const parsed = signupSchema.safeParse({ displayName, email, password });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        displayName: fieldErrors.displayName?.[0] ?? '',
        email: fieldErrors.email?.[0] ?? '',
        password: fieldErrors.password?.[0] ?? '',
      });
      return;
    }

    setErrors({});

    try {
      const result = await signupMutation.mutateAsync(parsed.data);
      if (result.requiresEmailVerification) {
        Alert.alert('Verify your email', 'Check your inbox to activate your account.');
      }
    } catch (error) {
      Alert.alert('Unable to create account', error instanceof Error ? error.message : 'Try again.');
    }
  };

  return (
    <View style={styles.container}>
      <TextInputField
        label="Full name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Elowen Thorne"
        error={errors.displayName}
      />
      <TextInputField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="elowen@garden.io"
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
        label="Create Account"
        onPress={handleSubmit}
        loading={signupMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
});
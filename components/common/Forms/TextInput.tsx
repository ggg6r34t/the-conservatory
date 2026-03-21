import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '@/components/design-system/useTheme';

interface TextInputFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextInputField({ label, error, ...props }: TextInputFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{label.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor="#c6cbc5"
        style={[styles.input, { backgroundColor: colors.surfaceContainerLow, color: colors.onSurface }]}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  label: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 2,
  },
  input: {
    minHeight: 60,
    borderRadius: 20,
    paddingHorizontal: 18,
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
  },
  error: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
});
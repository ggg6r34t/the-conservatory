import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface TextInputFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextInputField({ label, error, ...props }: TextInputFieldProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const helperOpacity = useRef(new Animated.Value(error ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(helperOpacity, {
      toValue: error ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [error, helperOpacity]);

  const borderColor = error
    ? colors.error
    : isFocused
      ? colors.primaryFixedDim
      : colors.surfaceContainerHigh;
  const labelColor = error
    ? colors.error
    : isFocused
      ? colors.onSurface
      : colors.onSurfaceVariant;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: labelColor }]}>{label.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor="#c6cbc5"
        onBlur={(event) => {
          setIsFocused(false);
          props.onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          props.onFocus?.(event);
        }}
        style={[
          styles.input,
          {
            backgroundColor: isFocused
              ? colors.surfaceContainerLowest
              : colors.surfaceContainerLow,
            color: colors.onSurface,
            borderColor,
          },
        ]}
        {...props}
      />
      <Animated.View
        style={[
          styles.helperWrap,
          {
            opacity: helperOpacity,
            maxHeight: error ? 24 : 0,
          },
        ]}
      >
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 2,
  },
  input: {
    minHeight: 60,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
  },
  helperWrap: {
    overflow: "hidden",
  },
  error: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
  },
});

import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface TextInputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  trailingIcon?: string;
  trailingIconFamily?: React.ComponentProps<typeof Icon>["family"];
  onTrailingPress?: () => void;
  trailingAccessibilityLabel?: string;
}

export function TextInputField({
  label,
  error,
  trailingIcon,
  trailingIconFamily,
  onTrailingPress,
  trailingAccessibilityLabel,
  ...props
}: TextInputFieldProps) {
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
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: isFocused
              ? colors.surfaceContainerLowest
              : colors.surfaceContainerLow,
            borderColor,
          },
        ]}
      >
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
              color: colors.onSurface,
            },
          ]}
          {...props}
        />
        {trailingIcon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trailingAccessibilityLabel}
            hitSlop={10}
            onPress={onTrailingPress}
            style={styles.trailingButton}
          >
            <Icon
              family={trailingIconFamily}
              name={trailingIcon}
              size={20}
              color={isFocused ? colors.primary : colors.onSurfaceVariant}
            />
          </Pressable>
        ) : null}
      </View>
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
    flex: 1,
    minHeight: 58,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
  },
  inputShell: {
    minHeight: 60,
    borderRadius: 20,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trailingButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  helperWrap: {
    overflow: "hidden",
  },
  error: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
  },
});

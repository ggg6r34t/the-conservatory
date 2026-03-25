import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  href?: Href;
  icon?: string;
  fullWidth?: boolean;
  variant?: "filled" | "surface";
  backgroundColor?: string;
  textColor?: string;
}

export function SecondaryButton({
  label,
  onPress,
  href,
  icon,
  fullWidth = false,
  variant = "filled",
  backgroundColor,
  textColor,
}: SecondaryButtonProps) {
  const { colors } = useTheme();
  const surfaceVariant = variant === "surface";

  const content = (
    <View
      style={[
        styles.button,
        fullWidth && styles.fullWidth,
        backgroundColor
          ? { backgroundColor }
          : surfaceVariant
            ? [
                styles.surfaceButton,
                {
                  backgroundColor: colors.surfaceContainerLowest,
                  borderColor: "rgba(193, 200, 194, 0.35)",
                },
              ]
            : { backgroundColor: colors.secondaryContainer },
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <Icon
            name={icon}
            size={18}
            color={
              textColor ??
              (surfaceVariant ? colors.onSurface : colors.secondaryOnContainer)
            }
          />
        ) : null}
        <Text
          style={[
            styles.label,
            {
              color:
                textColor ??
                (surfaceVariant
                  ? colors.onSurface
                  : colors.secondaryOnContainer),
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable accessibilityRole="button" onPress={onPress}>
          {content}
        </Pressable>
      </Link>
    );
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  fullWidth: {
    width: "100%",
  },
  surfaceButton: {
    borderWidth: 1,
    shadowColor: "rgba(27, 28, 25, 0.03)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 20,
  },
});

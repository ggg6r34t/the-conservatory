import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  href?: Href;
}

export function SecondaryButton({
  label,
  onPress,
  href,
}: SecondaryButtonProps) {
  const { colors } = useTheme();

  const content = (
    <Pressable
      onPress={onPress}
      style={[styles.button, { backgroundColor: colors.secondaryContainer }]}
    >
      <Text style={[styles.label, { color: colors.secondaryOnContainer }]}>
        {label}
      </Text>
    </Pressable>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        {content}
      </Link>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
  },
});

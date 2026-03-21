import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

interface TertiaryButtonProps {
  label: string;
  href?: Href;
  onPress?: () => void;
}

export function TertiaryButton({ label, href, onPress }: TertiaryButtonProps) {
  const { colors } = useTheme();

  const content = (
    <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable>{content}</Pressable>
      </Link>
    );
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    textDecorationLine: "underline",
    textDecorationColor: "#c5ebd4",
  },
});

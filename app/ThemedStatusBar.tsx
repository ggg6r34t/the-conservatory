import { StatusBar } from "expo-status-bar";

import { useTheme } from "@/components/design-system/useTheme";

export function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

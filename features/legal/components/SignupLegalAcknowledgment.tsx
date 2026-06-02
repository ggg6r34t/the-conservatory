import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { LEGAL_ROUTES } from "@/features/legal/constants";

export function SignupLegalAcknowledgment() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        By creating an account, you agree to our{" "}
        <Text
          style={[styles.link, { color: colors.primary }]}
          onPress={() => router.push(LEGAL_ROUTES.terms)}
        >
          Terms of Service
        </Text>{" "}
        and acknowledge our{" "}
        <Text
          style={[styles.link, { color: colors.primary }]}
          onPress={() => router.push(LEGAL_ROUTES.privacy)}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    lineHeight: 20,
    textDecorationLine: "underline",
  },
});

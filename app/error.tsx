import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";

interface ErrorBoundaryProps {
  error: Error;
  retry: () => void;
}

const COLORS = {
  background: "#faf9f7",
  titleText: "#1c1c1e",
  bodyText: "#6e6e73",
  buttonBackground: "#4a7c59",
  buttonText: "#ffffff",
};

const FONTS = {
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 26,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
  },
  button: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 1.4,
  },
};

export default function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[ErrorBoundary] Unhandled route error:", error);
  }, [error]);

  const errorMessage =
    error?.message ?? "An unexpected error occurred. Please try again.";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: COLORS.background }]}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: COLORS.titleText }]}>
          Something went wrong
        </Text>

        <Text style={[styles.body, { color: COLORS.bodyText }]}>
          {errorMessage}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: COLORS.buttonBackground },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonLabel, { color: COLORS.buttonText }]}>
            TRY AGAIN
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
    gap: 16,
    maxWidth: 280,
  },
  title: {
    ...FONTS.title,
    textAlign: "center",
    marginBottom: 8,
  },
  body: {
    ...FONTS.body,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minWidth: 160,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    ...FONTS.button,
    textAlign: "center",
  },
});

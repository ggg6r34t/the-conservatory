import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";
import { tokens } from "@/styles/tokens";

interface ErrorBoundaryProps {
  error: Error;
  retry: () => void;
}

export default function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[ErrorBoundary] Unhandled route error:", error);
  }, [error]);

  const errorMessage =
    error?.message ?? "An unexpected error occurred. Please try again.";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Something went wrong</Text>

        <Text style={styles.body}>{errorMessage}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={retry}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonLabel}>TRY AGAIN</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.lg,
  },
  content: {
    alignItems: "center",
    gap: tokens.spacing.md,
    maxWidth: 280,
  },
  title: {
    ...tokens.typography.title,
    color: tokens.colors.onBackground,
    textAlign: "center",
    marginBottom: tokens.spacing.xs,
  },
  body: {
    ...tokens.typography.body,
    color: tokens.colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: tokens.spacing.xs,
  },
  button: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: 14,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: tokens.spacing.xs,
    minWidth: 160,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    ...tokens.typography.label,
    color: tokens.colors.onPrimary,
    textAlign: "center",
  },
});

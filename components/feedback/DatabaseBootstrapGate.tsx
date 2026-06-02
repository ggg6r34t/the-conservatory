import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { useTheme } from "@/components/design-system/useTheme";
import {
  getDatabaseBootstrapState,
  retryDatabaseBootstrap,
  subscribeToDatabaseBootstrapState,
  type DatabaseBootstrapState,
} from "@/services/database/databaseBootstrap";
import { initializeDatabase } from "@/services/database/sqlite";

export function DatabaseBootstrapGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const [state, setState] = useState<DatabaseBootstrapState>(
    getDatabaseBootstrapState(),
  );
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => subscribeToDatabaseBootstrapState(setState), []);

  if (state.status === "ready") {
    return children;
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <View
        style={[styles.centered, { backgroundColor: colors.surfaceBright }]}
      >
        <Text style={[styles.title, { color: colors.primary }]}>
          Preparing your conservatory
        </Text>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          Opening local storage…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.centered, { backgroundColor: colors.surfaceBright }]}>
      <Text style={[styles.title, { color: colors.primary }]}>
        Local storage unavailable
      </Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        {state.error}
      </Text>
      <Text style={[styles.detail, { color: colors.onSurfaceVariant }]}>
        Your plants and care history stay on this device. The app needs a working
        local database before it can open safely.
      </Text>
      <PrimaryButton
        label={isRetrying ? "Retrying..." : "Try Again"}
        disabled={isRetrying}
        loading={isRetrying}
        onPress={() => {
          setIsRetrying(true);
          void retryDatabaseBootstrap(initializeDatabase)
            .catch(() => undefined)
            .finally(() => {
              setIsRetrying(false);
            });
        }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setIsRetrying(true);
          void retryDatabaseBootstrap(initializeDatabase)
            .catch(() => undefined)
            .finally(() => {
              setIsRetrying(false);
            });
        }}
      >
        <Text style={[styles.retryHint, { color: colors.primary }]}>
          If this keeps happening, restart the app or reinstall after exporting
          your collection.
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
  detail: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  retryHint: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});

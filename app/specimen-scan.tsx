import { CameraView, type BarcodeScanningResult } from "expo-camera";
import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { resolveSpecimenTagScan } from "@/features/plants/services/specimenTagsService";

const barcodeTypes = [
  "qr",
  "aztec",
  "pdf417",
  "code128",
  "code39",
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
] as const;

export default function SpecimenScanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<
    "ready" | "resolving" | "matched"
  >("ready");
  const [message, setMessage] = useState<string | null>(null);

  const handleScan = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanState !== "ready" || !user?.id) {
        return;
      }

      setScanState("resolving");
      setMessage(null);
      void resolveSpecimenTagScan({
        userId: user.id,
        value: result.data,
      })
        .then((resolution) => {
          if (resolution.status === "matched") {
            setScanState("matched");
            router.replace(`/plant/${resolution.match.plantId}` as const);
            return;
          }

          setScanState("ready");
          setMessage(
            resolution.status === "invalid"
              ? "That tag is not from The Conservatory."
              : "That specimen tag is not in this collection.",
          );
        })
        .catch(() => {
          setScanState("ready");
          setMessage("The tag could not be checked. Try scanning again.");
        });
    },
    [router, scanState, user?.id],
  );

  return (
    <ProfileScreenScaffold
      title="Scan Specimen"
      subtitle="Native scanner"
      description="Scan a Conservatory specimen QR or barcode to open the matching plant in this collection."
    >
      <View
        style={[
          styles.scannerShell,
          { backgroundColor: colors.surfaceContainerLowest },
        ]}
      >
        {permission?.granted ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...barcodeTypes] }}
            onBarcodeScanned={scanState === "ready" ? handleScan : undefined}
          >
            <View style={styles.overlay}>
              <View style={[styles.scanFrame, { borderColor: colors.surface }]} />
              <Text style={[styles.scanLabel, { color: colors.surface }]}>
                {scanState === "resolving"
                  ? "Checking specimen"
                  : "Align the tag inside the frame"}
              </Text>
            </View>
          </CameraView>
        ) : (
          <View style={styles.permissionCard}>
            <Text style={[styles.permissionTitle, { color: colors.primary }]}>
              Camera access is needed
            </Text>
            <Text
              style={[
                styles.permissionBody,
                { color: colors.onSurfaceVariant },
              ]}
            >
              The scanner uses your camera only while this screen is open.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void requestPermission();
              }}
              style={[
                styles.permissionButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.permissionButtonLabel,
                  { color: colors.surface },
                ]}
              >
                Allow Camera
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {message ? (
        <View
          style={[styles.messageCard, { backgroundColor: colors.surfaceContainerLow }]}
        >
          <Text style={[styles.messageText, { color: colors.primary }]}>
            {message}
          </Text>
        </View>
      ) : null}
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scannerShell: {
    borderRadius: 24,
    minHeight: 420,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
    minHeight: 420,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
  },
  scanFrame: {
    width: 230,
    height: 230,
    borderWidth: 2,
    borderRadius: 24,
  },
  scanLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  permissionCard: {
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
  },
  permissionTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },
  permissionBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  permissionButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionButtonLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  messageCard: {
    borderRadius: 20,
    padding: 16,
  },
  messageText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    lineHeight: 21,
  },
});

import { NativeModules, Platform } from "react-native";

type NativeModulesWithPurchases = typeof NativeModules & {
  RNPurchases?: unknown;
};

/** True when react-native-purchases native bridge is linked (dev client / store build). */
export function isRevenueCatNativeAvailable(): boolean {
  if (Platform.OS === "web") {
    return false;
  }

  return Boolean(
    (NativeModules as NativeModulesWithPurchases).RNPurchases,
  );
}

import { requireOptionalNativeModule } from "expo-modules-core";

/** True when expo-camera native module is present (not Expo Go without dev client). */
export function isExpoCameraNativeAvailable(): boolean {
  return requireOptionalNativeModule("ExpoCamera") != null;
}

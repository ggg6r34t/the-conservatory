import { Platform } from "react-native";

import { env } from "@/config/env";

/** Production: iOS only (App Store compliance). Dev: all platforms for OAuth QA. */
export function shouldShowAppleOAuthButton() {
  return Platform.OS === "ios" || env.isDevelopmentBuild;
}

export function shouldShowGoogleOAuthButton() {
  return true;
}

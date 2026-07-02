/**
 * @jest-environment node
 */

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

jest.mock("@/config/env", () => ({
  env: {
    isDevelopmentBuild: false,
    isProductionBuild: true,
  },
}));

import { Platform } from "react-native";

import {
  shouldShowAppleOAuthButton,
  shouldShowGoogleOAuthButton,
} from "@/features/auth/utils/oauthProviderVisibility";
import { env } from "@/config/env";

describe("oauthProviderVisibility", () => {
  beforeEach(() => {
    Platform.OS = "android";
    env.isDevelopmentBuild = false;
    env.isProductionBuild = true;
  });

  it("shows google on all platforms", () => {
    expect(shouldShowGoogleOAuthButton()).toBe(true);
  });

  it("hides apple on android production builds", () => {
    expect(shouldShowAppleOAuthButton()).toBe(false);
  });

  it("shows apple on android in development for oauth qa", () => {
    env.isDevelopmentBuild = true;
    env.isProductionBuild = false;
    expect(shouldShowAppleOAuthButton()).toBe(true);
  });

  it("shows apple on ios production builds", () => {
    Platform.OS = "ios";
    expect(shouldShowAppleOAuthButton()).toBe(true);
  });
});

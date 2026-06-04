import { Animated } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("@/features/theme/analytics", () => ({
  trackThemeScreenViewed: jest.fn(),
  trackThemeSelected: jest.fn(),
  trackThemeChanged: jest.fn(),
  trackThemePreviewViewed: jest.fn(),
  trackThemeContrastIssueDetected: jest.fn(),
  trackThemeFallbackApplied: jest.fn(),
  trackPremiumThemeTapped: jest.fn(),
  trackPremiumThemeBlocked: jest.fn(),
  trackPremiumThemeUnlocked: jest.fn(),
  trackThemeRevertedAfterDowngrade: jest.fn(),
  trackThemeSaveFailed: jest.fn(),
  trackThemeRestoredOnStartup: jest.fn(),
  trackProfileThemeLabelRendered: jest.fn(),
}));

jest.mock("@/features/theme/services/themeCacheStorage", () => ({
  readCachedThemeId: jest.fn().mockResolvedValue(null),
  writeCachedThemeId: jest.fn().mockResolvedValue(undefined),
  clearCachedThemeId: jest.fn().mockResolvedValue(undefined),
  getBootstrapThemeId: jest.fn(
    (_cached: string | null, preferred?: string | null) => {
      if (preferred) {
        const valid = [
          "linen-light",
          "deep-forest",
          "midnight-ivy",
          "terracotta-dusk",
        ] as const;
        return valid.includes(preferred as (typeof valid)[number])
          ? preferred
          : "linen-light";
      }
      return _cached ?? "linen-light";
    },
  ),
}));

const originalConsoleLog = console.log;

type AnimationCallback = ((result: { finished: boolean }) => void) | undefined;

function completeAnimation(
  value: {
    setValue?: ((next: any) => void) | undefined;
  },
  toValue: unknown,
  callback: AnimationCallback,
) {
  if (typeof toValue === "number" && value.setValue) {
    value.setValue(toValue);
  }

  if (
    toValue &&
    typeof toValue === "object" &&
    "x" in toValue &&
    "y" in toValue &&
    value.setValue
  ) {
    value.setValue(toValue);
  }

  callback?.({ finished: true });
}

beforeAll(() => {
  jest.spyOn(Animated, "timing").mockImplementation((value, config) => {
    return {
      start: (callback?: AnimationCallback) => {
        completeAnimation(value, config?.toValue, callback);
      },
      stop: jest.fn(),
      reset: jest.fn(),
    } as never;
  });

  jest.spyOn(Animated, "spring").mockImplementation((value, config) => {
    return {
      start: (callback?: AnimationCallback) => {
        completeAnimation(value, config?.toValue, callback);
      },
      stop: jest.fn(),
      reset: jest.fn(),
    } as never;
  });

  jest.spyOn(Animated, "parallel").mockImplementation((animations) => {
    return {
      start: (callback?: AnimationCallback) => {
        animations.forEach((animation) => animation.start?.());
        callback?.({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    } as never;
  });

  jest.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    const [firstArg] = args;

    if (typeof firstArg === "string") {
      try {
        const parsed = JSON.parse(firstArg) as { level?: string; message?: string };
        if (
          typeof parsed.level === "string" &&
          typeof parsed.message === "string"
        ) {
          return;
        }
      } catch {
        // Fall through to original logging for non-JSON console output.
      }
    }

    originalConsoleLog(...args);
  });
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

afterAll(() => {
  jest.restoreAllMocks();
});

import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react";
import { AccessibilityInfo } from "react-native";
import { PaperProvider } from "react-native-paper";

import { createBotanicalPaperTheme } from "@/config/theme";
import {
  buildThemeTokens,
  DEFAULT_THEME_ID,
  getThemeDefinition,
} from "@/features/theme/registry";
import { blendThemeColors } from "@/features/theme/services/themeColorTransition";
import { useThemeRuntimeStore } from "@/features/theme/stores/useThemeRuntimeStore";
import type { BotanicalTokens, ThemeId } from "@/features/theme/types";
export interface BotanicalThemeValue extends BotanicalTokens {
  paperTheme: ReturnType<typeof createBotanicalPaperTheme>;
  themeId: ThemeId;
  isDark: boolean;
}

const defaultTokens = buildThemeTokens(DEFAULT_THEME_ID);

export const BotanicalThemeContext = createContext<BotanicalThemeValue>({
  ...defaultTokens,
  paperTheme: createBotanicalPaperTheme(defaultTokens.colors, false),
  themeId: DEFAULT_THEME_ID,
  isDark: false,
});

const THEME_TRANSITION_MS = 280;

export function BotanicalThemeProvider({ children }: PropsWithChildren) {
  const activeThemeId = useThemeRuntimeStore((state) => state.activeThemeId);
  const transitionProgress = useThemeRuntimeStore(
    (state) => state.transitionProgress,
  );
  const setTransitionProgress = useThemeRuntimeStore(
    (state) => state.setTransitionProgress,
  );
  const previousThemeIdRef = useRef(activeThemeId);
  const fromColorsRef = useRef(defaultTokens.colors);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        reduceMotionRef.current = enabled;
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        reduceMotionRef.current = enabled;
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (previousThemeIdRef.current === activeThemeId) {
      return;
    }

    fromColorsRef.current = buildThemeTokens(previousThemeIdRef.current).colors;
    previousThemeIdRef.current = activeThemeId;

    if (reduceMotionRef.current) {
      setTransitionProgress(1);
      return;
    }

    setTransitionProgress(0);
    startTimeRef.current = null;

    const step = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / THEME_TRANSITION_MS);
      setTransitionProgress(progress);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [activeThemeId, setTransitionProgress]);

  const value = useMemo(() => {
    const targetTokens = buildThemeTokens(activeThemeId);
    const definition = getThemeDefinition(activeThemeId);
    const colors =
      transitionProgress >= 1
        ? targetTokens.colors
        : blendThemeColors(
            fromColorsRef.current,
            targetTokens.colors,
            transitionProgress,
          );

    return {
      ...targetTokens,
      colors,
      paperTheme: createBotanicalPaperTheme(colors, definition.isDark),
      themeId: activeThemeId,
      isDark: definition.isDark,
    };
  }, [activeThemeId, transitionProgress]);

  return (
    <BotanicalThemeContext.Provider value={value}>
      <PaperProvider theme={value.paperTheme}>{children}</PaperProvider>
    </BotanicalThemeContext.Provider>
  );
}

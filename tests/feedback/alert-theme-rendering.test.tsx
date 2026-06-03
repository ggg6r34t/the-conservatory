import { render, screen } from "@testing-library/react-native";

import { AlertDialogCard } from "@/components/feedback/AlertDialog/AlertDialogCard";
import type { QueuedAlertDialog } from "@/components/feedback/AlertDialog/alert.types";
import { BotanicalThemeContext } from "@/components/design-system/Theme";
import { botanicalPaperTheme } from "@/config/theme";
import { buildThemeTokens, getThemeDefinition } from "@/features/theme/registry";
import type { ThemeId } from "@/features/theme/types";

jest.mock("expo-blur", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BlurView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

const themeIds: ThemeId[] = [
  "linen-light",
  "deep-forest",
  "midnight-ivy",
  "terracotta-dusk",
];

function renderDestructiveAlert(themeId: ThemeId) {
  const tokens = buildThemeTokens(themeId);
  const definition = getThemeDefinition(themeId);

  const alert: QueuedAlertDialog = {
    id: "test-alert",
    variant: "destructive",
    title: "Delete this plant?",
    message: "This removes the plant from your collection.",
    primaryAction: { label: "Delete", tone: "danger" },
    secondaryAction: { label: "Cancel" },
    resolve: jest.fn(),
  };

  return render(
    <BotanicalThemeContext.Provider
      value={{
        ...tokens,
        paperTheme: botanicalPaperTheme,
        themeId,
        isDark: definition.category === "dark",
      }}
    >
      <AlertDialogCard
        alert={alert}
        loadingAction={null}
        onBackdropPress={jest.fn()}
        onPrimaryPress={jest.fn()}
        onSecondaryPress={jest.fn()}
      />
    </BotanicalThemeContext.Provider>,
  );
}

describe("AlertDialogCard theme rendering", () => {
  it.each(themeIds)("renders destructive variant readably in %s", (themeId) => {
    renderDestructiveAlert(themeId);
    expect(screen.getByText("Delete this plant?")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
  });
});

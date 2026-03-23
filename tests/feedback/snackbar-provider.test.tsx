import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";

import { useSnackbar } from "@/hooks/useSnackbar";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("react-native-paper", () => {
  const React = require("react");
  const actual = jest.requireActual("react-native-paper");
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => children,
  };
});

function SnackbarHarness({ onAction }: { onAction?: () => void }) {
  const snackbar = useSnackbar();

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          snackbar.success("Saved successfully.", {
            duration: 50,
            action: onAction
              ? { label: "Undo", onPress: onAction }
              : undefined,
          });
          snackbar.info("Queued info.", { duration: 50 });
        }}
      >
        <Text>show-snackbars</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => snackbar.dismiss()}
      >
        <Text>dismiss-snackbar</Text>
      </Pressable>
    </View>
  );
}

describe("SnackbarProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("shows queued snackbars in order", async () => {
    renderWithProviders(<SnackbarHarness />);

    fireEvent.press(screen.getByText("show-snackbars"));

    expect(screen.getByText("Saved successfully.")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(60);
    });

    await waitFor(() => {
      expect(screen.getByText("Queued info.")).toBeTruthy();
    });
  });

  it("fires the action callback once", async () => {
    const onAction = jest.fn();
    renderWithProviders(<SnackbarHarness onAction={onAction} />);

    fireEvent.press(screen.getByText("show-snackbars"));
    fireEvent.press(screen.getByText(/undo/i));

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });
});

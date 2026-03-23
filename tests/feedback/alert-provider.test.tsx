import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useAlert } from "@/hooks/useAlert";
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

jest.mock("expo-blur", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BlurView: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
    }) => <View {...props}>{children}</View>,
  };
});

function AlertHarness() {
  const alert = useAlert();
  const [result, setResult] = useState("");

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          const response = await alert.show({
            variant: "destructive",
            title: "Delete Specimen?",
            message: "This action cannot be undone.",
            primaryAction: {
              label: "Delete",
              tone: "danger",
              testID: "primary-delete",
            },
            secondaryAction: {
              label: "Keep Plant",
              testID: "secondary-keep",
            },
          });
          setResult(response.action);
        }}
      >
        <Text>open-alert</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void alert.show({
            variant: "info",
            title: "First",
            message: "First message",
            primaryAction: { label: "Next" },
          });
          void alert.show({
            variant: "info",
            title: "Second",
            message: "Second message",
            primaryAction: { label: "Done" },
          });
        }}
      >
        <Text>queue-alerts</Text>
      </Pressable>

      <Text>{result}</Text>
    </View>
  );
}

describe("AlertProvider", () => {
  it("resolves the selected action and advances the queue", async () => {
    renderWithProviders(<AlertHarness />);

    fireEvent.press(screen.getByText("queue-alerts"));

    expect(screen.getByText("First")).toBeTruthy();
    fireEvent.press(screen.getByText(/next/i));

    await waitFor(() => {
      expect(screen.getByText("Second")).toBeTruthy();
    });
  });

  it("returns the chosen action to the caller", async () => {
    renderWithProviders(<AlertHarness />);

    fireEvent.press(screen.getByText("open-alert"));
    fireEvent.press(screen.getByTestId("primary-delete"));

    await waitFor(() => {
      expect(screen.getByText("primary")).toBeTruthy();
    });
  });

  it("respects non-dismissible backdrop behavior", async () => {
    const BackdropHarness = () => {
      const alert = useAlert();

      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void alert.show({
              variant: "info",
              title: "Locked",
              message: "Backdrop dismiss is disabled.",
              dismissOnBackdropPress: false,
              primaryAction: { label: "Close" },
            });
          }}
        >
          <Text>open-locked</Text>
        </Pressable>
      );
    };

    renderWithProviders(<BackdropHarness />);

    fireEvent.press(screen.getByText("open-locked"));
    fireEvent.press(screen.getByLabelText("Dismiss dialog overlay"));

    await waitFor(() => {
      expect(screen.getByText("Locked")).toBeTruthy();
    });
  });

  it("keeps the dialog open during async primary actions", async () => {
    let resolveAction: undefined | (() => void);

    const AsyncHarness = () => {
      const alert = useAlert();

      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void alert.show({
              variant: "destructive",
              title: "Delete Specimen?",
              message: "This action cannot be undone.",
              primaryAction: {
                label: "Delete",
                tone: "danger",
                testID: "async-delete",
                onPress: () =>
                  new Promise<void>((resolve) => {
                    resolveAction = resolve;
                  }),
              },
            });
          }}
        >
          <Text>open-async</Text>
        </Pressable>
      );
    };

    renderWithProviders(<AsyncHarness />);

    fireEvent.press(screen.getByText("open-async"));
    fireEvent.press(screen.getByTestId("async-delete"));

    await waitFor(() => {
      expect(screen.getByText("Delete...")).toBeTruthy();
    });

    const completeAction = resolveAction;
    if (completeAction) {
      await act(async () => {
        completeAction();
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(screen.queryByText("Delete Specimen?")).toBeNull();
    });
  });
});

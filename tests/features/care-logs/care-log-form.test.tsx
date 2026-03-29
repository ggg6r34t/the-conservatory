import React from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { CareLogForm } from "@/features/care-logs/components/CareLogForm";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockMutateAsync = jest.fn();
const mockSuccess = jest.fn();
const mockWarning = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      secondaryOnContainer: "#5d3a1a",
      tertiaryContainer: "#7f9b78",
      surfaceContainerHigh: "#ddd",
      surfaceContainerLow: "#f2f2f2",
      onSurface: "#111",
      onSurfaceVariant: "#666",
      surfaceBright: "#fff",
      secondary: "#7a5f42",
      primary: "#111",
    },
  }),
}));

jest.mock("@/features/ai/hooks/useObservationTagging", () => ({
  useObservationTagging: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/features/ai/services/observationTaggingService", () => ({
  buildCareLogNoteForSave: ({
    originalNote,
  }: {
    originalNote: string;
  }) => originalNote.trim(),
}));

jest.mock("@/features/care-logs/hooks/useRecordCareEvent", () => ({
  useRecordCareEvent: () => ({
    mutateAsync: (...args: unknown[]) => mockMutateAsync(...args),
    isPending: false,
  }),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({
    success: (...args: unknown[]) => mockSuccess(...args),
    warning: (...args: unknown[]) => mockWarning(...args),
  }),
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: ({
    label,
    onPress,
  }: {
    label: string;
    onPress?: () => void;
  }) => {
    const { Pressable, Text } = require("react-native");

    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

describe("CareLogForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({
      careLog: {
        id: "log-1",
      },
      warningMessage: null,
    });
  });

  it("submits a general log without defaulting to water or forcing a condition", async () => {
    renderWithProviders(<CareLogForm plantId="plant-1" />);

    fireEvent.changeText(
      screen.getByPlaceholderText("How is your plant doing today?"),
      "Observed a new leaf unfurling.",
    );
    fireEvent.press(screen.getByText("Save Care Log"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        logType: "inspect",
        currentCondition: undefined,
        notes: "Observed a new leaf unfurling.",
      });
    });

    expect(mockSuccess).toHaveBeenCalledWith("Care log saved.");
    expect(mockBack).toHaveBeenCalled();
  });

  it("persists current condition only when the user explicitly selects one", async () => {
    renderWithProviders(<CareLogForm plantId="plant-1" />);

    fireEvent.changeText(
      screen.getByPlaceholderText("How is your plant doing today?"),
      "Edges are crisping.",
    );
    fireEvent.press(screen.getByText("Needs Attention"));
    fireEvent.press(screen.getByText("Save Care Log"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        logType: "inspect",
        currentCondition: "Needs Attention",
        notes: "Edges are crisping.",
      });
    });
  });

  it("treats reminder follow-up issues as a warning after the care log saves", async () => {
    mockMutateAsync.mockResolvedValueOnce({
      careLog: {
        id: "log-1",
      },
      warningMessage:
        "Care log saved on this device, but the reminder schedule needs another retry.",
    });

    renderWithProviders(<CareLogForm plantId="plant-1" />);

    fireEvent.press(screen.getByText("Save Care Log"));

    await waitFor(() => {
      expect(mockWarning).toHaveBeenCalledWith(
        "Care log saved on this device, but the reminder schedule needs another retry.",
      );
    });
    expect(mockBack).toHaveBeenCalled();
  });
});

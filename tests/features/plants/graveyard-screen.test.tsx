import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import GraveyardScreen from "@/app/(tabs)/graveyard";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockMutateAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-blur", () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("@/components/common/TopBar/AppHeader", () => ({
  AppHeader: ({ title }: { title: string }) => title,
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("@/features/plants/hooks/useGraveyard", () => ({
  useGraveyard: () => ({
    data: [
      {
        id: "graveyard-1",
        userId: "user-1",
        plantId: "plant-1",
        name: "Aster",
        speciesName: "Monstera deliciosa",
        causeOfPassing: null,
        memorialNote: null,
        archivedAt: "2026-03-10T10:00:00.000Z",
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-10T10:00:00.000Z",
        pending: 0,
        plantNotes: "Taught patience.",
        primaryPhotoUri: null,
      },
    ],
  }),
}));

jest.mock("@/features/plants/hooks/useUpdateGraveyardMemorial", () => ({
  useUpdateGraveyardMemorial: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

jest.mock("@/hooks/usePullToRefreshSync", () => ({
  usePullToRefreshSync: () => ({ onRefresh: jest.fn(), refreshing: false }),
}));

jest.mock("@/hooks/useAlert", () => ({
  useAlert: () => ({ show: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ success: jest.fn() }),
}));

describe("GraveyardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens a real memorial sheet and saves memorial content", async () => {
    renderWithProviders(<GraveyardScreen />);

    fireEvent.press(screen.getByText("Add Memorial"));
    fireEvent.changeText(
      screen.getByPlaceholderText(
        "What do you want preserved in this memorial?",
      ),
      "A patient grower who taught me restraint.",
    );
    fireEvent.press(screen.getByText("Save Memorial"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          graveyardId: "graveyard-1",
          memorialNote: "A patient grower who taught me restraint.",
        }),
      );
    });
  });
});

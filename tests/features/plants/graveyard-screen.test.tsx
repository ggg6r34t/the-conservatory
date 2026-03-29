import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import GraveyardScreen from "@/app/(tabs)/graveyard";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockMutateAsync = jest.fn().mockResolvedValue(undefined);
const mockRouterPush = jest.fn();
let mockGraveyardData: Array<Record<string, unknown>> = [];

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

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.mock("@/components/common/TopBar/AppHeader", () => ({
  AppHeader: ({ title }: { title: string }) => title,
}));

jest.mock("@/components/common/Icon/Icon", () => ({
  Icon: () => null,
}));

jest.mock("@/features/plants/hooks/useGraveyard", () => ({
  useGraveyard: () => ({
    data: mockGraveyardData,
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

function createMemorial(
  id: string,
  patch: Partial<Record<string, unknown>> = {},
) {
  return {
    id,
    userId: "user-1",
    plantId: `plant-${id}`,
    name: `Plant ${id}`,
    speciesName: "Monstera deliciosa",
    causeOfPassing: null,
    memorialNote: null,
    archivedAt: "2026-03-10T10:00:00.000Z",
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
    pending: 0,
    plantNotes: null,
    primaryPhotoUri: null,
    photoCount: 0,
    careLogCount: 0,
    hasPrimaryPhoto: false,
    ...patch,
  };
}

describe("GraveyardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGraveyardData = [];
  });

  it("shows a truthful empty state when there are no memorials", () => {
    renderWithProviders(<GraveyardScreen />);

    expect(screen.getByText("No memorials yet")).toBeTruthy();
    expect(screen.queryByText("Add Memorial")).toBeNull();
  });

  it("does not render tribute editing controls when only one memorial exists", () => {
    mockGraveyardData = [
      createMemorial("graveyard-1", {
        name: "Aster",
        plantNotes: "Taught patience.",
      }),
    ];

    renderWithProviders(<GraveyardScreen />);

    expect(screen.getByLabelText("View Aster memorial")).toBeTruthy();
    expect(screen.queryByText("Add Memorial")).toBeNull();
  });

  it("avoids silently reusing the same memorial across major role placements", () => {
    mockGraveyardData = [
      createMemorial("recent", {
        name: "Recent Plant",
        archivedAt: "2026-03-20T10:00:00.000Z",
      }),
      createMemorial("featured", {
        name: "Featured Plant",
        memorialNote:
          "A richly authored memorial that should win the featured placement.",
        causeOfPassing: "Root rot",
        photoCount: 3,
        careLogCount: 5,
        hasPrimaryPhoto: true,
      }),
      createMemorial("reflection", {
        name: "Reflection Plant",
        memorialNote:
          "A thoughtful remembrance that belongs in the reflection placement.",
      }),
      createMemorial("tribute", {
        name: "Tribute Plant",
        photoCount: 6,
        careLogCount: 9,
        hasPrimaryPhoto: true,
      }),
    ];

    renderWithProviders(<GraveyardScreen />);

    expect(screen.getAllByLabelText("View Featured Plant memorial")).toHaveLength(
      1,
    );
    expect(
      screen.getAllByLabelText("View Reflection Plant memorial"),
    ).toHaveLength(1);
    expect(screen.getAllByLabelText("View Tribute Plant memorial")).toHaveLength(
      1,
    );
  });

  it("opens a real memorial sheet and saves memorial content", async () => {
    mockGraveyardData = [
      createMemorial("featured", {
        name: "Featured Plant",
        memorialNote:
          "A richly authored memorial that should win the featured placement.",
        causeOfPassing: "Root rot",
        photoCount: 3,
        careLogCount: 5,
        hasPrimaryPhoto: true,
      }),
      createMemorial("reflection", {
        name: "Reflection Plant",
        memorialNote:
          "A thoughtful remembrance that belongs in the reflection placement.",
      }),
      createMemorial("graveyard-1", {
        name: "Aster",
        plantNotes: "Taught patience.",
        photoCount: 4,
        careLogCount: 9,
        hasPrimaryPhoto: true,
      }),
    ];

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

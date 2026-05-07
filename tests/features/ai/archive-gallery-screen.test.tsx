import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import ArchiveGalleryScreen from "@/app/archive-gallery";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockSaveArchiveCurationOverride = jest.fn();
const mockSuccess = jest.fn();

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/features/plants/hooks/useGraveyard", () => ({
  useGraveyard: () => ({ data: [] }),
}));

jest.mock("@/features/ai/hooks/useArchiveCuration", () => ({
  useArchiveCuration: () => ({
    isLoading: false,
    data: [
      {
        plantId: "plant-1",
        plantName: "Fern",
        beforeUri: "file://before.jpg",
        afterUri: "file://after.jpg",
        beforePhotoId: "photo-before",
        afterPhotoId: "photo-after",
        caption: "Original pairing",
        source: "local",
        candidatePhotos: [
          { id: "photo-before", uri: "file://before.jpg" },
          { id: "photo-after", uri: "file://after.jpg" },
          { id: "photo-third", uri: "file://third.jpg" },
        ],
      },
    ],
  }),
}));

jest.mock("@/features/ai/services/archiveCurationOverridesService", () => ({
  saveArchiveCurationOverride: (...args: unknown[]) =>
    mockSaveArchiveCurationOverride(...args),
}));

jest.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ success: mockSuccess, warning: jest.fn() }),
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      surfaceContainerLow: "#eee",
      surfaceContainerLowest: "#fff",
      primary: "#111",
      secondary: "#333",
      onSurfaceVariant: "#666",
    },
    spacing: { lg: 16 },
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("ArchiveGalleryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveArchiveCurationOverride.mockResolvedValue(undefined);
  });

  it("lets users edit and persist curated photo pair selections", async () => {
    renderWithProviders(<ArchiveGalleryScreen />);

    fireEvent.press(screen.getByText("Edit Pairing"));
    fireEvent.press(screen.getByText("Set after: 3"));
    fireEvent.press(screen.getByText("Save Pairing"));

    await waitFor(() =>
      expect(mockSaveArchiveCurationOverride).toHaveBeenCalledWith({
        userId: "user-1",
        selection: {
          plantId: "plant-1",
          beforePhotoId: "photo-before",
          afterPhotoId: "photo-third",
          caption: "Original pairing",
        },
      }),
    );
    expect(mockSuccess).toHaveBeenCalledWith("Archive pairing saved.");
  });
});

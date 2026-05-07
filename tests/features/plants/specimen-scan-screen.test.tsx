import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import SpecimenScanScreen from "@/app/specimen-scan";
import SpecimenTagsScreen from "@/app/specimen-tags";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRequestPermission = jest.fn();
const mockResolveSpecimenTagScan = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("expo-camera", () => ({
  CameraView: ({
    onBarcodeScanned,
  }: {
    onBarcodeScanned?: (event: { data: string; type: string }) => void;
  }) => {
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          onBarcodeScanned?.({
            data: "scan-payload",
            type: "qr",
          })
        }
      >
        <Text>Mock camera scanner</Text>
      </Pressable>
    );
  },
  useCameraPermissions: () => [
    { granted: true, canAskAgain: true },
    mockRequestPermission,
  ],
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: true,
    tier: 'premium',
    isLoading: false,
    isRestoring: false,
    expiresAt: null,
    period: 'monthly',
    error: null,
    offerings: null,
    purchase: jest.fn(),
    restore: jest.fn(),
    refreshOfferings: jest.fn(),
  }),
}));

jest.mock("@/features/plants/services/specimenTagsService", () => ({
  resolveSpecimenTagScan: (...args: unknown[]) =>
    mockResolveSpecimenTagScan(...args),
}));

jest.mock("@/features/plants/hooks/useSpecimenTags", () => ({
  useSpecimenTags: () => ({
    plants: [
      {
        id: "plant-1",
        name: "Monstera",
        speciesName: "Monstera deliciosa",
        location: "Library",
      },
    ],
    tags: [
      {
        plantId: "plant-1",
        code: "MON-3456",
        payload: "scan-payload",
        qrMatrix: [[true]],
      },
    ],
  }),
}));

jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return {
    BlurView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("react-native-qrcode-svg", () => {
  const { Text } = require("react-native");
  return ({ value }: { value: string }) => <Text>QR value: {value}</Text>;
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      surface: "#fff",
      surfaceContainerLowest: "#fff",
      surfaceContainerLow: "#f2f2f2",
      surfaceContainerHigh: "#ddd",
      surfaceBright: "#fff",
      primary: "#111",
      secondary: "#444",
      onSurface: "#222",
      onSurfaceVariant: "#666",
      error: "#8a1f11",
    },
    spacing: {
      lg: 16,
    },
  }),
}));

describe("specimen native scanning", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exposes the native scanner workflow from specimen tags", () => {
    renderWithProviders(<SpecimenTagsScreen />);

    expect(screen.getByText("QR value: scan-payload")).toBeTruthy();
    fireEvent.press(screen.getByText("Scan Tag"));

    expect(mockPush).toHaveBeenCalledWith("/specimen-scan");
  });

  it("opens a camera scanner and routes valid local specimen scans", async () => {
    mockResolveSpecimenTagScan.mockResolvedValue({
      status: "matched",
      match: {
        tagId: "tag-1",
        plantId: "plant-1",
        code: "MON-3456",
        plantName: "Monstera",
        speciesName: "Monstera deliciosa",
      },
    });

    renderWithProviders(<SpecimenScanScreen />);

    fireEvent.press(screen.getByText("Mock camera scanner"));

    await waitFor(() =>
      expect(mockResolveSpecimenTagScan).toHaveBeenCalledWith({
        userId: "user-1",
        value: "scan-payload",
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/plant/plant-1");
  });

  it("keeps scanning visible and truthful when a scanned code is invalid", async () => {
    mockResolveSpecimenTagScan.mockResolvedValue({ status: "invalid" });

    renderWithProviders(<SpecimenScanScreen />);
    fireEvent.press(screen.getByText("Mock camera scanner"));

    await waitFor(() =>
      expect(
        screen.getByText("That tag is not from The Conservatory."),
      ).toBeTruthy(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

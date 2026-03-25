import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import HomeScreen from "@/app/(tabs)/index";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockPush = jest.fn();
const mockUseDashboardInsight = jest.fn();

type PlantStub = {
  id: string;
  primaryPhotoUri?: string | null;
  nextWaterDueAt?: string | null;
};

let mockPlants: PlantStub[] = [];

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [] }),
}));

jest.mock("react-native-paper", () => ({
  FAB: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/components/design-system/useTheme", () => ({
  useTheme: () => ({
    colors: {
      surface: "#fff",
      primary: "#000",
      secondary: "#555",
      onSurfaceVariant: "#666",
      primaryContainer: "#ddd",
      surfaceBright: "#fff",
    },
    spacing: {
      lg: 16,
    },
  }),
}));

jest.mock("@/components/navigation/tabBarMetrics", () => ({
  getFloatingActionBottomOffset: () => 20,
}));

jest.mock("@/features/dashboard/hooks/useDashboard", () => ({
  useDashboard: () => ({
    plants: mockPlants,
    dueToday: mockPlants.filter((plant) => {
      if (!plant.nextWaterDueAt) {
        return false;
      }

      return (
        new Date(plant.nextWaterDueAt).getTime() <=
        Date.now() + 24 * 60 * 60 * 1000
      );
    }),
    nextCycleHours: null,
    isOffline: false,
    isLoading: false,
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/features/notifications/hooks/useReminders", () => ({
  useReminders: () => ({
    data: [],
  }),
}));

jest.mock("@/hooks/usePullToRefreshSync", () => ({
  usePullToRefreshSync: () => ({
    onRefresh: jest.fn(),
    refreshing: false,
  }),
}));

jest.mock("@/features/care-logs/api/careLogsClient", () => ({
  listCareLogsForPlants: jest.fn(async () => []),
}));

jest.mock("@/features/ai/hooks/useDashboardInsight", () => ({
  useDashboardInsight: (input: unknown) => {
    mockUseDashboardInsight(input);
    return {
      data: {
        title: "Today in your conservatory",
        body: "Aster is ready for care.",
        source: "local",
      },
    };
  },
}));

jest.mock("@/features/ai/hooks/useStreakRecoveryNudge", () => ({
  useStreakRecoveryNudge: () => ({
    data: null,
  }),
}));

jest.mock("@/features/ai/services/dashboardPresentationService", () => ({
  decideDashboardPresentation: ({ insight }: { insight: unknown }) => ({
    primaryInsight: insight,
    streakNudge: null,
  }),
}));

jest.mock("@/features/dashboard/services/dashboardHeroCopy", () => ({
  buildDashboardHeroCopy: () => ({
    eyebrow: "eyebrow",
    body: "body",
  }),
}));

jest.mock("@/features/dashboard/components/DashboardHeader", () => ({
  DashboardHeader: () => null,
}));

jest.mock("@/features/dashboard/components/HydrationCard", () => ({
  HydrationCard: () => null,
}));

jest.mock("@/features/dashboard/components/SpeciesCounter", () => ({
  SpeciesCounter: () => null,
}));

jest.mock("@/features/dashboard/components/UpcomingCare", () => ({
  UpcomingCare: () => null,
}));

jest.mock("@/features/ai/components/DashboardInsightCard", () => ({
  DashboardInsightCard: () => {
    const { Text } = require("react-native");
    return <Text>insight-card</Text>;
  },
}));

jest.mock("@/components/common/Buttons/PrimaryButton", () => ({
  PrimaryButton: () => null,
}));

describe("HomeScreen dashboard insight visibility", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-24T10:00:00.000Z"));
    mockPlants = [];
    mockUseDashboardInsight.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("hides insight card when no plants need watering today", () => {
    mockPlants = [
      {
        id: "plant-1",
        primaryPhotoUri: null,
        nextWaterDueAt: "2026-03-25T10:00:00.000Z",
      },
    ];

    render(<HomeScreen />);

    expect(screen.queryByText("insight-card")).toBeNull();
    expect(mockUseDashboardInsight).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it("shows insight card when a plant needs watering today", () => {
    mockPlants = [
      {
        id: "plant-1",
        primaryPhotoUri: null,
        nextWaterDueAt: "2026-03-24T18:00:00.000Z",
      },
    ];

    render(<HomeScreen />);

    expect(screen.getByText("insight-card")).toBeTruthy();
    expect(mockUseDashboardInsight).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });
});

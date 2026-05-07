import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";

import { useSpecimenTags } from "@/features/plants/hooks/useSpecimenTags";

const mockEnsureSpecimenTag = jest.fn();
let mockIsPremium = false;

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    isAuthenticated: true,
  }),
}));

jest.mock("@/features/billing/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: mockIsPremium,
    isLoading: false,
  }),
}));

jest.mock("@/features/plants/hooks/usePlants", () => ({
  useAllActivePlants: () => ({
    data: [
      {
        id: "plant-1",
        userId: "user-1",
        name: "Monstera",
        speciesName: "Monstera deliciosa",
        status: "active",
        wateringIntervalDays: 7,
        createdAt: "2026-05-07T00:00:00.000Z",
        updatedAt: "2026-05-07T00:00:00.000Z",
        pending: 0,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

jest.mock("@/features/plants/services/specimenTagsService", () => ({
  ensureSpecimenTag: (...args: unknown[]) => mockEnsureSpecimenTag(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useSpecimenTags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPremium = false;
    mockEnsureSpecimenTag.mockResolvedValue({
      id: "tag-1",
      plantId: "plant-1",
      code: "MON-NT-1",
      payload: "{}",
      qrMatrix: [],
    });
  });

  it("does not create persisted specimen tags for free users", async () => {
    const { result } = renderHook(() => useSpecimenTags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.plants).toHaveLength(1);
      expect(result.current.tags).toEqual([]);
    });
    expect(mockEnsureSpecimenTag).not.toHaveBeenCalled();
  });

  it("creates persisted specimen tags for premium users", async () => {
    mockIsPremium = true;

    const { result } = renderHook(() => useSpecimenTags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.tags).toHaveLength(1);
    });
    expect(mockEnsureSpecimenTag).toHaveBeenCalledWith({
      userId: "user-1",
      plant: expect.objectContaining({ id: "plant-1" }),
    });
  });
});

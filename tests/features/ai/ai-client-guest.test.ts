/**
 * @jest-environment node
 */

jest.mock("@/config/env", () => ({
  env: { isSupabaseConfigured: true },
}));

jest.mock("@/services/entitlementState", () => ({
  getEntitlementState: jest.fn(() => false),
}));

jest.mock("@/services/database/syncDataOwner", () => ({
  getActiveDataOwnerUserId: jest.fn(() => "guest-abc"),
}));

const mockInvoke = jest.fn();

jest.mock("@/config/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

import { requestDashboardInsight } from "@/features/ai/api/aiClient";

describe("aiClient guest blocking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not invoke edge functions for guest active users", async () => {
    const result = await requestDashboardInsight({
      summary: {
        activePlantCount: 0,
        duePlantCount: 0,
        overduePlantCount: 0,
        currentStreakDays: 0,
      },
      fallback: {
        title: "Local insight",
        body: "Your conservatory is growing steadily.",
      },
    });

    expect(result).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

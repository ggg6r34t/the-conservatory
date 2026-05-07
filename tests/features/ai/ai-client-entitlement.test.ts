const mockInvoke = jest.fn();

jest.mock("@/config/env", () => ({
  env: { isSupabaseConfigured: true },
}));

jest.mock("@/config/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

describe("aiClient entitlement gateway", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { setEntitlementState } = require("@/services/entitlementState");
    setEntitlementState(false);
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it("blocks premium-only cloud AI functions before invoking Supabase", async () => {
    const { requestDashboardInsight } = require("@/features/ai/api/aiClient");

    await expect(requestDashboardInsight({ plants: [] })).resolves.toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("sends entitlement context with allowed cloud AI requests", async () => {
    const { requestHealthInsight } = require("@/features/ai/api/aiClient");

    await requestHealthInsight({
      plant: { id: "plant-1", name: "Aster" },
      recentLogs: [],
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      "generate-health-insight",
      expect.objectContaining({
        body: expect.objectContaining({
          billingContext: expect.objectContaining({
            feature: "ai_health_insight",
            isPremium: false,
          }),
        }),
      }),
    );
  });
});

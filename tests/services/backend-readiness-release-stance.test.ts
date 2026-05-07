describe("backend readiness release stance", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("treats configured Supabase as sync-capable without a trial flag", async () => {
    jest.doMock("@/config/env", () => ({
      env: {
        isSupabaseConfigured: true,
        isProductionBuild: true,
        missingSupabaseConfig: [],
      },
    }));
    jest.doMock("@/config/supabase", () => ({
      supabase: {
        auth: {
          getUser: jest.fn(async () => ({ error: null })),
        },
      },
    }));

    const {
      probeRemoteBackendAvailability,
    } = require("@/services/supabase/backendReadiness");

    await expect(probeRemoteBackendAvailability()).resolves.toEqual(
      expect.objectContaining({
        state: "available",
        canSync: true,
      }),
    );
  });
});

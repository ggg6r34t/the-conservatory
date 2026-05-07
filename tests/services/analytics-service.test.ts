describe("analyticsService", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("does not emit events when posthogApiKey is absent", () => {
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.doMock("@/config/env", () => ({
      env: {
        posthogApiKey: null,
        posthogHost: 'https://app.posthog.com',
      },
    }));

    const service = require("@/services/analytics/analyticsService");

    service.trackEvent("onboarding_started", { source: "welcome" });

    expect(service.getAnalyticsMode()).toBe("disabled");
    expect(mockConsoleLog).not.toHaveBeenCalled();

    mockConsoleLog.mockRestore();
  });

  it("logs events in debug-log mode when posthogApiKey is present in dev", () => {
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.doMock("@/config/env", () => ({
      env: {
        posthogApiKey: 'phc_test_key',
        posthogHost: 'https://app.posthog.com',
      },
    }));

    const service = require("@/services/analytics/analyticsService");

    service.trackEvent("onboarding_started", { source: "welcome" });

    expect(service.getAnalyticsMode()).toBe("debug-log");
    expect(service.getAnalyticsStatus().productionReady).toBe(false);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      "[Analytics]",
      "onboarding_started",
      expect.objectContaining({ source: "welcome" }),
    );

    mockConsoleLog.mockRestore();
  });
});

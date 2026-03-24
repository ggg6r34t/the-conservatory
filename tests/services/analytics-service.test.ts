describe("analyticsService", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("does not emit events when analytics is disabled", () => {
    const mockInfo = jest.fn();

    jest.doMock("@/config/env", () => ({
      env: {
        enableAnalytics: false,
      },
    }));
    jest.doMock("@/utils/logger", () => ({
      logger: {
        info: (...args: unknown[]) => mockInfo(...args),
      },
    }));

    const service = require("@/services/analytics/analyticsService");

    service.trackEvent("onboarding_started", { source: "welcome" });

    expect(service.getAnalyticsMode()).toBe("disabled");
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("logs events in explicit debug-log mode when enabled", () => {
    const mockInfo = jest.fn();

    jest.doMock("@/config/env", () => ({
      env: {
        enableAnalytics: true,
      },
    }));
    jest.doMock("@/utils/logger", () => ({
      logger: {
        info: (...args: unknown[]) => mockInfo(...args),
      },
    }));

    const service = require("@/services/analytics/analyticsService");

    service.trackEvent("onboarding_started", { source: "welcome" });

    expect(service.getAnalyticsMode()).toBe("debug-log");
    expect(service.getAnalyticsStatus().productionReady).toBe(false);
    expect(mockInfo).toHaveBeenCalledWith(
      "analytics.debug_event",
      expect.objectContaining({
        name: "onboarding_started",
        mode: "debug-log",
      }),
    );
  });
});

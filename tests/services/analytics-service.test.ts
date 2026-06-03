describe("analyticsService", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("lazy-loads PostHog instead of importing it at module scope", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        process.cwd(),
        "services/analytics/analyticsService.ts",
      ),
      "utf8",
    );

    expect(source).toContain("import('posthog-react-native')");
    expect(source).not.toMatch(
      /^import\s+PostHog\s+from\s+['"]posthog-react-native['"]/m,
    );
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

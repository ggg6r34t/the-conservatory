jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: unknown) => component,
  startSpan: (_options: unknown, callback: () => unknown) => callback(),
}));

describe("crashReportingService", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("stays disabled without a Sentry DSN", () => {
    jest.doMock("@/config/env", () => ({
      env: {
        sentryDsn: null,
        isProductionBuild: true,
      },
    }));

    const service = require("@/services/observability/crashReportingService");
    service.initializeCrashReporting();
    service.captureException(new Error("boom"), { surface: "test" });

    const Sentry = require("@sentry/react-native");
    expect(service.getCrashReportingMode()).toBe("disabled");
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("initializes Sentry when a DSN is configured", () => {
    jest.doMock("@/config/env", () => ({
      env: {
        sentryDsn: "https://example@o0.ingest.sentry.io/0",
        isProductionBuild: true,
      },
    }));

    const service = require("@/services/observability/crashReportingService");
    service.initializeCrashReporting();
    service.setCrashReportingUser({ id: "user-1", email: "test@example.com" });
    service.captureException(new Error("sync failed"), { surface: "sync" });

    const Sentry = require("@sentry/react-native");
    expect(service.getCrashReportingMode()).toBe("active");
    expect(Sentry.init).toHaveBeenCalled();
    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: "user-1",
      email: "test@example.com",
    });
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

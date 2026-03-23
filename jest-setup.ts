const originalConsoleLog = console.log;

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    const [firstArg] = args;

    if (typeof firstArg === "string") {
      try {
        const parsed = JSON.parse(firstArg) as { level?: string; message?: string };
        if (
          typeof parsed.level === "string" &&
          typeof parsed.message === "string"
        ) {
          return;
        }
      } catch {
        // Fall through to original logging for non-JSON console output.
      }
    }

    originalConsoleLog(...args);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

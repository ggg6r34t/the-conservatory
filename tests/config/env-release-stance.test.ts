describe("env release sync stance", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("does not expose a sync trial flag in runtime config", () => {
    const { env } = require("@/config/env");

    expect(env).not.toHaveProperty("enableSyncTrials");
  });
});

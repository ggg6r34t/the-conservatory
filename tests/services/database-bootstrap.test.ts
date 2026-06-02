import {
  getDatabaseBootstrapState,
  markDatabaseBootstrapLoading,
  markDatabaseBootstrapReady,
} from "@/services/database/databaseBootstrap";

describe("databaseBootstrap", () => {
  beforeEach(() => {
    markDatabaseBootstrapReady();
  });

  it("does not regress to loading after the database is ready", () => {
    expect(getDatabaseBootstrapState().status).toBe("ready");

    markDatabaseBootstrapLoading();

    expect(getDatabaseBootstrapState().status).toBe("ready");
  });
});

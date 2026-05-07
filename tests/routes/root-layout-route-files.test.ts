import fs from "node:fs";
import path from "node:path";

describe("root layout route files", () => {
  it("declares only concrete top-level route files for backup repair routes", () => {
    const appRoot = path.join(process.cwd(), "app");

    expect(fs.existsSync(path.join(appRoot, "sync-repair.tsx"))).toBe(true);
  });
});

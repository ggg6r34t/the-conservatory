import fs from "fs";
import path from "path";

describe("downgrade copy", () => {
  it("states downgrade effects without threatening data deletion", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app", "downgrade.tsx"),
      "utf8",
    );

    expect(source).toContain("does not remove your plants");
    expect(source).toContain("New premium photo backup");
    expect(source).toContain("premium AI");
    expect(source).toContain("enhanced export");
    expect(source).toContain("Downgrading does not delete local photos");
  });
});

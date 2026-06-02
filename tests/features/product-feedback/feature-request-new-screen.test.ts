import fs from "fs";
import path from "path";

const newScreenSource = fs.readFileSync(
  path.join(process.cwd(), "app", "feature-requests", "new.tsx"),
  "utf8",
);

describe("feature request new screen chips", () => {
  it("uses white selected text for category, plant context, and contact preference chips", () => {
    const selectedColorPattern =
      /selected \? colors\.onPrimary : colors\.primary/g;

    expect(newScreenSource).toContain("Category");
    expect(newScreenSource).toContain("Optional plant context");
    expect(newScreenSource).toContain("Contact preference");
    expect(newScreenSource.match(selectedColorPattern)).toHaveLength(3);
  });

  it("uses selected-state text for the None plant context chip", () => {
    expect(newScreenSource).toContain(
      "{ color: !plantId ? colors.onPrimary : colors.primary }",
    );
  });
});

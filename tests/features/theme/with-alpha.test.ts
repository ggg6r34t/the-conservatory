import { withAlpha } from "@/features/theme/utils/withAlpha";

describe("withAlpha", () => {
  it("applies alpha to hex colors", () => {
    expect(withAlpha("#163828", 0.5)).toBe("rgba(22, 56, 40, 0.5)");
  });

  it("applies alpha to rgb colors", () => {
    expect(withAlpha("rgb(251, 249, 244)", 0.38)).toBe(
      "rgba(251, 249, 244, 0.38)",
    );
  });
});

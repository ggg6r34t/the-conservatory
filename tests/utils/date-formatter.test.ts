import { formatDueLabel, formatEditorialDate } from "@/utils/dateFormatter";

describe("dateFormatter", () => {
  it("should format editorial dates", () => {
    expect(formatEditorialDate("2026-03-21T10:00:00.000Z")).toContain("2026");
  });

  it("should describe missing due dates as TBD", () => {
    expect(formatDueLabel(null)).toBe("TBD");
  });
});

import {
  normalizeCareLogTags,
  serializeCareLogTags,
} from "@/features/care-logs/services/careLogTagsService";

describe("careLogTagsService", () => {
  it("normalizes duplicate and blank care log tags deterministically", () => {
    expect(
      normalizeCareLogTags([
        " new growth ",
        "",
        "stable condition",
        "new growth",
      ]),
    ).toEqual(["new growth", "stable condition"]);
  });

  it("serializes normalized tags for remote compatibility", () => {
    expect(serializeCareLogTags(["stable condition", "stable condition"])).toBe(
      '["stable condition"]',
    );
    expect(serializeCareLogTags([])).toBeNull();
  });
});

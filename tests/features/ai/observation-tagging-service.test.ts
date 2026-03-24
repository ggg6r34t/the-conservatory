import {
  buildCareLogNoteForSave,
  extractObservationTags,
  formatCareLogNoteForStorage,
  parseStructuredCareLogNote,
  refineCareLogNote,
} from "@/features/ai/services/observationTaggingService";

describe("observationTaggingService", () => {
  it("extracts observation tags from note content", () => {
    const result = extractObservationTags(
      "Noticed new growth but a few yellow leaves and dry soil.",
      "inspect",
    );

    expect(result).toEqual(
      expect.arrayContaining(["new growth", "yellowing leaves", "dry soil"]),
    );
  });

  it("refines a note conservatively", () => {
    expect(refineCareLogNote("checked leaves and wiped dust")).toBe(
      "Checked leaves and wiped dust.",
    );
  });

  it("stores tags in a structured note envelope and parses them back out", () => {
    const note = formatCareLogNoteForStorage({
      note: "Checked leaves and wiped dust.",
      tags: ["stable condition", "new growth"],
    });

    expect(parseStructuredCareLogNote(note)).toEqual({
      body: "Checked leaves and wiped dust.",
      tags: ["stable condition", "new growth"],
    });
  });

  it("preserves the original note when no refinement was accepted", () => {
    const note = buildCareLogNoteForSave({
      originalNote: "checked leaves and wiped dust",
      acceptedRefinement: null,
      tags: [],
    });

    expect(note).toBe("checked leaves and wiped dust");
  });

  it("uses the refined note only when it was explicitly accepted", () => {
    const note = buildCareLogNoteForSave({
      originalNote: "checked leaves and wiped dust",
      acceptedRefinement: "Checked leaves and wiped dust.",
      tags: ["stable condition"],
    });

    expect(parseStructuredCareLogNote(note)).toEqual({
      body: "Checked leaves and wiped dust.",
      tags: ["stable condition"],
    });
  });

  it("parses legacy tag marker envelopes for backward compatibility", () => {
    const parsed = parseStructuredCareLogNote(
      "Checked leaves and wiped dust.\n\nTags: stable condition, new growth",
    );

    expect(parsed).toEqual({
      body: "Checked leaves and wiped dust.",
      tags: ["stable condition", "new growth"],
    });
  });
});

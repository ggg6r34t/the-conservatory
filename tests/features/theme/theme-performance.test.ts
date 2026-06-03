import {
  buildThemeTokens,
  clearThemeTokenCache,
  themeCatalog,
} from "@/features/theme/registry";

describe("theme performance guardrails", () => {
  beforeEach(() => {
    clearThemeTokenCache();
  });

  it("builds cached tokens quickly for every theme", () => {
    const started = performance.now();

    for (const theme of themeCatalog) {
      const first = buildThemeTokens(theme.id);
      const second = buildThemeTokens(theme.id);
      expect(second).toBe(first);
    }

    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(100);
  });

  it("maps the catalog for picker rendering within budget", () => {
    const started = performance.now();
    const cards = themeCatalog.map((theme) => ({
      id: theme.id,
      name: theme.name,
      previewTitle: theme.preview.plantTitle,
    }));
    const elapsed = performance.now() - started;

    expect(cards).toHaveLength(4);
    expect(elapsed).toBeLessThan(50);
  });
});

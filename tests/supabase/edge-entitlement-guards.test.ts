import fs from "fs";
import path from "path";

const PREMIUM_ONLY_FUNCTIONS = [
  "generate-dashboard-insight",
  "generate-journal-summary",
  "optimize-reminders",
  "curate-archive-gallery",
];

describe("Supabase Edge Function entitlement guards", () => {
  it("provides a shared RevenueCat-backed premium entitlement guard", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase",
        "functions",
        "_shared",
        "entitlements.ts",
      ),
      "utf8",
    );

    expect(source).toContain("assertPremiumEntitlement");
    expect(source).toContain("auth.getUser");
    expect(source).toContain("REVENUECAT_SECRET_API_KEY");
    expect(source).toContain("https://api.revenuecat.com/v1/subscribers/");
    expect(source).toContain("expires_date");
    expect(source).not.toContain("billingContext.isPremium");
  });

  it.each(PREMIUM_ONLY_FUNCTIONS)(
    "guards %s before processing request body",
    (functionName) => {
      const source = fs.readFileSync(
        path.join(
          process.cwd(),
          "supabase",
          "functions",
          functionName,
          "index.ts",
        ),
        "utf8",
      );
      const guardIndex = source.indexOf("await assertPremiumEntitlement");
      const readJsonIndex = source.indexOf("await readJsonWithLimit");

      expect(source).toContain("../_shared/entitlements");
      expect(guardIndex).toBeGreaterThan(-1);
      expect(readJsonIndex).toBeGreaterThan(-1);
      expect(guardIndex).toBeLessThan(readJsonIndex);
    },
  );
});

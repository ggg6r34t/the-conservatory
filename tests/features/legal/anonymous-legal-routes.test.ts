import {
  isAnonymousAccessibleLegalRoute,
  LEGAL_ROUTES,
} from "@/features/legal/constants";

describe("isAnonymousAccessibleLegalRoute", () => {
  it("allows terms and privacy before sign-in", () => {
    expect(isAnonymousAccessibleLegalRoute("/terms")).toBe(true);
    expect(isAnonymousAccessibleLegalRoute("/privacy")).toBe(true);
  });

  it("allows legacy legal redirects that resolve to consolidated docs", () => {
    expect(isAnonymousAccessibleLegalRoute("/subscription-terms")).toBe(true);
    expect(isAnonymousAccessibleLegalRoute("/data-export-policy")).toBe(true);
  });

  it("blocks authenticated-only routes for anonymous users", () => {
    expect(isAnonymousAccessibleLegalRoute("/profile")).toBe(false);
    expect(isAnonymousAccessibleLegalRoute(LEGAL_ROUTES.privacySecurity)).toBe(
      false,
    );
  });
});

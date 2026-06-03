import { themeCatalog } from "@/features/theme/catalog";
import {
  canUseTheme,
  getThemeAccess,
  hasRecurringPremiumSubscription,
} from "@/features/theme/themeAccess";

describe("theme access", () => {
  it("marks linen-light as free and other catalog themes as premium", () => {
    expect(getThemeAccess("linen-light")).toBe("free");
    expect(getThemeAccess("deep-forest")).toBe("premium");
    expect(getThemeAccess("midnight-ivy")).toBe("premium");
    expect(getThemeAccess("terracotta-dusk")).toBe("premium");
    expect(themeCatalog.find((t) => t.id === "linen-light")?.access).toBe("free");
  });

  it("always allows linen-light", () => {
    expect(
      canUseTheme("linen-light", { tier: "free", period: null }).canUse,
    ).toBe(true);
    expect(
      canUseTheme("linen-light", { tier: "premium", period: "lifetime" })
        .canUse,
    ).toBe(true);
  });

  it("requires recurring premium for premium themes", () => {
    const free = canUseTheme("deep-forest", { tier: "free", period: null });
    expect(free.canUse).toBe(false);
    expect(free.reason).toBe("requires_premium");
    expect(free.resolvedThemeId).toBe("linen-light");

    const monthly = canUseTheme("midnight-ivy", {
      tier: "premium",
      period: "monthly",
    });
    expect(monthly.canUse).toBe(true);

    const annual = canUseTheme("terracotta-dusk", {
      tier: "premium",
      period: "annual",
    });
    expect(annual.canUse).toBe(true);
  });

  it("does not unlock premium themes for lifetime entitlement", () => {
    expect(
      hasRecurringPremiumSubscription({ tier: "premium", period: "lifetime" }),
    ).toBe(false);
    expect(
      canUseTheme("deep-forest", { tier: "premium", period: "lifetime" })
        .canUse,
    ).toBe(false);
    expect(
      canUseTheme("deep-forest", { tier: "premium", period: "lifetime" }).reason,
    ).toBe("entitlement_expired");
  });

  it("falls back unknown theme ids safely", () => {
    const result = canUseTheme("sunset-glow", { tier: "premium", period: "annual" });
    expect(result.canUse).toBe(false);
    expect(result.reason).toBe("unknown_theme");
    expect(result.resolvedThemeId).toBe("linen-light");
  });
});

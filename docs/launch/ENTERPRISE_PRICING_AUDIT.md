# Enterprise Pricing Audit — The Conservatory

**Audit basis:** Executable code (`features/billing/constants.ts`, AI edge stack, `app/premium.tsx`, RevenueCat adapter), store listings (Planta, Greg, PictureThis, Day One, Calm/Headspace), and infrastructure pricing (RevenueCat, Supabase, model cost tables in `supabase/functions/_shared/aiProvider.ts`).

**Not used as evidence:** Internal monetization docs alone, roadmap claims without code.

---

## Executive Summary

The Conservatory is **monetization-ready in infrastructure** but **not priced in code** — prices live in App Store Connect, Google Play, and RevenueCat. The **implemented Premium bundle** (AI narratives, cloud photo backup, unlimited quotas, specimen tags, premium export, archive curation) supports **premium positioning above utility plant apps (Greg, PictureThis)** but **below editorial AI journals (Day One Gold at $74.99/yr)** at launch.

**Recommended launch pricing (USD; localize to EUR at parity ±5%):**

| Plan | Membership name | Launch price | Role |
|------|-----------------|--------------|------|
| **Free** | **The Seedling** | $0 | Generous entry tier — same editorial naming as paid memberships |
| **Monthly** | **The Steward** | **$6.99 / €6.99** | Decoy anchor; de-emphasized in UI |
| **Annual** | **The Heirloom** | **$44.99 / €44.99** | Primary conversion SKU (~46% vs monthly) |
| **Lifetime** | **The Endowment** | **$129.99 / €129.99** | **Limited early-adopter SKU only** (cap quantity + grandfather rules) |

**Naming model:** Each membership rhythm — including free — gets a **distinct editorial title** (`features/billing/membershipNames.ts`). All paid SKUs unlock the same `premium` entitlement; names reflect how the member relates to their collection (seedling → monthly stewardship → seasonal legacy → permanent endowment).

**Free trial:** 7 days on annual (already supported via `introductoryPrice` in `subscription-plans.tsx`).

**Final verdict:** **RECOMMENDED WITH PRICE CHANGES** — set store/RevenueCat prices, add explicit annual savings on paywall, do **not** advertise roadmap features (Year in Review, Memorial Book, Web Companion, Collection Analytics) until shipped.

---

## Phase 1 — Premium Feature Value Audit

Scoring: **User value / Retention / Revenue / Defensibility / Emotional** (1–5).

**Ship status** from code audit.

| Feature | Shipped? | User | Freq | Retention | Revenue | Defensible | Emotional | Notes |
|---------|----------|------|------|-----------|---------|------------|-----------|-------|
| **AI Health Insights** | ✅ (quota free: 1/plant/mo) | 4 | Weekly | 4 | 5 | 2 | 4 | Unlimited premium; local fallback exists |
| **AI Journal Narratives** | ✅ Premium-only | 5 | Monthly | 5 | 5 | 4 | 5 | Highest emotional SKU; 7-day cache |
| **AI Dashboard Editorial** | ✅ Premium-only | 3 | Daily | 4 | 3 | 3 | 4 | Habit surface; local fallback for free |
| **AI Archive Curation** | ✅ Premium-only | 4 | Monthly | 4 | 4 | 4 | 5 | Pairs with photo archive — unique |
| **AI Species ID** | ✅ (3/mo free) | 3 | Occasional | 2 | 3 | 1 | 2 | Commodity; not a pricing anchor |
| **Smart Reminder Optimization** | ✅ **Free for all** | 3 | Weekly | 3 | 0 | 2 | 2 | Deterministic local — **not premium** |
| **Premium Cloud Backup** | ✅ (photos deferred without premium) | 5 | Continuous | 5 | 5 | 3 | 5 | Strong anti-churn; sync-enforced |
| **Full Photo History** | ✅ (60d free view/export) | 4 | Weekly | 4 | 4 | 3 | 5 | Unlimited upload + cloud backup premium |
| **Unlimited Plants** | ✅ (10 free) | 4 | Daily | 3 | 4 | 2 | 3 | Table stakes for collectors |
| **Premium Export** | ✅ (materially different JSON) | 3 | Rare | 3 | 3 | 4 | 4 | Tags, photos, snapshots stripped in free |
| **Archive Gallery** | ✅ (AI curation premium path) | 4 | Monthly | 4 | 3 | 4 | 5 | Core brand surface |
| **Specimen Tags** | ✅ Service-gated | 3 | Rare | 2 | 3 | 4 | 4 | Niche but differentiated |
| **Advanced Library Filters** | ✅ | 2 | Weekly | 2 | 2 | 2 | 1 | Utility, not headline value |
| **Collection Analytics** | ❌ Not in code | — | — | — | — | — | — | **Do not price in** |
| **Year in Review** | ❌ Not in code | — | — | — | — | — | — | Roadmap only |
| **Memorial Book** | ❌ Not in code | — | — | — | — | — | — | Roadmap; consider **separate IAP** later |
| **Web Companion** | ❌ Not in code | — | — | — | — | — | — | Future expansion tier |
| **Timeline Enhancements** | ⚠️ Partial (journal highlights free) | 3 | Monthly | 3 | 2 | 3 | 4 | Monthly highlights exist; no premium timeline SKU |

**Pricing implication:** Launch price should reflect **6 shipped premium pillars** — AI editorial, cloud archive, unlimited collection depth, specimen tags, premium export, archive curation — not the full roadmap in `docs/MONETIZATION_AUDIT.md`.

---

## Phase 2 — Competitor Pricing Benchmark

| App | Category | Monthly | Annual | Lifetime | Position vs Conservatory |
|-----|----------|---------|--------|----------|--------------------------|
| **Greg** | Plant utility | ~$6.99 | ~$29.99 | ~$29.99–49.99 | Lower; community/utility, not editorial |
| **PictureThis** | ID + care | ~$7.99 | ~$29.99–39.99 | Rare | ID commodity; weaker archive/emotion |
| **Planta** | Plant care | ~$7.99–9.99 | ~$35.99 (promos $17.99–24.99) | No | Mass market; frequent discounting |
| **Planta (EU)** | — | ~€8.49–9.99 | ~€36.99–39.99 | No | Reference for € benchmarking |
| **Day One Silver** | Journal | — | $49.99 | No | **Closest editorial comp (non-AI)** |
| **Day One Gold** | Journal + AI | — | $74.99 | No | Mature AI journal ceiling |
| **Calm / Headspace** | Wellness | ~$12.99–14.99 | $69.99 | Calm $399.99 | Habit/wellness anchor — not plant |
| **Greg lifetime** | Plant | — | — | ~1× annual | Aggressive; unsustainable with AI |

**Market bands (annual, US/EU mainstream):**

- Utility plant apps: **$25–40**
- Premium plant / garden: **$35–50**
- Editorial + AI lifestyle: **$50–75**
- Wellness premium: **$70**

**Conservatory fit:** **$44.99 annual** — above utility floor, below Day One Gold, aligned with Day One Silver + AI bundle delta.

---

## Phase 3 — Cost Model

### Variable cost assumptions (from code)

**AI models** (`aiProvider.ts`): primary `gpt-4o-mini` at $0.15/$0.60 per 1M in/out tokens; quotas premium 100/day, 1000/mo per feature class (`edge.ts`).

**Estimated monthly AI cost — engaged premium user:**

| Feature | Calls/mo | Est. cost/mo |
|---------|----------|--------------|
| Dashboard editorial | 20–30 (cached) | $0.01–0.02 |
| Journal narrative | 1 | $0.001–0.003 |
| Health insights | 10–20 | $0.01–0.03 |
| Archive curation | 2–4 | $0.002–0.005 |
| Species ID (image) | 5–15 | $0.03–0.12 |
| **Total AI** | | **$0.06–0.18 typical; $0.40 heavy tail** |

**Storage** (Supabase ~$0.021/GB/mo):

- Free user (no photo cloud sync): **~$0.00–0.01**
- Premium light (100MB photos): **~$0.002**
- Premium heavy (1GB): **~$0.02**

**Infrastructure amortized** (Supabase Pro $25+, edge, PostHog/Sentry at scale):

| Scale | Amortized / premium user / mo |
|-------|-------------------------------|
| 100 premium | ~$0.50 |
| 500 premium | ~$0.12 |
| 2,000 premium | ~$0.04 |

### Cost per user per month (CPUM)

| Segment | AI | Storage | Infra share | **Total CPUM** |
|---------|-----|---------|-------------|----------------|
| **Free (active)** | $0.02–0.05 | $0.00 | $0.02–0.10 | **$0.04–0.15** |
| **Premium (typical)** | $0.08–0.18 | $0.01 | $0.04–0.12 | **$0.13–0.31** |
| **Premium (heavy)** | $0.25–0.40 | $0.02 | $0.04–0.12 | **$0.31–0.54** |

At **$44.99/year ($3.75/mo gross)**, even heavy users are **well above variable cost**. Margin pressure comes from **store fees**, not COGS.

### Fixed / platform costs

| Item | Launch impact |
|------|----------------|
| **RevenueCat** | Free until **$2,500 MTR/mo**, then 1% of gross MTR |
| **Apple/Google** | **30%** Y1 subscriptions; **15%** Y2+ (Small Business / subscriber retention programs) |
| **Support** | Minimal at launch; budget **$0.10–0.25/premium user/mo** if email support added |

---

## Phase 4 — Retention & Conversion Model

Conservative indie plant/lifestyle assumptions (no live cohort data in repo):

| Month | Active users (base 1,000 launch cohort) | Retention | Paying (3%→5% conv.) | Annual renewal |
|-------|----------------------------------------|-----------|----------------------|----------------|
| M1 | 1,000 | 100% | 30 premium (3%) | — |
| M3 | 380 | 38% | +8 new premium | — |
| M6 | 280 | 28% | 4% conv. steady-state | 58% Y1 renewal |
| M12 | 180 | 18% | 5% conv. mature | 62% renewal |

**Minimum viable annual price (variable-cost floor):** **~$12/year** net of COGS — far below market.

**Minimum viable positioning floor:** **$39.99/year** — below this, users anchor to PictureThis/Greg and undervalue AI + backup.

**Upgrade drivers (evidence-ranked):** cloud photo backup → journal narrative → plant limit → premium export → health insights.

---

## Phase 5 — App Store Economics

**Annual $44.99 example (USD):**

| Line | Year 1 (30% fee) | Year 2+ (15% fee) |
|------|------------------|-------------------|
| Gross | $44.99 | $44.99 |
| Store fee | −$13.50 | −$6.75 |
| **Net to developer** | **$31.49** | **$38.24** |
| Variable COGS (~$3.60/yr typical) | −$3.60 | −$3.60 |
| **Contribution margin** | **~$27.89 (62%)** | **~$34.64 (77%)** |

RevenueCat at $5k MTR: ~$25/mo — immaterial at launch.

**Monthly $6.99:** net $4.89/mo Y1 → **$58.68/yr equivalent** vs $31.49 net on annual — annual is **structurally preferred** for both LTV and positioning.

---

## Phase 6 — Lifetime Plan Audit

### Should lifetime exist?

**Yes, but only as a constrained launch lever** — not as a permanent always-on SKU.

| Factor | Assessment |
|--------|------------|
| **Benefit** | Cash upfront; rewards early believers; App Store featuring for “founding member” narratives |
| **Risk** | Unlimited AI + cloud storage = **unbounded liability** (`edge.ts` premium limits are high: 1000/mo) |
| **Break-even** | At $129.99 lifetime vs $44.99 annual net ~$31.49 → **~4.1 years**; acceptable if churn would have lost user by Y3 |
| **Greg comparison** | Greg lifetime ≈ 1× annual — **too cheap for AI+storage product** |

**Recommendation:**

- **Launch lifetime: $129.99 / €129.99** — max **500–1,000 units** or **first 90 days only**
- **Do not** offer lifetime after Year in Review ships unless price ≥ **$179.99** or AI/storage caps added
- **Alternative:** skip lifetime at launch → lower operational risk

---

## Phase 7 — Psychological Pricing (Annual EUR/USD)

| Price | Conversion | Perceived value | Verdict |
|-------|------------|-----------------|---------|
| €39.99 | Highest volume | “Another plant app” | **Too low** for AI+backup bundle |
| **€44.99** | Strong | Premium but accessible | **Launch sweet spot** |
| €49.99 | Good | Mature editorial | **12-month target** |
| €59.99 | Moderate | Requires Year in Review | Post-roadmap |
| €69.99+ | Lower | Calm tier without Calm brand | **Not at launch** |
| €79.99–99.99 | Low | Day One Gold territory | Needs feature parity |

**Monthly anchor:** €6.99 makes €44.99 annual feel like **~46% savings** — optimal decoy structure.

---

## Phase 8 — GTM Pricing Strategy

### Launch (0–3 months)

- **Annual $44.99** default-selected (already preferred in `subscription-plans.tsx`)
- **7-day free trial** on annual only
- **No lifetime** OR capped **$129.99 founding member** (pick one)

### Early adopter (0–6 months)

- **Grandfather** launch annual price for renewals
- New subscribers only: optional **€39.99 founding annual** for first 500 users (creates urgency without permanent underpricing)

### Growth (6 months)

- New subs: **$49.99 / €49.99 annual**
- Add **3-month $19.99** optional SKU if conversion stalls (matches Planta pattern — not primary)

### Mature (12 months)

- **$54.99–59.99 annual** when Year in Review + Memorial Book IAP ship
- Monthly **$7.99**
- Re-evaluate lifetime at **$179.99+** with usage caps

---

## Phase 9 — Subscription Architecture Recommendation

| Element | Recommendation |
|---------|----------------|
| **Free tier name** | **The Seedling** |
| **Monthly name + price** | **The Steward** — **$6.99 / €6.99** |
| **Annual name + price** | **The Heirloom** — **$44.99 / €44.99** (launch) → **$49.99** (mo 6) → **$54.99** (mo 12) |
| **Lifetime name + price** | **The Endowment** — **$129.99** limited launch OR defer |
| **Free trial** | **7 days**, annual (`The Heirloom`) only |
| **Intro offer** | Optional: **$39.99 first year** for first cohort (store intro offer) |
| **Early adopter** | Grandfather launch annual; badge in profile |
| **Future** | Day One-style tier split only if AI costs spike — not needed at launch |

**Free tier (keep as implemented):** 10 plants, 3 progress photos/plant, 60-day history, 1 health insight/plant/mo, 3 IDs/mo — generous enough for habit formation (`constants.ts`).

---

## Phase 10 — Implementation Review

| Check | Status |
|-------|--------|
| RevenueCat integration | ✅ `RevenueCatAdapter`, `BillingBootstrapProvider` |
| Offerings from store (not hardcoded) | ✅ Dynamic `priceString` |
| Annual emphasized | ✅ `preferredPackage = annualPkg ?? monthlyPkg` |
| Lifetime package type | ✅ Supported in types/adapter |
| Trial disclosure | ✅ `subscription-plans.tsx` intro + auto-renew copy |
| Restore purchases | ✅ |
| **Annual savings % displayed** | ✅ `formatAnnualSavingsLabel()` on annual plan card |
| **Paywall lists only shipped features** | ✅ `premium.tsx` uses `PREMIUM_FEATURES`; profile copy tightened |
| **Lifetime SKU in stores** | **Deferred** — excluded from launch offerings UI |
| **Price localization** | Store-managed — no code gap |
| **Editorial membership names** | ✅ `membershipNames.ts` across premium/profile/plans |
| **Conservatory product ID resolution** | ✅ `offeringPackageResolution.ts` + `$rc_*` package fallback |
| **Offering fallback when not Current** | ✅ `purchasesOfferingSelection.ts` uses `default` env id |
| **RevenueCat dashboard products attached** | **Not Actionable in repo** — operator must attach ASC/Play products to `$rc_monthly` / `$rc_annual` |

### Remediation plan (implementation, not pricing strategy)

1. **RevenueCat / App Store Connect / Play Console:** Create products per [RevenueCat & Store Product Setup](#revenuecat--store-product-setup) below; map all three to entitlement `premium`.
2. **`subscription-plans.tsx`:** Editorial plan titles wired via `getMembershipNameForPackageType()`; add computed “Save X% vs monthly” from packages.
3. **`premium.tsx` / profile copy:** Membership titles come from `getMembershipName()` — verify copy on free card subtitle still reads well beside **The Seedling**; align feature list with `PREMIUM_FEATURES` only.
4. **Analytics:** Track `plan_selected` by package type (already wired) + conversion by savings display A/B.
5. **Lifetime guardrails:** Document in subscription terms: lifetime excludes future **separate IAPs** (Memorial Book); consider server-side AI budget if lifetime scales.

---

## RevenueCat & Store Product Setup

Configure **three separate products** in RevenueCat (and matching SKUs in App Store Connect / Google Play). Product identifiers match tests and mocks in `features/billing/adapters/MockBillingAdapter.ts` and `tests/features/billing/revenue-cat-adapter.test.ts`.

**Entitlement ID:** `premium` (default in `features/billing/constants.ts` via `EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM`)

**Offering ID:** `default` (default in `features/billing/config.ts` via `EXPO_PUBLIC_RC_OFFERING_IDENTIFIER`)

### Editorial membership ladder

| Rhythm | Customer-facing name | Meaning |
|--------|----------------------|---------|
| Free | **The Seedling** | Entry to the collection — beginning of the care journey |
| Monthly | **The Steward** | Active monthly care; ties to “Account Stewardship” copy on premium surfaces |
| Annual | **The Heirloom** | Cultivated across seasons; primary SKU |
| Lifetime | **The Endowment** | Permanent support of the Digital Conservatory; limited launch SKU |

Source of truth: `features/billing/membershipNames.ts`. Surfaces: `app/premium.tsx`, `app/profile.tsx`, `app/subscription-plans.tsx`.

All paid plans grant the **same** premium features. Names are brand/editorial only — not separate feature tiers.

### Product 1 — Monthly (`conservatory_premium_monthly`)

| Field | Value |
|--------|--------|
| **Identifier** | `conservatory_premium_monthly` |
| **Display name** (RevenueCat dashboard) | The Steward — Monthly |
| **Name** (customer-facing) | **The Steward** |
| **Product type** | Auto-renewing subscription |
| **Duration** | `P1M` |
| **Base price** | **$6.99** USD |
| **EUR** (add after save) | **€6.99** |

### Product 2 — Annual (`conservatory_premium_annual`)

| Field | Value |
|--------|--------|
| **Identifier** | `conservatory_premium_annual` |
| **Display name** (RevenueCat dashboard) | The Heirloom — Annual |
| **Name** (customer-facing) | **The Heirloom** |
| **Product type** | Auto-renewing subscription |
| **Duration** | `P1Y` |
| **Base price** | **$44.99** USD |
| **EUR** (add after save) | **€44.99** |
| **Intro offer** (separate from base price) | **7-day free trial** — annual only |

### Product 3 — Lifetime (`conservatory_premium_lifetime`)

| Field | Value |
|--------|--------|
| **Identifier** | `conservatory_premium_lifetime` |
| **Display name** (RevenueCat dashboard) | The Endowment — Lifetime |
| **Name** (customer-facing) | **The Endowment** |
| **Product type** | Non-consumable |
| **Duration** | *(none — not a subscription)* |
| **Base price** | **$129.99** USD |
| **EUR** (add after save) | **€129.99** |

**Launch constraint:** Cap at **500–1,000 units** or **first 90 days only** (see Phase 6). Optional — defer entirely if operational risk is preferred.

### Quick reference — identifiers, names, and prices

| Identifier | Customer name | Type | Duration | USD | EUR |
|------------|---------------|------|----------|-----|-----|
| `conservatory_premium_monthly` | The Steward | Subscription | P1M | $6.99 | €6.99 |
| `conservatory_premium_annual` | The Heirloom | Subscription | P1Y | $44.99 | €44.99 |
| `conservatory_premium_lifetime` | The Endowment | Non-consumable | — | $129.99 | €129.99 |

Annual saves **~46% vs paying monthly** ($6.99 × 12 = $83.88 vs $44.99).

### After products are saved

1. **Entitlement:** Open or create `premium` → attach all three product identifiers.
2. **Offering:** Open **`default`** → attach store products to existing packages:
   - **`$rc_monthly`** → product **`conservatory_premium_monthly`**
   - **`$rc_annual`** → product **`conservatory_premium_annual`**
   - *(Lifetime deferred — leave `$rc_lifetime` empty.)*
3. **Mark offering `default` as Current** in RevenueCat.
4. **App Store Connect / Google Play:** Create matching IAP/subscription products with the **same identifiers** when using native store billing.
5. **EAS secrets:** Confirm `EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM` and `EXPO_PUBLIC_RC_OFFERING_IDENTIFIER` match the dashboard (or rely on defaults `premium` / `default`).
6. **App UI:** Membership names centralized in `membershipNames.ts`; subscription plan picker resolves `conservatory_premium_monthly` and `conservatory_premium_annual` packages.

**Note:** Saved RevenueCat base prices cannot be edited afterwards; add new price tiers or currencies later if needed. Use Apple/Google price tiers for localization rather than literal 1:1 EUR parity everywhere.

---

## 12-Month Pricing Roadmap

| Period | Monthly | Annual | Lifetime | Trigger |
|--------|---------|--------|----------|---------|
| Launch | $6.99 | **$44.99** | $129.99 limited | Go-live |
| Mo 6 | $6.99 | **$49.99** | End or $149.99 | Cohort + retention data |
| Mo 12 | **$7.99** | **$54.99** | $179.99 capped | Year in Review shipped |
| Mo 18+ | $7.99 | **$59.99** | IAP-only extras | Mature editorial brand |

---

## Revenue Forecast (Illustrative)

Assumptions: 5k MAU @ M6, 4% premium, 85% choose annual @ $44.99 avg.

| Metric | M6 | M12 |
|--------|-----|-----|
| Premium subs | ~170 | ~280 |
| Gross MTR (annualized spread) | ~$630/mo | ~$1,050/mo |
| Net after 30% store (blended) | ~$440/mo | ~$735/mo |
| RevenueCat fee | $0 | $0 |
| AI + storage COGS | ~$50/mo | ~$85/mo |
| **Net contribution** | **~$390/mo** | **~$650/mo** |

Scale to 25k MAU @ 5% conversion → **~$3.8k net contribution/mo** — healthy bootstrap economics at recommended pricing.

---

## Risks

1. **Over-pricing vs Greg/PictureThis** at launch without reviews — mitigate with trial + founding price.
2. **Under-pricing** at €39.99 permanent — trains bargain tier; hard to raise later.
3. **Lifetime + unlimited AI** — tail risk; cap units or defer.
4. **Advertising unshipped features** — App Store rejection / trust damage.
5. **Planta-style promo erosion** — avoid permanent deep discounts; use intro offers instead.
6. **EUR/USD parity** — use Apple price tiers, not literal 1:1 everywhere.

---

## Final Verdict

### RECOMMENDED WITH PRICE CHANGES

The product **earns premium pricing above utility plant apps** based on shipped AI editorial, cloud photo archive, and emotional architecture — but **not Calm/Day One Gold pricing at launch** because Year in Review, Memorial Book, Web Companion, and Collection Analytics are **not implemented**.

**Set these products in RevenueCat / stores now:**

| Identifier | Membership name | Launch price | Trial |
|------------|-----------------|--------------|-------|
| `conservatory_premium_monthly` | **The Steward** | **$6.99 / €6.99** | — |
| `conservatory_premium_annual` | **The Heirloom** | **$44.99 / €44.99** | **7 days** |
| `conservatory_premium_lifetime` | **The Endowment** | **$129.99 / €129.99** (limited) **or defer** | — |

See [RevenueCat & Store Product Setup](#revenuecat--store-product-setup) for full form fields.

**Ship paywall savings copy and store product configuration before launch.** Grandfather early adopters; raise new-subscriber annual to **$49.99 at month 6** and **$54.99 at month 12** when roadmap features land.

---

## Verification Commands

Evidence for cost and feature gates in codebase:

```bash
npm test -- --testPathPattern="premium-features-certification|entitlementService|export-access-policy" --runInBand
npm run typecheck
```

Store pricing must be verified in App Store Connect, Google Play Console, and RevenueCat dashboard — not in repo source.

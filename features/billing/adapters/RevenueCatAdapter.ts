import { Platform } from "react-native";
import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesPackage,
} from "react-native-purchases";
import Purchases, { LOG_LEVEL, PACKAGE_TYPE } from "react-native-purchases";

import { billingConfig, validateBillingConfig } from "../config";
import { PREMIUM_ENTITLEMENT_ID } from "../constants";
import { isRevenueCatNativeAvailable } from "../services/revenueCatNative";
import { buildBillingOffering } from "../services/offeringPackageResolution";
import {
  logEmptyOfferingsDiagnostics,
  resolvePurchasesOffering,
} from "../services/purchasesOfferingSelection";
import type {
  BillingAdapter,
  BillingOffering,
  BillingPackage,
  PurchaseResult,
  SubscriptionPeriod,
  SubscriptionState,
} from "../types";

function mapPackageType(rcType: string): SubscriptionPeriod | "unknown" {
  if (rcType === PACKAGE_TYPE.ANNUAL) return "annual";
  if (rcType === PACKAGE_TYPE.MONTHLY) return "monthly";
  if (rcType === PACKAGE_TYPE.LIFETIME) return "lifetime";
  return "unknown";
}

function formatIntroductoryOffer(
  introPrice:
    | {
        priceString?: string;
        periodNumberOfUnits?: number;
        periodUnit?: string;
      }
    | null
    | undefined,
): string | null {
  if (!introPrice) {
    return null;
  }

  const units = introPrice.periodNumberOfUnits;
  const rawUnit = introPrice.periodUnit?.toLowerCase();

  if (units && rawUnit) {
    const singular = rawUnit.replace(/s$/, "");
    return `${units}-${singular} free trial`;
  }

  if (
    introPrice.priceString === "$0.00" ||
    introPrice.priceString?.toLowerCase() === "free"
  ) {
    return "Free trial";
  }

  return introPrice.priceString ?? null;
}

function mapRcPackage(pkg: PurchasesPackage): BillingPackage {
  const product = pkg.product;
  return {
    identifier: pkg.identifier,
    packageType: mapPackageType(pkg.packageType),
    priceString: product.priceString,
    pricePerMonthString: product.pricePerMonthString ?? product.priceString,
    productIdentifier: product.identifier,
    introductoryPrice: formatIntroductoryOffer(product.introPrice),
  };
}

function isPremiumFromCustomerInfo(info: CustomerInfo): boolean {
  return (info.entitlements.active[PREMIUM_ENTITLEMENT_ID] ?? null) !== null;
}

function inferPeriodFromProductIdentifier(
  productIdentifier: string | null | undefined,
): SubscriptionPeriod | null {
  const normalized = productIdentifier?.toLowerCase() ?? "";
  if (normalized.includes("annual") || normalized.includes("year")) {
    return "annual";
  }
  if (normalized.includes("month")) {
    return "monthly";
  }
  if (normalized.includes("lifetime")) {
    return "lifetime";
  }
  return null;
}

function mapCustomerInfoToSubscriptionState(
  info: CustomerInfo,
): Omit<SubscriptionState, "isLoading" | "isRestoring" | "error"> {
  const entitlement = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  if (!entitlement) {
    return { tier: "free", expiresAt: null, period: null };
  }

  const productIdentifier =
    "productIdentifier" in entitlement
      ? (entitlement.productIdentifier as string | null | undefined)
      : null;

  return {
    tier: "premium",
    expiresAt: entitlement.expirationDate ?? null,
    period: inferPeriodFromProductIdentifier(productIdentifier),
    subscribedAt: entitlement.originalPurchaseDate ?? null,
  };
}

export class RevenueCatAdapter implements BillingAdapter {
  private initialized = false;
  private configuredUserId: string | null = null;
  private customerInfoUpdateListener: CustomerInfoUpdateListener | null = null;

  async initialize(userId: string): Promise<void> {
    if (this.configuredUserId === userId) return;

    const { valid, missing } = validateBillingConfig();
    if (!valid) {
      console.warn(
        `[Billing] Missing RevenueCat config: ${missing.join(", ")}. Billing disabled.`,
      );
      return;
    }

    if (!isRevenueCatNativeAvailable()) {
      if (__DEV__) {
        console.warn(
          "[Billing] RevenueCat native module unavailable. Use EXPO_PUBLIC_USE_MOCK_BILLING=true in Expo Go or install a development build.",
        );
      }
      return;
    }

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    const apiKey =
      Platform.OS === "ios"
        ? billingConfig.revenueCatApiKeyIos
        : billingConfig.revenueCatApiKeyAndroid;

    // configure() is synchronous in react-native-purchases 10.x
    Purchases.configure({ apiKey, appUserID: userId });
    this.initialized = true;
    this.configuredUserId = userId;
  }

  async getSubscriptionState(): Promise<
    Omit<SubscriptionState, "isLoading" | "isRestoring" | "error">
  > {
    if (!this.initialized) {
      return { tier: "free", expiresAt: null, period: null };
    }

    try {
      const info = await Purchases.getCustomerInfo();
      return mapCustomerInfoToSubscriptionState(info);
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn("[Billing] getSubscriptionState error:", err);
      }
      throw err;
    }
  }

  async getOfferings(): Promise<BillingOffering | null> {
    if (!this.initialized) return null;

    try {
      const offerings = await Purchases.getOfferings();
      const selected = resolvePurchasesOffering(offerings);
      if (!selected) {
        logEmptyOfferingsDiagnostics(offerings);
        return null;
      }

      if (selected.availablePackages.length === 0) {
        logEmptyOfferingsDiagnostics(offerings);
        return null;
      }

      const packages = selected.availablePackages.map((pkg) =>
        mapRcPackage(pkg as PurchasesPackage),
      );
      const annual = selected.annual
        ? mapRcPackage(selected.annual as PurchasesPackage)
        : null;
      const monthly = selected.monthly
        ? mapRcPackage(selected.monthly as PurchasesPackage)
        : null;

      const billingOffering = buildBillingOffering(selected.identifier, packages, {
        annual,
        monthly,
        lifetime: null,
      });

      if (
        !billingOffering.annual &&
        !billingOffering.monthly &&
        billingOffering.packages.length === 0
      ) {
        if (__DEV__) {
          console.warn(
            `[Billing] Offering "${selected.identifier}" loaded but no monthly/annual packages matched conservatory_premium_monthly or conservatory_premium_annual.`,
          );
        }
        return null;
      }

      return billingOffering;
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn(
          "[Billing] getOfferings error:",
          err instanceof Error ? err.message : err,
        );
      }
      return null;
    }
  }

  async purchasePackage(packageIdentifier: string): Promise<PurchaseResult> {
    if (!this.initialized) {
      return { success: false, tier: "free", error: "Billing not initialized" };
    }

    try {
      const offerings = await Purchases.getOfferings();
      const selected = resolvePurchasesOffering(offerings);
      const pkg = (selected?.availablePackages as PurchasesPackage[] | undefined)?.find(
        (candidate) =>
          candidate.identifier === packageIdentifier ||
          candidate.product.identifier === packageIdentifier,
      );

      if (!pkg) {
        return { success: false, tier: "free", error: "Package not found" };
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPremium = isPremiumFromCustomerInfo(customerInfo);

      return { success: isPremium, tier: isPremium ? "premium" : "free" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      const userCancelled =
        typeof err === "object" &&
        err !== null &&
        "userCancelled" in err &&
        (err as { userCancelled: boolean }).userCancelled === true;

      if (userCancelled) {
        return { success: false, tier: "free", userCancelled: true };
      }
      return { success: false, tier: "free", error: message };
    }
  }

  async restorePurchases(): Promise<PurchaseResult> {
    if (!this.initialized) {
      return { success: false, tier: "free", error: "Billing not initialized" };
    }

    try {
      // In RC 10.x, restorePurchases() returns CustomerInfo directly
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = isPremiumFromCustomerInfo(customerInfo);
      return { success: true, tier: isPremium ? "premium" : "free" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Restore failed";
      return { success: false, tier: "free", error: message };
    }
  }

  setSubscriptionStateListener(
    listener: (
      state: Omit<SubscriptionState, "isLoading" | "isRestoring" | "error">,
    ) => void,
  ): () => void {
    if (!this.initialized) return () => {};

    if (this.customerInfoUpdateListener) {
      Purchases.removeCustomerInfoUpdateListener(
        this.customerInfoUpdateListener,
      );
    }

    const revenueCatListener: CustomerInfoUpdateListener = (info) => {
      listener(mapCustomerInfoToSubscriptionState(info));
    };

    this.customerInfoUpdateListener = revenueCatListener;
    Purchases.addCustomerInfoUpdateListener(revenueCatListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(revenueCatListener);
      if (this.customerInfoUpdateListener === revenueCatListener) {
        this.customerInfoUpdateListener = null;
      }
    };
  }

  async logOut(): Promise<void> {
    if (!this.initialized) return;
    try {
      if (this.customerInfoUpdateListener) {
        Purchases.removeCustomerInfoUpdateListener(
          this.customerInfoUpdateListener,
        );
        this.customerInfoUpdateListener = null;
      }
      await Purchases.logOut();
    } catch {
      // ignore
    } finally {
      this.initialized = false;
      this.configuredUserId = null;
    }
  }
}

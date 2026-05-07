import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
} from 'react-native-purchases';
import type {
  PurchasesPackage,
  CustomerInfo,
} from 'react-native-purchases';

import { billingConfig, validateBillingConfig } from '../config';
import { PREMIUM_ENTITLEMENT_ID } from '../constants';
import type {
  BillingAdapter,
  BillingOffering,
  BillingPackage,
  PurchaseResult,
  SubscriptionPeriod,
  SubscriptionState,
} from '../types';

function mapPackageType(rcType: string): SubscriptionPeriod | 'unknown' {
  if (rcType === PACKAGE_TYPE.ANNUAL) return 'annual';
  if (rcType === PACKAGE_TYPE.MONTHLY) return 'monthly';
  if (rcType === PACKAGE_TYPE.LIFETIME) return 'lifetime';
  return 'unknown';
}

function mapRcPackage(pkg: PurchasesPackage): BillingPackage {
  const product = pkg.product;
  return {
    identifier: pkg.identifier,
    packageType: mapPackageType(pkg.packageType),
    priceString: product.priceString,
    pricePerMonthString: product.pricePerMonthString ?? product.priceString,
    productIdentifier: product.identifier,
    introductoryPrice: product.introPrice?.priceString ?? null,
  };
}

function isPremiumFromCustomerInfo(info: CustomerInfo): boolean {
  return (info.entitlements.active[PREMIUM_ENTITLEMENT_ID] ?? null) !== null;
}

export class RevenueCatAdapter implements BillingAdapter {
  private initialized = false;

  async initialize(userId: string): Promise<void> {
    const { valid, missing } = validateBillingConfig();
    if (!valid) {
      console.warn(
        `[Billing] Missing RevenueCat config: ${missing.join(', ')}. Billing disabled.`,
      );
      return;
    }

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    const apiKey =
      Platform.OS === 'ios'
        ? billingConfig.revenueCatApiKeyIos
        : billingConfig.revenueCatApiKeyAndroid;

    // configure() is synchronous in react-native-purchases 10.x
    Purchases.configure({ apiKey, appUserID: userId });
    this.initialized = true;
  }

  async getSubscriptionState(): Promise<
    Omit<SubscriptionState, 'isLoading' | 'isRestoring' | 'error'>
  > {
    if (!this.initialized) {
      return { tier: 'free', expiresAt: null, period: null };
    }

    try {
      const info = await Purchases.getCustomerInfo();
      const isPremium = isPremiumFromCustomerInfo(info);

      if (!isPremium) {
        return { tier: 'free', expiresAt: null, period: null };
      }

      const entitlement = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
      // expirationDate is already an ISO string in RC 10.x
      const expiresAt = entitlement?.expirationDate ?? null;

      // periodType is uppercase in 10.x: "NORMAL" | "INTRO" | "TRIAL" | "PREPAID"
      // RC's periodType does not directly indicate billing duration (monthly vs annual).
      // Safe default to 'monthly' for all subscription types.
      const period: SubscriptionPeriod = 'monthly';

      return { tier: 'premium', expiresAt, period };
    } catch (err: unknown) {
      if (__DEV__) {
        console.warn('[Billing] getSubscriptionState error:', err);
      }
      return { tier: 'free', expiresAt: null, period: null };
    }
  }

  async getOfferings(): Promise<BillingOffering | null> {
    if (!this.initialized) return null;

    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) return null;

      const packages = current.availablePackages.map(mapRcPackage);
      const annual = current.annual ? mapRcPackage(current.annual) : null;
      const monthly = current.monthly ? mapRcPackage(current.monthly) : null;
      const lifetime = current.lifetime ? mapRcPackage(current.lifetime) : null;

      return {
        identifier: current.identifier,
        packages,
        annual,
        monthly,
        lifetime,
      };
    } catch {
      return null;
    }
  }

  async purchasePackage(packageIdentifier: string): Promise<PurchaseResult> {
    if (!this.initialized) {
      return { success: false, tier: 'free', error: 'Billing not initialized' };
    }

    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      const pkg = current?.availablePackages.find(
        (p) => p.identifier === packageIdentifier,
      );

      if (!pkg) {
        return { success: false, tier: 'free', error: 'Package not found' };
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPremium = isPremiumFromCustomerInfo(customerInfo);

      return { success: isPremium, tier: isPremium ? 'premium' : 'free' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      const userCancelled =
        typeof err === 'object' &&
        err !== null &&
        'userCancelled' in err &&
        (err as { userCancelled: boolean }).userCancelled === true;

      if (userCancelled) {
        return { success: false, tier: 'free', userCancelled: true };
      }
      return { success: false, tier: 'free', error: message };
    }
  }

  async restorePurchases(): Promise<PurchaseResult> {
    if (!this.initialized) {
      return { success: false, tier: 'free', error: 'Billing not initialized' };
    }

    try {
      // In RC 10.x, restorePurchases() returns CustomerInfo directly
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = isPremiumFromCustomerInfo(customerInfo);
      return { success: true, tier: isPremium ? 'premium' : 'free' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Restore failed';
      return { success: false, tier: 'free', error: message };
    }
  }

  async logOut(): Promise<void> {
    if (!this.initialized) return;
    try {
      await Purchases.logOut();
    } catch {
      // ignore
    }
  }
}

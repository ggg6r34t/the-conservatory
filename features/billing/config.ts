export const billingConfig = {
  revenueCatApiKeyIos: process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? '',
  revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? '',
  entitlementId: process.env.EXPO_PUBLIC_RC_ENTITLEMENT_PREMIUM ?? 'premium',
  offeringIdentifier: process.env.EXPO_PUBLIC_RC_OFFERING_IDENTIFIER ?? 'default',
} as const;

export function validateBillingConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!billingConfig.revenueCatApiKeyIos) missing.push('EXPO_PUBLIC_RC_API_KEY_IOS');
  if (!billingConfig.revenueCatApiKeyAndroid) missing.push('EXPO_PUBLIC_RC_API_KEY_ANDROID');
  return { valid: missing.length === 0, missing };
}

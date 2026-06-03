import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/components/design-system/useTheme";
import { LegalFooterLinks } from "@/features/legal/components/LegalFooterLinks";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { getMembershipNameForPackageType } from "@/features/billing/membershipNames";
import { resolvePremiumOfferingPackages } from "@/features/billing/services/offeringPackageResolution";
import { buildSubscriptionPurchaseConfirmMessage } from "@/features/billing/services/subscriptionPurchaseCopy";
import { formatAnnualSavingsLabel } from "@/features/billing/services/subscriptionPricingCopy";
import { EmptyState } from "@/features/empty-states/components/EmptyState";
import { getEmptyStateForContext } from "@/features/empty-states/getEmptyStateForContext";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";
import { useAlert } from "@/hooks/useAlert";
import { trackMonetizationEvent } from "@/services/analytics/analyticsService";

export default function SubscriptionPlansScreen() {
  const { colors } = useTheme();
  const alert = useAlert();
  const {
    isPremium,
    isLoading,
    isRestoring,
    error,
    offerings,
    lastVerifiedAt,
    entitlementUnavailable,
    purchase,
    restore,
    refreshOfferings,
  } = useSubscription();
  const [selectedPackageIdentifier, setSelectedPackageIdentifier] = useState<
    string | null
  >(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    trackMonetizationEvent("premium_screen_viewed");
    void refreshOfferings();
  }, [refreshOfferings]);

  useEffect(() => {
    if (!isLoading && !isPremium && offerings !== null) {
      const resolved = resolvePremiumOfferingPackages(offerings.packages ?? [], {
        annual: offerings.annual ?? null,
        monthly: offerings.monthly ?? null,
        lifetime: null,
      });
      if (!resolved.annual && !resolved.monthly) {
        trackMonetizationEvent("offerings_load_failed");
      }
    }
  }, [isLoading, isPremium, offerings]);

  async function handlePurchase() {
    if (!selectedPackage || purchasing) return;

    const planName =
      getMembershipNameForPackageType(selectedPackage.packageType) ??
      "Premium";

    const confirmed = await alert.confirm({
      variant: "confirm",
      title: `Subscribe to ${planName}?`,
      message: buildSubscriptionPurchaseConfirmMessage(selectedPackage),
      confirmLabel: selectedPackage.introductoryPrice
        ? "Start trial"
        : "Subscribe",
      cancelLabel: "Not now",
      analyticsKey: "subscription_purchase_confirm",
      sourceScreen: "subscription_plans",
    });

    if (!confirmed) {
      return;
    }

    setPurchasing(true);
    trackMonetizationEvent("purchase_started", {
      packageType: selectedPackage.packageType,
    });
    const result = await purchase(selectedPackage.identifier);
    setPurchasing(false);
    if (result.success) {
      trackMonetizationEvent("purchase_completed", {
        packageType: selectedPackage.packageType,
      });
      void alert.show({
        variant: "success",
        title: "Subscription active",
        message: `Your ${planName} membership is ready. Premium features unlock on this device after sync completes.`,
        primaryAction: { label: "Close" },
        analyticsKey: "subscription_purchase_success",
        sourceScreen: "subscription_plans",
      });
    } else if (result.userCancelled) {
      trackMonetizationEvent("purchase_cancelled");
    } else {
      trackMonetizationEvent("purchase_failed", {
        reason: result.error ?? "unknown",
        packageType: selectedPackage.packageType,
      });
      void alert.show({
        variant: "error",
        title: "Purchase didn't complete",
        message:
          result.error ??
          "Check your connection and App Store or Play billing, then try again.",
        primaryAction: { label: "Close", tone: "danger" },
        analyticsKey: "subscription_purchase_failed",
        sourceScreen: "subscription_plans",
      });
    }
  }

  async function handleRestore() {
    trackMonetizationEvent("restore_started");
    const result = await restore();
    if (result.success) {
      trackMonetizationEvent("restore_completed");
    } else {
      void alert.show({
        variant: "error",
        title: "Couldn't restore purchases",
        message:
          result.error ??
          "We couldn't find an active subscription for this account. Try again or contact support.",
        primaryAction: { label: "Close", tone: "danger" },
        analyticsKey: "subscription_restore_failed",
        sourceScreen: "subscription_plans",
      });
    }
  }

  const packages = offerings?.packages ?? [];
  const { annual: annualPkg, monthly: monthlyPkg } = resolvePremiumOfferingPackages(
    packages,
    {
      annual: offerings?.annual ?? null,
      monthly: offerings?.monthly ?? null,
      lifetime: null,
    },
  );
  const preferredPackage = annualPkg ?? monthlyPkg ?? null;
  const launchPackages = [annualPkg, monthlyPkg].filter(
    (pkg): pkg is NonNullable<typeof annualPkg> => pkg !== null,
  );
  const annualSavingsLabel = formatAnnualSavingsLabel(monthlyPkg, annualPkg);
  const selectedPackage =
    launchPackages.find((pkg) => pkg.identifier === selectedPackageIdentifier) ??
    preferredPackage;

  useEffect(() => {
    if (!selectedPackageIdentifier && preferredPackage?.identifier) {
      setSelectedPackageIdentifier(preferredPackage.identifier);
    }
  }, [preferredPackage?.identifier, selectedPackageIdentifier]);

  return (
    <ProfileScreenScaffold
      title="Subscription Plans"
      subtitle="Subscription Editorial"
      description="Choose the subscription that fits your collection. All plans renew automatically until cancelled."
    >
      <View style={styles.section}>
        {annualPkg || monthlyPkg ? (
          <View style={styles.plans}>
            <Text
              style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
            >
              CHOOSE YOUR PLAN
            </Text>

          {annualPkg ? (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{
                selected: selectedPackage?.identifier === annualPkg.identifier,
              }}
              onPress={() => {
                setSelectedPackageIdentifier(annualPkg.identifier);
                trackMonetizationEvent("plan_selected", {
                  packageType: annualPkg.packageType,
                });
              }}
              style={[
                styles.planCard,
                {
                  backgroundColor:
                    selectedPackage?.identifier === annualPkg.identifier
                      ? colors.primaryFixed
                      : colors.surfaceContainerLowest,
                  borderColor:
                    selectedPackage?.identifier === annualPkg.identifier
                      ? colors.primary
                      : colors.surfaceContainerHigh,
                },
              ]}
            >
              <View style={styles.planCardBadge}>
                <View
                  style={[styles.badge, { backgroundColor: colors.secondary }]}
                >
                  <Text
                    style={[styles.badgeLabel, { color: colors.surfaceBright }]}
                  >
                    BEST VALUE
                  </Text>
                </View>
              </View>
              <Text style={[styles.planTitle, { color: colors.primary }]}>
                {getMembershipNameForPackageType(annualPkg.packageType) ??
                  "Annual"}
              </Text>
              <Text style={[styles.planPrice, { color: colors.primary }]}>
                {annualPkg.priceString}
                <Text style={[styles.planPeriod, { color: colors.onSurface }]}>
                  /year
                </Text>
              </Text>
              <Text style={[styles.planPerMonth, { color: colors.onSurface }]}>
                {annualPkg.pricePerMonthString}/month
              </Text>
              {annualSavingsLabel ? (
                <Text style={[styles.planSavings, { color: colors.secondary }]}>
                  {annualSavingsLabel}
                </Text>
              ) : null}
              {annualPkg.introductoryPrice ? (
                <Text style={[styles.planTrial, { color: colors.secondary }]}>
                  {annualPkg.introductoryPrice}
                </Text>
              ) : null}
            </Pressable>
          ) : null}

          {monthlyPkg ? (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{
                selected: selectedPackage?.identifier === monthlyPkg.identifier,
              }}
              onPress={() => {
                setSelectedPackageIdentifier(monthlyPkg.identifier);
                trackMonetizationEvent("plan_selected", {
                  packageType: monthlyPkg.packageType,
                });
              }}
              style={[
                styles.planCard,
                {
                  backgroundColor:
                    selectedPackage?.identifier === monthlyPkg.identifier
                      ? colors.primaryFixed
                      : colors.surfaceContainerLowest,
                  borderColor:
                    selectedPackage?.identifier === monthlyPkg.identifier
                      ? colors.primary
                      : colors.surfaceContainerHigh,
                },
              ]}
            >
              <Text style={[styles.planTitle, { color: colors.primary }]}>
                {getMembershipNameForPackageType(monthlyPkg.packageType) ??
                  "Monthly"}
              </Text>
              <Text style={[styles.planPrice, { color: colors.primary }]}>
                {monthlyPkg.priceString}
                <Text style={[styles.planPeriod, { color: colors.onSurface }]}>
                  /month
                </Text>
              </Text>
              {monthlyPkg.introductoryPrice ? (
                <Text style={[styles.planTrial, { color: colors.secondary }]}>
                  {monthlyPkg.introductoryPrice}
                </Text>
              ) : null}
            </Pressable>
          ) : null}
          </View>
        ) : isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : isPremium ? (
          <EmptyState
            content={getEmptyStateForContext({
              context: "premium.alreadySubscribed",
            })}
            screen="subscription_plans"
            reason="already_subscribed"
          />
        ) : (
          <EmptyState
            content={getEmptyStateForContext({
              context: "premium.offeringsUnavailable",
            })}
            screen="subscription_plans"
            reason="offerings_unavailable"
            onPrimaryAction={() => void refreshOfferings()}
          />
        )}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}

      {entitlementUnavailable ? (
        <EmptyState
          content={getEmptyStateForContext({
            context: "premium.entitlementUnavailable",
          })}
          screen="subscription_plans"
          reason="entitlement_unavailable"
        />
      ) : null}

      <View style={styles.purchaseSection}>
        <Pressable
          accessibilityRole="button"
          disabled={!selectedPackage || purchasing || isLoading}
          onPress={() => void handlePurchase()}
          style={[
            styles.ctaButton,
            {
              backgroundColor:
                !selectedPackage || purchasing
                  ? colors.surfaceContainerHigh
                  : colors.primary,
            },
          ]}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.surfaceBright} />
          ) : (
            <Text style={[styles.ctaLabel, { color: colors.surfaceBright }]}>
              {selectedPackage?.introductoryPrice
                ? "Start Free Trial"
                : `Subscribe - ${selectedPackage?.priceString ?? "..."}`}
            </Text>
          )}
        </Pressable>

        <Text
          style={[styles.trialDisclosure, { color: colors.onSurfaceVariant }]}
        >
          {selectedPackage?.introductoryPrice
            ? `${selectedPackage.introductoryPrice}, then `
            : ""}
          {selectedPackage
            ? `${selectedPackage.priceString}${
                selectedPackage.packageType === "annual" ? "/year" : "/month"
              }`
            : "Subscriptions"}{" "}
          renew automatically until cancelled. Cancel at least 24 hours before
          the end of the current period to avoid the next charge. Payment is
          charged to your{" "}
          {Platform.OS === "ios" ? "App Store" : "Google Play"} account. Manage
          or cancel anytime in{" "}
          {Platform.OS === "ios"
            ? "App Store subscription settings"
            : "Google Play subscription settings"}
          .
        </Text>

        <LegalFooterLinks
          showRestore
          isRestoring={isRestoring}
          onRestore={() => void handleRestore()}
        />
      </View>
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 20,
  },
  plans: { gap: 16 },
  sectionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2.1,
  },
  loader: {
    marginTop: 4,
  },
  purchaseSection: {
    gap: 16,
  },
  planCard: { borderRadius: 20, borderWidth: 1.5, padding: 20, gap: 6 },
  planCardBadge: { alignItems: "flex-start" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  planTitle: { fontFamily: "NotoSerif_700Bold", fontSize: 20, lineHeight: 26 },
  planPrice: { fontFamily: "NotoSerif_700Bold", fontSize: 28, lineHeight: 34 },
  planPeriod: { fontFamily: "Manrope_500Medium", fontSize: 16 },
  planPerMonth: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  planSavings: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    lineHeight: 18,
  },
  planTrial: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  statusText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  ctaButton: {
    minHeight: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  ctaLabel: { fontFamily: "Manrope_700Bold", fontSize: 16, letterSpacing: 0.6 },
  trialDisclosure: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  footerLink: { fontFamily: "Manrope_500Medium", fontSize: 13 },
  footerDot: { fontSize: 13 },
  offeringsEmptyCard: { borderRadius: 20, padding: 20, gap: 12 },
  offeringsEmptyTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
  },
  offeringsEmptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 0.6,
  },
});

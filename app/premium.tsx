import { useEffect } from "react";

import { useRouter } from "expo-router";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";
import { useSubscription } from "@/features/billing/hooks/useSubscription";
import { getMembershipName } from "@/features/billing/membershipNames";
import { resolvePremiumOfferingPackages } from "@/features/billing/services/offeringPackageResolution";
import { LegalFooterLinks } from "@/features/legal/components/LegalFooterLinks";
import { trackMonetizationEvent } from "@/services/analytics/analyticsService";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";

const HEIRLOOM_CARD_IMAGE = require("@/assets/images/intricate-vintage-botanical-illustration-of-fern-leaves.png");

const PREMIUM_FEATURES = [
  {
    icon: "heart-pulse",
    label: "AI Health Insights",
    detail:
      "Unlimited AI analysis of each plant's health, growth signals, and care needs when Premium and AI services are enabled.",
  },
  {
    icon: "book-open-outline",
    label: "Journal Narratives",
    detail:
      "Monthly AI-written stories of your care rituals when Premium and AI services are enabled.",
  },
  {
    icon: "image-multiple-outline",
    label: "Unlimited Photo History",
    detail:
      "Progress photos are backed up to the cloud when Premium and cloud sync are active.",
  },
  {
    icon: "archive-star-outline",
    label: "Archive Curation",
    detail:
      "AI-enhanced before-and-after pairing is available when Premium and AI services are enabled.",
  },
  {
    icon: "cloud-sync-outline",
    label: "Full Cloud Backup",
    detail:
      "Plants, care logs, and reminders sync for all accounts. Progress photo backup requires Premium when cloud sync is active.",
  },
  {
    icon: "calendar-month",
    label: "Care Calendar AI Rhythms",
    detail:
      "Optional AI-assisted repot, inspect, and mist suggestions on your botanical planner.",
  },
  {
    icon: "filter-variant",
    label: "Advanced Library Filters",
    detail: "Sort and filter your collection with premium library views.",
  },
  {
    icon: "database-export",
    label: "Enhanced Export",
    detail:
      "Export full care history, photo metadata, status snapshots, and specimen tags.",
  },
  {
    icon: "qrcode",
    label: "Specimen Tags",
    detail:
      "Create and print botanical QR labels to bridge your physical and digital collection with Premium.",
  },
  {
    icon: "palette-outline",
    label: "Premium Themes",
    detail:
      "Additional interface themes with an active monthly or annual subscription.",
  },
];

export default function PremiumScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    isPremium,
    tier,
    period,
    offerings,
    lastVerifiedAt,
    subscribedAt,
    refreshOfferings,
    restore,
    isRestoring,
  } = useSubscription();

  const membershipName = getMembershipName({ tier, period });

  useEffect(() => {
    trackMonetizationEvent("premium_screen_viewed", { surface: "premium" });
    void refreshOfferings();
  }, [refreshOfferings]);

  const resolvedOfferings = resolvePremiumOfferingPackages(
    offerings?.packages ?? [],
    {
      annual: offerings?.annual ?? null,
      monthly: offerings?.monthly ?? null,
      lifetime: null,
    },
  );
  const displayPackage =
    resolvedOfferings.annual ?? resolvedOfferings.monthly ?? null;
  const periodLabel =
    displayPackage?.packageType === "annual"
      ? "year"
      : displayPackage?.packageType === "monthly"
        ? "month"
        : null;
  const displayPriceString = displayPackage?.priceString ?? "Plans";
  const verifiedDate = lastVerifiedAt
    ? new Date(lastVerifiedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "After purchase";

  return (
    <ProfileScreenScaffold
      title="Subscription Editorial"
      subtitle="Account Stewardship"
      description="Refine your botanical journey. Your subscription nurtures both your collection and the curated knowledge of the Digital Conservatory."
    >
      {isPremium ? (
        <View
          style={[styles.membershipCard, { backgroundColor: colors.primary }]}
        >
          <View style={styles.membershipImagePanel}>
            <Image
              source={HEIRLOOM_CARD_IMAGE}
              resizeMode="cover"
              style={styles.membershipCardImage}
            />
            <View
              style={[
                styles.membershipImageOverlay,
                { backgroundColor: colors.premiumHeroOverlay },
              ]}
            />
          </View>
          <View
            style={[
              styles.membershipCardOverlay,
              { backgroundColor: colors.premiumPanelOverlay },
            ]}
          />
          <View style={styles.membershipHeader}>
            <View style={styles.membershipTitleBlock}>
              <Text
                style={[
                  styles.membershipTitle,
                  { color: colors.surfaceBright },
                ]}
              >
                {membershipName}
              </Text>
              <Text
                style={[
                  styles.membershipSince,
                  { color: colors.surfaceBright },
                ]}
              >
                {`Active since ${new Date(subscribedAt ?? lastVerifiedAt ?? Date.now()).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`}
              </Text>
            </View>
            <View
              style={[
                styles.membershipBadge,
                { backgroundColor: colors.surfaceBright },
              ]}
            >
              <Text
                style={[styles.membershipBadgeLabel, { color: colors.primary }]}
              >
                PREMIUM
              </Text>
            </View>
          </View>

          <View style={styles.membershipFooter}>
            <Text
              style={[styles.membershipPrice, { color: colors.surfaceBright }]}
            >
              {displayPriceString}
              {periodLabel ? (
                <Text
                  style={[
                    styles.membershipPeriod,
                    { color: colors.surfaceBright },
                  ]}
                >
                  /{periodLabel}
                </Text>
              ) : null}
            </Text>
            <View style={styles.membershipRenewal}>
              <Text
                style={[
                  styles.membershipRenewalLabel,
                  { color: colors.surfaceBright },
                ]}
              >
                LAST VERIFIED
              </Text>
              <Text
                style={[
                  styles.membershipRenewalDate,
                  { color: colors.surfaceBright },
                ]}
              >
                {verifiedDate}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.membershipCard,
            { backgroundColor: colors.primaryFixed },
          ]}
        >
          <View style={styles.membershipImagePanel}>
            <Image
              source={HEIRLOOM_CARD_IMAGE}
              resizeMode="cover"
              style={[styles.membershipCardImage, { opacity: 0.07 }]}
            />
          </View>
          <View style={styles.membershipHeader}>
            <View style={styles.membershipTitleBlock}>
              <Text style={[styles.membershipTitle, { color: colors.primary }]}>
                {membershipName}
              </Text>
              <Text style={[styles.membershipSince, { color: colors.primary }]}>
                Care tracking for your collection — no subscription required
              </Text>
            </View>
            <View
              style={[
                styles.membershipBadge,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.membershipBadgeLabel,
                  { color: colors.primaryFixed },
                ]}
              >
                FREE
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/subscription-plans")}
            style={styles.freeUpgradeRow}
          >
            <Text style={[styles.freeUpgradeText, { color: colors.primary }]}>
              Upgrade to unlock all features
            </Text>
            <Icon name="chevron-right" size={18} color={colors.primary} />
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionEyebrow, { color: colors.secondary }]}>
            SUBSCRIPTION BENEFITS
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            What&apos;s Included
          </Text>
        </View>

        <View
          style={[
            styles.featureList,
            { backgroundColor: colors.surfaceContainerLowest },
          ]}
        >
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature.icon} style={styles.featureRow}>
              <View
                style={[
                  styles.featureIconBox,
                  { backgroundColor: colors.primaryFixed },
                ]}
              >
                <Icon name={feature.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureLabel, { color: colors.primary }]}>
                  {feature.label}
                </Text>
                <Text
                  style={[styles.featureDetail, { color: colors.onSurface }]}
                >
                  {feature.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.membershipActions}>
        {isPremium ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/subscription-plans")}
              style={[
                styles.membershipActionButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.membershipActionButtonLabel,
                  { color: colors.surfaceBright },
                ]}
              >
                Change Plan
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(
                  Platform.OS === "ios"
                    ? "https://apps.apple.com/account/subscriptions"
                    : "https://play.google.com/store/account/subscriptions",
                );
              }}
              style={styles.membershipCancelLinkWrap}
            >
              <Text
                style={[
                  styles.membershipCancelLink,
                  {
                    color: colors.primary,
                    borderBottomColor: colors.primaryFixed,
                  },
                ]}
              >
                Cancel Subscription
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/downgrade")}
              style={styles.membershipCancelLinkWrap}
            >
              <Text
                style={[
                  styles.membershipCancelLink,
                  {
                    color: colors.onSurfaceVariant,
                    borderBottomColor: colors.surfaceContainerHigh,
                  },
                ]}
              >
                After Premium
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/subscription-plans")}
            style={[
              styles.membershipActionButton,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.membershipActionButtonLabel,
                { color: colors.surfaceBright },
              ]}
            >
              View Subscription Plans
            </Text>
          </Pressable>
        )}
        <LegalFooterLinks
          showRestore={!isPremium}
          isRestoring={isRestoring}
          onRestore={() => void restore()}
        />
        <View style={styles.membershipQuote}>
          <Icon
            family="MaterialCommunityIcons"
            name="tree"
            size={30}
            color={colors.outlineVariant}
          />
          <Text style={[styles.membershipQuoteText, { color: colors.outline }]}>
            &quot;To plant a garden is to believe{"\n"}in tomorrow.&quot;
          </Text>
        </View>
      </View>
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  membershipCard: {
    borderRadius: 28,
    padding: 24,
    gap: 24,
    overflow: "hidden",
  },
  membershipImagePanel: {
    ...StyleSheet.absoluteFillObject,
    left: "50%",
    overflow: "hidden",
  },
  membershipCardImage: {
    width: "125%",
    height: "100%",
    opacity: 0.38,
    transform: [{ translateX: -24 }, { scale: 1.08 }],
  },
  membershipImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  membershipCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    right: "50%",
  },
  membershipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  membershipTitleBlock: {
    flex: 1,
    gap: 8,
  },
  membershipTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 25,
    lineHeight: 31,
  },
  membershipSince: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.68,
  },
  membershipBadge: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  membershipBadgeLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 2,
  },
  membershipFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 18,
  },
  membershipPrice: {
    flex: 1,
    fontFamily: "NotoSerif_700Bold",
    fontSize: 34,
    lineHeight: 40,
  },
  membershipPeriod: {
    fontFamily: "Manrope_500Medium",
    fontSize: 17,
  },
  membershipRenewal: {
    alignItems: "flex-end",
    gap: 6,
  },
  membershipRenewalLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.8,
    opacity: 0.65,
  },
  membershipRenewalDate: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 17,
    lineHeight: 22,
    fontStyle: "italic",
  },
  sectionHeader: {
    gap: 10,
  },
  section: {
    gap: 20,
  },
  sectionEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.8,
  },
  sectionTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 30,
    lineHeight: 38,
  },
  featureList: { borderRadius: 28, padding: 20, gap: 20 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, gap: 4 },
  featureLabel: { fontFamily: "Manrope_700Bold", fontSize: 15, lineHeight: 20 },
  featureDetail: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  membershipActions: {
    alignItems: "center",
    gap: 20,
  },
  membershipActionButton: {
    width: "100%",
    minHeight: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  membershipActionButtonLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 17,
    lineHeight: 22,
  },
  membershipCancelLinkWrap: {
    paddingVertical: 2,
  },
  membershipCancelLink: {
    fontFamily: "Manrope_700Bold",
    fontSize: 17,
    lineHeight: 22,
    borderBottomWidth: 2,
  },
  membershipQuote: {
    alignItems: "center",
    gap: 20,
    paddingTop: 40,
  },
  membershipQuoteText: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 22,
    lineHeight: 34,
    fontStyle: "italic",
    textAlign: "center",
  },
  freeUpgradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  freeUpgradeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    lineHeight: 20,
  },
});

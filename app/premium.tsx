import { useEffect, useState } from 'react';

import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/common/Icon/Icon';
import { useTheme } from '@/components/design-system/useTheme';
import { useSubscription } from '@/features/billing/hooks/useSubscription';
import type { BillingPackage } from '@/features/billing/types';
import { trackMonetizationEvent } from '@/services/analytics/analyticsService';

const PREMIUM_FEATURES = [
  { icon: 'heart-pulse', label: 'AI Health Insights', detail: 'Unlimited AI analysis of each plant\'s health, growth signals, and care needs.' },
  { icon: 'book-open-outline', label: 'Journal Narratives', detail: 'Monthly AI-written stories of your care rituals — not just statistics.' },
  { icon: 'image-multiple-outline', label: 'Unlimited Photo History', detail: 'Full photo archive synced to the cloud. Your collection\'s story, preserved.' },
  { icon: 'archive-star-outline', label: 'Archive Curation', detail: 'AI automatically pairs before-and-after photos to reveal your plants\' growth over time.' },
  { icon: 'cloud-sync-outline', label: 'Full Cloud Backup', detail: 'Every photo and record backed up and accessible across all your devices.' },
  { icon: 'qrcode', label: 'Specimen Tags', detail: 'Create and print botanical QR labels to bridge your physical and digital collection.' },
];

export default function PremiumScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
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
  } =
    useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<BillingPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    trackMonetizationEvent('premium_screen_viewed');
    void refreshOfferings();
  }, [refreshOfferings]);

  useEffect(() => {
    if (offerings?.annual) {
      setSelectedPackage(offerings.annual);
    }
  }, [offerings]);

  useEffect(() => {
    if (isPremium && !isLoading) {
      router.back();
    }
  }, [isPremium, isLoading, router]);

  useEffect(() => {
    if (!isLoading && !isPremium && offerings !== null && (offerings.packages ?? []).length === 0) {
      trackMonetizationEvent('offerings_load_failed');
    }
  }, [isLoading, isPremium, offerings]);

  async function handlePurchase() {
    if (!selectedPackage) return;
    setPurchasing(true);
    trackMonetizationEvent('purchase_started', { packageType: selectedPackage.packageType });
    const result = await purchase(selectedPackage.identifier);
    setPurchasing(false);
    if (result.success) {
      trackMonetizationEvent('purchase_completed', { packageType: selectedPackage.packageType });
    } else if (result.userCancelled) {
      trackMonetizationEvent('purchase_cancelled');
    }
  }

  async function handleRestore() {
    trackMonetizationEvent('restore_started');
    const result = await restore();
    if (result.success) {
      trackMonetizationEvent('restore_completed');
    }
  }

  const packages = offerings?.packages ?? [];
  const annualPkg = offerings?.annual;
  const monthlyPkg = offerings?.monthly;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing.lg, paddingBottom: 48 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Icon name="close" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.secondary }]}>
            THE CONSERVATORY
          </Text>
          <Text style={[styles.heroTitle, { color: colors.primary }]}>Premium</Text>
          <Text style={[styles.heroSubtitle, { color: colors.onSurface }]}>
            Deepen your collection&apos;s story.
          </Text>
        </View>

        {/* Feature list */}
        <View style={[styles.featureList, { backgroundColor: colors.surfaceContainerLowest }]}>
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature.icon} style={styles.featureRow}>
              <View style={[styles.featureIconBox, { backgroundColor: colors.primaryFixed }]}>
                <Icon name={feature.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureLabel, { color: colors.primary }]}>
                  {feature.label}
                </Text>
                <Text style={[styles.featureDetail, { color: colors.onSurface }]}>
                  {feature.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        {packages.length > 0 ? (
          <View style={styles.plans}>
            <Text style={[styles.plansLabel, { color: colors.onSurfaceVariant }]}>
              CHOOSE YOUR PLAN
            </Text>

            {annualPkg ? (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedPackage?.identifier === annualPkg.identifier }}
                onPress={() => {
                  setSelectedPackage(annualPkg);
                  trackMonetizationEvent('plan_selected', { packageType: annualPkg.packageType });
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
                  <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.badgeLabel, { color: colors.surfaceBright }]}>
                      BEST VALUE
                    </Text>
                  </View>
                </View>
                <Text style={[styles.planTitle, { color: colors.primary }]}>Annual</Text>
                <Text style={[styles.planPrice, { color: colors.primary }]}>
                  {annualPkg.priceString}
                  <Text style={[styles.planPeriod, { color: colors.onSurface }]}>/year</Text>
                </Text>
                <Text style={[styles.planPerMonth, { color: colors.onSurface }]}>
                  {annualPkg.pricePerMonthString}/month
                </Text>
                {annualPkg.introductoryPrice ? (
                  <Text style={[styles.planTrial, { color: colors.secondary }]}>
                    {annualPkg.introductoryPrice} free trial
                  </Text>
                ) : null}
              </Pressable>
            ) : null}

            {monthlyPkg ? (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedPackage?.identifier === monthlyPkg.identifier }}
                onPress={() => {
                  setSelectedPackage(monthlyPkg);
                  trackMonetizationEvent('plan_selected', { packageType: monthlyPkg.packageType });
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
                <Text style={[styles.planTitle, { color: colors.primary }]}>Monthly</Text>
                <Text style={[styles.planPrice, { color: colors.primary }]}>
                  {monthlyPkg.priceString}
                  <Text style={[styles.planPeriod, { color: colors.onSurface }]}>/month</Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={[styles.offeringsEmptyCard, { backgroundColor: colors.surfaceContainerLowest }]}>
            <Text style={[styles.offeringsEmptyTitle, { color: colors.primary }]}>
              Plans unavailable
            </Text>
            <Text style={[styles.offeringsEmptyBody, { color: colors.onSurface }]}>
              We couldn&apos;t load subscription options right now. Check your connection and try again.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshOfferings()}
              style={[styles.retryButton, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Text style={[styles.retryLabel, { color: colors.primary }]}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* CTA */}
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : null}

        {entitlementUnavailable ? (
          <Text style={[styles.statusText, { color: colors.onSurfaceVariant }]}>
            Subscription status is temporarily unavailable.
            {lastVerifiedAt
              ? ` Last verified ${new Date(lastVerifiedAt).toLocaleDateString()}.`
              : ' Try again when your connection is steady.'}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!selectedPackage || purchasing || isLoading}
          onPress={() => void handlePurchase()}
          style={[
            styles.ctaButton,
            {
              backgroundColor:
                !selectedPackage || purchasing ? colors.surfaceContainerHigh : colors.primary,
            },
          ]}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.surfaceBright} />
          ) : (
            <Text style={[styles.ctaLabel, { color: colors.surfaceBright }]}>
              {selectedPackage?.introductoryPrice
                ? `Start Free Trial`
                : `Subscribe — ${selectedPackage?.priceString ?? '...'}`}
            </Text>
          )}
        </Pressable>

        {/* Legal */}
        <Text style={[styles.trialDisclosure, { color: colors.onSurfaceVariant }]}>
          {selectedPackage?.introductoryPrice
            ? `${selectedPackage.introductoryPrice} free, then `
            : ''}
          {selectedPackage
            ? `${selectedPackage.priceString}${
                selectedPackage.packageType === 'annual' ? '/year' : '/month'
              }`
            : 'Subscriptions'}
          {' '}renew automatically until cancelled. Payment is charged to your{' '}
          {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} account. Cancel anytime in{' '}
          {Platform.OS === 'ios' ? 'App Store settings' : 'Google Play settings'}.
        </Text>

        {/* Restore + secondary links */}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={isRestoring}
            onPress={() => void handleRestore()}
          >
            <Text style={[styles.footerLink, { color: colors.onSurfaceVariant }]}>
              {isRestoring ? 'Restoring…' : 'Restore purchases'}
            </Text>
          </Pressable>
          <Text style={[styles.footerDot, { color: colors.onSurfaceVariant }]}>·</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL('https://theconservatory.app/terms')}
          >
            <Text style={[styles.footerLink, { color: colors.onSurfaceVariant }]}>Terms</Text>
          </Pressable>
          <Text style={[styles.footerDot, { color: colors.onSurfaceVariant }]}>·</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL('https://theconservatory.app/privacy')}
          >
            <Text style={[styles.footerLink, { color: colors.onSurfaceVariant }]}>Privacy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { gap: 28 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 },
  closeButton: { padding: 8 },
  hero: { alignItems: 'center', gap: 8, paddingTop: 8 },
  eyebrow: { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 2.4 },
  heroTitle: { fontFamily: 'NotoSerif_700Bold', fontSize: 42, lineHeight: 50 },
  heroSubtitle: { fontFamily: 'Manrope_500Medium', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  featureList: { borderRadius: 28, padding: 20, gap: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  featureIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, gap: 4 },
  featureLabel: { fontFamily: 'Manrope_700Bold', fontSize: 15, lineHeight: 20 },
  featureDetail: { fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 19 },
  plans: { gap: 12 },
  plansLabel: { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 2.1, paddingHorizontal: 4 },
  planCard: { borderRadius: 20, borderWidth: 1.5, padding: 20, gap: 6 },
  planCardBadge: { alignItems: 'flex-start' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeLabel: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1.5 },
  planTitle: { fontFamily: 'NotoSerif_700Bold', fontSize: 20, lineHeight: 26 },
  planPrice: { fontFamily: 'NotoSerif_700Bold', fontSize: 28, lineHeight: 34 },
  planPeriod: { fontFamily: 'Manrope_500Medium', fontSize: 16 },
  planPerMonth: { fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 18 },
  planTrial: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  errorText: { fontFamily: 'Manrope_500Medium', fontSize: 14, textAlign: 'center' },
  statusText: { fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  ctaButton: { height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontFamily: 'Manrope_700Bold', fontSize: 16, letterSpacing: 0.6 },
  trialDisclosure: { fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  footerLink: { fontFamily: 'Manrope_500Medium', fontSize: 13 },
  footerDot: { fontSize: 13 },
  offeringsEmptyCard: { borderRadius: 20, padding: 20, gap: 12 },
  offeringsEmptyTitle: { fontFamily: 'NotoSerif_700Bold', fontSize: 20, lineHeight: 26 },
  offeringsEmptyBody: { fontFamily: 'Manrope_500Medium', fontSize: 14, lineHeight: 21 },
  retryButton: { alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  retryLabel: { fontFamily: 'Manrope_700Bold', fontSize: 13, letterSpacing: 0.6 },
});

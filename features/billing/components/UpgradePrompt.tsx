import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/design-system/useTheme';

interface UpgradePromptProps {
  message: string;
  cta?: string;
  onDismiss?: () => void;
  compact?: boolean;
}

export function UpgradePrompt({
  message,
  cta = 'Explore Premium',
  onDismiss,
  compact = false,
}: UpgradePromptProps) {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surfaceContainerLow }]}>
        <Text style={[styles.compactMessage, { color: colors.onSurface }]}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPress={() => router.push('/premium' as any)}
          style={[styles.compactCta, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.compactCtaLabel, { color: colors.surfaceBright }]}>{cta}</Text>
        </Pressable>
        {onDismiss ? (
          <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.dismiss}>
            <Text style={[styles.dismissLabel, { color: colors.onSurfaceVariant }]}>
              Maybe later
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainerLow,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
        },
      ]}
    >
      <Text style={[styles.message, { color: colors.onSurface }]}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onPress={() => router.push('/premium' as any)}
        style={[styles.cta, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.ctaLabel, { color: colors.surfaceBright }]}>{cta}</Text>
      </Pressable>
      {onDismiss ? (
        <Pressable accessibilityRole="button" onPress={onDismiss}>
          <Text style={[styles.dismissLabel, { color: colors.onSurfaceVariant }]}>
            Maybe later
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  message: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  cta: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    letterSpacing: 1.2,
  },
  dismissLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  compactContainer: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  compactMessage: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  compactCta: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  compactCtaLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  dismiss: {
    width: '100%',
    alignItems: 'center',
    marginTop: -4,
  },
});

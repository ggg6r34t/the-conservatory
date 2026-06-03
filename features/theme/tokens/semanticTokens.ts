/** App-wide semantic colors derived per theme (status, sync, domain accents). */
export type BotanicalSemanticTokens = {
  scrim: string;
  /** Subtle elevation shadow (cards, surface buttons). */
  shadow: string;
  /** Stronger elevation shadow (floating badges, emphasis controls). */
  shadowElevated: string;

  success: string;
  onSuccess: string;
  successContainer: string;
  onSuccessContainer: string;

  warning: string;
  onWarning: string;
  warningContainer: string;
  onWarningContainer: string;

  info: string;
  onInfo: string;
  infoContainer: string;
  onInfoContainer: string;

  statusThriving: string;
  onStatusThriving: string;
  statusStable: string;
  onStatusStable: string;
  statusNeedsWater: string;
  onStatusNeedsWater: string;
  statusDormant: string;
  onStatusDormant: string;
  statusUnknown: string;
  onStatusUnknown: string;

  premium: string;
  onPremium: string;
  premiumContainer: string;
  onPremiumContainer: string;

  syncHealthy: string;
  syncWarning: string;
  syncError: string;

  graveyardAccent: string;
  memorialAccent: string;
  journalAccent: string;
  timelineAccent: string;
};

export const LEGAL_LAST_UPDATED = "June 2, 2026";

export const LEGAL_CONTACT = {
  privacyEmail: "privacy@theconservatory.garden",
  legalEmail: "legal@theconservatory.garden",
  supportEmail: "support@theconservatory.garden",
} as const;

export const LEGAL_WEB_BASE = "https://theconservatory.garden";

/** Primary in-app legal documents shown in Profile → Legal */
export const LEGAL_ROUTES = {
  terms: "/terms",
  privacy: "/privacy",
  aiDisclosure: "/ai-disclosure",
  licenses: "/license",
  privacySecurity: "/privacy-security",
  dataBackup: "/data-backup",
  exportCollection: "/export-collection-data",
  subscriptionPlans: "/subscription-plans",
} as const;

/** Legacy routes that redirect to consolidated documents */
export const LEGAL_REDIRECT_ROUTES = {
  subscriptionTerms: "/subscription-terms",
  privacySecurityStatement: "/privacy-security-statement",
  dataRetention: "/data-retention",
  dataExportPolicy: "/data-export-policy",
  accountDeletion: "/account-deletion-policy",
} as const;

const ANONYMOUS_ACCESSIBLE_LEGAL_PATHS = new Set<string>([
  LEGAL_ROUTES.terms,
  LEGAL_ROUTES.privacy,
  LEGAL_REDIRECT_ROUTES.subscriptionTerms,
  LEGAL_REDIRECT_ROUTES.privacySecurityStatement,
  LEGAL_REDIRECT_ROUTES.dataRetention,
  LEGAL_REDIRECT_ROUTES.dataExportPolicy,
  LEGAL_REDIRECT_ROUTES.accountDeletion,
]);

/** Legal documents reachable before account creation (signup acknowledgment links). */
export function isAnonymousAccessibleLegalRoute(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return ANONYMOUS_ACCESSIBLE_LEGAL_PATHS.has(normalized);
}

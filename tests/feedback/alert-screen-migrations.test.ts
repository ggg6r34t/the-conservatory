import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const MIGRATED_SCREENS: {
  file: string;
  patterns: RegExp[];
  description: string;
}[] = [
  {
    file: "features/auth/components/LoginForm.tsx",
    patterns: [/useAlert/, /alert\.show/],
    description: "auth sign-in errors",
  },
  {
    file: "app/privacy-security.tsx",
    patterns: [/useAlert/, /alert\.confirm/],
    description: "delete account confirmation",
  },
  {
    file: "app/profile.tsx",
    patterns: [/useAlert/, /alert\.confirm/, /profile_sign_out/],
    description: "sign-out confirmation",
  },
  {
    file: "app/care-reminders.tsx",
    patterns: [/useAlert/, /alert\.confirm/],
    description: "reminder delete confirmation",
  },
  {
    file: "app/backup-details.tsx",
    patterns: [/useAlert/, /alert\.show/],
    description: "backup failure dialog",
  },
  {
    file: "app/subscription-plans.tsx",
    patterns: [
      /useAlert/,
      /subscription_purchase_confirm/,
      /subscription_purchase_failed/,
      /subscription_purchase_success/,
      /buildSubscriptionPurchaseConfirmMessage/,
    ],
    description: "purchase confirm, success, and failure dialogs",
  },
  {
    file: "app/export-collection-data.tsx",
    patterns: [/useAlert/, /alert\.show/],
    description: "export failure dialog",
  },
  {
    file: "features/care-logs/components/CareLogForm.tsx",
    patterns: [/useAlert/, /care_log_save_failed/],
    description: "care log save failure",
  },
  {
    file: "app/plant/[id]/activity.tsx",
    patterns: [/useAlert/, /alert\.confirm/],
    description: "care log delete confirmation",
  },
  {
    file: "features/onboarding/components/WelcomeGateway.tsx",
    patterns: [/useAlert/, /alert\.show/],
    description: "onboarding welcome errors",
  },
];

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("alert screen migrations", () => {
  for (const screen of MIGRATED_SCREENS) {
    it(`${screen.description} uses custom alert (${screen.file})`, () => {
      const source = readSource(screen.file);
      for (const pattern of screen.patterns) {
        expect(source).toMatch(pattern);
      }
      expect(source).not.toMatch(/\bAlert\.alert\b/);
    });
  }
});

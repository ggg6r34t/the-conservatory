import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["app", "features", "hooks", "providers", "components"];

const ALLOWED_FILES = new Set([
  "features/permissions/requestSystemPermission.ts",
  "features/onboarding/services/permissionsService.ts",
  "features/notifications/services/notificationService.ts",
]);

const FORBIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
  {
    pattern: /\brequestPermissionsAsync\s*\(/,
    label: "notifications.requestPermissionsAsync",
  },
  {
    pattern: /\brequestMediaLibraryPermissionsAsync\s*\(/,
    label: "ImagePicker.requestMediaLibraryPermissionsAsync",
  },
  {
    pattern: /\brequestCameraPermissionsAsync\s*\(/,
    label: "ImagePicker.requestCameraPermissionsAsync",
  },
];

function collectSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") {
        continue;
      }
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("OS permission request centralization", () => {
  it("defaults ensureNotificationPermissions to no implicit OS request", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "features/notifications/services/notificationService.ts",
      ),
      "utf8",
    );

    expect(source).toMatch(/requestIfNeeded !== true/);
    expect(source).toMatch(/requestIfNeeded: false/);
  });

  it("only allows direct OS permission APIs in the permissions gateway files", () => {
    const offenders: string[] = [];

    for (const root of SCAN_ROOTS) {
      const files = collectSourceFiles(path.join(ROOT, root));
      for (const file of files) {
        const relative = path.relative(ROOT, file).replace(/\\/g, "/");
        if (ALLOWED_FILES.has(relative)) {
          continue;
        }

        const source = fs.readFileSync(file, "utf8");
        for (const { pattern, label } of FORBIDDEN_PATTERNS) {
          if (pattern.test(source)) {
            offenders.push(`${relative} (${label})`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

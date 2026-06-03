import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["app", "features", "hooks", "providers", "components", "services"];
const ALLOWED_EXCEPTIONS: { file: string; reason: string }[] = [];

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

describe("native Alert.alert ban", () => {
  it("has no user-facing Alert.alert in app source", () => {
    const offenders: string[] = [];

    for (const root of SCAN_ROOTS) {
      const files = collectSourceFiles(path.join(ROOT, root));
      for (const file of files) {
        const relative = path.relative(ROOT, file).replace(/\\/g, "/");
        if (ALLOWED_EXCEPTIONS.some((item) => item.file === relative)) {
          continue;
        }

        const source = fs.readFileSync(file, "utf8");
        if (/\bAlert\.alert\b/.test(source)) {
          offenders.push(`${relative} (Alert.alert)`);
        }
        if (
          /import\s*\{[^}]*\bAlert\b[^}]*\}\s*from\s*["']react-native["']/.test(
            source,
          )
        ) {
          offenders.push(`${relative} (import Alert from react-native)`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("documents any allowed native alert exceptions", () => {
    expect(ALLOWED_EXCEPTIONS).toEqual([]);
  });
});

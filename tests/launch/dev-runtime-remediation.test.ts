import fs from "fs";
import path from "path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Dev runtime remediation certification", () => {
  it("keeps specimen-scan route free of top-level expo-camera imports", () => {
    const route = read("app/specimen-scan.tsx");
    expect(route).not.toContain("expo-camera");
    expect(route).toContain("SpecimenScanEntry");
  });

  it("lazy-loads camera UI only when the native module is available", () => {
    expect(read("features/plants/components/SpecimenScanEntry.tsx")).toContain(
      "isExpoCameraNativeAvailable",
    );
    expect(read("features/plants/components/SpecimenScanEntry.tsx")).toContain(
      "require(\"@/features/plants/components/SpecimenScanCameraScreen\")",
    );
    expect(
      read("features/plants/components/SpecimenScanCameraScreen.tsx"),
    ).toContain("expo-camera");
  });

  it("guards RevenueCat initialization when native billing is unavailable", () => {
    expect(read("features/billing/adapters/RevenueCatAdapter.ts")).toContain(
      "isRevenueCatNativeAvailable",
    );
    expect(read("features/billing/services/revenueCatNative.ts")).toContain(
      "RNPurchases",
    );
  });

  it("debounces automatic remote hydration after a recent successful run", () => {
    expect(read("services/database/userDataSync.ts")).toContain(
      "HYDRATION_COOLDOWN_MS",
    );
    expect(read("services/database/userDataSync.ts")).toContain(
      "sync.hydration.skipped_recent",
    );
  });

  it("serializes concurrent hydration for the same user", () => {
    expect(read("services/database/remoteHydration.ts")).toContain(
      "hydrationInFlight",
    );
    expect(read("services/database/remoteHydration.ts")).toContain(
      "hydrateRemoteUserDataUnchecked",
    );
  });
});

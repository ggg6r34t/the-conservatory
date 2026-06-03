import { getSystemPermissionConfirmOptions } from "@/features/permissions/permissionPromptCopy";

describe("permissionPromptCopy", () => {
  it("includes device-next-step language for each permission kind", () => {
    for (const kind of [
      "notifications",
      "media",
      "camera",
      "mediaLibrary",
    ] as const) {
      const copy = getSystemPermissionConfirmOptions(kind);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.message).toMatch(/device/i);
      expect(copy.confirmLabel).toBe("Continue");
      expect(copy.analyticsKey).toMatch(/^system_permission_/);
    }
  });
});

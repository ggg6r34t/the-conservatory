import { combinePermissionStates } from "@/features/onboarding/utils/permissionState";

describe("combinePermissionStates", () => {
  it("returns granted when all inputs are granted", () => {
    expect(combinePermissionStates(["granted", "granted"])).toBe("granted");
  });

  it("returns denied when any permission is denied", () => {
    expect(combinePermissionStates(["granted", "denied"])).toBe("denied");
  });

  it("returns unavailable when any permission is unavailable", () => {
    expect(combinePermissionStates(["granted", "unavailable"])).toBe("unavailable");
  });

  it("falls back to undetermined for mixed incomplete states", () => {
    expect(combinePermissionStates(["granted", "undetermined"])).toBe("undetermined");
  });
});

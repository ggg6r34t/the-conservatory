import { confirmBeforeSystemPermission } from "@/features/permissions/confirmBeforeSystemPermission";
import { getSystemPermissionState } from "@/features/permissions/getSystemPermissionState";

jest.mock("@/features/permissions/getSystemPermissionState");

const getSystemPermissionStateMock = jest.mocked(getSystemPermissionState);

describe("confirmBeforeSystemPermission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns already_granted without calling confirm", async () => {
    getSystemPermissionStateMock.mockResolvedValue("granted");
    const confirm = jest.fn();

    const result = await confirmBeforeSystemPermission(
      confirm,
      "camera",
      "test_screen",
    );

    expect(result).toBe("already_granted");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("returns blocked for denied without calling confirm", async () => {
    getSystemPermissionStateMock.mockResolvedValue("denied");
    const confirm = jest.fn();

    const result = await confirmBeforeSystemPermission(
      confirm,
      "camera",
      "test_screen",
    );

    expect(result).toBe("blocked");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("returns proceed when the user accepts the pre-prompt", async () => {
    getSystemPermissionStateMock.mockResolvedValue("undetermined");
    const confirm = jest.fn().mockResolvedValue(true);

    const result = await confirmBeforeSystemPermission(
      confirm,
      "camera",
      "test_screen",
    );

    expect(result).toBe("proceed");
    expect(confirm).toHaveBeenCalled();
  });
});

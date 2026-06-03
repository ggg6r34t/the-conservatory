import { promptAndRequestSystemPermission } from "@/features/permissions/promptAndRequestSystemPermission";
import { getSystemPermissionState } from "@/features/permissions/getSystemPermissionState";
import { requestSystemPermission } from "@/features/permissions/requestSystemPermission";

jest.mock("@/features/permissions/getSystemPermissionState");
jest.mock("@/features/permissions/requestSystemPermission");

const getSystemPermissionStateMock = jest.mocked(getSystemPermissionState);
const requestSystemPermissionMock = jest.mocked(requestSystemPermission);

describe("promptAndRequestSystemPermission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns granted without showing confirm when already granted", async () => {
    getSystemPermissionStateMock.mockResolvedValue("granted");

    const confirm = jest.fn();
    const outcome = await promptAndRequestSystemPermission(
      confirm,
      "camera",
      "test_screen",
    );

    expect(outcome).toEqual({ status: "granted" });
    expect(confirm).not.toHaveBeenCalled();
    expect(requestSystemPermissionMock).not.toHaveBeenCalled();
  });

  it("returns cancelled when the user declines the in-app pre-prompt", async () => {
    getSystemPermissionStateMock.mockResolvedValue("undetermined");
    const confirm = jest.fn().mockResolvedValue(false);

    const outcome = await promptAndRequestSystemPermission(
      confirm,
      "notifications",
      "test_screen",
    );

    expect(outcome).toEqual({ status: "cancelled" });
    expect(requestSystemPermissionMock).not.toHaveBeenCalled();
  });

  it("requests the OS permission after the user accepts the pre-prompt", async () => {
    getSystemPermissionStateMock.mockResolvedValue("undetermined");
    const confirm = jest.fn().mockResolvedValue(true);
    requestSystemPermissionMock.mockResolvedValue("granted");

    const outcome = await promptAndRequestSystemPermission(
      confirm,
      "mediaLibrary",
      "test_screen",
    );

    expect(outcome).toEqual({ status: "granted" });
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        analyticsKey: "system_permission_media_library_pre_prompt",
        sourceScreen: "test_screen",
      }),
    );
    expect(requestSystemPermissionMock).toHaveBeenCalledWith("mediaLibrary");
  });
});

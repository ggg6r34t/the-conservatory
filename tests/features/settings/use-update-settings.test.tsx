import { renderHook } from "@testing-library/react-native";

const mockUpdateUserPreferences = jest.fn();
const mockRunUserDataSync = jest.fn();
const mockInvalidateBackupQueries = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockApplyReminderPreferenceSideEffects = jest.fn();
const mockWarn = jest.fn();

let mockOffline = false;

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
  }),
  useMutation: (config: {
    mutationFn: (patch: {
      remindersEnabled?: boolean;
      autoSyncEnabled?: boolean;
      defaultWateringHour?: number;
      timezone?: string;
    }) => Promise<unknown>;
    onSuccess?: (data: unknown, variables: Record<string, unknown>) => void;
  }) => ({
    mutateAsync: async (variables: Record<string, unknown>) => {
      const data = await config.mutationFn(variables);
      await config.onSuccess?.(data, variables);
      return data;
    },
    mutate: async (variables: Record<string, unknown>) => {
      const data = await config.mutationFn(variables);
      await config.onSuccess?.(data, variables);
      return data;
    },
    isPending: false,
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/hooks/useNetworkState", () => ({
  useNetworkState: () => ({
    isOffline: mockOffline,
  }),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  updateUserPreferences: (...args: unknown[]) =>
    mockUpdateUserPreferences(...args),
}));

jest.mock("@/services/database/userDataSync", () => ({
  runUserDataSync: (...args: unknown[]) => mockRunUserDataSync(...args),
}));

jest.mock("@/features/notifications/services/remindersScheduler", () => ({
  applyReminderPreferenceSideEffects: (...args: unknown[]) =>
    mockApplyReminderPreferenceSideEffects(...args),
}));

jest.mock("@/features/profile/utils/invalidateBackupQueries", () => ({
  invalidateBackupQueries: (...args: unknown[]) =>
    mockInvalidateBackupQueries(...args),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    warn: (...args: unknown[]) => mockWarn(...args),
  },
}));

describe("useUpdateSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOffline = false;
    mockUpdateUserPreferences.mockResolvedValue({
      userId: "user-1",
      autoSyncEnabled: true,
    });
    mockInvalidateQueries.mockResolvedValue(undefined);
    mockRunUserDataSync.mockResolvedValue(undefined);
    mockInvalidateBackupQueries.mockResolvedValue(undefined);
    mockApplyReminderPreferenceSideEffects.mockResolvedValue(undefined);
  });

  it("triggers an immediate sync when auto sync is enabled mid-session", async () => {
    const {
      useUpdateSettings,
    } = require("@/features/settings/hooks/useUpdateSettings");
    const { result } = renderHook(() => useUpdateSettings());

    await result.current.mutateAsync({ autoSyncEnabled: true });

    expect(mockUpdateUserPreferences).toHaveBeenCalledWith("user-1", {
      autoSyncEnabled: true,
    });
    expect(mockRunUserDataSync).toHaveBeenCalledWith({
      userId: "user-1",
      trigger: "auto-settings",
    });
    expect(mockInvalidateBackupQueries).toHaveBeenCalled();
  });

  it("does not trigger an immediate sync when the device is offline", async () => {
    mockOffline = true;
    const {
      useUpdateSettings,
    } = require("@/features/settings/hooks/useUpdateSettings");
    const { result } = renderHook(() => useUpdateSettings());

    await result.current.mutateAsync({ autoSyncEnabled: true });

    expect(mockRunUserDataSync).not.toHaveBeenCalled();
  });

  it("applies local notification side effects when watering alerts are disabled", async () => {
    const {
      useUpdateSettings,
    } = require("@/features/settings/hooks/useUpdateSettings");
    const { result } = renderHook(() => useUpdateSettings());

    await result.current.mutateAsync({ remindersEnabled: false });

    expect(mockApplyReminderPreferenceSideEffects).toHaveBeenCalledWith({
      userId: "user-1",
      remindersEnabled: false,
    });
  });
});

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn().mockResolvedValue(undefined);
const mockDeleteItemAsync = jest.fn().mockResolvedValue(undefined);
const mockClearPlantDraft = jest.fn().mockResolvedValue(undefined);
const mockResetOnboardingDebugSnapshot = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-secure-store", () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

jest.mock("@/features/plants/services/plantDraftStorage", () => ({
  clearPlantDraft: (...args: unknown[]) => mockClearPlantDraft(...args),
}));

jest.mock("@/features/onboarding/services/onboardingDebugStorage", () => ({
  resetOnboardingDebugSnapshot: (...args: unknown[]) =>
    mockResetOnboardingDebugSnapshot(...args),
}));

describe("sessionManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears invalid persisted session payloads", async () => {
    mockGetItemAsync.mockResolvedValue("{bad-json");

    const { readSession } = require("@/services/auth/sessionManager");

    await expect(readSession()).resolves.toBeNull();
    expect(mockDeleteItemAsync).toHaveBeenCalled();
  });

  it("clears auth-adjacent local state on logout", async () => {
    const { clearSession } = require("@/services/auth/sessionManager");

    await clearSession();

    expect(mockDeleteItemAsync).toHaveBeenCalled();
    expect(mockClearPlantDraft).toHaveBeenCalled();
    expect(mockResetOnboardingDebugSnapshot).toHaveBeenCalled();
  });
});

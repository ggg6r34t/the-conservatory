/**
 * @jest-environment node
 */

const mockWriteSession = jest.fn();
const mockReadSession = jest.fn();
const mockGetDatabase = jest.fn();

jest.mock("@/services/auth/sessionManager", () => ({
  readSession: (...args: unknown[]) => mockReadSession(...args),
  writeSession: (...args: unknown[]) => mockWriteSession(...args),
}));

jest.mock("@/services/database/sqlite", () => ({
  getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
}));

jest.mock("@/features/settings/api/settingsClient", () => ({
  getUserPreferences: jest.fn().mockResolvedValue({
    remindersEnabled: true,
    autoSyncEnabled: false,
  }),
}));

import {
  continueAsGuest,
  restoreGuestSession,
} from "@/features/auth/services/guestSessionService";

describe("guestSessionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteSession.mockResolvedValue(undefined);
    mockGetDatabase.mockResolvedValue({
      runAsync: jest.fn().mockResolvedValue(undefined),
    });
  });

  it("restores an existing guest session instead of creating a new id", async () => {
    const existingGuest = {
      id: "guest-stable-id",
      email: "stable-id@local.theconservatory.app",
      displayName: "Local Curator",
      avatarUrl: null,
      role: "user" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      isGuest: true as const,
    };

    mockReadSession.mockResolvedValue(existingGuest);

    const restored = await continueAsGuest();
    expect(restored.id).toBe("guest-stable-id");
    expect(mockWriteSession).not.toHaveBeenCalled();
  });

  it("persists a new guest session when none exists", async () => {
    mockReadSession.mockResolvedValue(null);

    const created = await continueAsGuest();
    expect(created.id.startsWith("guest-")).toBe(true);
    expect(mockWriteSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: created.id, isGuest: true }),
    );
  });

  it("restoreGuestSession returns null for authenticated sessions", async () => {
    mockReadSession.mockResolvedValue({
      id: "user-real",
      email: "real@example.com",
      displayName: "Real User",
      avatarUrl: null,
      role: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await expect(restoreGuestSession()).resolves.toBeNull();
  });
});

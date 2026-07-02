/**
 * @jest-environment node
 */

import type { AppUser } from "@/types/models";

import {
  resetOAuthProfileCoordinatorForTests,
  runOAuthProfileHydrationOnce,
} from "@/features/auth/services/oauthProfileCoordinator";

describe("oauthProfileCoordinator", () => {
  beforeEach(() => {
    resetOAuthProfileCoordinatorForTests();
  });

  it("deduplicates concurrent profile hydration for the same user", async () => {
    const hydrate = jest.fn(async (): Promise<AppUser> => ({
      id: "user-1",
      email: "curator@example.com",
      displayName: "Curator",
      avatarUrl: null,
      role: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));

    const [first, second] = await Promise.all([
      runOAuthProfileHydrationOnce("user-1", hydrate),
      runOAuthProfileHydrationOnce("user-1", hydrate),
    ]);

    expect(first).toEqual(second);
    expect(hydrate).toHaveBeenCalledTimes(1);
  });
});

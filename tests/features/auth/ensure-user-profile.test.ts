/**
 * @jest-environment node
 */

import type { User } from "@supabase/supabase-js";

import {
  buildAppUserFromAuthUser,
  deriveOAuthDisplayName,
} from "@/features/auth/services/ensureUserProfile";

function createAuthUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    aud: "authenticated",
    role: "authenticated",
    email: "curator@privaterelay.appleid.com",
    created_at: "2026-01-01T00:00:00.000Z",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    ...overrides,
  } as User;
}

describe("ensureUserProfile", () => {
  it("uses provider metadata for first-time display names", () => {
    const authUser = createAuthUser({
      user_metadata: { full_name: "Elowen Thorne" },
    });

    expect(deriveOAuthDisplayName(authUser)).toBe("Elowen Thorne");
  });

  it("preserves customized display names", () => {
    const authUser = createAuthUser({
      email: "curator@example.com",
      user_metadata: { full_name: "Provider Name" },
    });

    expect(deriveOAuthDisplayName(authUser, "Custom Curator")).toBe(
      "Custom Curator",
    );
  });

  it("falls back to email prefix for private relay accounts", () => {
    const authUser = createAuthUser({
      email: "abc@privaterelay.appleid.com",
      user_metadata: {},
    });

    const user = buildAppUserFromAuthUser(authUser);
    expect(user.email).toBe("abc@privaterelay.appleid.com");
    expect(user.displayName).toBe("abc");
  });
});

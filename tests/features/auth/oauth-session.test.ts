/**
 * @jest-environment node
 */

import type { User } from "@supabase/supabase-js";

import { inferOAuthProviderFromSession } from "@/features/auth/services/oauthSession";

function createAuthUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    aud: "authenticated",
    role: "authenticated",
    email: "curator@example.com",
    created_at: "2026-01-01T00:00:00.000Z",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    ...overrides,
  } as User;
}

describe("oauthSession", () => {
  it("prefers apple when present in identities", () => {
    const user = createAuthUser({
      identities: [
        { provider: "google" },
        { provider: "apple" },
      ] as User["identities"],
    });

    expect(inferOAuthProviderFromSession(user)).toBe("apple");
  });

  it("returns google when only google identity exists", () => {
    const user = createAuthUser({
      app_metadata: { provider: "google" },
    });

    expect(inferOAuthProviderFromSession(user)).toBe("google");
  });

  it("defaults to google when provider metadata is missing", () => {
    expect(inferOAuthProviderFromSession(createAuthUser())).toBe("google");
  });
});

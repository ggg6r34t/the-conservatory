import type { User } from "@supabase/supabase-js";

import type { OAuthProvider } from "@/features/auth/services/oauthErrors";

function collectProviderCandidates(user: User | null | undefined): string[] {
  if (!user) {
    return [];
  }

  const candidates = new Set<string>();
  const appProvider = user.app_metadata?.provider;
  if (typeof appProvider === "string" && appProvider.trim()) {
    candidates.add(appProvider.trim().toLowerCase());
  }

  for (const identity of user.identities ?? []) {
    if (typeof identity.provider === "string" && identity.provider.trim()) {
      candidates.add(identity.provider.trim().toLowerCase());
    }
  }

  return Array.from(candidates);
}

export function inferOAuthProviderFromSession(
  user: User | null | undefined,
): OAuthProvider {
  const candidates = collectProviderCandidates(user);

  if (candidates.includes("apple")) {
    return "apple";
  }

  if (candidates.includes("google")) {
    return "google";
  }

  return "google";
}

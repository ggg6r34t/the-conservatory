import type { AppUser } from "@/types/models";

let profileHydrationInflight: Promise<AppUser> | null = null;
let profileHydrationUserId: string | null = null;

export function resetOAuthProfileCoordinatorForTests() {
  profileHydrationInflight = null;
  profileHydrationUserId = null;
}

export async function runOAuthProfileHydrationOnce(
  userId: string,
  hydrate: () => Promise<AppUser>,
): Promise<AppUser> {
  if (profileHydrationInflight && profileHydrationUserId === userId) {
    return profileHydrationInflight;
  }

  const run = hydrate().finally(() => {
    if (profileHydrationUserId === userId) {
      profileHydrationInflight = null;
      profileHydrationUserId = null;
    }
  });

  profileHydrationUserId = userId;
  profileHydrationInflight = run;
  return run;
}

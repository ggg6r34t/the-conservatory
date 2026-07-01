import { LEGAL_WEB_BASE } from "@/features/legal/constants";

/** Native deep link opened when the app handles recovery directly. */
export const PASSWORD_RECOVERY_APP_PATH = "/auth/reset-password";

export const PASSWORD_RECOVERY_APP_SCHEME = "theconservatory";

export const PASSWORD_RECOVERY_APP_URL = `${PASSWORD_RECOVERY_APP_SCHEME}://${PASSWORD_RECOVERY_APP_PATH.replace(/^\//, "")}`;

/** HTTPS redirect registered in Supabase and used in reset emails. */
export const PASSWORD_RECOVERY_WEB_URL = `${LEGAL_WEB_BASE}${PASSWORD_RECOVERY_APP_PATH}`;

/** Supabase `redirectTo` for password recovery emails. */
export const PASSWORD_RECOVERY_REDIRECT_URL = PASSWORD_RECOVERY_WEB_URL;

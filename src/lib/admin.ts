export const ADMIN_USER_ID = "e0df092e-fa04-4d8c-93d2-c3f75afcd897";
export const ADMIN_EMAIL = "canibal637@gmail.com";

/**
 * Validates whether the given user is the system administrator.
 * Matches by user ID or email address (case-insensitive).
 */
export function isSystemAdmin(user?: { id?: string | null; email?: string | null } | null): boolean {
  if (!user) return false;
  const userEmail = (user.email || "").toLowerCase().trim();
  const userId = (user.id || "").trim();

  return (
    userId === ADMIN_USER_ID ||
    (userEmail.length > 0 && userEmail === ADMIN_EMAIL.toLowerCase())
  );
}

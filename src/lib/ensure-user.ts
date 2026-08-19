import { supabaseAdmin } from "./supabase-admin";

/**
 * Ensures a user record exists in public.users to satisfy foreign key constraints
 * across tables (e.g. tournament_casters, caster_applications, casters, tournaments).
 */
export async function ensurePublicUser(
  userId: string,
  fallbackInfo?: { name?: string | null; email?: string | null; image?: string | null }
): Promise<void> {
  if (!userId) return;

  try {
    // 1. Check if user already exists in public.users
    const { data: existingPublic } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingPublic?.id) return;

    // 2. Fetch user from next_auth.users if possible
    let name = fallbackInfo?.name || null;
    let email = fallbackInfo?.email || null;
    let image = fallbackInfo?.image || null;

    try {
      const { data: nextAuthUser } = await supabaseAdmin
        .schema("next_auth")
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (nextAuthUser) {
        name = nextAuthUser.name || name;
        email = nextAuthUser.email || email;
        image = nextAuthUser.image || image;
      }
    } catch (e) {
      console.warn("Could not query next_auth.users in ensurePublicUser:", e);
    }

    // 3. Upsert into public.users
    const { error: insertErr } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: userId,
          name: name || "Usuario",
          email: email || `${userId}@local.host`,
          image: image || null,
        } as any,
        { onConflict: "id" }
      );

    if (insertErr) {
      console.warn("Could not insert user into public.users in ensurePublicUser:", insertErr);
    }
  } catch (err) {
    console.error("ensurePublicUser error:", err);
  }
}

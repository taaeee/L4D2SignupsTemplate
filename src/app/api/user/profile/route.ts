import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { name, email } = body;

    const updates: { name?: string; email?: string } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return NextResponse.json(
          { error: "El nombre debe tener al menos 2 caracteres." },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.includes("@")) {
        return NextResponse.json(
          { error: "Proporciona un correo electrónico válido." },
          { status: 400 }
        );
      }

      const cleanEmail = email.toLowerCase().trim();

      // Check if email belongs to another user in next_auth or public schemas
      const { data: existingNextAuth } = await supabaseAdmin
        .schema("next_auth")
        .from("users")
        .select("id")
        .eq("email", cleanEmail)
        .neq("id", userId)
        .maybeSingle();

      if (existingNextAuth) {
        return NextResponse.json(
          { error: "El correo electrónico ya está en uso por otra cuenta." },
          { status: 400 }
        );
      }

      const { data: existingPublic } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", cleanEmail)
        .neq("id", userId)
        .maybeSingle();

      if (existingPublic) {
        return NextResponse.json(
          { error: "El correo electrónico ya está en uso por otra cuenta." },
          { status: 400 }
        );
      }

      updates.email = cleanEmail;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No se enviaron datos para actualizar." },
        { status: 400 }
      );
    }

    // Update in next_auth.users schema
    try {
      await supabaseAdmin
        .schema("next_auth")
        .from("users")
        .update(updates as any)
        .eq("id", userId);
    } catch (e) {
      console.warn("Could not update next_auth.users:", e);
    }

    // Update in public.users schema
    try {
      await supabaseAdmin
        .from("users")
        .update(updates as any)
        .eq("id", userId);
    } catch (e) {
      console.warn("Could not update public.users:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado correctamente.",
      user: {
        name: updates.name || session.user.name,
        email: updates.email || session.user.email,
      },
    });
  } catch (error: any) {
    console.error("Update profile API error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al actualizar el perfil." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Delete caster dependencies
    try {
      const { data: caster } = await supabaseAdmin
        .from("casters")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (caster?.id) {
        await supabaseAdmin.from("match_casters").delete().eq("caster_id", caster.id);
      }

      await supabaseAdmin.from("tournament_casters").delete().eq("user_id", userId);
      await supabaseAdmin.from("caster_applications").delete().eq("user_id", userId);
      await supabaseAdmin.from("casters").delete().eq("user_id", userId);
    } catch (e) {
      console.warn("Error cleaning up caster records:", e);
    }

    // 2. Delete next_auth sessions and accounts
    try {
      await supabaseAdmin.schema("next_auth").from("sessions").delete().eq("userId", userId);
      await supabaseAdmin.schema("next_auth").from("accounts").delete().eq("userId", userId);
    } catch (e) {
      console.warn("Error cleaning up next_auth sessions/accounts:", e);
    }

    // 4. Delete user records from next_auth and public schemas
    try {
      await supabaseAdmin.schema("next_auth").from("users").delete().eq("id", userId);
    } catch (e) {
      console.warn("Error deleting next_auth.users:", e);
    }

    try {
      await supabaseAdmin.from("users").delete().eq("id", userId);
    } catch (e) {
      console.warn("Error deleting public.users:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Tu cuenta ha sido eliminada exitosamente.",
    });
  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al eliminar tu cuenta." },
      { status: 500 }
    );
  }
}


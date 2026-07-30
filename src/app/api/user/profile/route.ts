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

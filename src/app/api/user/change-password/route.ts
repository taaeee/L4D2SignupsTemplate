import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Las contraseñas no coinciden." },
        { status: 400 }
      );
    }

    // Fetch existing user password hash
    let userRecord: any = null;

    try {
      const { data: nextAuthUser } = await supabaseAdmin
        .schema("next_auth")
        .from("users")
        .select("password_hash")
        .eq("id", userId)
        .maybeSingle();

      if (nextAuthUser) {
        userRecord = nextAuthUser;
      }
    } catch (e) {
      console.warn("Error querying next_auth.users:", e);
    }

    if (!userRecord) {
      try {
        const { data: publicUser } = await supabaseAdmin
          .from("users")
          .select("password_hash")
          .eq("id", userId)
          .maybeSingle();

        if (publicUser) {
          userRecord = publicUser;
        }
      } catch (e) {
        console.warn("Error querying public.users:", e);
      }
    }

    // If user already has a password_hash, require & verify currentPassword
    if (userRecord?.password_hash) {
      if (!currentPassword || typeof currentPassword !== "string") {
        return NextResponse.json(
          { error: "Debes ingresar tu contraseña actual." },
          { status: 400 }
        );
      }

      const isValidCurrent = await bcrypt.compare(
        currentPassword,
        userRecord.password_hash
      );

      if (!isValidCurrent) {
        return NextResponse.json(
          { error: "La contraseña actual es incorrecta." },
          { status: 400 }
        );
      }
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update in next_auth.users
    try {
      await supabaseAdmin
        .schema("next_auth")
        .from("users")
        .update({ password_hash: newPasswordHash } as any)
        .eq("id", userId);
    } catch (e) {
      console.warn("Could not update password_hash in next_auth.users:", e);
    }

    // Update in public.users
    try {
      await supabaseAdmin
        .from("users")
        .update({ password_hash: newPasswordHash } as any)
        .eq("id", userId);
    } catch (e) {
      console.warn("Could not update password_hash in public.users:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada correctamente.",
    });
  } catch (error: any) {
    console.error("Change password API error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al cambiar la contraseña." },
      { status: 500 }
    );
  }
}

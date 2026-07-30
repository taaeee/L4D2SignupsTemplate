import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, email, newPassword, confirmPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token de restauración no válido." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Correo electrónico no válido." },
        { status: 400 }
      );
    }

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

    const cleanEmail = email.toLowerCase().trim();

    // Verify token in next_auth.verification_tokens or public.verification_tokens
    let validToken: any = null;

    try {
      const { data: nextAuthToken } = await supabaseAdmin
        .schema("next_auth")
        .from("verification_tokens")
        .select("*")
        .eq("token", token)
        .eq("identifier", cleanEmail)
        .maybeSingle();

      if (nextAuthToken) validToken = nextAuthToken;
    } catch (e) {}

    if (!validToken) {
      try {
        const { data: publicToken } = await supabaseAdmin
          .from("verification_tokens")
          .select("*")
          .eq("token", token)
          .eq("identifier", cleanEmail)
          .maybeSingle();

        if (publicToken) validToken = publicToken;
      } catch (e) {}
    }

    if (!validToken) {
      return NextResponse.json(
        { error: "El token de recuperación es inválido o no existe." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(validToken.expires).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "El token de recuperación ha expirado. Por favor solicita uno nuevo." },
        { status: 400 }
      );
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password_hash in next_auth.users and public.users
    try {
      await supabaseAdmin
        .schema("next_auth")
        .from("users")
        .update({ password_hash: newPasswordHash } as any)
        .eq("email", cleanEmail);
    } catch (e) {
      console.warn("Could not update next_auth.users:", e);
    }

    try {
      await supabaseAdmin
        .from("users")
        .update({ password_hash: newPasswordHash } as any)
        .eq("email", cleanEmail);
    } catch (e) {
      console.warn("Could not update public.users:", e);
    }

    // Delete used verification token
    try {
      await supabaseAdmin
        .schema("next_auth")
        .from("verification_tokens")
        .delete()
        .eq("token", token);
    } catch (e) {}

    try {
      await supabaseAdmin
        .from("verification_tokens")
        .delete()
        .eq("token", token);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: "Tu contraseña ha sido restablecida con éxito.",
    });
  } catch (error: any) {
    console.error("Confirm reset password API error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al restablecer la contraseña." },
      { status: 500 }
    );
  }
}

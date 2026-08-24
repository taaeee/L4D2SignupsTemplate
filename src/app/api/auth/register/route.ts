import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

// Rate limiter: 5 registration requests per 15 minutes per IP
const registerLimiter = rateLimit({
  interval: 15 * 60 * 1000,
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { success, reset } = registerLimiter.check(5, `register_${ip}`);
    if (!success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return rateLimitExceededResponse(
        "Demasiados intentos de registro desde esta conexión. Por favor, intenta de nuevo en unos minutos.",
        retryAfterSeconds
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "El nombre debe tener al menos 2 caracteres." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Proporciona un correo electrónico válido." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    // Check if user exists in next_auth.users or public.users
    const { data: existingNextAuthUser } = await supabaseAdmin
      .schema("next_auth")
      .from("users")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingNextAuthUser) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado." },
        { status: 400 }
      );
    }

    const { data: existingPublicUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingPublicUser) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado." },
        { status: 400 }
      );
    }

    // Hash the password with bcrypt (salt factor 12)
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();

    // Insert user into next_auth.users schema first
    const { error: nextAuthErr } = await supabaseAdmin
      .schema("next_auth")
      .from("users")
      .insert({
        id: userId,
        name: cleanName,
        email: cleanEmail,
        password_hash: passwordHash,
      } as any);

    if (nextAuthErr) {
      console.warn("Failed to insert into next_auth.users, trying public.users:", nextAuthErr.message);
      const { error: publicErr } = await supabaseAdmin
        .from("users")
        .insert({
          id: userId,
          name: cleanName,
          email: cleanEmail,
          password_hash: passwordHash,
        } as any);

      if (publicErr) {
        console.error("Failed to insert user into public.users:", publicErr);
        return NextResponse.json(
          { error: "No se pudo registrar el usuario en la base de datos." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: "Usuario creado exitosamente." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al registrar el usuario." },
      { status: 500 }
    );
  }
}

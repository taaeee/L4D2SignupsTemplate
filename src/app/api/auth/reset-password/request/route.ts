import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import nodemailer from "nodemailer";

async function sendResetEmail(toEmail: string, resetUrl: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Soporte L4D2 Torneos" <noreply@l4d2tournaments.com>`;

  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #111827; color: #f3f4f6; padding: 2rem; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6; text-align: center; margin-bottom: 1.5rem;">Restablecimiento de Contraseña</h2>
        <p style="font-size: 1rem; line-height: 1.5;">Hola,</p>
        <p style="font-size: 1rem; line-height: 1.5;">Hemos recibido una solicitud para restablecer la contraseña asociada a esta cuenta de correo (<strong>${toEmail}</strong>).</p>
        <p style="font-size: 1rem; line-height: 1.5;">Haz clic en el siguiente botón para definir una nueva contraseña. Este enlace expira en 1 hora:</p>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 0.8rem 1.5rem; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Restablecer Contraseña</a>
        </div>
        <p style="font-size: 0.875rem; color: #9ca3af;">Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
        <hr style="border: none; border-top: 1px solid #374151; margin: 2rem 0;" />
        <p style="font-size: 0.75rem; color: #6b7280; text-align: center;">Plataforma de Torneos L4D2</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: "Recuperación de contraseña - Torneos L4D2",
      html: htmlContent,
    });

    console.log(`[EMAIL SENT] Password reset email sent to ${toEmail}`);
    
    // If using Ethereal test account, print preview URL to server console
    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log(`\n======================================================`);
      console.log(`[ETHEREAL INBOX PREVIEW] View email online:`);
      console.log(testUrl);
      console.log(`======================================================\n`);
    }
  } else {
    // Console log strictly on server for local dev environment when SMTP is unconfigured
    console.warn(`\n======================================================`);
    console.warn(`[DEV ONLY SERVER LOG] SMTP not configured.`);
    console.warn(`[DEV ONLY SERVER LOG] Reset link for ${toEmail}:`);
    console.warn(`${resetUrl}`);
    console.warn(`======================================================\n`);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Proporciona un correo electrónico válido." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists in database
    let userExists = false;

    try {
      const { data: nextAuthUser } = await supabaseAdmin
        .schema("next_auth")
        .from("users")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (nextAuthUser) userExists = true;
    } catch (e) {}

    if (!userExists) {
      try {
        const { data: publicUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (publicUser) userExists = true;
      } catch (e) {}
    }

    // Standardized response to prevent user enumeration attacks
    const standardSuccessResponse = NextResponse.json({
      success: true,
      message: "Si el correo está registrado en nuestro sistema, recibirás un mensaje con las instrucciones para restablecer tu contraseña. Por favor revisa tu bandeja de entrada o carpeta de spam.",
    });

    if (!userExists) {
      return standardSuccessResponse;
    }

    // Generate secure reset token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiration

    // Store token in verification_tokens table
    try {
      await supabaseAdmin
        .schema("next_auth")
        .from("verification_tokens")
        .insert({
          identifier: cleanEmail,
          token: token,
          expires: expiresAt,
        } as any);
    } catch (e) {
      try {
        await supabaseAdmin
          .from("verification_tokens")
          .insert({
            identifier: cleanEmail,
            token: token,
            expires: expiresAt,
          } as any);
      } catch (e2) {
        console.error("Failed to store reset token in database:", e2);
      }
    }

    // Construct reset URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(cleanEmail)}`;

    // Dispatch email asynchronously
    sendResetEmail(cleanEmail, resetUrl).catch((err) => {
      console.error("Error sending reset email:", err);
    });

    // NOTE: resetUrl is NEVER returned in the HTTP response to the client browser!
    return standardSuccessResponse;
  } catch (error: any) {
    console.error("Reset password request API error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al procesar la solicitud." },
      { status: 500 }
    );
  }
}

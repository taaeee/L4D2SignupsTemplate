import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ application: null, isCaster: false });
    }

    // Check existing application
    const { data: application, error: appError } = await supabaseAdmin
      .from("caster_applications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (appError && appError.code !== "PGRST116") {
      console.error("Error fetching caster application:", appError);
    }

    // Check if user has an active caster profile
    const { data: caster, error: casterError } = await supabaseAdmin
      .from("casters")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    return NextResponse.json({
      application: application || null,
      caster: caster || null,
      isCaster: application?.status === "approved" || !!caster,
    });
  } catch (error: any) {
    console.error("Caster apply GET error:", error);
    return NextResponse.json({ application: null, isCaster: false });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para postularte como caster." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { alias, bio, twitch_channel, youtube_channel, languages } = body;

    if (!alias || alias.trim().length < 2) {
      return NextResponse.json(
        { error: "El alias o nombre de caster es obligatorio (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }

    if (!twitch_channel || twitch_channel.trim().length < 2) {
      return NextResponse.json(
        { error: "Debes indicar tu canal o usuario de Twitch." },
        { status: 400 }
      );
    }

    // Normalize twitch channel
    let cleanTwitch = twitch_channel.trim();
    if (cleanTwitch.startsWith("http://") || cleanTwitch.startsWith("https://")) {
      const urlParts = cleanTwitch.split("/").filter(Boolean);
      cleanTwitch = urlParts[urlParts.length - 1] || cleanTwitch;
    }

    // Check if there is already an existing application
    const { data: existingApp } = await supabaseAdmin
      .from("caster_applications")
      .select("id, status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (existingApp) {
      if (existingApp.status === "approved") {
        return NextResponse.json(
          { error: "Ya eres un Caster Oficial registrado." },
          { status: 400 }
        );
      }

      // Update existing application
      const { data, error } = await supabaseAdmin
        .from("caster_applications")
        .update({
          alias: alias.trim(),
          bio: bio?.trim() || null,
          twitch_channel: cleanTwitch,
          youtube_channel: youtube_channel?.trim() || null,
          languages: Array.isArray(languages) && languages.length > 0 ? languages : ["Español"],
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingApp.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating application:", error);
        return NextResponse.json(
          { error: "Error al actualizar la solicitud de caster." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Tu solicitud de caster ha sido enviada para revisión.",
        application: data,
      });
    }

    // Insert new application
    const { data, error } = await supabaseAdmin
      .from("caster_applications")
      .insert({
        user_id: session.user.id,
        alias: alias.trim(),
        bio: bio?.trim() || null,
        twitch_channel: cleanTwitch,
        youtube_channel: youtube_channel?.trim() || null,
        languages: Array.isArray(languages) && languages.length > 0 ? languages : ["Español"],
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating caster application:", error);
      return NextResponse.json(
        { error: "Error al guardar la solicitud de caster." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tu solicitud de caster ha sido enviada para revisión.",
      application: data,
    });
  } catch (error: any) {
    console.error("Caster apply POST error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar la solicitud." },
      { status: 500 }
    );
  }
}

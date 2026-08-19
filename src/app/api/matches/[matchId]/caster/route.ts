import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensurePublicUser } from "@/lib/ensure-user";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para asignar una transmisión." },
        { status: 401 }
      );
    }

    const { matchId } = await params;
    const body = await request.json();
    const { streamUrl } = body;

    // Check if current user is an approved caster or organizer
    let { data: caster } = await supabaseAdmin
      .from("casters")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    let casterId = caster?.id;
    let defaultStream =
      (caster?.kick_channel ? (caster.kick_channel.startsWith("http") ? caster.kick_channel : `https://kick.com/${caster.kick_channel}`) : "") ||
      (caster?.youtube_channel || "") ||
      (caster?.twitch_channel ? (caster.twitch_channel.startsWith("http") ? caster.twitch_channel : `https://twitch.tv/${caster.twitch_channel}`) : "") ||
      "";

    if (!caster) {
      // Fallback check in caster_applications
      const { data: app } = await supabaseAdmin
        .from("caster_applications")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "approved")
        .maybeSingle();

      if (!app) {
        return NextResponse.json(
          { error: "Solo los Casters Oficiales aprobados pueden castear matches." },
          { status: 403 }
        );
      }

      // Auto create caster record from app
      await ensurePublicUser(app.user_id);

      const { data: newCaster } = await supabaseAdmin
        .from("casters")
        .upsert(
          {
            user_id: app.user_id,
            alias: app.alias,
            bio: app.bio,
            twitch_channel: app.twitch_channel,
            kick_channel: app.kick_channel,
            youtube_channel: app.youtube_channel,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      casterId = newCaster?.id || app.id;
      defaultStream =
        (newCaster?.kick_channel ? (newCaster.kick_channel.startsWith("http") ? newCaster.kick_channel : `https://kick.com/${newCaster.kick_channel}`) : "") ||
        newCaster?.youtube_channel ||
        (newCaster?.twitch_channel ? (newCaster.twitch_channel.startsWith("http") ? newCaster.twitch_channel : `https://twitch.tv/${newCaster.twitch_channel}`) : "") ||
        (app.kick_channel ? (app.kick_channel.startsWith("http") ? app.kick_channel : `https://kick.com/${app.kick_channel}`) : "") ||
        app.youtube_channel ||
        (app.twitch_channel ? (app.twitch_channel.startsWith("http") ? app.twitch_channel : `https://twitch.tv/${app.twitch_channel}`) : "") ||
        "";
    }

    if (!casterId) {
      return NextResponse.json(
        { error: "No se pudo identificar el perfil de caster." },
        { status: 400 }
      );
    }

    const cleanStream = streamUrl || defaultStream;

    // Insert or update match_casters
    const { data, error } = await supabaseAdmin
      .from("match_casters")
      .upsert(
        {
          match_id: matchId,
          caster_id: casterId,
          stream_url: cleanStream,
          is_primary: true,
          created_at: new Date().toISOString(),
        },
        { onConflict: "match_id,caster_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error assigning caster to match:", error);
      return NextResponse.json(
        { error: "No se pudo asignar la transmisión al match." },
        { status: 500 }
      );
    }

    // If startStreamNow is true, set match status to in_progress
    const { startStreamNow } = body;
    if (startStreamNow) {
      await supabaseAdmin
        .from("matches")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", matchId);
    }

    return NextResponse.json({
      success: true,
      message: startStreamNow
        ? "Transmisión asignada y partido iniciado EN VIVO."
        : "Transmisión vinculada al match exitosamente.",
      matchCaster: data,
    });
  } catch (error: any) {
    console.error("Match caster POST error:", error);
    return NextResponse.json(
      { error: "Error del servidor al asignar caster." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { matchId } = await params;

    // Find caster id
    const { data: caster } = await supabaseAdmin
      .from("casters")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!caster) {
      return NextResponse.json(
        { error: "Perfil de caster no encontrado." },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from("match_casters")
      .delete()
      .eq("match_id", matchId)
      .eq("caster_id", caster.id);

    if (error) {
      console.error("Error unlinking caster from match:", error);
      return NextResponse.json(
        { error: "No se pudo desvincular la transmisión." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transmisión desvinculada del match.",
    });
  } catch (error: any) {
    console.error("Match caster DELETE error:", error);
    return NextResponse.json(
      { error: "Error interno al desvincular caster." },
      { status: 500 }
    );
  }
}

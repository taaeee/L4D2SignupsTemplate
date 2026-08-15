import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const session = await getServerSession(getAuthOptions(request));

    // 1. Fetch tournament details to check permissions
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("creator_id, moderators")
      .eq("id", tournamentId)
      .single();

    const isCreator = session?.user?.id && tournament?.creator_id === session.user.id;
    const isModerator =
      session?.user?.id &&
      Array.isArray(tournament?.moderators) &&
      tournament.moderators.includes(session.user.id);
    const canManage = isCreator || isModerator;

    // 2. Fetch approved casters for this tournament
    const { data: approvedCasters, error: castersError } = await supabaseAdmin
      .from("tournament_casters")
      .select("*, users:users!tournament_casters_user_id_fkey(name, image)")
      .eq("tournament_id", tournamentId)
      .eq("status", "approved")
      .order("alias", { ascending: true });

    if (castersError) {
      console.error("Error fetching approved tournament casters:", castersError);
    }

    // 3. If manager, fetch all applications for this tournament
    let allApplications: any[] = [];
    if (canManage) {
      const { data: apps } = await supabaseAdmin
        .from("tournament_casters")
        .select("*, users:users!tournament_casters_user_id_fkey(name, email, image)")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

      allApplications = apps || [];
    }

    // 4. Fetch current user's application for this tournament
    let userApplication = null;
    if (session?.user?.id) {
      const { data: myApp } = await supabaseAdmin
        .from("tournament_casters")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      userApplication = myApp || null;
    }

    return NextResponse.json({
      casters: approvedCasters || [],
      applications: allApplications,
      userApplication,
      canManage: !!canManage,
    });
  } catch (error: any) {
    console.error("Tournament casters GET error:", error);
    return NextResponse.json({ casters: [], applications: [], userApplication: null, canManage: false });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const session = await getServerSession(getAuthOptions(request));

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para postularte como caster de este torneo." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { alias, bio, twitch_channel, youtube_channel, languages } = body;

    if (!alias || alias.trim().length < 2) {
      return NextResponse.json(
        { error: "El alias de caster es obligatorio (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }

    if (!twitch_channel || twitch_channel.trim().length < 2) {
      return NextResponse.json(
        { error: "Debes ingresar tu canal o usuario de Twitch." },
        { status: 400 }
      );
    }

    // Clean Twitch channel username
    let cleanTwitch = twitch_channel.trim();
    if (cleanTwitch.startsWith("http://") || cleanTwitch.startsWith("https://")) {
      const parts = cleanTwitch.split("/").filter(Boolean);
      cleanTwitch = parts[parts.length - 1] || cleanTwitch;
    }

    // Upsert tournament caster application
    const { data, error } = await supabaseAdmin
      .from("tournament_casters")
      .upsert(
        {
          tournament_id: tournamentId,
          user_id: session.user.id,
          alias: alias.trim(),
          bio: bio?.trim() || null,
          twitch_channel: cleanTwitch,
          youtube_channel: youtube_channel?.trim() || null,
          languages: Array.isArray(languages) && languages.length > 0 ? languages : ["Español"],
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tournament_id,user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error submitting tournament caster application:", error);
      return NextResponse.json(
        { error: "Error al enviar la postulación de caster para este torneo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tu solicitud para castear este torneo ha sido enviada con éxito.",
      application: data,
    });
  } catch (error: any) {
    console.error("Tournament casters POST error:", error);
    return NextResponse.json(
      { error: "Error interno al enviar la postulación." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const session = await getServerSession(getAuthOptions(request));

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Check manager permissions for this tournament
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("creator_id, moderators")
      .eq("id", tournamentId)
      .single();

    const isCreator = tournament?.creator_id === session.user.id;
    const isModerator =
      Array.isArray(tournament?.moderators) && tournament.moderators.includes(session.user.id);

    if (!isCreator && !isModerator) {
      return NextResponse.json(
        { error: "No tienes permisos de organizador en este torneo." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicationId, action, reviewerNotes } = body;

    if (!applicationId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Parámetros inválidos (applicationId y action son obligatorios)." },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    const { data, error } = await supabaseAdmin
      .from("tournament_casters")
      .update({
        status: newStatus,
        reviewer_notes: reviewerNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .eq("tournament_id", tournamentId)
      .select()
      .single();

    if (error || !data) {
      console.error("Error updating tournament caster application:", error);
      return NextResponse.json(
        { error: "No se pudo actualizar la solicitud del caster." },
        { status: 500 }
      );
    }

    // Also register or update in global casters table if approved
    if (newStatus === "approved") {
      try {
        await supabaseAdmin.from("casters").upsert(
          {
            user_id: data.user_id,
            alias: data.alias,
            bio: data.bio,
            twitch_channel: data.twitch_channel,
            youtube_channel: data.youtube_channel,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      } catch (e) {
        console.warn("Could not upsert global caster:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Caster aprobado para este torneo." : "Solicitud de caster rechazada.",
      application: data,
    });
  } catch (error: any) {
    console.error("Tournament casters PATCH error:", error);
    return NextResponse.json(
      { error: "Error interno al procesar la solicitud." },
      { status: 500 }
    );
  }
}

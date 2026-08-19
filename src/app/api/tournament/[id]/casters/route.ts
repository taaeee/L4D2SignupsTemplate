import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensurePublicUser } from "@/lib/ensure-user";
import { enrichCasterProfile, enrichCasterList, getUserStreamingChannels } from "@/lib/caster-enrichment";

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
    let approvedCasters: any[] = [];
    const { data: castersData, error: castersError } = await supabaseAdmin
      .from("tournament_casters")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("status", "approved")
      .order("alias", { ascending: true });

    if (castersError) {
      console.error("Error fetching approved tournament casters:", castersError);
    } else {
      approvedCasters = castersData || [];
    }

    // 3. If manager, fetch all applications for this tournament
    let allApplications: any[] = [];
    if (canManage) {
      const { data: appsData, error: appsError } = await supabaseAdmin
        .from("tournament_casters")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

      if (appsError) {
        console.error("Error fetching tournament caster applications:", appsError);
      } else {
        allApplications = appsData || [];
      }
    }

    // Enrich casters & applications with streaming accounts
    approvedCasters = await enrichCasterList(approvedCasters);
    allApplications = await enrichCasterList(allApplications);

    // Enrich with user names/emails/avatars
    const userIdsToFetch = Array.from(
      new Set([
        ...approvedCasters.map((c) => c.user_id),
        ...allApplications.map((a) => a.user_id),
      ].filter(Boolean))
    );

    if (userIdsToFetch.length > 0) {
      try {
        const { data: usersData } = await supabaseAdmin
          .from("users")
          .select("id, name, email, image")
          .in("id", userIdsToFetch);

        const userMap = new Map((usersData || []).map((u) => [u.id, u]));

        approvedCasters = approvedCasters.map((c) => ({
          ...c,
          users: userMap.get(c.user_id) || { name: c.alias, email: "", image: null },
        }));

        allApplications = allApplications.map((a) => ({
          ...a,
          users: userMap.get(a.user_id) || { name: a.alias, email: "", image: null },
        }));
      } catch (e) {
        console.warn("Could not enrich user profiles for tournament casters:", e);
      }
    }

    // 4. Fetch current user's application for this tournament and check global caster status
    let userApplication = null;
    let isGlobalCaster = false;
    let globalCasterProfile = null;

    if (session?.user?.id) {
      const { data: myApp } = await supabaseAdmin
        .from("tournament_casters")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (myApp) {
        userApplication = await enrichCasterProfile(myApp);
      }

      const { data: gCaster } = await supabaseAdmin
        .from("casters")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (gCaster) {
        isGlobalCaster = true;
        globalCasterProfile = await enrichCasterProfile(gCaster);
      }
    }

    return NextResponse.json({
      casters: approvedCasters || [],
      applications: allApplications,
      userApplication,
      canManage: !!canManage,
      isGlobalCaster,
      globalCasterProfile,
    });
  } catch (error: any) {
    console.error("Tournament casters GET error:", error);
    return NextResponse.json({
      casters: [],
      applications: [],
      userApplication: null,
      canManage: false,
      isGlobalCaster: false,
      globalCasterProfile: null,
    });
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

    // 1. Verify that user has the global Caster role
    let { data: globalCaster } = await supabaseAdmin
      .from("casters")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!globalCaster) {
      return NextResponse.json(
        {
          error: "Debes ser un Caster Oficial registrado primero para poder postularte a un torneo. Postúlate primero desde Ajustes > Caster Oficial.",
          requiresGlobalCaster: true,
        },
        { status: 403 }
      );
    }

    // Enrich global caster with linked accounts
    globalCaster = await enrichCasterProfile(globalCaster);

    // 2. Parse body or fallback to global caster profile data
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // Also get any verified streaming channels
    const userChannels = await getUserStreamingChannels(session.user.id);

    const alias = (body.alias?.trim() || globalCaster.alias || session.user.name || "Caster").trim();
    let cleanTwitch = (body.twitch_channel?.trim() || globalCaster.twitch_channel || userChannels.twitch_channel || "").trim();
    if (cleanTwitch.startsWith("http://") || cleanTwitch.startsWith("https://")) {
      const parts = cleanTwitch.split("/").filter(Boolean);
      cleanTwitch = parts[parts.length - 1] || cleanTwitch;
    }

    const kick = body.kick_channel !== undefined ? body.kick_channel?.trim() || null : globalCaster.kick_channel || userChannels.kick_channel || null;
    const youtube = body.youtube_channel !== undefined ? body.youtube_channel?.trim() || null : globalCaster.youtube_channel || userChannels.youtube_channel || null;
    const bio = body.bio !== undefined ? body.bio?.trim() || null : globalCaster.bio || null;
    const languages = Array.isArray(body.languages) && body.languages.length > 0 ? body.languages : ["Español"];

    if (!alias || alias.length < 2) {
      return NextResponse.json(
        { error: "El alias de caster es obligatorio (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }

    if (!cleanTwitch && !kick && !youtube) {
      return NextResponse.json(
        { error: "Debes tener configurado al menos un canal de streaming (Twitch, Kick o YouTube)." },
        { status: 400 }
      );
    }

    // Ensure user exists in public.users to avoid foreign key errors
    await ensurePublicUser(session.user.id, session.user);

    // Check if user is tournament creator / moderator (auto-approve if creator)
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("creator_id")
      .eq("id", tournamentId)
      .single();

    const isCreator = tournament?.creator_id === session.user.id;
    const initialStatus = isCreator ? "approved" : "pending";

    // Upsert tournament caster application
    const upsertData: any = {
      tournament_id: tournamentId,
      user_id: session.user.id,
      alias,
      bio,
      twitch_channel: cleanTwitch,
      kick_channel: kick,
      youtube_channel: youtube,
      languages,
      status: initialStatus,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabaseAdmin
      .from("tournament_casters")
      .upsert(upsertData, { onConflict: "tournament_id,user_id" })
      .select()
      .single();

    if (error && error.message?.includes("kick_channel")) {
      delete upsertData.kick_channel;
      const retry = await supabaseAdmin
        .from("tournament_casters")
        .upsert(upsertData, { onConflict: "tournament_id,user_id" })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Error submitting tournament caster application:", error);
      return NextResponse.json(
        { error: "Error al enviar la postulación de caster para este torneo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isCreator
        ? "Te has registrado como Caster Oficial de tu torneo."
        : "Tu postulación para castear este torneo ha sido enviada con éxito.",
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

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensurePublicUser } from "@/lib/ensure-user";
import { getTwitchUserById } from "@/lib/twitch";
import { getKickUserById } from "@/lib/kick";
import { validateAndResolveYoutubeChannel, formatYoutubeChannel } from "@/lib/youtube";
import { enrichCasterProfile } from "@/lib/caster-enrichment";
import { normalizeLanguages } from "@/lib/language-helper";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({
        application: null,
        caster: null,
        isCaster: false,
        hasStreamingLinked: false,
        hasTwitchLinked: false,
        hasKickLinked: false,
        hasGoogleLinked: false,
        primaryPlatform: "twitch",
      });
    }

    // 1. Fetch application, caster, and linked accounts in parallel
    const [appRes, casterRes, accountsRes] = await Promise.all([
      supabaseAdmin
        .from("caster_applications")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("casters")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      supabaseAdmin
        .schema("next_auth")
        .from("accounts")
        .select("provider, providerAccountId")
        .eq("userId", session.user.id),
    ]);

    let application = appRes.data;
    let caster = casterRes.data;
    const userAccounts = accountsRes.data || [];

    // If caster record is missing from public.casters but application was previously approved, ensure public.casters row exists!
    if (!caster && application?.status === "approved") {
      const initCaster = {
        user_id: session.user.id,
        alias: application.alias,
        bio: application.bio || null,
        twitch_channel: application.twitch_channel || null,
        youtube_channel: application.youtube_channel || null,
        updated_at: new Date().toISOString(),
      };
      const { data: backfilled } = await supabaseAdmin
        .from("casters")
        .upsert(initCaster, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (backfilled) caster = backfilled;
    }

    const twitchAccount = userAccounts.find((a) => a.provider === "twitch");
    const kickAccount = userAccounts.find((a) => a.provider === "kick");
    const googleAccount = userAccounts.find((a) => a.provider === "google");

    let verifiedTwitchChannel: string | null = caster?.twitch_channel || application?.twitch_channel || null;
    let verifiedTwitchAlias: string | null = caster?.alias || application?.alias || null;
    let verifiedKickChannel: string | null = (caster as any)?.kick_channel || (application as any)?.kick_channel || null;
    let verifiedKickAlias: string | null = caster?.alias || application?.alias || null;

    // Only query external APIs if channels are not yet in DB
    const externalLookups: Promise<void>[] = [];

    if (twitchAccount?.providerAccountId && (!verifiedTwitchChannel || !verifiedTwitchAlias)) {
      externalLookups.push(
        getTwitchUserById(twitchAccount.providerAccountId)
          .then((twitchUser) => {
            if (twitchUser?.login) {
              verifiedTwitchChannel = twitchUser.login;
              verifiedTwitchAlias = twitchUser.display_name || twitchUser.login;
            }
          })
          .catch((e) => console.warn("Could not verify twitch user in GET:", e))
      );
    }

    if (kickAccount?.providerAccountId && (!verifiedKickChannel || !verifiedKickAlias)) {
      externalLookups.push(
        getKickUserById(kickAccount.providerAccountId)
          .then((kickUser) => {
            if (kickUser?.name) {
              verifiedKickChannel = kickUser.name;
              verifiedKickAlias = kickUser.name;
            }
          })
          .catch((e) => console.warn("Could not verify kick user in GET:", e))
      );
    }

    if (externalLookups.length > 0) {
      await Promise.all(externalLookups);
    }

    if (application) {
      application.twitch_channel = application.twitch_channel || verifiedTwitchChannel;
      application.kick_channel = (application as any).kick_channel || verifiedKickChannel;
      application.languages = normalizeLanguages(application.languages);
    }
    if (caster) {
      caster.twitch_channel = caster.twitch_channel || verifiedTwitchChannel;
      (caster as any).kick_channel = (caster as any).kick_channel || verifiedKickChannel;
      (caster as any).languages = normalizeLanguages((caster as any).languages || application?.languages);
    }

    const hasTwitchLinked = !!twitchAccount;
    const hasKickLinked = !!kickAccount;
    const hasGoogleLinked = !!googleAccount;
    const hasStreamingLinked = hasTwitchLinked || hasKickLinked || hasGoogleLinked;

    // Determine primary platform (Twitch, Kick or YouTube)
    let primaryPlatform: "twitch" | "kick" | "youtube" = "twitch";
    if (hasTwitchLinked) {
      primaryPlatform = "twitch";
    } else if (hasKickLinked) {
      primaryPlatform = "kick";
    } else if (hasGoogleLinked) {
      primaryPlatform = "youtube";
    }

    const isCaster = Boolean(caster || application?.status === "approved");
    const hasPendingEdit = isCaster && application?.status === "pending";
    const hasPendingApplication = !isCaster && application?.status === "pending";
    const hasRejectedApplication = !isCaster && application?.status === "rejected";
    const rejectedEditNotes = isCaster && !hasPendingEdit && application?.reviewer_notes ? application.reviewer_notes : null;
    const rejectedAppNotes = hasRejectedApplication ? application?.reviewer_notes : null;

    return NextResponse.json({
      application: application || null,
      caster: caster || null,
      isCaster,
      hasPendingEdit,
      hasPendingApplication,
      hasRejectedApplication,
      rejectedEditNotes,
      rejectedAppNotes,
      hasStreamingLinked,
      hasTwitchLinked,
      hasKickLinked,
      hasGoogleLinked,
      primaryPlatform,
      verifiedTwitchChannel,
      verifiedTwitchAlias,
      verifiedKickChannel,
      verifiedKickAlias,
      verifiedGoogleAlias: session.user.name || "Google User",
    });
  } catch (error: any) {
    console.error("Caster apply GET error:", error);
    return NextResponse.json({
      application: null,
      caster: null,
      isCaster: false,
      hasStreamingLinked: false,
      hasTwitchLinked: false,
      hasKickLinked: false,
      hasGoogleLinked: false,
      primaryPlatform: "twitch",
    });
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

    // Check linked accounts in next_auth.accounts
    const { data: accounts } = await supabaseAdmin
      .schema("next_auth")
      .from("accounts")
      .select("provider, providerAccountId")
      .eq("userId", session.user.id);

    const userAccounts = accounts || [];
    const twitchAccount = userAccounts.find((a) => a.provider === "twitch");
    const kickAccount = userAccounts.find((a) => a.provider === "kick");
    const googleAccount = userAccounts.find((a) => a.provider === "google");

    const hasTwitchLinked = !!twitchAccount;
    const hasKickLinked = !!kickAccount;
    const hasGoogleLinked = !!googleAccount;

    if (!hasTwitchLinked && !hasKickLinked && !hasGoogleLinked) {
      return NextResponse.json(
        { error: "Debes autenticar y vincular al menos una cuenta (Twitch, Kick o Google) para postularte como caster." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { bio, languages, primary_platform, youtube_channel } = body;

    let chosenPlatform: "twitch" | "kick" | "youtube" = "twitch";
    if (primary_platform === "kick" && hasKickLinked) {
      chosenPlatform = "kick";
    } else if (primary_platform === "youtube" && hasGoogleLinked) {
      chosenPlatform = "youtube";
    } else if (hasTwitchLinked) {
      chosenPlatform = "twitch";
    } else if (hasKickLinked) {
      chosenPlatform = "kick";
    } else {
      chosenPlatform = "youtube";
    }

    let finalAlias = body.alias?.trim() || "";
    let finalTwitch: string | null = body.twitch_channel?.trim() || null;
    if (finalTwitch) {
      if (finalTwitch.startsWith("http://") || finalTwitch.startsWith("https://")) {
        const parts = finalTwitch.split("/").filter(Boolean);
        finalTwitch = parts[parts.length - 1] || finalTwitch;
      }
    }
    let finalKick: string | null = body.kick_channel?.trim() || null;
    if (finalKick) {
      if (finalKick.startsWith("http://") || finalKick.startsWith("https://")) {
        const parts = finalKick.split("/").filter(Boolean);
        finalKick = parts[parts.length - 1] || finalKick;
      }
    }
    let finalYoutube: string | null = null;

    if (hasTwitchLinked && twitchAccount?.providerAccountId) {
      try {
        const twitchUser = await getTwitchUserById(twitchAccount.providerAccountId);
        if (twitchUser?.login) {
          if (!finalTwitch) finalTwitch = twitchUser.login;
          if (!finalAlias && chosenPlatform === "twitch") {
            finalAlias = twitchUser.display_name || twitchUser.login;
          }
        }
      } catch (e) {
        console.error("Error resolving Twitch user in POST:", e);
      }
    }

    if (hasKickLinked && kickAccount?.providerAccountId) {
      try {
        const kickUser = await getKickUserById(kickAccount.providerAccountId);
        if (kickUser?.name) {
          if (!finalKick) finalKick = kickUser.name;
          if (!finalAlias && chosenPlatform === "kick") {
            finalAlias = kickUser.name;
          }
        }
      } catch (e) {
        console.error("Error resolving Kick user in POST:", e);
      }
    }

    if (youtube_channel?.trim()) {
      try {
        const resolvedYt = await validateAndResolveYoutubeChannel(youtube_channel.trim());
        if (resolvedYt?.url) {
          finalYoutube = resolvedYt.url;
        }
      } catch (e) {
        console.warn("Could not resolve YouTube channel in POST:", e);
        finalYoutube = formatYoutubeChannel(youtube_channel.trim());
      }
    }

    if (!finalAlias && chosenPlatform === "youtube") {
      finalAlias = session.user.name || "Google User";
    }

    if (!finalAlias) {
      finalAlias = session.user.name || "Caster";
    }

    if (!finalAlias || finalAlias.length < 2) {
      return NextResponse.json(
        { error: "Debes ingresar un alias de caster válido (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }

    if (!finalTwitch && !finalKick && !finalYoutube) {
      return NextResponse.json(
        { error: "Debes configurar al menos un canal de streaming (Twitch, Kick o YouTube)." },
        { status: 400 }
      );
    }

    // Ensure user exists in public.users to satisfy foreign keys
    await ensurePublicUser(session.user.id, session.user);

    // 1. Check if user is already an active caster
    let { data: existingCaster } = await supabaseAdmin
      .from("casters")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    // 2. Check if there is already an existing application
    const { data: existingApp } = await supabaseAdmin
      .from("caster_applications")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    // If user was previously an approved caster, ensure public.casters has their current active record!
    const isAlreadyCaster = !!existingCaster || existingApp?.status === "approved";
    if (isAlreadyCaster && !existingCaster && existingApp) {
      const initCaster = {
        user_id: session.user.id,
        alias: existingApp.alias,
        bio: existingApp.bio || null,
        twitch_channel: existingApp.twitch_channel || null,
        youtube_channel: existingApp.youtube_channel || null,
        updated_at: new Date().toISOString(),
      };
      const { data: created } = await supabaseAdmin
        .from("casters")
        .upsert(initCaster, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (created) existingCaster = created;
    }

    const isEdit = !!existingCaster;

    if (existingApp) {
      const normalizedLangs = normalizeLanguages(languages);
      // Update existing application with new data and set to pending for admin review
      const updateData: any = {
        alias: finalAlias,
        bio: bio?.trim() || null,
        twitch_channel: finalTwitch || null,
        kick_channel: finalKick || null,
        youtube_channel: finalYoutube,
        languages: normalizedLangs,
        status: "pending",
        reviewer_notes: null,
        updated_at: new Date().toISOString(),
      };

      let { data, error } = await supabaseAdmin
        .from("caster_applications")
        .update(updateData)
        .eq("id", existingApp.id)
        .select()
        .single();

      // Fallback if kick_channel column does not exist yet
      if (error && error.message?.includes("kick_channel")) {
        delete updateData.kick_channel;
        const retry = await supabaseAdmin
          .from("caster_applications")
          .update(updateData)
          .eq("id", existingApp.id)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("Error updating application:", error);
        return NextResponse.json(
          { error: "Error al actualizar la solicitud de caster." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        isEdit,
        message: isEdit
          ? "Tu solicitud de actualización de perfil de Caster ha sido enviada para revisión."
          : "Tu postulación como Caster Oficial ha sido enviada para revisión.",
        application: data,
      });
    }

    // Insert new application
    const normalizedLangs = normalizeLanguages(languages);
    const insertData: any = {
      user_id: session.user.id,
      alias: finalAlias,
      bio: bio?.trim() || null,
      twitch_channel: finalTwitch || null,
      kick_channel: finalKick || null,
      youtube_channel: finalYoutube,
      languages: normalizedLangs,
      status: "pending",
    };

    let { data, error } = await supabaseAdmin
      .from("caster_applications")
      .insert(insertData)
      .select()
      .single();

    // Fallback if kick_channel column does not exist yet
    if (error && error.message?.includes("kick_channel")) {
      delete insertData.kick_channel;
      const retry = await supabaseAdmin
        .from("caster_applications")
        .insert(insertData)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Error creating caster application:", error);
      return NextResponse.json(
        { error: "Error al guardar la solicitud de caster." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isEdit,
      message: isEdit
        ? "Tu solicitud de actualización de perfil de Caster ha sido enviada para revisión."
        : "Tu postulación como Caster Oficial ha sido enviada para revisión.",
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

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Check if user is an existing approved caster
    const { data: existingCaster } = await supabaseAdmin
      .from("casters")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    // If cancelling an edit request
    if (action === "cancel_edit") {
      if (existingCaster) {
        // Reset application back to match their active approved caster profile
        await supabaseAdmin
          .from("caster_applications")
          .update({
            alias: existingCaster.alias,
            bio: existingCaster.bio,
            twitch_channel: existingCaster.twitch_channel,
            kick_channel: existingCaster.kick_channel,
            youtube_channel: existingCaster.youtube_channel,
            languages: normalizeLanguages((existingCaster as any).languages),
            status: "approved",
            reviewer_notes: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", session.user.id);

        return NextResponse.json({
          success: true,
          message: "Solicitud de edición cancelada. Tu perfil de Caster actual permanece activo.",
        });
      } else {
        await supabaseAdmin
          .from("caster_applications")
          .delete()
          .eq("user_id", session.user.id);

        return NextResponse.json({
          success: true,
          message: "Solicitud cancelada.",
        });
      }
    }

    if (action === "cancel_application") {
      await supabaseAdmin
        .from("caster_applications")
        .delete()
        .eq("user_id", session.user.id);

      return NextResponse.json({
        success: true,
        message: "Solicitud de Caster cancelada.",
      });
    }

    // Explicit full resignation from Caster role
    await supabaseAdmin
      .from("caster_applications")
      .delete()
      .eq("user_id", session.user.id);

    await supabaseAdmin
      .from("casters")
      .delete()
      .eq("user_id", session.user.id);

    return NextResponse.json({
      success: true,
      message: "Has renunciado al rol de Caster Oficial correctamente.",
    });
  } catch (error: any) {
    console.error("Caster apply DELETE error:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud." },
      { status: 500 }
    );
  }
}

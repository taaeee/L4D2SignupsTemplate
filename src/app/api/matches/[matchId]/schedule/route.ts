import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensurePublicUser } from "@/lib/ensure-user";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensurePublicUser(session.user.id, session.user);

    const { matchId } = await params;
    const body = await request.json();
    const { scheduledAt, selectedMaps, status, score1, score2, winnerId } = body;

    // 1. Fetch match details with tournament and teams
    const { data: match, error: matchError } = await supabaseAdmin
      .from("matches")
      .select(
        `
        *,
        tournaments (
          id,
          creator_id,
          moderators
        ),
        team1:teams!matches_team1_id_fkey (
          id,
          creator_id
        ),
        team2:teams!matches_team2_id_fkey (
          id,
          creator_id
        )
      `
      )
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });
    }

    const userId = session.user.id;
    const tournament = match.tournaments as any;
    const team1 = match.team1 as any;
    const team2 = match.team2 as any;

    // 2. Permission Check
    const isTournamentCreator = tournament?.creator_id === userId;
    const isTournamentMod =
      Array.isArray(tournament?.moderators) && tournament.moderators.includes(userId);
    const isTeam1Captain = team1?.creator_id === userId;
    const isTeam2Captain = team2?.creator_id === userId;

    let hasPermission = isTournamentCreator || isTournamentMod || isTeam1Captain || isTeam2Captain;

    let isCaster = false;
    let casterProfile: any = null;

    // Check if user is an approved caster in the system
    const { data: casterRecord } = await supabaseAdmin
      .from("casters")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (casterRecord) {
      isCaster = true;
      casterProfile = casterRecord;
      hasPermission = true;
    } else {
      const { data: appRecord } = await supabaseAdmin
        .from("caster_applications")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "approved")
        .maybeSingle();

      if (appRecord) {
        isCaster = true;
        casterProfile = appRecord;
        hasPermission = true;
      }
    }

    // Check if user is an assigned caster for this match
    if (!isCaster) {
      const { data: matchCaster } = await supabaseAdmin
        .from("match_casters")
        .select("*, casters(*)")
        .eq("match_id", matchId)
        .maybeSingle();

      if (matchCaster && matchCaster.casters?.user_id === userId) {
        isCaster = true;
        casterProfile = matchCaster.casters;
        hasPermission = true;
      }
    }

    // Check if user is a steam-verified member of team1 or team2
    if (!hasPermission && (team1?.id || team2?.id)) {
      // Find user's linked Steam ID
      const { data: steamAccount } = await supabaseAdmin
        .schema("next_auth")
        .from("accounts")
        .select("providerAccountId, steamId")
        .eq("userId", userId)
        .eq("provider", "steam")
        .maybeSingle();

      const userSteamId = steamAccount?.steamId || steamAccount?.providerAccountId;

      if (userSteamId) {
        const teamIds = [team1?.id, team2?.id].filter(Boolean);
        const { data: verifiedMember } = await supabaseAdmin
          .from("team_members")
          .select("id")
          .in("team_id", teamIds)
          .eq("steam_id_64", userSteamId)
          .maybeSingle();

        if (verifiedMember) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para modificar este partido. Debes ser organizador, caster, capitán o integrante con cuenta de Steam vinculada.",
        },
        { status: 403 }
      );
    }

    // 3. Build update payload
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (scheduledAt !== undefined) {
      updatePayload.scheduled_at = scheduledAt;
    }

    if (selectedMaps !== undefined) {
      updatePayload.selected_maps = Array.isArray(selectedMaps) ? selectedMaps : [];
    }

    // Organizers, tournament mods, and casters can change live status (e.g. in_progress, pending)
    const canChangeMatchStatus = isTournamentCreator || isTournamentMod || isCaster;
    if (status !== undefined) {
      if (canChangeMatchStatus || status === "in_progress") {
        // Enforce: Cannot start transmission (in_progress) without an assigned caster
        if (status === "in_progress") {
          const { data: existingMatchCasters } = await supabaseAdmin
            .from("match_casters")
            .select("id")
            .eq("match_id", matchId);

          const hasAssignedCaster = existingMatchCasters && existingMatchCasters.length > 0;
          const isCallerCaster = isCaster && !!casterProfile;

          if (!hasAssignedCaster && !isCallerCaster) {
            return NextResponse.json(
              {
                error:
                  "No se puede iniciar la transmisión sin un caster asignado al partido. Por favor asigna un caster primero.",
                requiresCasterAssignment: true,
              },
              { status: 400 }
            );
          }
        }

        updatePayload.status = status;

        // If a caster is starting the transmission and is not yet in match_casters, auto-link them without overwriting existing stream_url
        if (status === "in_progress" && isCaster && casterProfile) {
          try {
            const casterId = casterProfile.id;
            const { data: existingMC } = await supabaseAdmin
              .from("match_casters")
              .select("id, stream_url")
              .eq("match_id", matchId)
              .maybeSingle();

            if (!existingMC && casterId) {
              const defaultStream =
                (casterProfile.primary_platform === "kick" && casterProfile.kick_channel
                  ? (casterProfile.kick_channel.startsWith("http") ? casterProfile.kick_channel : `https://kick.com/${casterProfile.kick_channel}`)
                  : "") ||
                (casterProfile.primary_platform === "youtube" && casterProfile.youtube_channel
                  ? casterProfile.youtube_channel
                  : "") ||
                (casterProfile.kick_channel ? (casterProfile.kick_channel.startsWith("http") ? casterProfile.kick_channel : `https://kick.com/${casterProfile.kick_channel}`) : "") ||
                (casterProfile.youtube_channel || "") ||
                (casterProfile.twitch_channel ? (casterProfile.twitch_channel.startsWith("http") ? casterProfile.twitch_channel : `https://twitch.tv/${casterProfile.twitch_channel}`) : "") ||
                "";

              if (defaultStream) {
                await supabaseAdmin.from("match_casters").upsert(
                  {
                    match_id: matchId,
                    caster_id: casterId,
                    stream_url: defaultStream,
                    is_primary: true,
                    created_at: new Date().toISOString(),
                  },
                  { onConflict: "match_id,caster_id" }
                );
              }
            }
          } catch (e) {
            console.warn("Could not auto-bind caster on stream start:", e);
          }
        }
      }
    }

    if (score1 !== undefined && canChangeMatchStatus) {
      updatePayload.score1 = score1;
    }

    if (score2 !== undefined && canChangeMatchStatus) {
      updatePayload.score2 = score2;
    }

    if (winnerId !== undefined && canChangeMatchStatus) {
      updatePayload.winner_id = winnerId;
      updatePayload.loser_id =
        winnerId === match.team1_id ? match.team2_id : match.team1_id;
    }

    // 4. Update match
    const { data: updatedMatch, error: updateError } = await supabaseAdmin
      .from("matches")
      .update(updatePayload as any)
      .eq("id", matchId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating match schedule:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar el horario o información del partido." },
        { status: 500 }
      );
    }

    // 5. If match is completed with a winner, advance teams in the bracket
    const finalWinnerId = updatePayload.winner_id || match.winner_id;
    const finalLoserId = updatePayload.loser_id || match.loser_id;

    if (
      (updatePayload.status === "completed" || updatedMatch.status === "completed") &&
      finalWinnerId
    ) {
      async function advanceTeam(
        teamId: string,
        targetMatchId: string,
        sourceMatchOrder: number = 0,
        oldTeamId?: string | null
      ) {
        if (!teamId || !targetMatchId) return;

        const { data: targetMatch } = await supabaseAdmin
          .from("matches")
          .select("*")
          .eq("id", targetMatchId)
          .single();

        if (!targetMatch) return;

        // If target match is a BYE, automatically fast-forward
        if (targetMatch.is_bye) {
          await supabaseAdmin
            .from("matches")
            .update({ winner_id: teamId, status: "completed" })
            .eq("id", targetMatchId);

          if (targetMatch.next_match_id) {
            await advanceTeam(
              teamId,
              targetMatch.next_match_id,
              targetMatch.match_order,
              oldTeamId
            );
          }
          return;
        }

        const updateData: any = {};

        // If replacing a previously advanced team
        if (
          oldTeamId &&
          (targetMatch.team1_id === oldTeamId || targetMatch.team2_id === oldTeamId)
        ) {
          if (targetMatch.team1_id === oldTeamId) {
            updateData.team1_id = teamId;
          } else {
            updateData.team2_id = teamId;
          }
        } else if (
          targetMatch.team1_id === teamId ||
          targetMatch.team2_id === teamId
        ) {
          return;
        } else {
          const isEven = sourceMatchOrder % 2 === 0;
          if (isEven) {
            if (!targetMatch.team1_id || targetMatch.team1_id === oldTeamId) {
              updateData.team1_id = teamId;
            } else {
              updateData.team2_id = teamId;
            }
          } else {
            if (!targetMatch.team2_id || targetMatch.team2_id === oldTeamId) {
              updateData.team2_id = teamId;
            } else {
              updateData.team1_id = teamId;
            }
          }
        }

        const finalTeam1 =
          updateData.team1_id !== undefined
            ? updateData.team1_id
            : targetMatch.team1_id;
        const finalTeam2 =
          updateData.team2_id !== undefined
            ? updateData.team2_id
            : targetMatch.team2_id;

        if (finalTeam1 && finalTeam2 && targetMatch.status !== "completed") {
          updateData.status = "active";
        }

        await supabaseAdmin
          .from("matches")
          .update(updateData)
          .eq("id", targetMatchId);
      }

      if (match.next_match_id && finalWinnerId) {
        await advanceTeam(
          finalWinnerId,
          match.next_match_id,
          match.match_order,
          match.winner_id
        );
      }

      if (match.loser_match_id && finalLoserId) {
        await advanceTeam(
          finalLoserId,
          match.loser_match_id,
          match.match_order,
          match.loser_id
        );
      }

      if ((match.is_grand_final || (!match.next_match_id && match.round > 1)) && match.tournament_id) {
        await supabaseAdmin
          .from("tournaments")
          .update({ bracket_status: "completed" })
          .eq("id", match.tournament_id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Horario e información del partido actualizados correctamente.",
      match: updatedMatch,
    });
  } catch (error: any) {
    console.error("Match schedule PATCH error:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar el schedule del partido." },
      { status: 500 }
    );
  }
}

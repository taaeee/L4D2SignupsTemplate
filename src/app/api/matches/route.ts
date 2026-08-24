import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");
    const casterId = searchParams.get("casterId");
    const status = searchParams.get("status");

    // Query matches with joins
    let query = supabaseAdmin
      .from("matches")
      .select(
        `
        *,
        tournaments (
          id,
          name,
          status,
          logo_url,
          bracket_status,
          creator_id,
          moderators,
          template_json
        ),
        team1:teams!matches_team1_id_fkey (
          id,
          name,
          logo_url,
          status,
          creator_id,
          team_members (
            id,
            name,
            steam_id_64,
            role,
            l4d2_playtime_hours,
            is_profile_private
          )
        ),
        team2:teams!matches_team2_id_fkey (
          id,
          name,
          logo_url,
          status,
          creator_id,
          team_members (
            id,
            name,
            steam_id_64,
            role,
            l4d2_playtime_hours,
            is_profile_private
          )
        )
      `
      )
      .not("team1_id", "is", null)
      .not("team2_id", "is", null)
      .eq("is_bye", false)
      .order("created_at", { ascending: false });

    if (tournamentId && tournamentId !== "all") {
      query = query.eq("tournament_id", tournamentId);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error("Error fetching matches:", error);
      return NextResponse.json({ matches: [] });
    }

    // Fetch match_casters mapping
    let matchCastersMap: Record<string, any[]> = {};
    try {
      const { data: matchCasters } = await supabaseAdmin
        .from("match_casters")
        .select("*, casters(*)");

      if (matchCasters && matchCasters.length > 0) {
        matchCasters.forEach((mc: any) => {
          if (!matchCastersMap[mc.match_id]) {
            matchCastersMap[mc.match_id] = [];
          }
          matchCastersMap[mc.match_id].push(mc);
        });
      }
    } catch (e) {
      console.warn("Could not query match_casters:", e);
    }

    // Filter only valid matches with 2 real teams and determine exact status
    let formattedMatches = (matches || [])
      .filter((m: any) => {
        // Exclude BYEs, empty matches, or incomplete matches without an opponent
        if (m.is_bye === true) return false;
        if (!m.team1_id || !m.team2_id) return false;
        if (!m.team1 || !m.team2) return false;
        return true;
      })
      .map((m: any) => {
        const assignedCasters = matchCastersMap[m.id] || [];

        // Determine if match actually has a finished result
        const hasScore =
          m.score1 !== null &&
          m.score1 !== undefined &&
          m.score2 !== null &&
          m.score2 !== undefined &&
          (m.score1 > 0 || m.score2 > 0);

        const isCompleted =
          hasScore ||
          (m.status === "completed" && Boolean(m.winner_id));

        const isLive = m.status === "in_progress";

        const matchStatus = isLive
          ? "in_progress"
          : isCompleted
          ? "completed"
          : "pending";

        return {
          ...m,
          match_status: matchStatus,
          is_completed: isCompleted,
          is_live: isLive,
          scheduled_at: m.scheduled_at || null,
          selected_maps: Array.isArray(m.selected_maps) ? m.selected_maps : [],
          map_veto_id: m.map_veto_id || null,
          assigned_casters: assignedCasters,
          primary_stream_url:
            assignedCasters[0]?.stream_url ||
            (assignedCasters[0]?.casters?.kick_channel
              ? (assignedCasters[0].casters.kick_channel.startsWith("http")
                ? assignedCasters[0].casters.kick_channel
                : `https://kick.com/${assignedCasters[0].casters.kick_channel}`)
              : null) ||
            (assignedCasters[0]?.casters?.youtube_channel || null) ||
            (assignedCasters[0]?.casters?.twitch_channel
              ? (assignedCasters[0].casters.twitch_channel.startsWith("http")
                ? assignedCasters[0].casters.twitch_channel
                : `https://twitch.tv/${assignedCasters[0].casters.twitch_channel}`)
              : null) ||
            null,
        };
      });

    // Apply status filter if provided
    if (status && status !== "all") {
      if (status === "live") {
        formattedMatches = formattedMatches.filter((m: any) => m.match_status === "in_progress");
      } else if (status === "upcoming") {
        formattedMatches = formattedMatches.filter((m: any) => m.match_status === "pending");
      } else if (status === "completed") {
        formattedMatches = formattedMatches.filter((m: any) => m.match_status === "completed");
      }
    }

    // Filter by caster if specified
    if (casterId && casterId !== "all") {
      if (casterId === "has_caster") {
        formattedMatches = formattedMatches.filter(
          (m: any) => m.assigned_casters && m.assigned_casters.length > 0
        );
      } else {
        formattedMatches = formattedMatches.filter((m: any) =>
          m.assigned_casters.some(
            (c: any) =>
              c.caster_id === casterId ||
              c.casters?.user_id === casterId ||
              c.casters?.alias?.toLowerCase() === casterId.toLowerCase()
          )
        );
      }
    }

    return NextResponse.json({ matches: formattedMatches });
  } catch (error: any) {
    console.error("Matches API error:", error);
    return NextResponse.json({ matches: [] });
  }
}

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const session = await getServerSession(getAuthOptions(req));

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { score1, score2, winner_id } = await req.json();

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*, tournaments(id, creator_id, moderators, template_json)")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const tournament = match.tournaments as any;
    const isCreator = session.user.id === tournament?.creator_id;
    const isModerator = Array.isArray(tournament?.moderators) && tournament.moderators.includes(session.user.id);

    if (!isCreator && !isModerator) {
      return NextResponse.json({ error: "Forbidden: Solo organizadores pueden registrar resultados." }, { status: 403 });
    }

    const oldWinnerId = match.winner_id;
    const oldLoserId = match.loser_id;
    const loser_id = winner_id === match.team1_id ? match.team2_id : match.team1_id;

    // Update match result
    const { error: updateError } = await supabase
      .from("matches")
      .update({
        score1: Number(score1),
        score2: Number(score2),
        winner_id,
        loser_id,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq("id", matchId);

    if (updateError) {
      throw updateError;
    }

    // Function to advance a team to a target match safely
    async function advanceTeam(
      teamId: string,
      targetMatchId: string,
      sourceMatchOrder: number = 0,
      oldTeamId?: string | null
    ) {
      if (!teamId || !targetMatchId) return;

      const { data: targetMatch } = await supabase
        .from("matches")
        .select("*")
        .eq("id", targetMatchId)
        .single();

      if (!targetMatch) return;

      // If target match is a BYE, automatically fast-forward
      if (targetMatch.is_bye) {
        await supabase
          .from("matches")
          .update({ winner_id: teamId, status: 'completed' })
          .eq("id", targetMatchId);

        if (targetMatch.next_match_id) {
          await advanceTeam(teamId, targetMatch.next_match_id, targetMatch.match_order, oldTeamId);
        }
        return;
      }

      const updateData: any = {};

      // If replacing a previously advanced team
      if (oldTeamId && (targetMatch.team1_id === oldTeamId || targetMatch.team2_id === oldTeamId)) {
        if (targetMatch.team1_id === oldTeamId) {
          updateData.team1_id = teamId;
        } else {
          updateData.team2_id = teamId;
        }
      } else if (targetMatch.team1_id === teamId || targetMatch.team2_id === teamId) {
        // Already assigned in this match
        return;
      } else {
        // Determine slot based on source match order
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

      const finalTeam1 = updateData.team1_id !== undefined ? updateData.team1_id : targetMatch.team1_id;
      const finalTeam2 = updateData.team2_id !== undefined ? updateData.team2_id : targetMatch.team2_id;

      if (finalTeam1 && finalTeam2 && targetMatch.status !== 'completed') {
        updateData.status = 'active';
      }

      await supabase
        .from("matches")
        .update(updateData)
        .eq("id", targetMatchId);
    }

    // Advance Winner to next round in bracket
    if (match.next_match_id && winner_id) {
      await advanceTeam(winner_id, match.next_match_id, match.match_order, oldWinnerId);
    }

    // Advance Loser (Double Elimination)
    if (match.loser_match_id && loser_id) {
      await advanceTeam(loser_id, match.loser_match_id, match.match_order, oldLoserId);
    }

    // If Grand Final match is completed, mark tournament as completed
    if ((match.is_grand_final || (!match.next_match_id && match.round > 1)) && match.tournament_id) {
      await supabase
        .from("tournaments")
        .update({ bracket_status: 'completed' })
        .eq("id", match.tournament_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Match report error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

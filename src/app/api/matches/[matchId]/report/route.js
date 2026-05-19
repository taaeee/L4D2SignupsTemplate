import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req, { params }) {
  try {
    const { matchId } = await params;
    const session = await getServerSession(getAuthOptions(req));

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { score1, score2, winner_id } = await req.json();

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*, tournaments(creator_id, moderators, template_json)")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const tournament = match.tournaments;
    const isCreator = session.user.id === tournament.creator_id;
    const isModerator = tournament.moderators?.includes(session.user.id);

    if (!isCreator && !isModerator) {
      return NextResponse.json({ error: "Forbidden: Only creators and moderators can edit scores." }, { status: 403 });
    }

    const loser_id = winner_id === match.team1_id ? match.team2_id : match.team1_id;

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        score1: Number(score1),
        score2: Number(score2),
        winner_id,
        loser_id,
        status: 'completed'
      })
      .eq("id", matchId);

    if (updateError) {
      throw updateError;
    }

    // Function to advance a team to a target match safely
    async function advanceTeam(teamId, targetMatchId) {
      if (!teamId || !targetMatchId) return;

      const { data: nextMatch } = await supabase
        .from("matches")
        .select("*")
        .eq("id", targetMatchId)
        .single();

      if (nextMatch) {
        // If the target match is a bye, automatically fast-forward the team as the winner
        if (nextMatch.is_bye) {
          await supabase
            .from("matches")
            .update({ winner_id: teamId, status: 'completed' })
            .eq("id", targetMatchId);
          await advanceTeam(teamId, nextMatch.next_match_id);
          return;
        }

        const updateData = {};
        
        // If it's already in the match, don't do anything (avoid duplicates/overwrites)
        if (nextMatch.team1_id === teamId || nextMatch.team2_id === teamId) return;

        if (!nextMatch.team1_id) {
          updateData.team1_id = teamId;
        } else {
          updateData.team2_id = teamId;
        }

        if ((updateData.team1_id || nextMatch.team1_id) && (updateData.team2_id || nextMatch.team2_id)) {
          updateData.status = 'active';
        }

        await supabase
          .from("matches")
          .update(updateData)
          .eq("id", targetMatchId);
      }
    }

    // Advance Winner
    if (match.next_match_id && winner_id) {
      await advanceTeam(winner_id, match.next_match_id);
    }

    // Advance Loser (Double Elimination)
    if (match.loser_match_id && loser_id) {
      await advanceTeam(loser_id, match.loser_match_id);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

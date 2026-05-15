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

    // Fetch Match and Tournament Info
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*, tournaments(creator_id, moderators)")
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

    if (match.status === 'completed') {
       // We can allow re-editing if needed, but we'd have to handle cascading updates. 
       // For now, let's allow it but warn if it breaks the tree.
       // Actually, it's safer to just overwrite, but let's keep it simple.
    }

    // Determine loser
    const loser_id = winner_id === match.team1_id ? match.team2_id : match.team1_id;

    // Update the match
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

    // Advance winner to the next match
    if (match.next_match_id && winner_id) {
      // Find the next match
      const { data: nextMatch } = await supabase
        .from("matches")
        .select("*")
        .eq("id", match.next_match_id)
        .single();

      if (nextMatch) {
        const updateData = {};
        if (match.match_order % 2 === 0) {
          updateData.team1_id = winner_id;
        } else {
          updateData.team2_id = winner_id;
        }

        // Check if both teams will now be present, make it active
        if ((updateData.team1_id || nextMatch.team1_id) && (updateData.team2_id || nextMatch.team2_id)) {
          updateData.status = 'active';
        }

        await supabase
          .from("matches")
          .update(updateData)
          .eq("id", match.next_match_id);
      }
    }

    // Advance loser if there's a loser bracket (Double Elimination) - ignoring for now as requested Single Elim

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

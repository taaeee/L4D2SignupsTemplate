import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import crypto from "crypto";

export async function POST(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await getServerSession(getAuthOptions(req));

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tournament, error: tError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (tError || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const isCreator = session.user.id === tournament.creator_id;
    const isModerator = (tournament.moderators as any[])?.includes(session.user.id);

    if (!isCreator && !isModerator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if ((tournament.template_json as any)?.tournamentFormat !== 'swiss') {
      return NextResponse.json({ error: "Not a Swiss tournament" }, { status: 400 });
    }

    const currentRound = (tournament.template_json as any).currentSwissRound || 1;
    const totalRounds = (tournament.template_json as any).swissRounds || 1;

    if (currentRound >= totalRounds) {
      // Si ya se llegó al máximo de rondas, marcamos como completado
      await supabase.from("tournaments").update({ bracket_status: 'completed' }).eq("id", id);
      return NextResponse.json({ error: "Tournament has reached the maximum number of Swiss rounds." }, { status: 400 });
    }

    // 1. Fetch active teams
    const { data: activeTeamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id")
      .eq("tournament_id", id)
      .eq("status", "accepted");

    if (teamsError) throw teamsError;

    if (!activeTeamsData || activeTeamsData.length < 2) {
      return NextResponse.json({ error: "Not enough active teams to generate next round" }, { status: 400 });
    }

    const activeTeamIds = new Set(activeTeamsData.map(t => t.id));

    // 2. Fetch all completed matches to calculate standings and avoid rematches
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", id)
      .lte("round", currentRound);

    if (matchesError) throw matchesError;

    // Verify all matches in current round are completed
    const currentRoundMatches = matches.filter(m => m.round === currentRound);
    if (currentRoundMatches.some(m => m.status !== 'completed')) {
      return NextResponse.json({ error: "Not all matches in the current round are completed." }, { status: 400 });
    }

    // 3. Calculate Standings
    const standings: any = {};
    activeTeamsData.forEach(t => {
      standings[t.id] = { id: t.id, wins: 0, losses: 0, opponents: new Set() };
    });

    // We also need standings for dropped teams if they played, just to calculate Buchholz properly
    const allStandings: any = { ...standings };
    
    matches.forEach(m => {
      if (m.status !== 'completed') return;
      
      const t1 = m.team1_id;
      const t2 = m.team2_id;
      const winner = m.winner_id;
      
      if (t1 && !allStandings[t1]) allStandings[t1] = { id: t1, wins: 0, losses: 0, opponents: new Set() };
      if (t2 && !allStandings[t2]) allStandings[t2] = { id: t2, wins: 0, losses: 0, opponents: new Set() };

      if (t1 && t2) {
        allStandings[t1].opponents.add(t2);
        allStandings[t2].opponents.add(t1);
      }

      if (winner && winner === t1) {
        allStandings[t1].wins += 1;
        if (t2) allStandings[t2].losses += 1;
      } else if (winner && winner === t2) {
        allStandings[t2].wins += 1;
        if (t1) allStandings[t1].losses += 1;
      }
    });

    // Calculate Buchholz
    activeTeamsData.forEach(t => {
      let buchholz = 0;
      allStandings[t.id].opponents.forEach((oppId: any) => {
        if (allStandings[oppId]) {
          buchholz += allStandings[oppId].wins;
        }
      });
      standings[t.id].buchholz = buchholz;
    });

    // 4. Sort Teams
    const sortedTeams: any[] = Object.values(standings).sort((a: any, b: any) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return Math.random() - 0.5; // Random fallback
    });

    // 5. Greedy Pairing with simple backtracking for avoiding rematches
    const pairs: any[] = [];
    const used = new Set();

    function findPairs(teamIndex: number): boolean {
      if (teamIndex >= sortedTeams.length) return true; // All paired
      
      const team = sortedTeams[teamIndex];
      if (used.has(team.id)) return findPairs(teamIndex + 1);

      // Si es el último equipo y es impar, recibe un BYE
      let canHaveBye = false;
      if (sortedTeams.length % 2 !== 0 && used.size === sortedTeams.length - 1) {
         canHaveBye = true;
      }

      for (let i = teamIndex + 1; i < sortedTeams.length; i++) {
        const opponent = sortedTeams[i];
        if (!used.has(opponent.id) && !team.opponents.has(opponent.id)) {
          // Try pairing
          used.add(team.id);
          used.add(opponent.id);
          pairs.push([team.id, opponent.id]);

          if (findPairs(teamIndex + 1)) return true;

          // Backtrack
          used.delete(team.id);
          used.delete(opponent.id);
          pairs.pop();
        }
      }

      if (canHaveBye) {
         used.add(team.id);
         pairs.push([team.id, null]);
         return true;
      }

      return false; // No valid pairing found
    }

    const success = findPairs(0);
    
    if (!success) {
      return NextResponse.json({ error: "Could not find a valid pairing without rematches. Try manual pairing or adjusting teams." }, { status: 400 });
    }

    // 6. Generate Match Objects
    const nextRound = currentRound + 1;
    const insertMatches = pairs.map((pair, idx) => {
      const matchId = crypto.randomUUID();
      const isBye = pair[1] === null;
      return {
        id: matchId,
        tournament_id: id,
        round: nextRound,
        match_order: idx,
        team1_id: pair[0],
        team2_id: pair[1],
        status: isBye ? 'completed' : 'active',
        next_match_id: null,
        is_upper: true,
        loser_match_id: null,
        is_grand_final: false,
        is_bye: isBye,
        winner_id: isBye ? pair[0] : null
      };
    });

    const { error: insertError } = await supabase
      .from("matches")
      .insert(insertMatches);

    if (insertError) {
      console.error("Error inserting matches", insertError);
      return NextResponse.json({ error: "Failed to save next round" }, { status: 500 });
    }

    // 7. Update Tournament Round
    const newTemplateJson = { ...(tournament.template_json as any), currentSwissRound: nextRound };
    await supabase
      .from("tournaments")
      .update({ template_json: newTemplateJson })
      .eq("id", id);

    return NextResponse.json({ success: true, matches_created: insertMatches.length });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

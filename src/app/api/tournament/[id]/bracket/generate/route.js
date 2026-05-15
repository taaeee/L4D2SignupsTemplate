import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route";
import crypto from "crypto";

// We need to use standard supabase client with service role or the session token if RLS requires it.
// Assuming we check session first.

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(getAuthOptions(req));

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch tournament to verify permissions
    const { data: tournament, error: tError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (tError || !tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const isCreator = session.user.id === tournament.creator_id;
    const isModerator = tournament.moderators?.includes(session.user.id);

    if (!isCreator && !isModerator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const force = body.force;

    if (!force && (tournament.bracket_status === 'generated' || tournament.bracket_status === 'completed')) {
      return NextResponse.json({ error: "Bracket already generated" }, { status: 400 });
    }

    if (force) {
      await supabase.from("matches").delete().eq("tournament_id", id);
    }

    // Fetch accepted teams
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id")
      .eq("tournament_id", id)
      .eq("status", "accepted");

    if (teamsError) throw teamsError;

    if (!teams || teams.length < 2) {
      return NextResponse.json({ error: "Not enough teams to generate bracket (minimum 2)" }, { status: 400 });
    }

    // Shuffle teams for Random Seeding
    const shuffledTeams = teams.sort(() => Math.random() - 0.5);
    const N = shuffledTeams.length;

    // Calculate Power of 2
    const rounds = Math.ceil(Math.log2(N));
    const P = Math.pow(2, rounds);
    // Number of matches in round 1
    const round1MatchesCount = P / 2;

    const matchNodes = {};
    const insertMatches = [];

    // 1. Generate match nodes
    for (let r = 1; r <= rounds; r++) {
      const matchesInRound = P / Math.pow(2, r);
      matchNodes[r] = [];
      for (let m = 0; m < matchesInRound; m++) {
        const match = {
          id: crypto.randomUUID(),
          tournament_id: id,
          round: r,
          match_order: m,
          team1_id: null,
          team2_id: null,
          status: 'pending',
          next_match_id: null,
          is_grand_final: r === rounds
        };
        matchNodes[r].push(match);
        insertMatches.push(match);
      }
    }

    // 2. Link next_match_id
    for (let r = 1; r < rounds; r++) {
      const currentRoundMatches = matchNodes[r];
      const nextRoundMatches = matchNodes[r + 1];
      for (let m = 0; m < currentRoundMatches.length; m++) {
        const nextMatchIndex = Math.floor(m / 2);
        currentRoundMatches[m].next_match_id = nextRoundMatches[nextMatchIndex].id;
      }
    }

    // 3. Assign teams to Round 1
    const round1Matches = matchNodes[1];
    
    // Distribute 1 team to every match in Round 1
    for (let i = 0; i < round1MatchesCount; i++) {
      if (shuffledTeams[i]) {
        round1Matches[i].team1_id = shuffledTeams[i].id;
      }
    }

    // Distribute remaining teams as team2
    for (let i = round1MatchesCount; i < N; i++) {
      const matchIndex = i - round1MatchesCount;
      round1Matches[matchIndex].team2_id = shuffledTeams[i].id;
    }

    // 4. Handle Byes (matches with only team1)
    for (let m of round1Matches) {
      if (m.team1_id && !m.team2_id) {
        // Auto advance team 1
        m.status = 'completed';
        m.winner_id = m.team1_id;
        
        // Find next match and place them
        const nextMatch = insertMatches.find(x => x.id === m.next_match_id);
        if (nextMatch) {
          if (m.match_order % 2 === 0) {
            nextMatch.team1_id = m.winner_id;
          } else {
            nextMatch.team2_id = m.winner_id;
          }
          
          // If the next match now has both teams, mark it active
          if (nextMatch.team1_id && nextMatch.team2_id) {
            nextMatch.status = 'active';
          }
        }
      } else if (m.team1_id && m.team2_id) {
        m.status = 'active';
      }
    }

    // Wait! A round 2 match might get TWO byes feeding into it (if N is very small, e.g., 2 teams, P=2, but we handled N>=2.
    // E.g., N=5, P=8. R1 has 4 matches. 3 byes, 1 real match.
    // M0: T1 vs Bye -> T1 advances to M4 (R2)
    // M1: T2 vs Bye -> T2 advances to M4 (R2)
    // Wait, M4 will now have T1 and T2! M4 becomes 'active'. This works perfectly!

    // 5. Insert Matches
    const { error: insertError } = await supabase
      .from("matches")
      .insert(insertMatches);

    if (insertError) {
      console.error("Error inserting matches", insertError);
      return NextResponse.json({ error: "Failed to save bracket" }, { status: 500 });
    }

    // 6. Update Tournament status
    await supabase
      .from("tournaments")
      .update({ bracket_status: 'generated', tournament_format: 'single_elimination' })
      .eq("id", id);

    return NextResponse.json({ success: true, total_matches: insertMatches.length });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route";
import crypto from "crypto";

export async function POST(req, { params }) {
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

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id")
      .eq("tournament_id", id)
      .eq("status", "accepted");

    if (teamsError) throw teamsError;

    if (!teams || teams.length < 2) {
      return NextResponse.json({ error: "Not enough teams to generate bracket (minimum 2)" }, { status: 400 });
    }

    if (teams.length % 2 !== 0) {
      return NextResponse.json({ error: "The number of teams must be even to generate the bracket." }, { status: 400 });
    }

    const format = tournament.template_json?.tournamentFormat || 'single_elimination';
    const isDoubleElimination = format === 'double_elimination';

    const shuffledTeams = teams.sort(() => Math.random() - 0.5);
    const N = shuffledTeams.length;
    const rounds = Math.ceil(Math.log2(N));
    const P = Math.pow(2, rounds);

    let matches = [];
    let insertMatches = [];
    let matchIdCounter = 1;
    const ubNodes = {};

    // ================= UPPER BRACKET =================
    for (let r = 1; r <= rounds; r++) {
      const matchesInRound = P / Math.pow(2, r);
      ubNodes[r] = [];
      for (let m = 0; m < matchesInRound; m++) {
        const matchId = crypto.randomUUID();
        const match = {
          id: matchId,
          tournament_id: id,
          round: r,
          match_order: m,
          team1_id: null,
          team2_id: null,
          status: 'pending',
          next_match_id: null,
          is_upper: true,
          loser_match_id: null,
          is_grand_final: !isDoubleElimination && r === rounds,
          is_bye: false
        };

        ubNodes[r].push(match);
        insertMatches.push(match);
      }
    }

    // Link next_match_id for Upper Bracket
    for (let r = 1; r < rounds; r++) {
      for (let m = 0; m < ubNodes[r].length; m++) {
        ubNodes[r][m].next_match_id = ubNodes[r + 1][Math.floor(m / 2)].id;
      }
    }

    // Seeding Algorithm
    function getSeedOrder(p) {
      if (p === 1) return [1];
      const prev = getSeedOrder(p / 2);
      const result = [];
      for (let s of prev) {
        result.push(s);
        result.push(p - s + 1);
      }
      return result;
    }
    const seedOrder = getSeedOrder(P);

    for (let i = 0; i < P / 2; i++) {
      const seed1 = seedOrder[i * 2];
      const seed2 = seedOrder[i * 2 + 1];
      
      const t1 = seed1 <= N ? shuffledTeams[seed1 - 1].id : null;
      const t2 = seed2 <= N ? shuffledTeams[seed2 - 1].id : null;
      
      ubNodes[1][i].team1_id = t1;
      ubNodes[1][i].team2_id = t2;
      
      if (t1 && t2) {
        ubNodes[1][i].status = 'active';
      } else if (t1 || t2) {
        // BYE MATCH
        ubNodes[1][i].status = 'completed';
        // The winner column exists on `matches` table but it requires an explicit field `winner_id`.
        // Wait, does `winner_id` exist? Yes, we saw it in `report/route.js`.
        // Let's add winner_id to the match object to be safe.
        // I will dynamically add it.
        ubNodes[1][i].winner_id = t1 || t2;
        
        ubNodes[1][i].is_bye = true;
        
        const nextMatch = insertMatches.find(m => m.id === ubNodes[1][i].next_match_id);
        if (nextMatch) {
          if (ubNodes[1][i].match_order % 2 === 0) {
            nextMatch.team1_id = ubNodes[1][i].winner_id;
          } else {
            nextMatch.team2_id = ubNodes[1][i].winner_id;
          }
          if (nextMatch.team1_id && nextMatch.team2_id) nextMatch.status = 'active';
        }
      }
    }

    // ================= LOWER BRACKET (DOUBLE ELIM) =================
    if (isDoubleElimination && rounds > 1) {
      const lbRounds = (rounds - 1) * 2;
      const lbNodes = {};
      
      for (let r = 1; r <= lbRounds; r++) {
        const matchesInRound = P / Math.pow(2, Math.ceil(r / 2) + 1);
        lbNodes[r] = [];
        for (let m = 0; m < matchesInRound; m++) {
          const matchId = crypto.randomUUID();
          const match = {
            id: matchId,
            tournament_id: id,
            round: r,
            match_order: m,
            team1_id: null,
            team2_id: null,
            status: 'pending',
            next_match_id: null,
            is_upper: false,
            loser_match_id: null,
            is_grand_final: false,
            is_bye: false
          };
          
          lbNodes[r].push(match);
          insertMatches.push(match);
        }
      }

      // Link next_match_id for Lower Bracket
      for (let r = 1; r < lbRounds; r++) {
        for (let m = 0; m < lbNodes[r].length; m++) {
          if (r % 2 !== 0) {
            lbNodes[r][m].next_match_id = lbNodes[r + 1][m].id;
          } else {
            lbNodes[r][m].next_match_id = lbNodes[r + 1][Math.floor(m / 2)].id;
          }
        }
      }

      // Link UB Losers to LB
      for (let ur = 1; ur <= rounds; ur++) {
        if (ur === rounds) {
          ubNodes[ur][0].loser_match_id = lbNodes[lbRounds][0].id;
        } else {
          let targetLBRound = (ur === 1) ? 1 : (ur - 1) * 2;
          for (let m = 0; m < ubNodes[ur].length; m++) {
            if (ur === 1) {
              ubNodes[ur][m].loser_match_id = lbNodes[targetLBRound][Math.floor(m / 2)].id;
            } else {
              const numMatches = ubNodes[ur].length;
              const targetMatch = (ur % 2 === 0) ? (numMatches - 1 - m) : m;
              ubNodes[ur][m].loser_match_id = lbNodes[targetLBRound][targetMatch].id;
            }
          }
        }
      }

      // Handle Byes cascading to LB
      for (let i = 0; i < P / 2; i++) {
        if (ubNodes[1][i].is_bye) {
          const lbMatchId = ubNodes[1][i].loser_match_id;
          if (lbMatchId) {
            const lbMatch = insertMatches.find(m => m.id === lbMatchId);
            if (lbMatch) {
              lbMatch.is_bye = true;
              lbMatch.status = 'completed';
            }
          }
        }
      }

      // ================= GRAND FINAL =================
      const gfId = crypto.randomUUID();
      const grandFinal = {
        id: gfId,
        tournament_id: id,
        round: rounds + 1,
        match_order: 0,
        team1_id: null,
        team2_id: null,
        status: 'pending',
        next_match_id: null,
        is_upper: true,
        is_grand_final: true,
        loser_match_id: null,
        is_bye: false
      };
      
      insertMatches.push(grandFinal);
      ubNodes[rounds][0].next_match_id = gfId;
      lbNodes[lbRounds][0].next_match_id = gfId;
    }
    
    // Filter matches to only include valid columns:
    const validMatches = insertMatches.map(m => ({
      id: m.id,
      tournament_id: m.tournament_id,
      round: m.round,
      match_order: m.match_order,
      team1_id: m.team1_id,
      team2_id: m.team2_id,
      status: m.status,
      next_match_id: m.next_match_id,
      winner_id: m.winner_id || null, // Include winner_id specifically for Byes
      is_upper: m.is_upper,
      is_bye: m.is_bye,
      is_grand_final: m.is_grand_final,
      loser_match_id: m.loser_match_id
    }));

    const { error: insertError } = await supabase
      .from("matches")
      .insert(validMatches);

    if (insertError) {
      console.error("Error inserting matches", insertError);
      return NextResponse.json({ error: "Failed to save bracket" }, { status: 500 });
    }

    // Update Tournament status AND template_json without bracketMap
    const newTemplateJson = {
      ...(tournament.template_json || {}),
      tournamentFormat: format
    };
    // remove bracket_map if it existed
    delete newTemplateJson.bracket_map;

    await supabase
      .from("tournaments")
      .update({ bracket_status: 'generated', tournament_format: format, template_json: newTemplateJson })
      .eq("id", id);

    return NextResponse.json({ success: true, total_matches: insertMatches.length });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

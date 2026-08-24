/**
 * Comprehensive Tournament Bracket Verification and Simulation Suite
 * Tests full match-by-match progression across all supported formats:
 * - Single Elimination
 * - Double Elimination (with Byes, Double-Byes, LB routing & Grand Finals)
 * - Swiss Format (Rounds 1..N, Buchholz, pairing without rematches)
 * - Match score corrections / re-reporting
 * - Pre-lock slot swapping (Drag & Drop)
 */

import crypto from "crypto";

class MockDatabase {
  constructor() {
    this.tournaments = new Map();
    this.matches = new Map();
    this.teams = new Map();
  }

  reset() {
    this.tournaments.clear();
    this.matches.clear();
    this.teams.clear();
  }
}

const db = new MockDatabase();

/**
 * Generates tournament bracket matching backend logic in /api/tournament/[id]/bracket/generate
 */
function generateBracket({ tournamentId, format, teamsList, swissRounds = null }) {
  const tournament = {
    id: tournamentId,
    bracket_status: 'pending',
    tournament_format: format,
    template_json: { tournamentFormat: format, abandoned_paths: [] }
  };
  db.tournaments.set(tournamentId, tournament);

  teamsList.forEach(t => db.teams.set(t.id, { ...t, tournament_id: tournamentId, status: 'accepted' }));

  const N = teamsList.length;
  const isDoubleElimination = format === 'double_elimination';
  const isSwiss = format === 'swiss';

  let insertMatches = [];

  if (isSwiss) {
    const rounds = swissRounds || Math.ceil(Math.log2(N));
    tournament.template_json.swissRounds = rounds;
    tournament.template_json.currentSwissRound = 1;

    for (let i = 0; i < N / 2; i++) {
      const match = {
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        round: 1,
        match_order: i,
        team1_id: teamsList[i * 2].id,
        team2_id: teamsList[i * 2 + 1].id,
        status: 'active',
        next_match_id: null,
        is_upper: true,
        loser_match_id: null,
        is_grand_final: false,
        is_bye: false,
        winner_id: null,
        loser_id: null,
        score1: 0,
        score2: 0
      };
      insertMatches.push(match);
      db.matches.set(match.id, match);
    }
  } else {
    const rounds = Math.ceil(Math.log2(N));
    const P = Math.pow(2, rounds);
    let ubNodes = {};

    // Upper Bracket
    for (let r = 1; r <= rounds; r++) {
      const matchesInRound = P / Math.pow(2, r);
      ubNodes[r] = [];
      for (let m = 0; m < matchesInRound; m++) {
        const match = {
          id: crypto.randomUUID(),
          tournament_id: tournamentId,
          round: r,
          match_order: m,
          team1_id: null,
          team2_id: null,
          status: 'pending',
          next_match_id: null,
          is_upper: true,
          loser_match_id: null,
          is_grand_final: !isDoubleElimination && r === rounds,
          is_bye: false,
          winner_id: null,
          loser_id: null,
          score1: 0,
          score2: 0
        };
        ubNodes[r].push(match);
        insertMatches.push(match);
        db.matches.set(match.id, match);
      }
    }

    for (let r = 1; r < rounds; r++) {
      for (let m = 0; m < ubNodes[r].length; m++) {
        ubNodes[r][m].next_match_id = ubNodes[r + 1][Math.floor(m / 2)].id;
      }
    }

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
      
      const t1 = seed1 <= N ? teamsList[seed1 - 1].id : null;
      const t2 = seed2 <= N ? teamsList[seed2 - 1].id : null;
      
      ubNodes[1][i].team1_id = t1;
      ubNodes[1][i].team2_id = t2;
      
      if (t1 && t2) {
        ubNodes[1][i].status = 'active';
      } else if (t1 || t2) {
        ubNodes[1][i].status = 'completed';
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

    // Lower Bracket (Double Elimination)
    if (isDoubleElimination && rounds > 1) {
      const lbRounds = (rounds - 1) * 2;
      const lbNodes = {};

      for (let r = 1; r <= lbRounds; r++) {
        const matchesInRound = P / Math.pow(2, Math.ceil(r / 2) + 1);
        lbNodes[r] = [];
        for (let m = 0; m < matchesInRound; m++) {
          const match = {
            id: crypto.randomUUID(),
            tournament_id: tournamentId,
            round: r,
            match_order: m,
            team1_id: null,
            team2_id: null,
            status: 'pending',
            next_match_id: null,
            is_upper: false,
            loser_match_id: null,
            is_grand_final: false,
            is_bye: false,
            winner_id: null,
            loser_id: null,
            score1: 0,
            score2: 0
          };
          lbNodes[r].push(match);
          insertMatches.push(match);
          db.matches.set(match.id, match);
        }
      }

      for (let r = 1; r < lbRounds; r++) {
        for (let m = 0; m < lbNodes[r].length; m++) {
          if (r % 2 !== 0) {
            lbNodes[r][m].next_match_id = lbNodes[r + 1][m].id;
          } else {
            lbNodes[r][m].next_match_id = lbNodes[r + 1][Math.floor(m / 2)].id;
          }
        }
      }

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

      // Cascading LB byes
      const lbR1TeamCount = {};
      for (let i = 0; i < P / 2; i++) {
        const targetLbMatchId = ubNodes[1][i].loser_match_id;
        if (targetLbMatchId) {
          if (!lbR1TeamCount[targetLbMatchId]) lbR1TeamCount[targetLbMatchId] = 0;
          if (!ubNodes[1][i].is_bye) {
            lbR1TeamCount[targetLbMatchId] += 1;
          }
        }
      }

      for (let m = 0; m < lbNodes[1].length; m++) {
        const lbMatch = lbNodes[1][m];
        const incomingTeams = lbR1TeamCount[lbMatch.id] || 0;
        if (incomingTeams <= 1) {
          lbMatch.is_bye = true;
          lbMatch.status = 'completed';

          if (incomingTeams === 0 && lbMatch.next_match_id) {
            const lbR2Match = insertMatches.find(x => x.id === lbMatch.next_match_id);
            if (lbR2Match) {
              lbR2Match.is_bye = true;
              lbR2Match.status = 'completed';
            }
          }
        }
      }

      const gfId = crypto.randomUUID();
      const grandFinal = {
        id: gfId,
        tournament_id: tournamentId,
        round: rounds + 1,
        match_order: 0,
        team1_id: null,
        team2_id: null,
        status: 'pending',
        next_match_id: null,
        is_upper: true,
        is_grand_final: true,
        loser_match_id: null,
        is_bye: false,
        winner_id: null,
        loser_id: null,
        score1: 0,
        score2: 0
      };
      insertMatches.push(grandFinal);
      db.matches.set(gfId, grandFinal);
      ubNodes[rounds][0].next_match_id = gfId;
      lbNodes[lbRounds][0].next_match_id = gfId;
    }
  }

  tournament.bracket_status = 'generated';
  return { tournament, matches: insertMatches };
}

/**
 * Reports a match result matching backend logic in /api/matches/[matchId]/report
 */
function reportMatch({ matchId, score1, score2, winner_id }) {
  const match = db.matches.get(matchId);
  if (!match) throw new Error(`Match ${matchId} not found`);

  const oldWinnerId = match.winner_id;
  const oldLoserId = match.loser_id;
  const loser_id = winner_id === match.team1_id ? match.team2_id : match.team1_id;

  match.score1 = Number(score1);
  match.score2 = Number(score2);
  match.winner_id = winner_id;
  match.loser_id = loser_id;
  match.status = 'completed';

  function advanceTeam(teamId, targetMatchId, sourceMatchOrder = 0, oldTeamId = null) {
    if (!teamId || !targetMatchId) return;

    const targetMatch = db.matches.get(targetMatchId);
    if (!targetMatch) return;

    if (targetMatch.is_bye) {
      targetMatch.winner_id = teamId;
      targetMatch.status = 'completed';
      if (targetMatch.next_match_id) {
        advanceTeam(teamId, targetMatch.next_match_id, targetMatch.match_order, oldTeamId);
      }
      return;
    }

    const updateData = {};

    if (oldTeamId && (targetMatch.team1_id === oldTeamId || targetMatch.team2_id === oldTeamId)) {
      if (targetMatch.team1_id === oldTeamId) {
        updateData.team1_id = teamId;
      } else {
        updateData.team2_id = teamId;
      }
    } else if (targetMatch.team1_id === teamId || targetMatch.team2_id === teamId) {
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

    if (updateData.team1_id !== undefined) targetMatch.team1_id = updateData.team1_id;
    if (updateData.team2_id !== undefined) targetMatch.team2_id = updateData.team2_id;

    if (targetMatch.team1_id && targetMatch.team2_id && targetMatch.status !== 'completed') {
      targetMatch.status = 'active';
    }
  }

  if (match.next_match_id && winner_id) {
    advanceTeam(winner_id, match.next_match_id, match.match_order, oldWinnerId);
  }

  if (match.loser_match_id && loser_id) {
    advanceTeam(loser_id, match.loser_match_id, match.match_order, oldLoserId);
  }

  if ((match.is_grand_final || (!match.next_match_id && match.round > 1)) && match.tournament_id) {
    const tournament = db.tournaments.get(match.tournament_id);
    if (tournament) {
      tournament.bracket_status = 'completed';
    }
  }
}

/**
 * Swiss next-round generation matching /api/tournament/[id]/bracket/next-round
 */
function nextSwissRound(tournamentId, activeTeams = null) {
  const tournament = db.tournaments.get(tournamentId);
  if (!tournament) throw new Error("Tournament not found");

  const currentRound = tournament.template_json.currentSwissRound || 1;
  const totalRounds = tournament.template_json.swissRounds || 1;

  if (currentRound >= totalRounds) {
    tournament.bracket_status = 'completed';
    return { completed: true };
  }

  const activeTeamsList = activeTeams || Array.from(db.teams.values()).filter(t => t.tournament_id === tournamentId && t.status === 'accepted');
  if (activeTeamsList.length < 2) {
    tournament.bracket_status = 'completed';
    return { completed: true };
  }

  const allMatches = Array.from(db.matches.values()).filter(m => m.tournament_id === tournamentId && m.round <= currentRound);
  const currentRoundMatches = allMatches.filter(m => m.round === currentRound);
  if (currentRoundMatches.some(m => m.status !== 'completed')) {
    throw new Error("Not all matches in current round are completed");
  }

  const standings = {};
  activeTeamsList.forEach(t => {
    standings[t.id] = { id: t.id, wins: 0, losses: 0, opponents: new Set() };
  });

  const allStandings = { ...standings };

  allMatches.forEach(m => {
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

  activeTeamsList.forEach(t => {
    let buchholz = 0;
    allStandings[t.id].opponents.forEach(oppId => {
      if (allStandings[oppId]) {
        buchholz += allStandings[oppId].wins;
      }
    });
    standings[t.id].buchholz = buchholz;
  });

  const sortedTeams = Object.values(standings).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return Math.random() - 0.5;
  });

  const pairs = [];
  const used = new Set();

  function findPairs(teamIndex) {
    if (teamIndex >= sortedTeams.length) return true;
    const team = sortedTeams[teamIndex];
    if (used.has(team.id)) return findPairs(teamIndex + 1);

    let canHaveBye = false;
    if (sortedTeams.length % 2 !== 0 && used.size === sortedTeams.length - 1) {
      canHaveBye = true;
    }

    for (let i = teamIndex + 1; i < sortedTeams.length; i++) {
      const opponent = sortedTeams[i];
      if (!used.has(opponent.id) && !team.opponents.has(opponent.id)) {
        used.add(team.id);
        used.add(opponent.id);
        pairs.push([team.id, opponent.id]);

        if (findPairs(teamIndex + 1)) return true;

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

    return false;
  }

  const success = findPairs(0);
  if (!success) throw new Error("Could not find valid Swiss pairing without rematches");

  const nextRound = currentRound + 1;
  const insertMatches = pairs.map((pair, idx) => {
    const isBye = pair[1] === null;
    const match = {
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
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
      winner_id: isBye ? pair[0] : null,
      score1: 0,
      score2: 0
    };
    db.matches.set(match.id, match);
    return match;
  });

  tournament.template_json.currentSwissRound = nextRound;
  return { success: true, nextRound, matches: insertMatches };
}

/**
 * Slot Swapping matching /api/tournament/[id]/bracket/swap-slots
 */
function swapSlots({ tournamentId, sourceMatchId, sourceSlot, targetMatchId, targetSlot }) {
  const allMatches = Array.from(db.matches.values()).filter(m => m.tournament_id === tournamentId);
  const sourceMatch = allMatches.find(m => m.id === sourceMatchId);
  const targetMatch = allMatches.find(m => m.id === targetMatchId);

  const sourceField = sourceSlot === 1 ? "team1_id" : "team2_id";
  const targetField = targetSlot === 1 ? "team1_id" : "team2_id";

  const teamFromSource = sourceMatch[sourceField];
  const teamFromTarget = targetMatch[targetField];

  sourceMatch[sourceField] = teamFromTarget;
  targetMatch[targetField] = teamFromSource;

  const evaluateMatchBye = (matchObj) => {
    const t1 = matchObj.team1_id;
    const t2 = matchObj.team2_id;

    if (t1 && t2) {
      matchObj.is_bye = false;
      matchObj.status = "active";
      matchObj.winner_id = null;
    } else if (t1 || t2) {
      matchObj.is_bye = true;
      matchObj.status = "completed";
      matchObj.winner_id = t1 || t2;
    } else {
      matchObj.is_bye = false;
      matchObj.status = "pending";
      matchObj.winner_id = null;
    }

    if (matchObj.next_match_id) {
      const nextMatch = allMatches.find(m => m.id === matchObj.next_match_id);
      if (nextMatch) {
        const nextSlotField = matchObj.match_order % 2 === 0 ? "team1_id" : "team2_id";
        const nextSlotWinner = matchObj.is_bye ? matchObj.winner_id : null;
        nextMatch[nextSlotField] = nextSlotWinner;

        const nextHasT1 = Boolean(nextMatch.team1_id);
        const nextHasT2 = Boolean(nextMatch.team2_id);
        if (nextHasT1 && nextHasT2) {
          nextMatch.status = "active";
        } else {
          nextMatch.status = "pending";
        }
      }
    }
  };

  if (sourceMatch.round === 1 && sourceMatch.is_upper) {
    evaluateMatchBye(sourceMatch);
  }
  if (targetMatch.round === 1 && targetMatch.is_upper) {
    evaluateMatchBye(targetMatch);
  }

  const tournament = db.tournaments.get(tournamentId);
  const format = tournament?.tournament_format || 'single_elimination';

  if (format === "double_elimination") {
    const ubR1Matches = allMatches.filter(m => m.round === 1 && m.is_upper);
    const lbR1Matches = allMatches.filter(m => m.round === 1 && !m.is_upper);
    const lbR2Matches = allMatches.filter(m => m.round === 2 && !m.is_upper);

    const lbR1TeamCount = {};
    for (const ubMatch of ubR1Matches) {
      if (ubMatch.loser_match_id) {
        if (!lbR1TeamCount[ubMatch.loser_match_id]) lbR1TeamCount[ubMatch.loser_match_id] = 0;
        if (!ubMatch.is_bye) {
          lbR1TeamCount[ubMatch.loser_match_id] += 1;
        }
      }
    }

    for (const lbMatch of lbR1Matches) {
      const incomingTeams = lbR1TeamCount[lbMatch.id] || 0;
      const isBye = incomingTeams <= 1;
      lbMatch.is_bye = isBye;
      lbMatch.status = isBye ? "completed" : "pending";

      if (lbMatch.next_match_id) {
        const lbR2Match = lbR2Matches.find(m => m.id === lbMatch.next_match_id);
        if (lbR2Match) {
          const isR2Bye = incomingTeams === 0;
          lbR2Match.is_bye = isR2Bye;
          lbR2Match.status = isR2Bye ? "completed" : "pending";
        }
      }
    }
  }
}

// -------------------------------------------------------------
// COMPLETE SIMULATION RUNNER
// -------------------------------------------------------------
console.log("🎮 ==============================================================");
console.log("🎮 TOURNAMENT BRACKET ADVANCEMENT SIMULATION & VERIFICATION");
console.log("🎮 ==============================================================\n");

let passedCount = 0;
let totalCount = 0;

function runSimulationTest(testName, fn) {
  totalCount++;
  try {
    fn();
    console.log(`✅ [PASS] ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}:`, err.message);
  }
}

// Test 1: Single Elimination (2, 4, 6, 8, 12, 16, 32 teams)
const seSizes = [2, 4, 6, 8, 10, 12, 14, 16, 32];
for (const size of seSizes) {
  runSimulationTest(`Single Elimination - ${size} Teams Match-by-Match to Completion`, () => {
    db.reset();
    const teams = Array.from({ length: size }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
    generateBracket({ tournamentId: `se_${size}`, format: 'single_elimination', teamsList: teams });

    let matchCount = 0;
    while (true) {
      const active = Array.from(db.matches.values()).filter(m => m.tournament_id === `se_${size}` && m.status === 'active' && m.team1_id && m.team2_id);
      if (active.length === 0) {
        const uncompleted = Array.from(db.matches.values()).filter(m => m.tournament_id === `se_${size}` && m.status !== 'completed');
        if (uncompleted.length > 0) {
          throw new Error(`Deadlock! ${uncompleted.length} uncompleted matches remain.`);
        }
        break;
      }
      matchCount++;
      const match = active[0];
      const winner = Math.random() > 0.5 ? match.team1_id : match.team2_id;
      reportMatch({ matchId: match.id, score1: 2, score2: 0, winner_id: winner });
    }

    const tourney = db.tournaments.get(`se_${size}`);
    if (tourney.bracket_status !== 'completed') {
      throw new Error(`Tournament status expected 'completed' but got '${tourney.bracket_status}'`);
    }
  });
}

// Test 2: Double Elimination (4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32 teams)
const deSizes = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32];
for (const size of deSizes) {
  runSimulationTest(`Double Elimination - ${size} Teams Match-by-Match to Grand Final`, () => {
    db.reset();
    const teams = Array.from({ length: size }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
    generateBracket({ tournamentId: `de_${size}`, format: 'double_elimination', teamsList: teams });

    let matchCount = 0;
    while (true) {
      const active = Array.from(db.matches.values()).filter(m => m.tournament_id === `de_${size}` && m.status === 'active' && m.team1_id && m.team2_id);
      if (active.length === 0) {
        const uncompleted = Array.from(db.matches.values()).filter(m => m.tournament_id === `de_${size}` && m.status !== 'completed');
        if (uncompleted.length > 0) {
          throw new Error(`Deadlock! ${uncompleted.length} uncompleted matches remain.`);
        }
        break;
      }
      matchCount++;
      // Pick random active match (out-of-order execution)
      const match = active[Math.floor(Math.random() * active.length)];
      const winner = Math.random() > 0.5 ? match.team1_id : match.team2_id;
      reportMatch({ matchId: match.id, score1: 2, score2: 1, winner_id: winner });
    }

    const tourney = db.tournaments.get(`de_${size}`);
    if (tourney.bracket_status !== 'completed') {
      throw new Error(`Tournament status expected 'completed' but got '${tourney.bracket_status}'`);
    }
  });
}

// Test 3: Swiss System (4, 6, 8, 16 teams)
const swissSizes = [4, 6, 8, 16];
for (const size of swissSizes) {
  runSimulationTest(`Swiss System - ${size} Teams Through All Swiss Rounds`, () => {
    db.reset();
    const totalRounds = Math.ceil(Math.log2(size));
    const teams = Array.from({ length: size }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
    generateBracket({ tournamentId: `swiss_${size}`, format: 'swiss', teamsList: teams, swissRounds: totalRounds });

    for (let r = 1; r <= totalRounds; r++) {
      const rMatches = Array.from(db.matches.values()).filter(m => m.tournament_id === `swiss_${size}` && m.round === r);
      rMatches.forEach(m => {
        if (m.status !== 'completed') {
          const winner = Math.random() > 0.5 ? m.team1_id : m.team2_id;
          reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: winner });
        }
      });

      if (r < totalRounds) {
        nextSwissRound(`swiss_${size}`, teams);
      } else {
        nextSwissRound(`swiss_${size}`, teams);
      }
    }

    const tourney = db.tournaments.get(`swiss_${size}`);
    if (tourney.bracket_status !== 'completed') {
      throw new Error(`Tournament status expected 'completed' but got '${tourney.bracket_status}'`);
    }
  });
}

// Test 4: Dynamic Score Corrections & Downstream Bracket Consistency
runSimulationTest(`Score Corrections: Re-reporting a match dynamically updates downstream brackets`, () => {
  db.reset();
  const teams = Array.from({ length: 4 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'corr_test', format: 'double_elimination', teamsList: teams });

  const r1m0 = Array.from(db.matches.values()).find(m => m.tournament_id === 'corr_test' && m.round === 1 && m.match_order === 0 && m.is_upper);
  
  // 1. First report T1 wins
  reportMatch({ matchId: r1m0.id, score1: 2, score2: 0, winner_id: r1m0.team1_id });
  const ubFinal = Array.from(db.matches.values()).find(m => m.tournament_id === 'corr_test' && m.round === 2 && m.is_upper);
  const lbR1 = Array.from(db.matches.values()).find(m => m.tournament_id === 'corr_test' && m.round === 1 && !m.is_upper);
  
  if (ubFinal.team1_id !== r1m0.team1_id || lbR1.team1_id !== r1m0.team2_id) {
    throw new Error("Initial report failed to set downstream slots");
  }

  // 2. Score correction: T2 actually won!
  reportMatch({ matchId: r1m0.id, score1: 0, score2: 2, winner_id: r1m0.team2_id });
  if (ubFinal.team1_id !== r1m0.team2_id || lbR1.team1_id !== r1m0.team1_id) {
    throw new Error("Score correction failed to replace team in downstream slots");
  }
});

// Test 5: Drag & Drop Slot Swapping Before Lock
runSimulationTest(`Slot Swapping: Swapping slots re-calculates byes and downstream assignments`, () => {
  db.reset();
  const teams = Array.from({ length: 10 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'swap_test', format: 'double_elimination', teamsList: teams });

  const m0 = Array.from(db.matches.values()).find(m => m.tournament_id === 'swap_test' && m.round === 1 && m.match_order === 0 && m.is_upper);
  const m1 = Array.from(db.matches.values()).find(m => m.tournament_id === 'swap_test' && m.round === 1 && m.match_order === 1 && m.is_upper);

  swapSlots({
    tournamentId: 'swap_test',
    sourceMatchId: m0.id,
    sourceSlot: 1,
    targetMatchId: m1.id,
    targetSlot: 2
  });

  // Check that tournament finishes cleanly after swapping
  while (true) {
    const active = Array.from(db.matches.values()).filter(m => m.tournament_id === 'swap_test' && m.status === 'active' && m.team1_id && m.team2_id);
    if (active.length === 0) {
      const uncompleted = Array.from(db.matches.values()).filter(m => m.tournament_id === 'swap_test' && m.status !== 'completed');
      if (uncompleted.length > 0) {
        throw new Error(`Deadlock after slot swap! ${uncompleted.length} uncompleted matches remain.`);
      }
      break;
    }
    const match = active[0];
    const winner = Math.random() > 0.5 ? match.team1_id : match.team2_id;
    reportMatch({ matchId: match.id, score1: 2, score2: 0, winner_id: winner });
  }

  const tourney = db.tournaments.get('swap_test');
  if (tourney.bracket_status !== 'completed') {
    throw new Error(`Tournament status expected 'completed' but got '${tourney.bracket_status}'`);
  }
});

/**
 * Team synchronization matching /api/tournament/[id]/bracket/sync-team
 */
function syncTeam({ tournamentId, action, teamId, oldTeamId, newTeamId, newTeamObj = null }) {
  const tournament = db.tournaments.get(tournamentId);
  if (!tournament) throw new Error("Tournament not found");

  const templateJson = tournament.template_json || {};
  if (!templateJson.abandoned_paths) templateJson.abandoned_paths = [];

  const allMatches = Array.from(db.matches.values()).filter(m => m.tournament_id === tournamentId);

  if (action === "remove") {
    const teamMatches = allMatches.filter(
      m => m.team1_id === teamId || m.team2_id === teamId || m.winner_id === teamId || m.loser_id === teamId
    );

    if (teamMatches.length > 0) {
      const pathInfo = teamMatches.map(m => ({
        id: m.id,
        wasTeam1: m.team1_id === teamId,
        wasTeam2: m.team2_id === teamId,
        wasWinner: m.winner_id === teamId,
        wasLoser: m.loser_id === teamId
      }));
      templateJson.abandoned_paths.push(pathInfo);
    }

    allMatches.forEach(m => {
      if (m.team1_id === teamId) m.team1_id = null;
      if (m.team2_id === teamId) m.team2_id = null;
      if (m.winner_id === teamId) m.winner_id = null;
      if (m.loser_id === teamId) m.loser_id = null;
      if (!m.team1_id || !m.team2_id) {
        if (m.status === 'active') m.status = 'pending';
      }
    });

    db.teams.delete(teamId);
    return { success: true };
  }

  if (action === "insert") {
    if (newTeamObj) {
      db.teams.set(teamId, { ...newTeamObj, id: teamId, tournament_id: tournamentId, status: 'accepted' });
    }

    if (templateJson.abandoned_paths.length > 0) {
      const pathToRestore = templateJson.abandoned_paths.shift();
      for (const mInfo of pathToRestore) {
        const match = db.matches.get(mInfo.id);
        if (match) {
          if (mInfo.wasTeam1) match.team1_id = teamId;
          if (mInfo.wasTeam2) match.team2_id = teamId;
          if (mInfo.wasWinner) match.winner_id = teamId;
          if (mInfo.wasLoser) match.loser_id = teamId;
          if (match.team1_id && match.team2_id && match.status !== 'completed') {
            match.status = 'active';
          }
        }
      }
      return { success: true, inserted: true, restored: true };
    }

    // Find empty match in Round 1 upper bracket
    const r1Matches = allMatches.filter(m => m.round === 1 && m.is_upper);
    const emptyMatch = r1Matches.find(m => !m.team1_id || !m.team2_id);

    if (emptyMatch) {
      const fieldToUpdate = !emptyMatch.team1_id ? "team1_id" : "team2_id";
      emptyMatch[fieldToUpdate] = teamId;

      if (emptyMatch.is_bye) {
        emptyMatch.is_bye = false;
        emptyMatch.winner_id = null;
        emptyMatch.status = (emptyMatch.team1_id && emptyMatch.team2_id) ? 'active' : 'pending';

        if (emptyMatch.next_match_id) {
          const nextMatch = db.matches.get(emptyMatch.next_match_id);
          if (nextMatch) {
            if (nextMatch.team1_id) nextMatch.team1_id = null;
            if (nextMatch.team2_id) nextMatch.team2_id = null;
            nextMatch.status = 'pending';
          }
        }
      } else {
        if (emptyMatch.team1_id && emptyMatch.team2_id) {
          emptyMatch.status = 'active';
        }
      }
      return { success: true, inserted: true };
    }

    return { success: true, inserted: false };
  }

  if (action === "substitute") {
    if (newTeamObj) {
      db.teams.set(newTeamId, { ...newTeamObj, id: newTeamId, tournament_id: tournamentId, status: 'accepted' });
    }

    const teamMatches = allMatches.filter(
      m => m.team1_id === oldTeamId || m.team2_id === oldTeamId || m.winner_id === oldTeamId || m.loser_id === oldTeamId
    );

    if (teamMatches.length > 0) {
      for (const m of teamMatches) {
        if (m.team1_id === oldTeamId) m.team1_id = newTeamId;
        if (m.team2_id === oldTeamId) m.team2_id = newTeamId;
        if (m.winner_id === oldTeamId) m.winner_id = newTeamId;
        if (m.loser_id === oldTeamId) m.loser_id = newTeamId;
        if (m.team1_id && m.team2_id && m.status !== 'completed') {
          m.status = 'active';
        }
      }
    } else if (templateJson.abandoned_paths.length > 0) {
      const pathToRestore = templateJson.abandoned_paths.shift();
      for (const mInfo of pathToRestore) {
        const match = db.matches.get(mInfo.id);
        if (match) {
          if (mInfo.wasTeam1) match.team1_id = newTeamId;
          if (mInfo.wasTeam2) match.team2_id = newTeamId;
          if (mInfo.wasWinner) match.winner_id = newTeamId;
          if (mInfo.wasLoser) match.loser_id = newTeamId;
          if (match.team1_id && match.team2_id && match.status !== 'completed') {
            match.status = 'active';
          }
        }
      }
    }

    const oldTeam = db.teams.get(oldTeamId);
    if (oldTeam) oldTeam.status = 'disqualified';

    return { success: true, substituted: true };
  }
}

// Test 6: Single Elimination - Direct Substitution in R1 & Full Progression
runSimulationTest(`Single Elimination: Team Substitution & match-by-match completion to final`, () => {
  db.reset();
  const teams = Array.from({ length: 8 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'se_sub_test', format: 'single_elimination', teamsList: teams });

  syncTeam({
    tournamentId: 'se_sub_test',
    action: 'substitute',
    oldTeamId: 'T3',
    newTeamId: 'SUB_T3',
    newTeamObj: { name: "Substitute Team 3" }
  });

  while (true) {
    const active = Array.from(db.matches.values()).filter(m => m.tournament_id === 'se_sub_test' && m.status === 'active' && m.team1_id && m.team2_id);
    if (active.length === 0) {
      const uncompleted = Array.from(db.matches.values()).filter(m => m.tournament_id === 'se_sub_test' && m.status !== 'completed');
      if (uncompleted.length > 0) throw new Error(`Deadlock! ${uncompleted.length} uncompleted matches.`);
      break;
    }
    const match = active[0];
    const winner = Math.random() > 0.5 ? match.team1_id : match.team2_id;
    reportMatch({ matchId: match.id, score1: 2, score2: 0, winner_id: winner });
  }

  const tourney = db.tournaments.get('se_sub_test');
  if (tourney.bracket_status !== 'completed') throw new Error("Tournament not completed");
});

// Test 7: Single Elimination - Remove Team (abandoned path) -> Insert Replacement -> Full Progression
runSimulationTest(`Single Elimination: Remove team -> Insert replacement -> Match-by-match completion`, () => {
  db.reset();
  const teams = Array.from({ length: 8 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'se_remove_insert_test', format: 'single_elimination', teamsList: teams });

  syncTeam({
    tournamentId: 'se_remove_insert_test',
    action: 'remove',
    teamId: 'T4'
  });

  syncTeam({
    tournamentId: 'se_remove_insert_test',
    action: 'insert',
    teamId: 'NEW_T4',
    newTeamObj: { name: "New Team 4" }
  });

  while (true) {
    const active = Array.from(db.matches.values()).filter(m => m.tournament_id === 'se_remove_insert_test' && m.status === 'active' && m.team1_id && m.team2_id);
    if (active.length === 0) {
      const uncompleted = Array.from(db.matches.values()).filter(m => m.tournament_id === 'se_remove_insert_test' && m.status !== 'completed');
      if (uncompleted.length > 0) throw new Error(`Deadlock! ${uncompleted.length} uncompleted matches.`);
      break;
    }
    const match = active[0];
    const winner = Math.random() > 0.5 ? match.team1_id : match.team2_id;
    reportMatch({ matchId: match.id, score1: 2, score2: 0, winner_id: winner });
  }

  const tourney = db.tournaments.get('se_remove_insert_test');
  if (tourney.bracket_status !== 'completed') throw new Error("Tournament not completed");
});

// Test 8: Double Elimination - Mid-tournament DQ & Substitution in Upper Bracket
runSimulationTest(`Double Elimination: Mid-tournament DQ & substitution -> Full completion to Grand Final`, () => {
  db.reset();
  const teams = Array.from({ length: 8 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'de_sub_test', format: 'double_elimination', teamsList: teams });

  // Play UB R1
  const r1Matches = Array.from(db.matches.values()).filter(m => m.tournament_id === 'de_sub_test' && m.round === 1 && m.is_upper);
  r1Matches.forEach(m => reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id }));

  // Substitute T1 (who is in UB R2)
  syncTeam({
    tournamentId: 'de_sub_test',
    action: 'substitute',
    oldTeamId: 'T1',
    newTeamId: 'SUB_T1_PRO',
    newTeamObj: { name: "Pro Sub Team 1" }
  });

  while (true) {
    const active = Array.from(db.matches.values()).filter(m => m.tournament_id === 'de_sub_test' && m.status === 'active' && m.team1_id && m.team2_id);
    if (active.length === 0) {
      const uncompleted = Array.from(db.matches.values()).filter(m => m.tournament_id === 'de_sub_test' && m.status !== 'completed');
      if (uncompleted.length > 0) throw new Error(`Deadlock! ${uncompleted.length} uncompleted matches.`);
      break;
    }
    const match = active[Math.floor(Math.random() * active.length)];
    const winner = Math.random() > 0.5 ? match.team1_id : match.team2_id;
    reportMatch({ matchId: match.id, score1: 2, score2: 1, winner_id: winner });
  }

  const tourney = db.tournaments.get('de_sub_test');
  if (tourney.bracket_status !== 'completed') throw new Error("Tournament not completed");
});

// Test 9: Double Elimination (10 Teams with Byes) - Lower Bracket Substitution & Full Progression
runSimulationTest(`Double Elimination (10 Teams): Lower Bracket substitution -> Full completion to Grand Final`, () => {
  db.reset();
  const teams = Array.from({ length: 10 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'de10_sub_test', format: 'double_elimination', teamsList: teams });

  syncTeam({
    tournamentId: 'de10_sub_test',
    action: 'substitute',
    oldTeamId: 'T8',
    newTeamId: 'SUB_T8',
    newTeamObj: { name: "Substitute Team 8" }
  });

  while (true) {
    const active = Array.from(db.matches.values()).filter(m => m.tournament_id === 'de10_sub_test' && m.status === 'active' && m.team1_id && m.team2_id);
    if (active.length === 0) {
      const uncompleted = Array.from(db.matches.values()).filter(m => m.tournament_id === 'de10_sub_test' && m.status !== 'completed');
      if (uncompleted.length > 0) throw new Error(`Deadlock! ${uncompleted.length} uncompleted matches.`);
      break;
    }
    const match = active[Math.floor(Math.random() * active.length)];
    const winner = Math.random() > 0.5 ? match.team1_id : match.team2_id;
    reportMatch({ matchId: match.id, score1: 2, score2: 1, winner_id: winner });
  }

  const tourney = db.tournaments.get('de10_sub_test');
  if (tourney.bracket_status !== 'completed') throw new Error("Tournament not completed");
});

// Test 10: Swiss System - Team drop / DQ after Round 1 (Odd Teams & Byes)
runSimulationTest(`Swiss System: Team DQ/Drop after Round 1 -> Pairing with Auto-Bye -> Completion`, () => {
  db.reset();
  const teams = Array.from({ length: 8 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'swiss_dq_test', format: 'swiss', teamsList: teams, swissRounds: 3 });

  // Play Round 1
  const r1Matches = Array.from(db.matches.values()).filter(m => m.tournament_id === 'swiss_dq_test' && m.round === 1);
  r1Matches.forEach(m => reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id }));

  // Disqualify T4
  const dqTeam = db.teams.get('T4');
  if (dqTeam) dqTeam.status = 'disqualified';

  // Round 2 (7 active teams -> 1 bye)
  const r2 = nextSwissRound('swiss_dq_test');
  const r2Matches = Array.from(db.matches.values()).filter(m => m.tournament_id === 'swiss_dq_test' && m.round === 2);
  r2Matches.forEach(m => {
    if (m.status !== 'completed') {
      reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id });
    }
  });

  // Round 3
  const r3 = nextSwissRound('swiss_dq_test');
  const r3Matches = Array.from(db.matches.values()).filter(m => m.tournament_id === 'swiss_dq_test' && m.round === 3);
  r3Matches.forEach(m => {
    if (m.status !== 'completed') {
      reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id });
    }
  });

  nextSwissRound('swiss_dq_test');
  const tourney = db.tournaments.get('swiss_dq_test');
  if (tourney.bracket_status !== 'completed') throw new Error("Swiss tournament not completed");
});

// Test 11: Swiss System - Team Substitution after Round 1
runSimulationTest(`Swiss System: Mid-tournament team substitution -> Seamless round pairing to completion`, () => {
  db.reset();
  const teams = Array.from({ length: 6 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'swiss_sub_test', format: 'swiss', teamsList: teams, swissRounds: 3 });

  // Play Round 1
  const r1Matches = Array.from(db.matches.values()).filter(m => m.tournament_id === 'swiss_sub_test' && m.round === 1);
  r1Matches.forEach(m => reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id }));

  // Substitute T2
  syncTeam({
    tournamentId: 'swiss_sub_test',
    action: 'substitute',
    oldTeamId: 'T2',
    newTeamId: 'SUB_T2',
    newTeamObj: { name: "Substitute Team 2" }
  });

  for (let r = 2; r <= 3; r++) {
    nextSwissRound('swiss_sub_test');
    const rMatches = Array.from(db.matches.values()).filter(m => m.tournament_id === 'swiss_sub_test' && m.round === r);
    rMatches.forEach(m => {
      if (m.status !== 'completed') {
        reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id });
      }
    });
  }

  nextSwissRound('swiss_sub_test');
  const tourney = db.tournaments.get('swiss_sub_test');
  if (tourney.bracket_status !== 'completed') throw new Error("Swiss tournament not completed");
});

// Test 12: 16-Team Single Elimination - Disruptions at 50% (QF) and 75% (SF) with score correction & walkovers
runSimulationTest(`Mid-Tournament SE (16 Teams): QF substitutions, vacant slot restore, walkover & SF correction`, () => {
  db.reset();
  const teams = Array.from({ length: 16 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'se16_mid_suite', format: 'single_elimination', teamsList: teams });

  // Play R1
  const r1 = Array.from(db.matches.values()).filter(m => m.tournament_id === 'se16_mid_suite' && m.round === 1);
  r1.forEach(m => reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id }));

  const qfMatches = Array.from(db.matches.values()).filter(m => m.tournament_id === 'se16_mid_suite' && m.round === 2);

  // Substitute in QF 0
  syncTeam({ tournamentId: 'se16_mid_suite', action: 'substitute', oldTeamId: 'T1', newTeamId: 'SUB_CHAMP', newTeamObj: { name: "Champion Sub" } });

  // Remove & Insert in QF 1
  syncTeam({ tournamentId: 'se16_mid_suite', action: 'remove', teamId: 'T2' });
  syncTeam({ tournamentId: 'se16_mid_suite', action: 'insert', teamId: 'SUB_WILD', newTeamObj: { name: "Wild Sub" } });

  // Walkover in QF 2
  reportMatch({ matchId: qfMatches[2].id, score1: 2, score2: 0, winner_id: qfMatches[2].team1_id });

  // Play remaining QF
  while (true) {
    const active = Array.from(db.matches.values()).filter(m => m.tournament_id === 'se16_mid_suite' && m.round === 2 && m.status === 'active');
    if (active.length === 0) break;
    reportMatch({ matchId: active[0].id, score1: 2, score2: 0, winner_id: active[0].team1_id });
  }

  // SF score correction
  const sf = Array.from(db.matches.values()).filter(m => m.tournament_id === 'se16_mid_suite' && m.round === 3);
  reportMatch({ matchId: sf[0].id, score1: 2, score2: 0, winner_id: sf[0].team1_id });
  reportMatch({ matchId: sf[0].id, score1: 1, score2: 2, winner_id: sf[0].team2_id });
  reportMatch({ matchId: sf[1].id, score1: 2, score2: 1, winner_id: sf[1].team1_id });

  // Final
  const fin = Array.from(db.matches.values()).find(m => m.tournament_id === 'se16_mid_suite' && m.round === 4);
  reportMatch({ matchId: fin.id, score1: 2, score2: 0, winner_id: fin.team1_id });

  const tourney = db.tournaments.get('se16_mid_suite');
  if (tourney.bracket_status !== 'completed') throw new Error("Tournament not completed");
});

// Test 13: 16-Team Double Elimination - Mid-tournament UB & LB Disruptions
runSimulationTest(`Mid-Tournament DE (16 Teams): Disruptions across UB R2, LB R2, and LB R4 to Grand Final`, () => {
  db.reset();
  const teams = Array.from({ length: 16 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'de16_mid_suite', format: 'double_elimination', teamsList: teams });

  // Play UB R1
  const ubR1 = Array.from(db.matches.values()).filter(m => m.tournament_id === 'de16_mid_suite' && m.round === 1 && m.is_upper);
  ubR1.forEach(m => reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id }));

  // Play LB R1
  const lbR1 = Array.from(db.matches.values()).filter(m => m.tournament_id === 'de16_mid_suite' && m.round === 1 && !m.is_upper);
  lbR1.forEach(m => reportMatch({ matchId: m.id, score1: 2, score2: 1, winner_id: m.team1_id }));

  // Substitute in UB R2
  syncTeam({ tournamentId: 'de16_mid_suite', action: 'substitute', oldTeamId: 'T1', newTeamId: 'DE_SUB_ALPHA', newTeamObj: { name: "Alpha Sub" } });

  // Substitute in LB R2
  syncTeam({ tournamentId: 'de16_mid_suite', action: 'substitute', oldTeamId: lbR1[0].winner_id, newTeamId: 'DE_SUB_BETA', newTeamObj: { name: "Beta Sub" } });

  while (true) {
    const active = Array.from(db.matches.values()).filter(m => m.tournament_id === 'de16_mid_suite' && m.status === 'active' && m.team1_id && m.team2_id);
    if (active.length === 0) break;
    const m = active[Math.floor(Math.random() * active.length)];
    const winner = Math.random() > 0.5 ? m.team1_id : m.team2_id;
    reportMatch({ matchId: m.id, score1: 2, score2: 1, winner_id: winner });
  }

  const tourney = db.tournaments.get('de16_mid_suite');
  if (tourney.bracket_status !== 'completed') throw new Error("Tournament not completed");
});

// Test 14: 16-Team Swiss System - Multi-team drops and substitutions after Round 2
runSimulationTest(`Mid-Tournament Swiss (16 Teams): 3 team DQs after Round 2 -> Auto-Byes & pairing to round 4`, () => {
  db.reset();
  const teams = Array.from({ length: 16 }, (_, i) => ({ id: `T${i+1}`, name: `Team ${i+1}` }));
  generateBracket({ tournamentId: 'sw16_mid_suite', format: 'swiss', teamsList: teams, swissRounds: 4 });

  // Round 1
  const r1 = Array.from(db.matches.values()).filter(m => m.tournament_id === 'sw16_mid_suite' && m.round === 1);
  r1.forEach(m => reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id }));

  // Round 2
  nextSwissRound('sw16_mid_suite');
  const r2 = Array.from(db.matches.values()).filter(m => m.tournament_id === 'sw16_mid_suite' && m.round === 2);
  r2.forEach(m => reportMatch({ matchId: m.id, score1: 2, score2: 1, winner_id: m.team1_id }));

  // Disqualify 3 teams (leaving 13 active teams)
  db.teams.get('T4').status = 'disqualified';
  db.teams.get('T8').status = 'disqualified';
  db.teams.get('T12').status = 'disqualified';

  // Substitute 1 team
  syncTeam({ tournamentId: 'sw16_mid_suite', action: 'substitute', oldTeamId: 'T16', newTeamId: 'SW_SUB_HERO', newTeamObj: { name: "Hero Sub" } });

  // Round 3
  nextSwissRound('sw16_mid_suite');
  const r3 = Array.from(db.matches.values()).filter(m => m.tournament_id === 'sw16_mid_suite' && m.round === 3);
  r3.forEach(m => {
    if (m.status !== 'completed') reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id });
  });

  // Round 4
  nextSwissRound('sw16_mid_suite');
  const r4 = Array.from(db.matches.values()).filter(m => m.tournament_id === 'sw16_mid_suite' && m.round === 4);
  r4.forEach(m => {
    if (m.status !== 'completed') reportMatch({ matchId: m.id, score1: 2, score2: 0, winner_id: m.team1_id });
  });

  nextSwissRound('sw16_mid_suite');
  const tourney = db.tournaments.get('sw16_mid_suite');
  if (tourney.bracket_status !== 'completed') throw new Error("Swiss tournament not completed");
});

console.log("\n==============================================================");
console.log(`SUMMARY: ${passedCount}/${totalCount} TESTS PASSED (${((passedCount / totalCount) * 100).toFixed(1)}%)`);
console.log("==============================================================");



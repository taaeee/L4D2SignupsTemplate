import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";

export async function POST(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await getServerSession(getAuthOptions(req));

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: tournament, error: tError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (tError || !tournament) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    const isCreator = session.user.id === tournament.creator_id;
    const isModerator = (tournament.moderators as any[])?.includes(session.user.id);

    if (!isCreator && !isModerator) {
      return NextResponse.json({ error: "Sin permisos suficientes" }, { status: 403 });
    }

    if (tournament.status === "locked") {
      return NextResponse.json(
        { error: "No se pueden modificar enfrentamientos una vez iniciado o cerrado el torneo" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { sourceMatchId, sourceSlot, targetMatchId, targetSlot } = body;

    if (!sourceMatchId || !sourceSlot || !targetMatchId || !targetSlot) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    if (sourceMatchId === targetMatchId && sourceSlot === targetSlot) {
      return NextResponse.json({ success: true, message: "Mismo slot seleccionado" });
    }

    // Fetch all tournament matches to handle next_match propagation
    const { data: allMatches, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", id);

    if (matchesError || !allMatches) {
      return NextResponse.json({ error: "Error al obtener enfrentamientos" }, { status: 500 });
    }

    const sourceMatch = allMatches.find((m) => m.id === sourceMatchId);
    const targetMatch = allMatches.find((m) => m.id === targetMatchId);

    if (!sourceMatch || !targetMatch) {
      return NextResponse.json({ error: "Enfrentamientos no encontrados" }, { status: 404 });
    }

    const sourceField = sourceSlot === 1 ? "team1_id" : "team2_id";
    const targetField = targetSlot === 1 ? "team1_id" : "team2_id";

    const teamFromSource = sourceMatch[sourceField];
    const teamFromTarget = targetMatch[targetField];

    sourceMatch[sourceField] = teamFromTarget;
    targetMatch[targetField] = teamFromSource;

    const matchesToUpdate: Map<string, any> = new Map();

    const format = (tournament.template_json as any)?.tournamentFormat || "single_elimination";
    const isSwiss = format === "swiss";

    if (isSwiss) {
      // For Swiss format, simple swap
      matchesToUpdate.set(sourceMatch.id, {
        [sourceField]: sourceMatch[sourceField],
      });
      matchesToUpdate.set(targetMatch.id, {
        [targetField]: targetMatch[targetField],
      });
    } else {
      // Bracket formats (Single / Double Elimination)
      const evaluateMatchBye = (matchObj: any) => {
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

        matchesToUpdate.set(matchObj.id, {
          team1_id: matchObj.team1_id,
          team2_id: matchObj.team2_id,
          is_bye: matchObj.is_bye,
          status: matchObj.status,
          winner_id: matchObj.winner_id,
        });

        // If this match advances to next_match_id
        if (matchObj.next_match_id) {
          const nextMatch = allMatches.find((m) => m.id === matchObj.next_match_id);
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

            matchesToUpdate.set(nextMatch.id, {
              team1_id: nextMatch.team1_id,
              team2_id: nextMatch.team2_id,
              status: nextMatch.status,
            });
          }
        }
      };

      // Only recalculate byes if the matches are in Round 1 upper bracket
      if (sourceMatch.round === 1 && sourceMatch.is_upper) {
        evaluateMatchBye(sourceMatch);
      } else {
        matchesToUpdate.set(sourceMatch.id, { [sourceField]: sourceMatch[sourceField] });
      }

      if (targetMatch.round === 1 && targetMatch.is_upper) {
        evaluateMatchBye(targetMatch);
      } else {
        matchesToUpdate.set(targetMatch.id, { [targetField]: targetMatch[targetField] });
      }

      if (format === "double_elimination") {
        const ubR1Matches = allMatches.filter((m) => m.round === 1 && m.is_upper);
        const lbR1Matches = allMatches.filter((m) => m.round === 1 && !m.is_upper);
        const lbR2Matches = allMatches.filter((m) => m.round === 2 && !m.is_upper);

        const lbR1TeamCount: Record<string, number> = {};
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
          matchesToUpdate.set(lbMatch.id, {
            is_bye: lbMatch.is_bye,
            status: lbMatch.status,
          });

          if (lbMatch.next_match_id) {
            const lbR2Match = lbR2Matches.find((m) => m.id === lbMatch.next_match_id);
            if (lbR2Match) {
              const isR2Bye = incomingTeams === 0;
              lbR2Match.is_bye = isR2Bye;
              lbR2Match.status = isR2Bye ? "completed" : "pending";
              matchesToUpdate.set(lbR2Match.id, {
                is_bye: lbR2Match.is_bye,
                status: lbR2Match.status,
              });
            }
          }
        }
      }
    }

    // Persist all modified matches
    for (const [matchId, updates] of matchesToUpdate.entries()) {
      const { error: updateError } = await supabase
        .from("matches")
        .update(updates)
        .eq("id", matchId);

      if (updateError) {
        throw updateError;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Enfrentamientos actualizados exitosamente",
    });
  } catch (err: any) {
    console.error("Error in swap-slots endpoint:", err);
    return NextResponse.json(
      { error: err.message || "Error al actualizar enfrentamientos" },
      { status: 500 }
    );
  }
}

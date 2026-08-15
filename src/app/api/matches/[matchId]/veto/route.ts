import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { matchId } = await params;
    const body = await request.json().catch(() => ({}));
    const format = body.format || "bo1";
    const customPool = body.customMaps;

    // Fetch match
    const { data: match, error: matchError } = await supabaseAdmin
      .from("matches")
      .select("*, tournaments(id, creator_id, moderators)")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });
    }

    if (!match.team1_id || !match.team2_id) {
      return NextResponse.json(
        { error: "El partido debe tener ambos equipos asignados para generar un veto de mapas." },
        { status: 400 }
      );
    }

    // Default 7 competitive maps if not specified
    const defaultCompetitiveMaps = [
      { name: "Dead Center", type: "official", image: "/maps/c1.jpg" },
      { name: "Dark Carnival", type: "official", image: "/maps/c2.jpg" },
      { name: "Swamp Fever", type: "official", image: "/maps/c3.jpg" },
      { name: "Hard Rain", type: "official", image: "/maps/c4.jpg" },
      { name: "The Parish", type: "official", image: "/maps/c5.jpg" },
      { name: "The Passing", type: "official", image: "/maps/c6.jpg" },
      { name: "No Mercy", type: "official", image: "/maps/c8.jpg" },
    ];

    let poolMaps = defaultCompetitiveMaps;
    if (Array.isArray(customPool) && customPool.length >= 3) {
      poolMaps = customPool.map((name: string) => ({
        name,
        type: "official",
        image: "/maps/c1.jpg",
      }));
    }

    const mapsWithStatus = poolMaps.map((m) => ({
      ...m,
      status: "available",
    }));

    const teamAToken = crypto.randomBytes(6).toString("hex");
    const teamBToken = crypto.randomBytes(6).toString("hex");

    const initialState = {
      status: "in_progress",
      currentTurn: match.team1_id,
      history: [],
      maps: mapsWithStatus,
    };

    // Insert into map_vetoes
    const { data: veto, error: vetoError } = await supabaseAdmin
      .from("map_vetoes")
      .insert({
        tournament_id: match.tournament_id,
        team_a_id: match.team1_id,
        team_b_id: match.team2_id,
        format,
        team_a_token: teamAToken,
        team_b_token: teamBToken,
        match_id: matchId,
        state: initialState,
      })
      .select()
      .single();

    if (vetoError) {
      console.error("Error creating map veto for match:", vetoError);
      return NextResponse.json(
        { error: "Error al generar la sesión de veto de mapas." },
        { status: 500 }
      );
    }

    // Link veto to match
    await supabaseAdmin
      .from("matches")
      .update({ map_veto_id: veto.id })
      .eq("id", matchId);

    return NextResponse.json({
      success: true,
      vetoId: veto.id,
      teamAToken,
      teamBToken,
      spectatorUrl: `/map-veto/${veto.id}`,
      teamAUrl: `/map-veto/${veto.id}?token=${teamAToken}`,
      teamBUrl: `/map-veto/${veto.id}?token=${teamBToken}`,
    });
  } catch (error: any) {
    console.error("Match veto POST error:", error);
    return NextResponse.json(
      { error: "Error interno al crear el veto de mapas." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request, { params }) {
  const id = params.id;

  try {
    // 1. Obtener el torneo
    const { data: tournament, error: tError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (tError || !tournament) {
      return new NextResponse("Tournament not found", { status: 404 });
    }

    // 2. Obtener los equipos y miembros
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*, team_members(*)")
      .eq("tournament_id", id);

    if (teamsError) {
      return new NextResponse("Error fetching data", { status: 500 });
    }

    // 3. Formatear como CSV
    // Cabeceras: Team Name, Logo URL, Player Name, Role, SteamID64, L4D2 Playtime, Profile Status, Registered At
    let csvStr = "Team Name,Logo URL,Player Name,Role,SteamID64,Steam URL,L4D2 Playtime (Hours),Profile Status,Registered At\n";

    for (const team of teams) {
      const tName = `"${(team.name || "").replace(/"/g, '""')}"`;
      const tLogo = team.logo_url || "";
      const tDate = new Date(team.created_at).toISOString();

      if (!team.team_members || team.team_members.length === 0) {
         csvStr += `${tName},${tLogo},,,,,"",${tDate}\n`;
      } else {
        for (const member of team.team_members) {
          const pName = `"${(member.name || "").replace(/"/g, '""')}"`;
          const pRole = `"${(member.role || "").replace(/"/g, '""')}"`;
          const steamId = member.steam_id_64 || "";
          const steamUrl = steamId ? `https://steamcommunity.com/profiles/${steamId}` : "";
          const hours = member.l4d2_playtime_hours || 0;
          const status = member.is_profile_private ? "Private" : "Public";

          csvStr += `${tName},${tLogo},${pName},${pRole},${steamId},${steamUrl},${hours},${status},${tDate}\n`;
        }
      }
    }

    return new NextResponse(csvStr, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tournament_${id}_registrations.csv"`,
      },
    });

  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

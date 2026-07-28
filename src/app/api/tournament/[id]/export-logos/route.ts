import { supabaseAdmin } from "@/lib/supabase-admin";
import JSZip from "jszip";

export async function GET(request: Request, { params }: { params: any }) {
  const { id } = await params;

  try {
    // 1. Fetch tournament details
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from("tournaments")
      .select("name")
      .eq("id", id)
      .single();

    if (tournamentError || !tournament) {
      return new Response("Torneo no encontrado", { status: 404 });
    }

    // 2. Fetch all accepted teams for this tournament
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from("teams")
      .select("id, name, logo_url")
      .eq("tournament_id", id)
      .eq("status", "accepted");

    if (teamsError) {
      return new Response("Error al obtener los equipos", { status: 500 });
    }

    if (!teams || teams.length === 0) {
      return new Response("No hay equipos aceptados", { status: 404 });
    }

    // 3. Create a new ZIP
    const zip = new JSZip();

    // 4. Download logos and add to ZIP
    for (const team of teams) {
      let tLogoUrl = team.logo_url;
      if (!tLogoUrl) continue;
      if (tLogoUrl.startsWith("{")) {
        try {
          const parsed = JSON.parse(tLogoUrl);
          tLogoUrl = parsed.url;
        } catch (e) {}
      }
      if (!tLogoUrl) continue;

      try {
        const fetchRes = await fetch(tLogoUrl);
        if (!fetchRes.ok) continue;

        const arrayBuffer = await fetchRes.arrayBuffer();
        
        // Get the content type to figure out the extension
        const contentType = fetchRes.headers.get("content-type");
        let ext = ".png";
        if (contentType) {
          if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = ".jpg";
          if (contentType.includes("webp")) ext = ".webp";
          if (contentType.includes("gif")) ext = ".gif";
        }
        
        // Clean team name for the filename
        const safeTeamName = team.name.replace(/[^a-z0-9\-_]/gi, '_');
        
        zip.file(`${safeTeamName}${ext}`, arrayBuffer);
      } catch (e) {
        console.error(`Failed to fetch logo for team ${team.name}:`, e);
      }
    }

    // 5. Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });

    // 6. Return response
    const safeTournamentName = tournament.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", `attachment; filename=logos_${safeTournamentName}.zip`);
    headers.set("Content-Length", zipBuffer.length.toString());

    return new Response(zipBuffer as any, { headers });

  } catch (error: any) {
    console.error("Export Logos API Error:", error);
    return new Response("Internal Server Error: " + error.message, { status: 500 });
  }
}

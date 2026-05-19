import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import ExcelJS from "exceljs";

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

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

    // 3. Crear Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Registros");

    // Definir columnas
    worksheet.columns = [
      { header: 'Team Name', key: 'teamName', width: 25 },
      { header: 'Logo', key: 'logo', width: 20 },
      { header: 'Player Name', key: 'playerName', width: 25 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'SteamID64', key: 'steamId', width: 25 },
      { header: 'Steam URL', key: 'steamUrl', width: 45 },
      { header: 'L4D2 Playtime (Hours)', key: 'hours', width: 25 },
      { header: 'Profile Status', key: 'status', width: 15 },
      { header: 'Registered At', key: 'date', width: 25 }
    ];

    // Estilos cabecera
    worksheet.getRow(1).font = { bold: true };

    let currentRow = 2;

    for (const team of teams) {
      const numMembers = team.team_members && team.team_members.length > 0 ? team.team_members.length : 1;
      const startRow = currentRow;
      const endRow = currentRow + numMembers - 1;

      const tName = team.name || "";
      let tLogoUrl = team.logo_url || "";
      if (tLogoUrl.startsWith("{")) {
        try {
          const parsed = JSON.parse(tLogoUrl);
          tLogoUrl = parsed.url || "";
        } catch (e) {
          console.warn("Could not parse logo_url JSON for team", tName);
        }
      }
      
      const tDate = new Date(team.created_at).toLocaleString();

      if (!team.team_members || team.team_members.length === 0) {
         const row = worksheet.addRow({ teamName: tName, date: tDate });
         row.height = 50; 
         currentRow++;
      } else {
        for (const member of team.team_members) {
          const steamId = member.steam_id_64 || "";
          const steamUrl = steamId ? `https://steamcommunity.com/profiles/${steamId}` : "";
          const row = worksheet.addRow({
            teamName: tName,
            playerName: member.name || "",
            role: member.role || "",
            steamUrl: steamUrl,
            hours: member.l4d2_playtime_hours || 0,
            status: member.is_profile_private ? "Private" : "Public",
            date: tDate
          });
          
          // Forzar texto para SteamID para evitar notación científica
          row.getCell('steamId').value = steamId ? steamId.toString() : "";
          row.getCell('steamId').numFmt = '@';

          row.height = 50; // altura para que el logo se vea bien
          currentRow++;
        }
      }

      // Combinar celdas
      if (numMembers > 1) {
        worksheet.mergeCells(`A${startRow}:A${endRow}`); // Team Name
        worksheet.mergeCells(`B${startRow}:B${endRow}`); // Logo
        worksheet.mergeCells(`I${startRow}:I${endRow}`); // Registered At
      }

      // Descargar e insertar imagen si hay URL
      if (tLogoUrl) {
        try {
          const response = await fetch(tLogoUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            let extension = 'png';
            if (tLogoUrl.toLowerCase().includes('.jpg') || tLogoUrl.toLowerCase().includes('.jpeg')) extension = 'jpeg';
            if (tLogoUrl.toLowerCase().includes('.gif')) extension = 'gif';
            
            const imageId = workbook.addImage({
              buffer: Buffer.from(buffer),
              extension: extension,
            });

            worksheet.addImage(imageId, {
              tl: { col: 1.1, row: startRow - 1 + 0.1 },
              br: { col: 1.9, row: endRow - 1 + 0.9 },
              editAs: 'oneCell'
            });
          }
        } catch (imgError) {
          console.error("Error loading image for team", tName, imgError);
        }
      }
    }

    // Centrar todo vertical y horizontalmente
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tournament_${id}_registrations.xlsx"`,
      },
    });

  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

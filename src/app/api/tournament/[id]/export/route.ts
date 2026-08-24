import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import ExcelJS from "exceljs";
import { rateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/rate-limit";

// Rate limiter: 15 excel export requests per minute per IP
const excelExportLimiter = rateLimit({
  interval: 60 * 1000,
});

export async function GET(request: Request, { params }: { params: any }) {
  const ip = getClientIp(request);
  const { success, reset } = excelExportLimiter.check(15, `export_excel_${ip}`);
  if (!success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return rateLimitExceededResponse(
      "Demasiadas descargas de registros. Por favor, espera un momento antes de intentar de nuevo.",
      retryAfterSeconds
    );
  }

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
    const baseColumns: any[] = [
      { header: 'Team Name', key: 'teamName', width: 25 },
      { header: 'Team Status', key: 'teamStatus', width: 18 },
      { header: 'Logo', key: 'logo', width: 20 },
    ];

    const customTeamFields = (tournament.template_json as any)?.fields?.filter((f: any) => f.name !== "Country" && f.name !== "Region" && f.name !== "Tag") || [];
    for (const f of customTeamFields) {
      baseColumns.push({ header: `Team: ${f.name}`, key: `team_${f.name}`, width: 25 });
    }

    baseColumns.push(
      { header: 'Player Name', key: 'playerName', width: 25 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'SteamID64', key: 'steamId', width: 25 },
      { header: 'Steam URL', key: 'steamUrl', width: 45 },
      { header: 'L4D2 Playtime (Hours)', key: 'hours', width: 25 },
      { header: 'Profile Status', key: 'status', width: 15 }
    );

    const customPlayerFields = (tournament.template_json as any)?.playerFields || [];
    for (const f of customPlayerFields) {
      baseColumns.push({ header: `Player: ${f.name}`, key: `player_${f.name}`, width: 25 });
    }

    baseColumns.push({ header: 'Registered At', key: 'date', width: 25 });

    worksheet.columns = baseColumns;

    // Estilos cabecera
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' } // Dark blue
    };

    let currentRow = 2;
    let isAlternate = false;

    for (const team of teams) {
      const numMembers = team.team_members && team.team_members.length > 0 ? team.team_members.length : 1;
      const startRow = currentRow;
      const endRow = currentRow + numMembers - 1;

      const teamBgColor = isAlternate ? 'FFE8F5E9' : 'FFE3F2FD'; // Alternating light green or light blue
      isAlternate = !isAlternate;

      const tName = team.name || "";
      let tLogoUrl = team.logo_url || "";
      let teamCustomFields: any = {};

      if (tLogoUrl.startsWith("{")) {
        try {
          const parsed = JSON.parse(tLogoUrl);
          tLogoUrl = parsed.url || "";
          if (parsed.answers) {
            for (const key of Object.keys(parsed.answers)) {
              teamCustomFields[`team_${key}`] = parsed.answers[key];
            }
          }
        } catch (e) {
          console.warn("Could not parse logo_url JSON for team", tName);
        }
      }
      
      const tDate = new Date(team.created_at as string).toLocaleString();
      const tStatus = team.status === 'accepted' ? 'En competencia' : team.status === 'eliminated' ? 'Eliminado' : team.status === 'disqualified' ? 'Descalificado' : team.status === 'withdrawn' ? 'Retirado' : team.status || 'Pendiente';

      if (!team.team_members || team.team_members.length === 0) {
         const row = worksheet.addRow({ teamName: tName, teamStatus: tStatus, ...teamCustomFields, date: tDate });
         row.height = 50; 
         currentRow++;
      } else {
        for (const member of team.team_members) {
          const steamId = member.steam_id_64 || "";
          const steamUrl = steamId ? `https://steamcommunity.com/profiles/${steamId}` : "";
          
          let roleTitle = member.role || "";
          let playerCustomFields: any = {};
          if (member.role && member.role.startsWith("{")) {
            try {
              const parsed = JSON.parse(member.role);
              roleTitle = parsed.title || "";
              if (parsed.answers) {
                for (const key of Object.keys(parsed.answers)) {
                  playerCustomFields[`player_${key}`] = parsed.answers[key];
                }
              }
            } catch (e) {}
          }

          const row = worksheet.addRow({
            teamName: tName,
            teamStatus: tStatus,
            ...teamCustomFields,
            playerName: member.name || "",
            role: roleTitle,
            steamUrl: steamUrl,
            hours: member.l4d2_playtime_hours || 0,
            status: member.is_profile_private ? "Private" : "Public",
            date: tDate,
            ...playerCustomFields
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
        worksheet.mergeCells(startRow, 1, endRow, 1); // Team Name
        worksheet.mergeCells(startRow, 2, endRow, 2); // Logo
        
        let colIndex = 3;
        for (let i = 0; i < customTeamFields.length; i++) {
          worksheet.mergeCells(startRow, colIndex, endRow, colIndex);
          colIndex++;
        }
        
        worksheet.mergeCells(startRow, baseColumns.length, endRow, baseColumns.length); // Registered At
      }

      // Aplicar color de fondo al equipo
      for (let r = startRow; r <= endRow; r++) {
        const row = worksheet.getRow(r);
        for (let c = 1; c <= baseColumns.length; c++) {
          row.getCell(c).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: teamBgColor }
          };
        }
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
              buffer: Buffer.from(buffer) as any,
              extension: extension as 'png' | 'jpeg' | 'gif',
            });

            worksheet.addImage(imageId, {
              tl: { col: 1.1, row: startRow - 1 + 0.1 } as any,
              br: { col: 1.9, row: endRow - 1 + 0.9 } as any,
              editAs: 'oneCell'
            });
          }
        } catch (imgError) {
          console.error("Error loading image for team", tName, imgError);
        }
      }

      // Añadir una fila de espacio para separar equipos
      const spacerRow = worksheet.addRow({});
      spacerRow.height = 15;
      currentRow++;
    }

    // Centrar todo vertical y horizontalmente y agregar bordes (excepto en los separadores)
    worksheet.eachRow((row, rowNumber) => {
      let isEmpty = true;
      row.eachCell((cell) => {
        if (cell.value) isEmpty = false;
      });

      if (!isEmpty || rowNumber === 1) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (colNumber <= baseColumns.length) {
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
            };
            // Hacer el nombre del equipo en negrita para que resalte más
            if (colNumber === 1 && rowNumber > 1) {
              cell.font = { bold: true, size: 12 };
            }
          }
        });
      }
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

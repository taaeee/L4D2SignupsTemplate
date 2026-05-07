import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const steamId = searchParams.get("steamId");

  if (!steamId) {
    return NextResponse.json({ error: "Missing steamId" }, { status: 400 });
  }

  try {
    const STEAM_API_KEY = process.env.STEAM_API_KEY;
    const APP_ID = 550; // Left 4 Dead 2

    // 1. Get Player Summaries to check visibility
    const summaryRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`
    );
    const summaryData = await summaryRes.json();
    const player = summaryData.response?.players?.[0];

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const is_profile_private = player.communityvisibilitystate !== 3; // 3 means public

    // 2. Get Owned Games to check L4D2 playtime
    let l4d2_playtime_hours = 0;
    
    // Si es privado, getOwnedGames devolverá vacío o error, manejémoslo de forma segura
    if (!is_profile_private) {
      const gamesRes = await fetch(
        `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1`
      );
      const gamesData = await gamesRes.json();
      const games = gamesData.response?.games || [];
      const l4d2 = games.find((g) => g.appid === APP_ID);

      if (l4d2) {
        l4d2_playtime_hours = Math.floor(l4d2.playtime_forever / 60); // Convert to hours
      }
    }

    return NextResponse.json({
      steam_id_64: steamId,
      is_profile_private,
      l4d2_playtime_hours,
      personaname: player.personaname,
      avatar: player.avatarfull
    });

  } catch (error) {
    console.error("Steam API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

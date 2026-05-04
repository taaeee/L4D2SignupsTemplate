import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.steamId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const API_KEY = process.env.STEAM_API_KEY;
    if (!API_KEY) {
      throw new Error("STEAM_API_KEY not found");
    }

    // Fetch user profile from Steam
    const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${session.steamId}`);
    const data = await res.json();
    const profile = data.response?.players?.[0];

    if (!profile) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        steamId: profile.steamid,
        name: profile.personaname,
        avatar: profile.avatarfull,
      }
    });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

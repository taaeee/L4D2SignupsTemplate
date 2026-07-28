import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Buscamos la cuenta vinculada de Steam en la base de datos
    const { data: account, error } = await supabaseAdmin
      .schema("next_auth")
      .from("accounts")
      .select("providerAccountId")
      .eq("userId", session.user.id)
      .eq("provider", "steam")
      .single();

    if (error || !account) {
      return NextResponse.json({ error: "No tienes una cuenta de Steam vinculada." }, { status: 400 });
    }

    const steamId = account.providerAccountId;
    const API_KEY = process.env.STEAM_API_KEY;

    if (!API_KEY) {
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    // 1. Fetch friend list
    const friendListRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${API_KEY}&steamid=${steamId}&relationship=friend`
    );
    
    if (!friendListRes.ok) {
      return NextResponse.json({ error: "Failed to fetch friend list from Steam" }, { status: 500 });
    }
    
    const friendListData = await friendListRes.json();
    const friends = friendListData.friendslist?.friends;
    
    if (!friends || friends.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    // Steam API allows up to 100 steamids per request for GetPlayerSummaries
    const friendIds = friends.map((f: any) => f.steamid);
    
    const chunks = [];
    for (let i = 0; i < friendIds.length; i += 100) {
      chunks.push(friendIds.slice(i, i + 100));
    }

    let allProfiles: any[] = [];

    // 2. Fetch profiles for all friends
    for (const chunk of chunks) {
      const summariesRes = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${chunk.join(",")}`
      );
      if (summariesRes.ok) {
        const summariesData = await summariesRes.json();
        const players = summariesData.response?.players || [];
        allProfiles = allProfiles.concat(players);
      }
    }

    const formattedFriends = allProfiles.map(p => ({
      steamId: p.steamid,
      name: p.personaname,
      avatar: p.avatarfull,
      profileUrl: p.profileurl
    }));

    formattedFriends.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ friends: formattedFriends });
  } catch (error) {
    console.error("Friend list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

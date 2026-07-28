import { NextResponse } from "next/server";

const STEAM_API_KEY = process.env.STEAM_API_KEY;

function convertSteam64ToSteamID(steam64Str: string) {
  try {
    const W = BigInt(steam64Str);
    const universe = 1; // STEAM_1
    const Y = W % 2n;
    const Z = (W - 76561197960265728n) / 2n;
    return `STEAM_${universe}:${Y}:${Z}`;
  } catch (e) {
    return "[INVALID_STEAM64]";
  }
}

export async function POST(req: Request) {
  try {
    const { urls } = await req.json();
    
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: "Invalid request, expected an array of URLs." }, { status: 400 });
    }

    const mappings: any = {};

    for (const url of urls) {
      if (!url) continue;
      
      let steam64 = null;
      let vanityName = null;

      // Clean URL
      let cleanUrl = url.trim().replace(/\/$/, "");

      // Check if it's a profile ID
      const profileMatch = cleanUrl.match(/\/profiles\/(\d+)/);
      if (profileMatch) {
        steam64 = profileMatch[1];
      } else {
        // Check if it's a vanity ID
        const idMatch = cleanUrl.match(/\/id\/([^\/]+)/);
        if (idMatch) {
          vanityName = idMatch[1];
        } else {
          // Maybe it's just the ID or Vanity directly?
          if (/^\d{17}$/.test(cleanUrl)) {
            steam64 = cleanUrl;
          } else {
            // Assume it's a vanity name
            vanityName = cleanUrl;
          }
        }
      }

      if (steam64) {
        mappings[url] = { steamid: convertSteam64ToSteamID(steam64), steam64: steam64 };
      } else if (vanityName) {
        if (!STEAM_API_KEY) {
          // Mock response for testing if no API key is provided
          console.warn(`No STEAM_API_KEY provided. Mocking response for ${vanityName}`);
          mappings[url] = { steamid: `STEAM_1:0:12345678`, steam64: `76561197960278150` };
        } else {
          try {
            const apiRes = await fetch(
              `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanityName)}`
            );
            const data = await apiRes.json();
            if (data.response && data.response.success === 1) {
              mappings[url] = { steamid: convertSteam64ToSteamID(data.response.steamid), steam64: data.response.steamid };
            } else {
              mappings[url] = { steamid: "[VANITY_NOT_FOUND]", steam64: "" };
            }
          } catch (e) {
            console.error(e);
            mappings[url] = { steamid: "[API_ERROR]", steam64: "" };
          }
        }
      } else {
        mappings[url] = { steamid: "[INVALID_URL_FORMAT]", steam64: "" };
      }
    }

    return NextResponse.json({ mappings });
    
  } catch (err) {
    console.error("Steam API Route Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

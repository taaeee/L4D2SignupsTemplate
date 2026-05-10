import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { steamIds } = await request.json(); // array of steamId64
    if (!steamIds || !Array.isArray(steamIds)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Fetch SirPlease list once
    let sirPleaseBans = [];
    try {
      const spRes = await fetch("https://sirplease.vercel.app/api/bans", {
        next: { revalidate: 300 },
      });
      if (spRes.ok) {
        const spData = await spRes.json();
        sirPleaseBans = spData.data || [];
      }
    } catch (e) {
      console.error("SirPlease fetch error:", e);
    }

    const results = {};

    await Promise.all(
      steamIds.map(async (steamId64) => {
        let isBanned = false;
        let bans = [];

        try {
          const v = BigInt(steamId64) - BigInt("76561197960265728");
          const y = v % 2n;
          const z = v / 2n;
          const computedSteamId = `STEAM_1:${y}:${z}`;
          const computedSteamId0 = `STEAM_0:${y}:${z}`; // Just in case

          // Check SirPlease
          const spBan = sirPleaseBans.find(
            (b) =>
              (b.steam_id === computedSteamId ||
                b.steam_id === computedSteamId0) &&
              b.status === "Banned"
          );
          if (spBan) {
            isBanned = true;
            bans.push({
              source: "SirPlease",
              url: `https://sirplease.vercel.app/bans?search=${steamId64}`,
            });
          }

          // Check Lalohlz
          try {
            const lzUrl = `https://sb.lalohlz.games/index.php?p=banlist&advSearch=${computedSteamId}&advType=steamid&hideinactive=true`;
            const lzRes = await fetch(lzUrl);
            const lzText = await lzRes.text();
            const match = lzText.match(/Total Bans: (\d+)/);
            if (match && parseInt(match[1]) > 0) {
              isBanned = true;
              bans.push({ source: "Lalohlz", url: lzUrl });
            }
          } catch (e) {
            console.error("Lalohlz fetch error for", computedSteamId, e);
          }
        } catch (e) {
          console.error("Error processing steamId", steamId64, e);
        }

        // Check L4D2Center using provided API details
        const l4d2CenterUrl = `https://l4d2center.com/bans/?search=${steamId64}`;
        let l4d2CenterBanned = false;
        try {
          const apiUrl = `https://api.l4d2center.com/v2/getbanrecords?search=${steamId64}&filter=active&page=0&csrf=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGVhbWlkNjQiOiI3NjU2MTE5OTQ4MjA0NjA0MSIsImV4cCI6MTgwNzY0NzgwNH0.cEZNhJ_tNLZIDlNyIxEKSYRb1zkhf4yQ5b4Nhcpt4Zc`;
          const l4d2Res = await fetch(apiUrl, {
            headers: {
              accept: "*/*",
              "accept-encoding": "gzip, deflate, br, zstd",
              "accept-language": "en,es-US;q=0.9,es-419;q=0.8,es;q=0.7",
              "cache-control": "no-cache",
              cookie:
                "auth2=ynxwtgnr2eazvqqdxfzlo5xtbgvgcdagfez8runk; session_id=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGVhbWlkNjQiOiI3NjU2MTE5OTQ4MjA0NjA0MSIsImV4cCI6MTgwNzY0NzgwNH0.w-hlCrTOvIa0GAJkS4kzvwnnhsJh9oHDfwXy_sTkK5A; cf_clearance=oMbVJEAxRg0b41Veo.H26nyTNe0Go63_cyy9VjqgcQ4-1778214500-1.2.1.1-gKXkx7qD3lioTopGCzQhQtBCGoGc0ZM9tQspFbJxB1MIitYpT5pn1SvE4CgEDt3bjdStor1mUXX_p8R5rMeOyzgX62CK0.UlVbLY7JXTOGCTVfYhXxUBVDYBtTNWKCnmT.wqCaext9wg5BfwhSNALrRCv_6ETUxnBYL4tGO6s0XkQGvF49h3KEN_GwObFYHjzzAZvdT.s3BYtyWPlYmiMtX_9nSnu.aIYCaEgl5DtXbhbnhPF5_gwp8Aw6HMHnmKgKUGSgVwL2IuVT6SQkwKNf70f9ZtnBYqftppzpBYTFZDzdxv666EX2U_kiz0csEbNMTE5bpujdoSm7W05LWm8Q",
              dnt: "1",
              origin: "https://l4d2center.com",
              pragma: "no-cache",
              priority: "u=1, i",
              referer: "https://l4d2center.com/",
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
            },
          });

          if (l4d2Res.ok) {
            const buffer = await l4d2Res.arrayBuffer();
            
            // Decode protobuf
            const protobuf = require("protobufjs");
            const { Type, Field } = protobuf;

            const BanRecord = new Type("BanRecord");
            BanRecord.add(new Field("ID", 1, "int64"));
            BanRecord.add(new Field("Nickname", 2, "string"));
            BanRecord.add(new Field("SteamID", 3, "string"));
            BanRecord.add(new Field("Restrictions", 4, "int32"));
            BanRecord.add(new Field("Immediate", 5, "bool"));
            BanRecord.add(new Field("BannedBy", 6, "string"));
            BanRecord.add(new Field("BanLength", 7, "int64"));
            BanRecord.add(new Field("BannedAt", 8, "int64"));
            BanRecord.add(new Field("AcceptedAt", 9, "int64"));
            BanRecord.add(new Field("Description", 10, "string"));
            BanRecord.add(new Field("Reasons", 11, "int64"));
            BanRecord.add(new Field("UnbannedBy", 12, "string"));

            const BanRecords = new Type("BanRecords");
            BanRecords.add(new Field("Success", 1, "bool"));
            BanRecords.add(new Field("Page", 2, "int32"));
            BanRecords.add(new Field("MaxPages", 3, "int32"));
            BanRecords.add(new Field("Bans", 4, "BanRecord", "repeated"));
            BanRecords.add(new Field("StatBannedRQ", 5, "int32"));
            BanRecords.add(new Field("StatUnbannedRQ", 6, "int32"));
            BanRecords.add(new Field("StatBannedRQTotal", 7, "int32"));
            BanRecords.add(BanRecord);

            const decoded = BanRecords.decode(new Uint8Array(buffer));
            const json = BanRecords.toObject(decoded, {
                longs: String,
                enums: String,
                defaults: true
            });

            if (json.Bans && json.Bans.length > 0) {
              const currentTime = Date.now();
              
              for (const ban of json.Bans) {
                const bannedAt = parseInt(ban.BannedAt, 10);
                const rawLength = parseInt(ban.BanLength, 10);
                
                const isPermanent = rawLength === 0;
                const expirationTime = bannedAt + rawLength;

                const isUnbannedManually = ban.UnbannedBy && ban.UnbannedBy.length > 0;
                const isActive = !isUnbannedManually && (isPermanent || expirationTime > currentTime);

                if (isActive) {
                  // L4D2Center Reason Flags:
                  // Cheating = 1 << 7  (128)
                  // Banned smurf = 1 << 10 (1024)
                  // Other = 1 << 16 (65536)
                  const reasonsBitmask = parseInt(ban.Reasons, 10);
                  const TARGET_REASONS = (1 << 7) | (1 << 10) | (1 << 16);
                  
                  if ((reasonsBitmask & TARGET_REASONS) !== 0) {
                    isBanned = true;
                    l4d2CenterBanned = true;
                    bans.push({ source: "L4D2Center", url: l4d2CenterUrl });
                    break;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error(
            "Error processing L4D2Center for steamId",
            steamId64,
            e
          );
        }

        const manualChecks = [];
        if (!l4d2CenterBanned) {
          manualChecks.push({ source: "L4D2Center", url: l4d2CenterUrl });
        }

        results[steamId64] = { isBanned, bans, manualChecks };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Bans Check Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

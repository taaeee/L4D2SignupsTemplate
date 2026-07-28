import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { steamIds } = await request.json(); // array of steamId64
    if (!steamIds || !Array.isArray(steamIds)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const results: any = {};

    await Promise.all(
      steamIds.map(async (steamId64) => {
        let isBanned = false;
        let bans: any[] = [];
        let lalohlzChecked = false;
        let lzUrl = "";

        try {
          const v = BigInt(steamId64) - BigInt("76561197960265728");
          const y = v % 2n;
          const z = v / 2n;
          const computedSteamId = `STEAM_1:${y}:${z}`;
          const computedSteamId0 = `STEAM_0:${y}:${z}`; // Just in case

          // Check SirPlease per-player directly
          try {
            const spRes = await fetch(
              `https://sirplease.net/api/bans?search=${steamId64}`,
              {
                signal: AbortSignal.timeout(3000),
              },
            );
            if (spRes.ok) {
              const contentType = spRes.headers.get("content-type") || "";
              if (contentType.includes("application/json")) {
                const spData = await spRes.json();
                const foundBans = spData.data || [];
                const spBan = foundBans.find(
                  (b: any) =>
                    (b.steam_id === computedSteamId ||
                      b.steam_id === computedSteamId0 ||
                      b.steam_id === `STEAM_1:1:${z}` ||
                      b.steam_id === `STEAM_0:1:${z}` ||
                      b.steam_id === `STEAM_1:0:${z}` ||
                      b.steam_id === `STEAM_0:0:${z}` ||
                      String(b.steam_id).includes(String(z)) ||
                      String(b.reason || "").includes(computedSteamId)) &&
                    b.status === "Banned",
                );
                if (spBan) {
                  isBanned = true;
                  bans.push({
                    source: "SirPlease",
                    url: `https://sirplease.net/bans?search=${steamId64}`,
                  });
                }
              }
            }
          } catch (e: any) {
            if (e.name === "TimeoutError") {
              console.warn(`SirPlease check timed out for ${steamId64}`);
            } else {
              console.error(
                "SirPlease fetch error for",
                steamId64,
                e.message || String(e),
              );
            }
          }

          // Check Lalohlz
          lzUrl = `https://sb.lalohlz.com/index.php?p=banlist&advSearch=${computedSteamId}&advType=steamid&hideinactive=true`;
          try {
            const lzRes = await fetch(lzUrl, {
              signal: AbortSignal.timeout(3000),
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
              },
            });
            if (lzRes.ok) {
              const lzText = await lzRes.text();
              const match = lzText.match(/Total Bans:\s*(\d+)/i);
              if (match) {
                lalohlzChecked = true;
                if (parseInt(match[1], 10) > 0) {
                  isBanned = true;
                  bans.push({ source: "Lalohlz", url: lzUrl });
                }
              }
            }
          } catch (e: any) {
            if (e.name === "TimeoutError") {
              console.warn(`Lalohlz check timed out for ${computedSteamId}`);
            } else {
              console.error(
                "Lalohlz fetch error for",
                computedSteamId,
                e.message || String(e),
              );
            }
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
            signal: AbortSignal.timeout(3000),
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
              defaults: true,
            });

            if (json.Bans && json.Bans.length > 0) {
              const currentTime = Date.now();

              for (const ban of json.Bans) {
                const bannedAt = parseInt(ban.BannedAt, 10);
                const rawLength = parseInt(ban.BanLength, 10);

                const isPermanent = rawLength === 0;
                const expirationTime = bannedAt + rawLength;

                const isUnbannedManually =
                  ban.UnbannedBy && ban.UnbannedBy.length > 0;
                const isActive =
                  !isUnbannedManually &&
                  (isPermanent || expirationTime > currentTime);

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
        } catch (e: any) {
          if (e.name === "TimeoutError") {
            console.warn(`L4D2Center check timed out for ${steamId64}`);
          } else {
            console.error(
              "Error processing L4D2Center for steamId",
              steamId64,
              e.message || String(e),
            );
          }
        }

        const manualChecks: any[] = [];
        if (!lalohlzChecked && lzUrl) {
          manualChecks.push({ source: "Lalohlz", url: lzUrl });
        }
        if (!l4d2CenterBanned) {
          manualChecks.push({ source: "L4D2Center", url: l4d2CenterUrl });
        }

        results[steamId64] = { isBanned, bans, manualChecks };
      }),
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Bans Check Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { createSession } from "@/lib/session";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const openidParams = new URLSearchParams();

  // Reconstruct params for verification
  searchParams.forEach((value, key) => {
    openidParams.append(key, value);
  });
  openidParams.set("openid.mode", "check_authentication");

  try {
    const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: openidParams.toString(),
    });

    const verifyText = await verifyRes.text();
    const isValid = verifyText.includes("is_valid:true");

    if (!isValid) {
      return NextResponse.redirect(new URL("/?error=Steam Auth Failed", request.url));
    }

    const claimedId = searchParams.get("openid.claimed_id");
    const steamIdMatch = claimedId?.match(/steamcommunity\.com\/openid\/id\/(\d+)/);

    const returnHash = searchParams.get("returnHash") || "";

    if (steamIdMatch && steamIdMatch[1]) {
      const steamId = steamIdMatch[1];
      await createSession(steamId);
      const url = new URL("/", request.url);
      if (returnHash) url.hash = returnHash;
      return NextResponse.redirect(url);
    } else {
      return NextResponse.redirect(new URL("/?error=Invalid Steam ID", request.url));
    }
  } catch (error) {
    console.error("Steam auth error:", error);
    return NextResponse.redirect(new URL("/?error=Steam Auth Error", request.url));
  }
}

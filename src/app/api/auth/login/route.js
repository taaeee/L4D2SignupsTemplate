import { NextResponse } from "next/server";

export async function GET(request) {
  const host = request.headers.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  
  const { searchParams: reqSearchParams } = new URL(request.url);
  const returnHash = reqSearchParams.get("returnHash") || "";
  
  const returnTo = `${protocol}://${host}/api/auth/callback?returnHash=${encodeURIComponent(returnHash)}`;
  const realm = `${protocol}://${host}`;

  const searchParams = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return NextResponse.redirect(`https://steamcommunity.com/openid/login?${searchParams.toString()}`);
}

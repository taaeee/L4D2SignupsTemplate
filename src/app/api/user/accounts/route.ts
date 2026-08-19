import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getTwitchUserById } from "@/lib/twitch";
import { getKickUserById } from "@/lib/kick";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ accounts: [] });
    }

    const { data, error } = await supabaseAdmin
      .schema("next_auth")
      .from("accounts")
      .select("provider, providerAccountId, access_token")
      .eq("userId", session.user.id);

    if (error) {
      console.error("Error fetching linked accounts:", error);
      return NextResponse.json({ accounts: [] });
    }

    let accounts = data || [];

    // Enrich accounts
    accounts = await Promise.all(
      accounts.map(async (acc) => {
        if (acc.provider === "twitch" && acc.providerAccountId) {
          try {
            const twitchUser = await getTwitchUserById(acc.providerAccountId);
            if (twitchUser) {
              return {
                ...acc,
                username: twitchUser.login,
                displayName: twitchUser.display_name,
                avatar: twitchUser.profile_image_url,
              };
            }
          } catch (e) {
            console.warn("Could not enrich twitch user:", e);
          }
        } else if (acc.provider === "kick" && acc.providerAccountId) {
          try {
            const kickUser = await getKickUserById(acc.providerAccountId);
            if (kickUser) {
              return {
                ...acc,
                username: kickUser.name,
                displayName: kickUser.name,
                avatar: kickUser.profile_picture,
              };
            }
          } catch (e) {
            console.warn("Could not enrich kick user:", e);
          }
          return {
            ...acc,
            username: acc.providerAccountId,
            displayName: acc.providerAccountId,
          };
        } else if (acc.provider === "google") {
          return {
            ...acc,
            username: session.user.name || "Google User",
            displayName: session.user.name || "Google User",
          };
        }
        return acc;
      })
    );

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error("Accounts API error:", error);
    return NextResponse.json({ accounts: [] });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") || "steam";

    const { error } = await supabaseAdmin
      .schema("next_auth")
      .from("accounts")
      .delete()
      .eq("userId", session.user.id)
      .eq("provider", provider);

    if (error) {
      console.error("Error deleting linked account:", error);
      return NextResponse.json({ success: false, error: "Error desvinculando cuenta" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Accounts API DELETE error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

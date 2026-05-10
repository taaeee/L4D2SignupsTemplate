import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ accounts: [] });
    }

    const { data, error } = await supabaseAdmin
      .schema("next_auth")
      .from("accounts")
      .select("provider")
      .eq("userId", session.user.id);

    if (error) {
      console.error("Error fetching linked accounts:", error);
      return NextResponse.json({ accounts: [] });
    }

    return NextResponse.json({ accounts: data || [] });
  } catch (error) {
    console.error("Accounts API error:", error);
    return NextResponse.json({ accounts: [] });
  }
}

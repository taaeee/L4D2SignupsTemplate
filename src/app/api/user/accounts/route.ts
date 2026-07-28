import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ accounts: [] });
    }

    const { data, error } = await supabaseAdmin
      .schema("next_auth")
      .from("accounts")
      .select("provider, providerAccountId")
      .eq("userId", session.user.id);

    if (error) {
      console.error("Error fetching linked accounts:", error);
      return NextResponse.json({ accounts: [] });
    }

    return NextResponse.json({ accounts: data || [] });
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

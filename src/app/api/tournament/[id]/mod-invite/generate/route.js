import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SignJWT } from "jose";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify user is the creator of the tournament
    const { data: tournament, error } = await supabaseAdmin
      .from("tournaments")
      .select("creator_id")
      .eq("id", id)
      .single();

    if (error || !tournament) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    if (tournament.creator_id !== session.user.id) {
      return NextResponse.json({ error: "Solo el creador puede generar invitaciones" }, { status: 403 });
    }

    // Generate JWT token with jose (1 day expiration)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_secret");
    
    const token = await new SignJWT({ tournamentId: id, type: "mod_invite" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(secret);

    // Return the link
    const baseUrl = process.env.NEXTAUTH_URL || request.headers.get("origin") || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/tournament/invite/${token}`;

    return NextResponse.json({ inviteUrl, token });
  } catch (error) {
    console.error("Generate invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

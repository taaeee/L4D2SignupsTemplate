import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { jwtVerify } from "jose";

export async function POST(request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    // Verify token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_secret");
    let payload;
    try {
      const { payload: jwtPayload } = await jwtVerify(token, secret);
      payload = jwtPayload;
    } catch (e) {
      return NextResponse.json({ error: "El enlace de invitación es inválido o ha expirado" }, { status: 400 });
    }

    if (payload.type !== "mod_invite" || !payload.tournamentId) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    const tournamentId = payload.tournamentId;

    // Fetch tournament
    const { data: tournament, error: tError } = await supabaseAdmin
      .from("tournaments")
      .select("creator_id, moderators")
      .eq("id", tournamentId)
      .single();

    if (tError || !tournament) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    // Check if user is creator
    if (tournament.creator_id === session.user.id) {
      return NextResponse.json({ success: true, message: "Ya eres el creador de este torneo", tournamentId });
    }

    // Check if user is already a mod
    const currentMods = tournament.moderators || [];
    if (currentMods.includes(session.user.id)) {
      return NextResponse.json({ success: true, message: "Ya eres moderador de este torneo", tournamentId });
    }

    // Add user to moderators
    const newMods = [...currentMods, session.user.id];
    const { error: updateError } = await supabaseAdmin
      .from("tournaments")
      .update({ moderators: newMods })
      .eq("id", tournamentId);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: "Error al actualizar moderadores" }, { status: 500 });
    }

    return NextResponse.json({ success: true, tournamentId });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

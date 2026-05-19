import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(getAuthOptions(req));
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: tData } = await supabase.from("tournaments").select("creator_id, moderators").eq("id", id).single();
    if (!tData) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isCreator = session.user.id === tData.creator_id;
    const isModerator = tData.moderators?.includes(session.user.id);
    if (!isCreator && !isModerator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { action, teamId } = await req.json();

    if (action === "remove") {
      await supabase.from("matches").update({ team1_id: null }).eq("team1_id", teamId).eq("tournament_id", id);
      await supabase.from("matches").update({ team2_id: null }).eq("team2_id", teamId).eq("tournament_id", id);
      await supabase.from("matches").update({ winner_id: null }).eq("winner_id", teamId).eq("tournament_id", id);
      await supabase.from("matches").update({ loser_id: null }).eq("loser_id", teamId).eq("tournament_id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "insert") {
      // Find empty match in Round 1 upper bracket
      const { data: matches } = await supabase.from("matches").select("*").eq("tournament_id", id).eq("round", 1).eq("is_upper", true);
      const { data: teams } = await supabase.from("teams").select("id").eq("tournament_id", id).eq("status", "accepted");
      
      const acceptedIds = teams ? teams.map(t => t.id) : [];

      const isSlotEmpty = (tid) => !tid || !acceptedIds.includes(tid);
      const emptyMatch = matches?.find(m => isSlotEmpty(m.team1_id) || isSlotEmpty(m.team2_id));

      if (emptyMatch) {
        const fieldToUpdate = isSlotEmpty(emptyMatch.team1_id) ? "team1_id" : "team2_id";
        const updates = { [fieldToUpdate]: teamId };
        if (emptyMatch.is_bye) updates.is_bye = false;

        await supabase.from("matches").update(updates).eq("id", emptyMatch.id);
        return NextResponse.json({ success: true, inserted: true });
      }
      return NextResponse.json({ success: true, inserted: false });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

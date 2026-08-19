import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const body = await req.json();
    const { selectedMaps, mapVetoId } = body;

    if (!Array.isArray(selectedMaps)) {
      return NextResponse.json(
        { error: "selectedMaps must be an array" },
        { status: 400 }
      );
    }

    const updateData: any = {
      selected_maps: selectedMaps,
      updated_at: new Date().toISOString(),
    };

    if (mapVetoId) {
      updateData.map_veto_id = mapVetoId;
    }

    const { data, error } = await supabaseAdmin
      .from("matches")
      .update(updateData)
      .eq("id", matchId)
      .select()
      .single();

    if (error) {
      console.error("Error syncing maps to match:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, match: data });
  } catch (error: any) {
    console.error("sync-maps error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

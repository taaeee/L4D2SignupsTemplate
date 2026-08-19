import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { enrichCasterList } from "@/lib/caster-enrichment";

export async function GET() {
  try {
    // 1. Try to fetch from casters table
    const { data: casters, error: castersError } = await supabaseAdmin
      .from("casters")
      .select("*, users:users!casters_user_id_fkey(name, image)")
      .order("alias", { ascending: true });

    if (!castersError && casters && casters.length > 0) {
      const enriched = await enrichCasterList(casters);
      return NextResponse.json({ casters: enriched });
    }

    // 2. Fallback to approved caster_applications if casters table is empty/new
    const { data: applications, error: appError } = await supabaseAdmin
      .from("caster_applications")
      .select("id, user_id, alias, bio, twitch_channel, youtube_channel, status, created_at, users:users!caster_applications_user_id_fkey(name, image)")
      .eq("status", "approved")
      .order("alias", { ascending: true });

    if (appError) {
      const { data: simpleApps } = await supabaseAdmin
        .from("caster_applications")
        .select("*")
        .eq("status", "approved");

      const enriched = await enrichCasterList(simpleApps || []);
      return NextResponse.json({ casters: enriched });
    }

    const enriched = await enrichCasterList(applications || []);
    return NextResponse.json({ casters: enriched });
  } catch (error: any) {
    console.error("Casters API error:", error);
    return NextResponse.json({ casters: [] });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: applications, error } = await supabaseAdmin
      .from("caster_applications")
      .select("*, users:users!caster_applications_user_id_fkey(name, email, image)")
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback without join in case relationship name differs
      const { data: appsRaw, error: rawError } = await supabaseAdmin
        .from("caster_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (rawError) {
        console.error("Error fetching applications:", rawError);
        return NextResponse.json({ applications: [] });
      }

      return NextResponse.json({ applications: appsRaw || [] });
    }

    return NextResponse.json({ applications: applications || [] });
  } catch (error: any) {
    console.error("Admin caster applications GET error:", error);
    return NextResponse.json({ applications: [] });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, action, reviewerNotes } = body;

    if (!applicationId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Parámetros inválidos (applicationId y action son obligatorios)." },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // 1. Update application status
    const { data: app, error: appError } = await supabaseAdmin
      .from("caster_applications")
      .update({
        status: newStatus,
        reviewer_notes: reviewerNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .select()
      .single();

    if (appError || !app) {
      console.error("Error updating application:", appError);
      return NextResponse.json(
        { error: "No se pudo actualizar la solicitud." },
        { status: 500 }
      );
    }

    // 2. If approved, create or update public.casters profile
    if (newStatus === "approved") {
      const { error: casterError } = await supabaseAdmin
        .from("casters")
        .upsert(
          {
            user_id: app.user_id,
            alias: app.alias,
            bio: app.bio,
            twitch_channel: app.twitch_channel,
            youtube_channel: app.youtube_channel,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (casterError) {
        console.error("Error upserting caster record:", casterError);
      }
    }

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Solicitud de caster aprobada con éxito." : "Solicitud de caster rechazada.",
      application: app,
    });
  } catch (error: any) {
    console.error("Admin caster applications PATCH error:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar la solicitud." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";
import { normalizeLanguages } from "@/lib/language-helper";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensurePublicUser } from "@/lib/ensure-user";
import { enrichCasterList } from "@/lib/caster-enrichment";
import { isSystemAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Strictly check if the user is the system administrator
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json(
        {
          error: "Acceso restringido. Solo el administrador puede ver las solicitudes de casters.",
          applications: [],
          isAdmin: false,
        },
        { status: 403 }
      );
    }

    // Fetch all global caster applications
    const { data: appsRaw, error: rawError } = await supabaseAdmin
      .from("caster_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (rawError) {
      console.error("Error fetching caster applications:", rawError);
      return NextResponse.json({ applications: [], isAdmin: true });
    }

    let applications = await enrichCasterList(appsRaw || []);

    // Fetch all active approved casters from public.casters
    const { data: castersList } = await supabaseAdmin
      .from("casters")
      .select("*");

    const casterMap = new Map(((castersList as any[]) || []).map((c) => [c.user_id, c]));

    // Auto-sync any previously approved application into public.casters if not present
    for (const app of applications) {
      if (app.status === "approved" && !casterMap.has(app.user_id)) {
        const initCaster = {
          user_id: app.user_id,
          alias: app.alias,
          bio: app.bio || null,
          twitch_channel: app.twitch_channel || null,
          youtube_channel: app.youtube_channel || null,
          updated_at: new Date().toISOString(),
        };
        const { data: created } = await supabaseAdmin
          .from("casters")
          .upsert(initCaster, { onConflict: "user_id" })
          .select()
          .maybeSingle();
        if (created) casterMap.set(app.user_id, created);
      }
    }

    // Enrich with user profiles and edit status
    const userIds = Array.from(new Set(applications.map((a) => a.user_id).filter(Boolean)));
    let userMap = new Map();
    if (userIds.length > 0) {
      try {
        const { data: usersData } = await supabaseAdmin
          .from("users")
          .select("id, name, email, image")
          .in("id", userIds);

        userMap = new Map((usersData || []).map((u) => [u.id, u]));
      } catch (e) {
        console.warn("Could not enrich user profiles for admin applications:", e);
      }
    }

    applications = applications.map((a) => {
      const isCasterActive = casterMap.has(a.user_id);
      // An application is an edit ONLY IF the user is currently an active caster in public.casters
      const isEdit = isCasterActive;
      return {
        ...a,
        isEdit,
        isCasterActive,
        currentCaster: casterMap.get(a.user_id) || null,
        users: userMap.get(a.user_id) || { name: a.alias, email: "", image: null },
      };
    });

    return NextResponse.json({ applications, isAdmin: true });
  } catch (error: any) {
    console.error("Admin caster applications GET error:", error);
    return NextResponse.json({ applications: [], isAdmin: false });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(getAuthOptions(request));
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Strictly check if the user is the system administrator
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json(
        { error: "Acceso denegado. Solo el administrador puede aprobar o rechazar solicitudes de casters." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicationId, action, reviewerNotes } = body;

    if (!applicationId || !["approve", "reject", "revoke"].includes(action)) {
      return NextResponse.json(
        { error: "Parámetros inválidos (applicationId y action son obligatorios)." },
        { status: 400 }
      );
    }

    // 1. Locate application by id or user_id
    let { data: app } = await supabaseAdmin
      .from("caster_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

    if (!app) {
      const byUser = await supabaseAdmin
        .from("caster_applications")
        .select("*")
        .eq("user_id", applicationId)
        .maybeSingle();
      app = byUser.data;
    }

    if (!app) {
      // Check if applicationId is a user in public.casters
      const { data: casterRecord } = await supabaseAdmin
        .from("casters")
        .select("*")
        .or(`id.eq.${applicationId},user_id.eq.${applicationId}`)
        .maybeSingle();

      if (casterRecord) {
        const { data: createdApp } = await supabaseAdmin
          .from("caster_applications")
          .upsert({
            user_id: casterRecord.user_id,
            alias: casterRecord.alias,
            bio: casterRecord.bio,
            twitch_channel: casterRecord.twitch_channel,
            kick_channel: casterRecord.kick_channel,
            youtube_channel: casterRecord.youtube_channel,
            languages: normalizeLanguages((casterRecord as any).languages),
            status: "approved",
            reviewer_notes: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" })
          .select()
          .maybeSingle();
        app = createdApp;
      }
    }

    if (!app) {
      return NextResponse.json(
        { error: "No se encontró la solicitud de caster correspondiente." },
        { status: 404 }
      );
    }

    // 2. Check if the user is currently an active caster in public.casters
    const { data: existingCaster } = await supabaseAdmin
      .from("casters")
      .select("*")
      .eq("user_id", app.user_id)
      .maybeSingle();

    const isEdit = !!existingCaster;

    // ─── ACTION: REVOKE ──────────────────────────────────────────────
    if (action === "revoke") {
      // Remove from public.casters
      await supabaseAdmin
        .from("casters")
        .delete()
        .eq("user_id", app.user_id);

      // Update application status to rejected
      await supabaseAdmin
        .from("caster_applications")
        .update({
          status: "rejected",
          reviewer_notes: reviewerNotes || "Rol de Caster Oficial revocado por el administrador.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", app.id);

      return NextResponse.json({
        success: true,
        isEdit: false,
        message: "Rol de Caster Oficial revocado con éxito.",
      });
    }

    // ─── ACTION: APPROVE ─────────────────────────────────────────────
    if (action === "approve") {
      await ensurePublicUser(app.user_id);

      const casterData = {
        user_id: app.user_id,
        alias: app.alias,
        bio: app.bio || null,
        twitch_channel: app.twitch_channel || null,
        youtube_channel: app.youtube_channel || null,
        updated_at: new Date().toISOString(),
      };

      const { error: casterError } = await supabaseAdmin
        .from("casters")
        .upsert(casterData, { onConflict: "user_id" });

      if (casterError) {
        console.error("Error upserting caster record:", casterError);
      }

      // Update application status to approved and clear notes
      const { data: updatedApp } = await supabaseAdmin
        .from("caster_applications")
        .update({
          status: "approved",
          reviewer_notes: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", app.id)
        .select()
        .maybeSingle();

      return NextResponse.json({
        success: true,
        isEdit,
        message: isEdit
          ? "Edición de perfil de Caster aprobada con éxito."
          : "Solicitud de Caster Oficial aprobada con éxito.",
        application: updatedApp || app,
      });
    }

    // ─── ACTION: REJECT ──────────────────────────────────────────────
    if (action === "reject") {
      if (isEdit && existingCaster) {
        // CASE 2: The user is ALREADY a Caster.
        // We reject ONLY their proposed changes.
        // public.casters remains UNTOUCHED!
        // Reset application fields back to active caster profile with rejection reviewer note.
        const defaultNotes = "Los cambios propuestos no fueron aprobados. Tu perfil actual de Caster continúa activo sin modificaciones. Si lo deseas, puedes intentar de nuevo o contactar al administrador.";
        const { data: updatedApp } = await supabaseAdmin
          .from("caster_applications")
          .update({
            alias: existingCaster.alias,
            bio: existingCaster.bio,
            twitch_channel: existingCaster.twitch_channel,
            kick_channel: existingCaster.kick_channel,
            youtube_channel: existingCaster.youtube_channel,
            languages: normalizeLanguages((existingCaster as any).languages),
            status: "approved",
            reviewer_notes: reviewerNotes || defaultNotes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", app.id)
          .select()
          .maybeSingle();

        return NextResponse.json({
          success: true,
          isEdit: true,
          message: "Solicitud de edición rechazada. El usuario conserva su rol de Caster y perfil actual sin cambios.",
          application: updatedApp || app,
        });
      } else {
        // CASE 1: First-time applicant.
        // Ensure user is NOT in public.casters and set application status to rejected.
        await supabaseAdmin
          .from("casters")
          .delete()
          .eq("user_id", app.user_id);

        const { data: updatedApp } = await supabaseAdmin
          .from("caster_applications")
          .update({
            status: "rejected",
            reviewer_notes: reviewerNotes || "Solicitud de Caster Oficial no aprobada.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", app.id)
          .select()
          .maybeSingle();

        return NextResponse.json({
          success: true,
          isEdit: false,
          message: "Solicitud de Caster rechazada.",
          application: updatedApp || app,
        });
      }
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error: any) {
    console.error("Admin caster applications PATCH error:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar la solicitud." },
      { status: 500 }
    );
  }
}

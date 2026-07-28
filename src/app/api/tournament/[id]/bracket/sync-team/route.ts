import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/authOptions";

export async function POST(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await getServerSession(getAuthOptions(req));
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: tData } = await supabase.from("tournaments").select("creator_id, moderators").eq("id", id).single();
    if (!tData) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isCreator = session.user.id === tData.creator_id;
    const isModerator = (tData.moderators as any[])?.includes(session.user.id);
    if (!isCreator && !isModerator) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { action, teamId } = await req.json();

    if (action === "remove") {
      // Find all matches where this team is involved
      const { data: teamMatches } = await supabase.from("matches")
        .select("*")
        .or(`team1_id.eq.${teamId},team2_id.eq.${teamId},winner_id.eq.${teamId},loser_id.eq.${teamId}`)
        .eq("tournament_id", id);
      
      if (teamMatches && teamMatches.length > 0) {
        // Store this in tournament.template_json.abandoned_paths
        const { data: tDataNode } = await supabase.from("tournaments").select("template_json").eq("id", id).single();
        const templateJson = tDataNode?.template_json || {};
        const abandonedPaths: any[] = (templateJson as any).abandoned_paths || [];
        
        const pathInfo = teamMatches.map(m => ({
          id: m.id,
          wasTeam1: m.team1_id === teamId,
          wasTeam2: m.team2_id === teamId,
          wasWinner: m.winner_id === teamId,
          wasLoser: m.loser_id === teamId
        }));

        abandonedPaths.push(pathInfo);
        (templateJson as any).abandoned_paths = abandonedPaths;
        await supabase.from("tournaments").update({ template_json: templateJson }).eq("id", id);
      }

      await supabase.from("matches").update({ team1_id: null }).eq("team1_id", teamId).eq("tournament_id", id);
      await supabase.from("matches").update({ team2_id: null }).eq("team2_id", teamId).eq("tournament_id", id);
      await supabase.from("matches").update({ winner_id: null }).eq("winner_id", teamId).eq("tournament_id", id);
      await supabase.from("matches").update({ loser_id: null }).eq("loser_id", teamId).eq("tournament_id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "insert") {
      const { data: tDataNode } = await supabase.from("tournaments").select("template_json").eq("id", id).single();
      const templateJson = tDataNode?.template_json || {};
      const abandonedPaths: any[] = (templateJson as any).abandoned_paths || [];

      if (abandonedPaths.length > 0) {
        const pathToRestore = abandonedPaths.shift(); // take the first one
        
        for (const mInfo of pathToRestore) {
          const updates: any = {};
          if (mInfo.wasTeam1) updates.team1_id = teamId;
          if (mInfo.wasTeam2) updates.team2_id = teamId;
          if (mInfo.wasWinner) updates.winner_id = teamId;
          if (mInfo.wasLoser) updates.loser_id = teamId;
          
          if (Object.keys(updates).length > 0) {
            await supabase.from("matches").update(updates).eq("id", mInfo.id);
          }
        }
        
        (templateJson as any).abandoned_paths = abandonedPaths;
        await supabase.from("tournaments").update({ template_json: templateJson }).eq("id", id);
        
        return NextResponse.json({ success: true, inserted: true, restored: true });
      }

      // Find empty match in Round 1 upper bracket
      const { data: matches } = await supabase.from("matches").select("*").eq("tournament_id", id).eq("round", 1).eq("is_upper", true);
      const { data: teams } = await supabase.from("teams").select("id").eq("tournament_id", id).eq("status", "accepted");
      
      const acceptedIds = teams ? teams.map(t => t.id) : [];

      const isSlotEmpty = (tid: any) => !tid || !acceptedIds.includes(tid);
      const emptyMatch = matches?.find(m => isSlotEmpty(m.team1_id) || isSlotEmpty(m.team2_id));

      if (emptyMatch) {
        const fieldToUpdate = isSlotEmpty(emptyMatch.team1_id) ? "team1_id" : "team2_id";
        const otherField = fieldToUpdate === "team1_id" ? "team2_id" : "team1_id";
        const otherTeamId = emptyMatch[otherField];
        const otherHasTeam = !isSlotEmpty(otherTeamId);
        
        const updates: any = { [fieldToUpdate]: teamId };

        if (emptyMatch.is_bye) {
          updates.is_bye = false;
          updates.status = otherHasTeam ? 'active' : 'pending';
          updates.winner_id = null;

          await supabase.from("matches").update(updates).eq("id", emptyMatch.id);

          // Revert auto-advancement in next match
          if (emptyMatch.next_match_id) {
            const { data: nextMatch } = await supabase.from("matches").select("*").eq("id", emptyMatch.next_match_id).single();
            if (nextMatch) {
              const previousWinnerId = emptyMatch.winner_id || otherTeamId;
              if (previousWinnerId) {
                if (nextMatch.team1_id === previousWinnerId) {
                  await supabase.from("matches").update({ team1_id: null, status: 'pending' }).eq("id", nextMatch.id);
                } else if (nextMatch.team2_id === previousWinnerId) {
                  await supabase.from("matches").update({ team2_id: null, status: 'pending' }).eq("id", nextMatch.id);
                }
              }
            }
          }

          // Fix the lower bracket counterpart that was also marked as a bye
          if (emptyMatch.loser_match_id) {
            await supabase.from("matches").update({ is_bye: false, status: 'pending', winner_id: null }).eq("id", emptyMatch.loser_match_id);
          }
        } else {
          updates.status = otherHasTeam ? 'active' : 'pending';
          await supabase.from("matches").update(updates).eq("id", emptyMatch.id);
        }

        return NextResponse.json({ success: true, inserted: true });
      }
      return NextResponse.json({ success: true, inserted: false });
    }

    if (action === "substitute") {
      const { oldTeamId, newTeamId } = await req.json();
      if (!oldTeamId || !newTeamId) {
        return NextResponse.json({ error: "Missing team IDs" }, { status: 400 });
      }

      // 1. Find all matches where oldTeamId is involved
      const { data: teamMatches } = await supabase.from("matches")
        .select("*")
        .or(`team1_id.eq.${oldTeamId},team2_id.eq.${oldTeamId},winner_id.eq.${oldTeamId},loser_id.eq.${oldTeamId}`)
        .eq("tournament_id", id);

      if (teamMatches && teamMatches.length > 0) {
        for (const m of teamMatches) {
          const updates: any = {};
          if (m.team1_id === oldTeamId) updates.team1_id = newTeamId;
          if (m.team2_id === oldTeamId) updates.team2_id = newTeamId;
          if (m.winner_id === oldTeamId) updates.winner_id = newTeamId;
          if (m.loser_id === oldTeamId) updates.loser_id = newTeamId;
          
          if (Object.keys(updates).length > 0) {
            await supabase.from("matches").update(updates).eq("id", m.id);
          }
        }
      } else {
        // Check if there are abandoned paths to restore if oldTeamId wasn't in matches directly
        const { data: tDataNode } = await supabase.from("tournaments").select("template_json").eq("id", id).single();
        const templateJson = tDataNode?.template_json || {};
        const abandonedPaths: any[] = (templateJson as any).abandoned_paths || [];
        if (abandonedPaths.length > 0) {
          const pathToRestore = abandonedPaths.shift();
          for (const mInfo of pathToRestore) {
            const updates: any = {};
            if (mInfo.wasTeam1) updates.team1_id = newTeamId;
            if (mInfo.wasTeam2) updates.team2_id = newTeamId;
            if (mInfo.wasWinner) updates.winner_id = newTeamId;
            if (mInfo.wasLoser) updates.loser_id = newTeamId;
            if (Object.keys(updates).length > 0) {
              await supabase.from("matches").update(updates).eq("id", mInfo.id);
            }
          }
          (templateJson as any).abandoned_paths = abandonedPaths;
          await supabase.from("tournaments").update({ template_json: templateJson }).eq("id", id);
        }
      }

      // 2. Update newTeamId status to accepted
      await supabase.from("teams").update({ status: "accepted" }).eq("id", newTeamId);

      return NextResponse.json({ success: true, substituted: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

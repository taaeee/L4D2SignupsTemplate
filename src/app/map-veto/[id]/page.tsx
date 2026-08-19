"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";

export default function MapVetoInterface() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: session } = useSession();
  const router = useRouter();

  const [vetoSession, setVetoSession] = useState<any>(null);
  const [teamA, setTeamA] = useState<any>(null);
  const [teamB, setTeamB] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [hoveredMap, setHoveredMap] = useState<string | null>(null);

  useEffect(() => {
    fetchVetoSession();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`map_vetoes_${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "map_vetoes", filter: `id=eq.${id}` },
        async (payload: any) => {
          setVetoSession(payload.new);
          if (payload.new?.state?.status === "completed" && payload.new?.match_id) {
            const pickedMapNames = (payload.new.state.maps || [])
              .filter((m: any) => m.status === "picked")
              .map((m: any) => m.name);

            if (pickedMapNames.length > 0) {
              await fetch(`/api/matches/${payload.new.match_id}/sync-maps`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  selectedMaps: pickedMapNames,
                  mapVetoId: id,
                }),
              }).catch((e) => console.warn("Auto-sync error:", e));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (vetoSession && !teamA && !teamB) {
      fetchTeams(vetoSession.team_a_id, vetoSession.team_b_id);
    }
    if (vetoSession && session?.user?.id && !isAdmin) {
      checkAdminStatus(vetoSession.tournament_id);
    }
  }, [vetoSession, session]);

  const checkAdminStatus = async (tournamentId: string) => {
    const { data } = await supabase
      .from("tournaments")
      .select("creator_id, moderators")
      .eq("id", tournamentId)
      .single();
    
    if (data) {
      const isCreator = data.creator_id === session?.user?.id;
      const isMod = (data.moderators as any[])?.includes(session?.user?.id);
      setIsAdmin(isCreator || isMod);
    }
  };

  const fetchVetoSession = async () => {
    const { data, error } = await supabase
      .from("map_vetoes")
      .select("*")
      .eq("id", id as string)
      .single();

    if (error) {
      console.error(error);
      toast.error("Veto no encontrado.");
    } else {
      setVetoSession(data);
    }
    setIsLoading(false);
  };

  const fetchTeams = async (idA: string, idB: string) => {
    const { data } = await supabase
      .from("teams")
      .select("id, name, logo_url")
      .in("id", [idA, idB]);

    if (data) {
      const parsedData = data.map((team: any) => {
        let parsedLogo = team.logo_url;
        if (parsedLogo && parsedLogo.startsWith("{")) {
          try { parsedLogo = JSON.parse(parsedLogo).url; } catch(e) {}
        }
        return { ...team, logo_url: parsedLogo };
      });
      setTeamA(parsedData.find((t) => t.id === idA));
      setTeamB(parsedData.find((t) => t.id === idB));
    }
  };

  const getNextTurnInfo = (format: string, history: any[], maps: any[], currentTurnId: string) => {
    const pickCount = history.filter((h: any) => h.action === "pick").length;
    const availableCount = maps.filter((m: any) => m.status === "available").length;

    let expectedAction = "veto";
    let status = "in_progress";

    if (format === "to2" && pickCount >= 2) {
      status = "completed";
    } else if (availableCount === 1 && format !== "to2") {
      status = "completed";
    } else {
      if (format === "bo1") expectedAction = "veto";
      else if (format === "to2") expectedAction = "pick";
      else if (format === "bo3") expectedAction = pickCount < 2 ? "pick" : "veto";
      else if (format === "bo5") expectedAction = pickCount < 4 ? "pick" : "veto";
    }

    const nextTurnId = currentTurnId === vetoSession?.team_a_id ? vetoSession?.team_b_id : vetoSession?.team_a_id;

    return { expectedAction, status, nextTurnId, availableCount };
  };

  const handleMapAction = async (mapName: string) => {
    if (!vetoSession || vetoSession.state.status === "completed") return;

    const isTeamA = token === vetoSession.team_a_token;
    const isTeamB = token === vetoSession.team_b_token;
    const myTeamId = isTeamA ? vetoSession.team_a_id : isTeamB ? vetoSession.team_b_id : null;

    if (!myTeamId) {
      toast.error("Eres espectador. No puedes votar.");
      return;
    }

    if (myTeamId !== vetoSession.state.currentTurn) {
      toast.error("No es tu turno.");
      return;
    }

    const map = vetoSession.state.maps.find((m: any) => m.name === mapName);
    if (map.status !== "available") {
      toast.error("Este mapa ya no está disponible.");
      return;
    }

    // Determine what action we are doing (pick or veto) based on format rules
    const { expectedAction, nextTurnId } = getNextTurnInfo(
      vetoSession.format, 
      vetoSession.state.history, 
      vetoSession.state.maps, 
      vetoSession.state.currentTurn
    );

    // Update map status
    const newMaps = vetoSession.state.maps.map((m: any) => {
      if (m.name === mapName) {
        return { ...m, status: expectedAction === "pick" ? "picked" : "vetoed" };
      }
      return m;
    });

    const newHistory = [
      ...vetoSession.state.history,
      { teamId: myTeamId, action: expectedAction, mapName }
    ];

    // Check if we reached completion state
    const { status, availableCount } = getNextTurnInfo(
      vetoSession.format,
      newHistory,
      newMaps,
      nextTurnId
    );

    let finalMaps = newMaps;
    if (status === "completed" && availableCount === 1 && vetoSession.format !== "to2") {
      // Auto-pick the last map (decider)
      finalMaps = newMaps.map((m: any) => m.status === "available" ? { ...m, status: "picked", isDecider: true } : m);
    }

    const newState = {
      ...vetoSession.state,
      maps: finalMaps,
      history: newHistory,
      currentTurn: nextTurnId,
      status: status
    };

    // Optimistic UI update
    setVetoSession({ ...vetoSession, state: newState });

    // Save to DB
    await supabase
      .from("map_vetoes")
      .update({ state: newState })
      .eq("id", id as string);

    // If veto is completed and linked to a match, auto-sync selected maps to match schedule via server API
    if (status === "completed" && vetoSession.match_id) {
      try {
        const pickedMapNames = finalMaps
          .filter((m: any) => m.status === "picked")
          .map((m: any) => m.name);

        if (pickedMapNames.length > 0) {
          const syncRes = await fetch(`/api/matches/${vetoSession.match_id}/sync-maps`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              selectedMaps: pickedMapNames,
              mapVetoId: id,
            }),
          });
          if (syncRes.ok) {
            toast.success("Mapas sincronizados con el partido exitosamente.");
          }
        }
      } catch (e) {
        console.warn("Could not sync maps to match:", e);
      }
    }
  };

  const handleEndVeto = async () => {
    const { error } = await supabase.from("map_vetoes").delete().eq("id", id as string);
    if (!error) {
      toast.success("Veto finalizado y eliminado de la base de datos.");
      router.push("/map-veto");
    } else {
      toast.error("Hubo un error al eliminar el veto.");
    }
  };

  if (isLoading || !vetoSession || !teamA || !teamB) {
    return <LoadingSpinner text="Cargando Veto..." fullHeight={true} />;
  }

  const isTeamA = token === vetoSession.team_a_token;
  const isTeamB = token === vetoSession.team_b_token;
  const isSpectator = !isTeamA && !isTeamB;

  const myTeamId = isTeamA ? teamA.id : isTeamB ? teamB.id : null;
  const isMyTurn = vetoSession.state.status !== "completed" && myTeamId === vetoSession.state.currentTurn;
  const currentTurnTeam = vetoSession.state.currentTurn === teamA.id ? teamA : teamB;

  const { expectedAction } = getNextTurnInfo(
    vetoSession.format,
    vetoSession.state.history,
    vetoSession.state.maps,
    vetoSession.state.currentTurn
  );

  const filteredMaps = vetoSession.state.maps.filter((m: any) => filter === "all" || m.type === filter);

  return (
    <div className="container" style={{ padding: "2rem", maxWidth: "1200px" }}>
      {/* Header Info */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ color: "var(--primary)", margin: "0 0 0.5rem 0", fontSize: "2.5rem" }}>Map Veto</h1>
        <h3 style={{ margin: 0, color: "var(--muted)" }}>
          Formato: <span style={{ color: "#fff", textTransform: "uppercase" }}>{vetoSession.format}</span>
        </h3>
        {isSpectator && (
          <span className="badge" style={{ background: "rgba(255,255,255,0.1)", marginTop: "1rem" }}>
            Modo Espectador
          </span>
        )}
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <button className="btn" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "var(--danger)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: "bold" }} onClick={() => setIsDeleteModalOpen(true)}>
            <Trash2 size={18} /> Terminar Veto y Limpiar
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Terminar Veto"
        message="¿Estás seguro de que deseas terminar y eliminar este veto? Esta acción borrará el veto permanentemente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={handleEndVeto}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Versus Section */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", marginBottom: "3rem" }}>
        {/* Team A */}
        <div style={{ textAlign: "center", opacity: vetoSession.state.currentTurn === teamA.id ? 1 : 0.5, transition: "opacity 0.3s" }}>
          <img src={teamA.logo_url || `https://ui-avatars.com/api/?name=${teamA.name}`} alt={teamA.name} style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", border: isTeamA ? "4px solid var(--primary)" : "4px solid transparent" }} />
          <h2 style={{ margin: "0.5rem 0 0 0" }}>{teamA.name}</h2>
          {isTeamA && <span style={{ color: "var(--primary)", fontSize: "0.8rem", fontWeight: "bold" }}>Tú</span>}
        </div>

        <div style={{ fontSize: "3rem", fontWeight: "900", color: "rgba(255,255,255,0.2)" }}>VS</div>

        {/* Team B */}
        <div style={{ textAlign: "center", opacity: vetoSession.state.currentTurn === teamB.id ? 1 : 0.5, transition: "opacity 0.3s" }}>
          <img src={teamB.logo_url || `https://ui-avatars.com/api/?name=${teamB.name}`} alt={teamB.name} style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", border: isTeamB ? "4px solid var(--primary)" : "4px solid transparent" }} />
          <h2 style={{ margin: "0.5rem 0 0 0" }}>{teamB.name}</h2>
          {isTeamB && <span style={{ color: "var(--primary)", fontSize: "0.8rem", fontWeight: "bold" }}>Tú</span>}
        </div>
      </div>

      {/* Turn Indicator */}
      <div style={{ textAlign: "center", marginBottom: "2rem", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: isMyTurn ? `1px solid ${expectedAction === "pick" ? "var(--success)" : "var(--danger)"}` : "1px solid var(--border-light)" }}>
        {vetoSession.state.status === "completed" ? (
          <h2 style={{ color: "var(--success)", margin: 0 }}>¡Veto Finalizado!</h2>
        ) : (
          <h2 style={{ margin: 0 }}>
            {isMyTurn ? (
              <span style={{ color: expectedAction === "pick" ? "var(--success)" : "var(--danger)" }}>
                ¡Es tu turno de {expectedAction === "pick" ? "ELEGIR" : "VETAR"}!
              </span>
            ) : (
              <span>Turno de {currentTurnTeam?.name} ({expectedAction === "pick" ? "Elegir" : "Vetar"})</span>
            )}
          </h2>
        )}
      </div>



      {/* Maps Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}>
        {filteredMaps.map((map: any) => {
          const isVetoed = map.status === "vetoed";
          const isPicked = map.status === "picked";
          const isAvailable = map.status === "available";
          
          const historyEntry = vetoSession.state.history.find((h: any) => h.mapName === map.name);
          const actingTeam = historyEntry ? (historyEntry.teamId === teamA.id ? teamA : teamB) : null;
          
          
          return (
            <div
              key={map.name}
              onClick={() => {
                if (isMyTurn && isAvailable) {
                  handleMapAction(map.name);
                  setHoveredMap(null);
                }
              }}
              style={{
                position: "relative",
                borderRadius: "12px",
                overflow: "hidden",
                cursor: isMyTurn && isAvailable ? "pointer" : "default",
                transition: "all 0.3s ease",
                transform: isVetoed ? "scale(0.95)" : (hoveredMap === map.name && isMyTurn && isAvailable ? "scale(1.05)" : "scale(1)"),
                opacity: isVetoed ? 0.4 : 1,
                border: isPicked ? "3px solid var(--success)" : (hoveredMap === map.name && isMyTurn && isAvailable ? `3px solid ${expectedAction === "pick" ? "var(--success)" : "var(--danger)"}` : "3px solid transparent"),
                boxShadow: isPicked ? "0 0 20px rgba(34, 197, 94, 0.4)" : "0 4px 15px rgba(0,0,0,0.5)",
                aspectRatio: "16/9"
              }}
              onMouseEnter={() => setHoveredMap(map.name)}
              onMouseLeave={() => setHoveredMap(null)}
            >
              <img
                src={map.imageUrl}
                alt={map.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", filter: isVetoed ? "grayscale(100%)" : "none" }}
              />
              
              {/* Overlay */}
              <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.1) 100%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "1rem"
              }}>
                <h3 style={{ margin: 0, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>{map.name}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "capitalize" }}>{map.type} Map</span>
              </div>

              {/* Status Icons */}
              {isVetoed && (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <XCircle size={64} color="var(--danger)" />
                  {actingTeam && (
                    <div style={{ background: "rgba(0,0,0,0.8)", color: "var(--danger)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.9rem", fontWeight: "bold", marginTop: "8px", whiteSpace: "nowrap" }}>
                      Vetado por {actingTeam.name}
                    </div>
                  )}
                </div>
              )}
              {isPicked && (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {actingTeam ? (
                    <img src={actingTeam.logo_url || `https://ui-avatars.com/api/?name=${actingTeam.name}`} alt={actingTeam.name} style={{ width: "64px", height: "64px", borderRadius: "50%", border: "2px solid var(--success)", objectFit: "cover", boxShadow: "0 0 10px rgba(0,0,0,0.8)" }} />
                  ) : (
                    <CheckCircle size={64} color="var(--success)" />
                  )}
                  {map.isDecider && <div style={{ textAlign: "center", background: "var(--primary)", color: "#000", padding: "2px 8px", borderRadius: "10px", fontSize: "0.8rem", fontWeight: "bold", marginTop: "5px" }}>DECIDER</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>


    </div>
  );
}

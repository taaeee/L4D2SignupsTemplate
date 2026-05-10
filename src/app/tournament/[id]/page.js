"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, Trophy, Download, Settings, Edit } from "lucide-react";

export default function TournamentDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [teamsSearch, setTeamsSearch] = useState("");

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setIsLoading(true);
    // Fetch Tournament
    const { data: tData, error: tError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (tError || !tData) {
      console.error(tError);
      setIsLoading(false);
      return;
    }
    setTournament(tData);

    // Fetch Teams
    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("*, team_members(*)")
      .eq("tournament_id", id);

    if (!teamsError && teamsData) {
      setTeams(teamsData);
    }
    setIsLoading(false);
  };

  const handleExport = () => {
    window.location.href = `/api/tournament/${id}/export`;
  };

  if (isLoading) {
    return <div className="container" style={{ textAlign: "center", marginTop: "10vh" }}>Cargando Torneo...</div>;
  }

  if (!tournament) {
    return <div className="container" style={{ textAlign: "center", marginTop: "10vh" }}>Torneo no encontrado.</div>;
  }

  const isCreator = session?.user?.id === tournament.creator_id;
  const isModerator = tournament.moderators?.includes(session?.user?.id);
  const canManage = isCreator || isModerator;
  const isLocked = tournament.status === "locked";
  
  const acceptedTeamsAll = teams.filter(t => t.status === "accepted");
  const acceptedTeams = acceptedTeamsAll.filter(t => t.name.toLowerCase().includes(teamsSearch.toLowerCase()));
  const pendingTeams = teams.filter(t => t.status === "pending" && t.name.toLowerCase().includes(teamsSearch.toLowerCase()));

  const isFull = acceptedTeamsAll.length >= tournament.max_teams;
  const isRegistrationFull = teams.length >= 300;

  const handleAcceptTeam = async (teamId) => {
    if (acceptedTeamsAll.length >= tournament.max_teams) {
      return alert("No puedes aceptar más equipos. Se ha alcanzado el límite de equipos del torneo.");
    }
    const { error } = await supabase.from("teams").update({ status: "accepted" }).eq("id", teamId);
    if (!error) {
      setTeams(teams.map(t => t.id === teamId ? { ...t, status: "accepted" } : t));
    }
  };

  const handleRejectOrDelete = async (teamId) => {
    if (!confirm("¿Seguro que deseas eliminar este equipo? Esta acción no se puede deshacer y liberará un cupo.")) return;
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (!error) {
      setTeams(teams.filter(t => t.id !== teamId));
    }
  };



  const toggleTeam = (teamId) => {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // Helper function to render a team card
  const renderTeamCard = (team) => {
    const isAccepted = team.status === "accepted";
    const isExpanded = !isAccepted || expandedTeams[team.id];

    const players = team.team_members || [];
    const validHours = players.map(p => Number(p.l4d2_playtime_hours) || 0);
    const avgHours = validHours.length > 0 ? (validHours.reduce((a, b) => a + b, 0) / validHours.length).toFixed(1) : 0;

    return (
      <div key={team.id} style={{
        display: "flex",
        background: "rgba(0,0,0,0.3)",
        border: "1px solid var(--border-light)",
        borderRadius: "8px",
        marginBottom: "1rem",
        overflowX: isExpanded ? "auto" : "hidden",
        cursor: isAccepted ? "pointer" : "default",
        transition: "background 0.3s ease"
      }}
      onClick={() => {
        if (isAccepted) toggleTeam(team.id);
      }}
      onMouseEnter={(e) => {
        if (isAccepted) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        if (isAccepted) e.currentTarget.style.background = "rgba(0,0,0,0.3)";
      }}
      >
        {/* Logo Column */}
        <div style={{ flex: `0 0 ${isExpanded ? '150px' : '120px'}`, borderRight: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", transition: "flex 0.4s ease" }}>
          <img 
            src={team.logo_url || "https://ui-avatars.com/api/?name=" + team.name} 
            alt={team.name} 
            style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "8px" }} 
          />
        </div>

        {/* Name Column */}
        <div style={{ position: "relative", flex: isExpanded ? "0 0 200px" : "1", borderRight: isExpanded ? "1px solid var(--border-light)" : "none", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", transition: "flex 0.4s ease, border 0.4s ease" }}>
          <h3 style={{ margin: 0, textAlign: "center", fontSize: "1.5rem", wordBreak: "break-word" }}>{team.name}</h3>
          {!isExpanded && <span style={{ position: "absolute", right: "1.5rem", color: "var(--primary)", fontSize: "0.9rem", fontWeight: "bold" }}>Ver Detalles ▼</span>}
        </div>

        {/* Collapsible Area (Table + Actions) */}
        <div style={{ 
          display: "flex", 
          flex: isExpanded ? "1" : "0",
          maxWidth: isExpanded ? "2000px" : "0px",
          opacity: isExpanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-width 0.5s ease, opacity 0.3s ease, flex 0.5s ease"
        }}>
          {/* Table Column */}
          <div style={{ flex: 1, minWidth: "600px", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border-light)" }} onClick={(e) => isAccepted && e.stopPropagation()}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-light)", color: "var(--muted)" }}>
                <th style={{ padding: "0.5rem 1rem", borderRight: "1px solid var(--border-light)" }}>Player</th>
                <th style={{ padding: "0.5rem 1rem", borderRight: "1px solid var(--border-light)" }}>Steam ID</th>
                <th style={{ padding: "0.5rem 1rem", borderRight: "1px solid var(--border-light)", textAlign: "center" }}>Horas</th>
                <th style={{ padding: "0.5rem 1rem", textAlign: "center" }}>¿Perfil Público?</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => (
                <tr key={p.id} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "0.5rem 1rem", borderRight: "1px solid var(--border-light)" }}>
                    <div style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.name}>
                      <a href={`https://steamcommunity.com/profiles/${p.steam_id_64}`} target="_blank" rel="noreferrer" className="player-link">
                        {p.name}
                      </a>
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem 1rem", borderRight: "1px solid var(--border-light)" }}>
                    <div style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted)" }} title={p.steam_id_64 || "N/A"}>
                      {p.steam_id_64 || "N/A"}
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem 1rem", borderRight: "1px solid var(--border-light)", textAlign: "center" }}>{p.l4d2_playtime_hours !== null ? p.l4d2_playtime_hours : "-"}</td>
                  <td style={{ padding: "0.5rem 1rem", textAlign: "center" }}>{p.is_profile_private ? <span className="text-danger">No</span> : <span className="text-success">Sí</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-light)", padding: "0.75rem 1rem", textAlign: "right", fontWeight: "bold", background: "rgba(0,0,0,0.2)" }}>
            Promedio de horas jugadas: <span style={{ color: "var(--primary)" }}>{avgHours} hrs</span>
          </div>
        </div>

        {/* Action Column */}
        <div style={{ flex: "0 0 200px", display: "flex", flexDirection: "column" }} onClick={(e) => isAccepted && e.stopPropagation()}>
          {team.status === "pending" && canManage && (
            <>
              <button 
                className="btn text-success" 
                style={{ flex: 1, borderRadius: 0, borderBottom: "1px solid var(--border-light)", background: "rgba(0,255,0,0.05)" }}
                onClick={() => handleAcceptTeam(team.id)}
              >
                ACEPTAR
              </button>
              <button 
                className="btn text-danger" 
                style={{ flex: 1, borderRadius: 0, background: "rgba(255,0,0,0.05)" }}
                onClick={() => handleRejectOrDelete(team.id)}
              >
                RECHAZAR
              </button>
            </>
          )}
          {team.status === "accepted" && (
            <>
              {canManage && (
                <button 
                  className="btn text-danger" 
                  style={{ flex: 1, borderRadius: 0, borderBottom: "1px solid var(--border-light)", background: "rgba(255,0,0,0.05)" }}
                  onClick={() => handleRejectOrDelete(team.id)}
                >
                  ELIMINAR
                </button>
              )}
              {/* Ver/Editar if Accepted. Can manage OR is captain and tournament not locked */}
              {(canManage || (session?.user?.id === team.creator_id && !isLocked)) && (
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, borderRadius: 0 }}
                  onClick={() => router.push(`/tournament/${id}/team/${team.id}`)}
                >
                  VER / EDITAR
                </button>
              )}
            </>
          )}
          {team.status === "pending" && !canManage && session?.user?.id === team.creator_id && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", color: "var(--warning)", textAlign: "center", fontSize: "0.9rem" }}>
              Esperando revisión de un administrador
            </div>
          )}
        </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ paddingBottom: "4rem", maxWidth: "1400px" }}>
      <header style={{ marginBottom: "3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{tournament.name}</h1>
        <p className="text-muted" style={{ maxWidth: "600px", margin: "0 auto" }}>
          {tournament.description}
        </p>
      </header>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "3rem" }}>
        <div className="card" style={{ flex: "1 1 200px", textAlign: "center", position: "relative" }}>
          {canManage && (
            <button 
              className="btn-icon" 
              style={{ position: "absolute", top: "1rem", right: "1rem" }}
              onClick={() => router.push(`/tournament/${id}/edit`)}
              title="Configuración"
            >
              <Settings size={20} />
            </button>
          )}
          <Trophy size={32} style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
          <h3>Estado</h3>
          <p className={isLocked ? "text-danger" : (isFull ? "text-warning" : "text-success")}>
            {isLocked ? "Torneo Cerrado" : (isRegistrationFull ? "Registro Lleno (300)" : "Registro Abierto")}
          </p>
        </div>
        <div className="card" style={{ flex: "1 1 200px", textAlign: "center" }}>
          <Users size={32} style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
          <h3>Equipos Aceptados</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{acceptedTeamsAll.length} / {tournament.max_teams}</p>
        </div>
        <div className="card" style={{ flex: "1 1 200px", textAlign: "center" }}>
          <Users size={32} style={{ color: "var(--muted)", margin: "0 auto 1rem" }} />
          <h3>En Cola (Pendientes)</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{pendingTeams.length}</p>
        </div>
        {isCreator && (
          <div className="card" style={{ flex: "1 1 200px", textAlign: "center" }}>
            <Download size={32} style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
            <h3>Exportar Datos</h3>
            <button className="btn btn-secondary" onClick={handleExport} style={{ marginTop: "0.5rem" }}>
              Descargar Excel
            </button>
          </div>
        )}
      </div>

      <main>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <input 
            type="text" 
            className="input-base" 
            placeholder="Buscar equipo por nombre..." 
            value={teamsSearch}
            onChange={(e) => setTeamsSearch(e.target.value)}
            style={{ width: "100%", maxWidth: "400px" }}
          />
          {!isRegistrationFull && !isLocked && (
            <button className="btn btn-primary" onClick={() => router.push(`/tournament/${id}/register`)}>
              Registrar mi Equipo
            </button>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2 style={{ margin: 0, color: "var(--success)" }}>Equipos Aceptados</h2>
        </div>

        {acceptedTeams.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem", marginBottom: "3rem" }}>
            <p className="text-muted">Aún no hay equipos aceptados en este torneo.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "3rem" }}>
            {acceptedTeams.map(team => renderTeamCard(team))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2 style={{ margin: 0, color: "var(--warning)" }}>Registros (Pendientes)</h2>
        </div>

        {pendingTeams.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem", marginBottom: "3rem" }}>
            <p className="text-muted">No hay equipos en cola de revisión.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "3rem" }}>
            {pendingTeams.map(team => renderTeamCard(team))}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, Trophy, Download } from "lucide-react";

export default function TournamentDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
  const isFull = teams.length >= tournament.max_teams;

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      <header style={{ marginBottom: "3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{tournament.name}</h1>
        <p className="text-muted" style={{ maxWidth: "600px", margin: "0 auto" }}>
          {tournament.description}
        </p>
      </header>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center", marginBottom: "3rem" }}>
        <div className="card" style={{ flex: "1 1 200px", textAlign: "center" }}>
          <Trophy size={32} style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
          <h3>Estado</h3>
          <p className={isFull ? "text-danger" : "text-success"}>
            {isFull ? "Registro Lleno" : "Registro Abierto"}
          </p>
        </div>
        <div className="card" style={{ flex: "1 1 200px", textAlign: "center" }}>
          <Users size={32} style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
          <h3>Equipos Registrados</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{teams.length} / {tournament.max_teams}</p>
        </div>
        {isCreator && (
          <div className="card" style={{ flex: "1 1 200px", textAlign: "center" }}>
            <Download size={32} style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
            <h3>Exportar Datos</h3>
            <button className="btn btn-secondary" onClick={handleExport} style={{ marginTop: "0.5rem" }}>
              Descargar CSV
            </button>
          </div>
        )}
      </div>

      <main>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2 style={{ margin: 0 }}>Equipos</h2>
          {!isFull && (
            <button className="btn btn-primary" onClick={() => router.push(`/tournament/${id}/register`)}>
              Registrar mi Equipo
            </button>
          )}
        </div>

        {teams.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <p className="text-muted">Aún no hay equipos registrados en este torneo.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {teams.map(team => (
              <div key={team.id} className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <img 
                  src={team.logo_url || "https://ui-avatars.com/api/?name=" + team.name} 
                  alt={team.name} 
                  style={{ width: "60px", height: "60px", borderRadius: "8px", objectFit: "cover" }} 
                />
                <div>
                  <h3 style={{ margin: 0 }}>{team.name}</h3>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>{team.team_members?.length || 0} Jugadores</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

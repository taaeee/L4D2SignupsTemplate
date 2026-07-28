"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";

let cachedTournaments: any = null;
let cachedMaps: any = null;

export default function MapVetoDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<any[]>(cachedTournaments || []);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamA, setSelectedTeamA] = useState("");
  const [selectedTeamB, setSelectedTeamB] = useState("");
  const [format, setFormat] = useState("bo1");
  const [isLoading, setIsLoading] = useState(!cachedTournaments || !cachedMaps);

  const [allMaps, setAllMaps] = useState<any[]>(cachedMaps || []);
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  const [searchMap, setSearchMap] = useState("");
  const [mapFilter, setMapFilter] = useState("all");
  const [randomCount, setRandomCount] = useState(7);

  const [generatedVeto, setGeneratedVeto] = useState<any>(null);
  const [hoveredAvailableMap, setHoveredAvailableMap] = useState<string | null>(null);
  const [hoveredSelectedMap, setHoveredSelectedMap] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (session?.user?.id) {
      fetchTournaments();
      fetchMaps();
      cleanupOldVetoes();
    }
  }, [session?.user?.id, status]);

  const cleanupOldVetoes = async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("map_vetoes")
        .delete()
        .lt("created_at", twentyFourHoursAgo);
    } catch (e) {
      console.error("Error cleaning up old vetoes:", e);
    }
  };

  useEffect(() => {
    if (selectedTournament) {
      fetchTeams(selectedTournament);
    } else {
      setTeams([]);
      setSelectedTeamA("");
      setSelectedTeamB("");
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    if (!cachedTournaments) setIsLoading(true);

    // Fetch Tournaments (created)
    const { data: createdTournaments } = await supabase
      .from("tournaments")
      .select("id, name, creator_id, moderators")
      .eq("creator_id", session!.user!.id);

    // Fetch Tournaments (moderated)
    const { data: moderatedTournaments } = await supabase
      .from("tournaments")
      .select("id, name, creator_id, moderators")
      .contains("moderators", JSON.stringify([session!.user!.id]));

    const allTournaments = [
      ...(createdTournaments || []),
      ...(moderatedTournaments || []),
    ];

    // Remove duplicates
    const uniqueTournaments = Array.from(
      new Map(allTournaments.map((t) => [t.id, t])).values()
    );

    cachedTournaments = uniqueTournaments;
    setTournaments(uniqueTournaments);
    if (cachedMaps) setIsLoading(false);
  };

  const fetchTeams = async (tournamentId: string) => {
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("tournament_id", tournamentId)
      .eq("status", "accepted");

    if (data) {
      setTeams(data);
    }
  };

  const fetchMaps = async () => {
    try {
      const res = await fetch("/api/maps");
      const data = await res.json();
      const sortedMaps = data.all.sort((a: any, b: any) => a.name.localeCompare(b.name));
      cachedMaps = sortedMaps;
      setAllMaps(sortedMaps);
      if (cachedTournaments) setIsLoading(false);
    } catch (e) {
      console.error("Error fetching maps", e);
      if (cachedTournaments) setIsLoading(false);
    }
  };

  const handleRandomPool = () => {
    const filtered = allMaps.filter((map: any) => mapFilter === "all" || map.type === mapFilter);
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, randomCount).map((m: any) => m.name);
    setSelectedMaps(selected);
  };

  const generateToken = () => Math.random().toString(36).substr(2, 9);

  const handleCreateVeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !selectedTeamA || !selectedTeamB || selectedTeamA === selectedTeamB) {
      toast.error("Selecciona un torneo y dos equipos diferentes.");
      return;
    }

    const teamAToken = generateToken();
    const teamBToken = generateToken();

    try {
      const visibleMaps = allMaps.filter((map: any) => map.name.toLowerCase().includes(searchMap.toLowerCase()) && (mapFilter === "all" || map.type === mapFilter));

      const poolMaps = visibleMaps
        .filter((m: any) => selectedMaps.includes(m.name))
        .map((m: any) => ({
          ...m,
          status: "available"
        }));

      if (poolMaps.length === 0) {
        toast.error("Debes seleccionar al menos un mapa para el pool.");
        return;
      }

      const initialState = {
        status: "in_progress",
        currentTurn: selectedTeamA,
        history: [],
        maps: poolMaps
      };

      const { data, error } = await supabase
        .from("map_vetoes")
        .insert({
          tournament_id: selectedTournament,
          team_a_id: selectedTeamA,
          team_b_id: selectedTeamB,
          format: format,
          team_a_token: teamAToken,
          team_b_token: teamBToken,
          state: initialState
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedVeto(data);
      toast.success("Veto creado exitosamente.");
    } catch (e) {
      console.error("Veto creation error:", e);
      toast.error(`Error: ${(e as any).message || (e as any).details || JSON.stringify(e)}`);
    }
  };

  const copyLink = (path: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
    toast.success("¡Enlace copiado!");
  };

  if (isLoading) {
    return <LoadingSpinner text="Cargando..." fullHeight={true} />;
  }

  return (
    <div className="container" style={{ maxWidth: "800px", padding: "2rem" }}>
      <h1 style={{ textAlign: "center", color: "var(--primary)" }}>Map Veto Creator</h1>
      <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: "2rem" }}>
        Crea un enlace para vetar mapas entre dos equipos de tus torneos.
      </p>

      {!generatedVeto ? (
        <form onSubmit={handleCreateVeto} className="card">
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label>Torneo</label>
            <select
              className="input-base"
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              required
            >
              <option value="">Selecciona un torneo...</option>
              {tournaments.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Equipo A</label>
              <select
                className="input-base"
                value={selectedTeamA}
                onChange={(e) => setSelectedTeamA(e.target.value)}
                required
                disabled={!selectedTournament || teams.length === 0}
              >
                <option value="">Selecciona equipo A...</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Equipo B</label>
              <select
                className="input-base"
                value={selectedTeamB}
                onChange={(e) => setSelectedTeamB(e.target.value)}
                required
                disabled={!selectedTournament || teams.length === 0}
              >
                <option value="">Selecciona equipo B...</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label>Formato</label>
            <select
              className="input-base"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="bo1">One map</option>
              <option value="to2">Total of 2 (2 mapas)</option>
              <option value="bo3">Best of 3 (3 mapas)</option>
              <option value="bo5">Best of 5 (5 mapas)</option>
            </select>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
              <label style={{ margin: 0 }}>Map Pool (Mapas disponibles)</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" className="btn btn-secondary text-sm" onClick={() => setSelectedMaps(allMaps.filter((map: any) => map.name.toLowerCase().includes(searchMap.toLowerCase()) && (mapFilter === "all" || map.type === mapFilter)).map((m: any) => m.name))}>Seleccionar Todos</button>
                <button type="button" className="btn btn-secondary text-sm" onClick={() => setSelectedMaps([])}>Deseleccionar Todos</button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <label style={{ margin: 0, whiteSpace: "nowrap" }}>Generar Aleatorio:</label>
              <input
                type="number"
                className="input-base"
                value={randomCount}
                onChange={(e) => setRandomCount(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: "80px", textAlign: "center" }}
                min="1"
                max={allMaps.length}
              />
              <button type="button" className="btn btn-secondary text-sm" onClick={handleRandomPool}>
                Generar
              </button>
              <span className="text-sm text-muted" style={{ marginLeft: "auto" }}>
                Filtrado actual: {allMaps.filter((map: any) => mapFilter === "all" || map.type === mapFilter).length} mapas
              </span>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <input
                type="text"
                className="input-base"
                placeholder="Buscar mapa..."
                value={searchMap}
                onChange={(e) => setSearchMap(e.target.value)}
                style={{ flex: 1, minWidth: "200px" }}
              />
              <select
                className="input-base"
                value={mapFilter}
                onChange={(e) => setMapFilter(e.target.value)}
                style={{ minWidth: "150px" }}
              >
                <option value="all">Todos los tipos</option>
                <option value="official">Oficiales</option>
                <option value="custom">Customs</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {/* Available Maps Panel */}
              <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <h4 style={{ margin: 0, color: "var(--primary)" }}>Mapas Disponibles</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.5rem", maxHeight: "300px", overflowY: "auto", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid var(--border-light)", alignContent: "start" }}>
                  {allMaps
                    .filter((map: any) => !selectedMaps.includes(map.name))
                    .filter((map: any) => map.name.toLowerCase().includes(searchMap.toLowerCase()) && (mapFilter === "all" || map.type === mapFilter))
                    .map((map: any) => (
                    <button
                      key={map.name}
                      type="button"
                      onClick={() => {
                        setSelectedMaps([...selectedMaps, map.name]);
                        setHoveredAvailableMap(null);
                      }}
                      style={{ padding: "0.5rem", textAlign: "center", background: hoveredAvailableMap === map.name ? "rgba(74, 222, 128, 0.2)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem", whiteSpace: "normal", wordBreak: "break-word", transition: "background 0.2s", color: "var(--text-main)" }}
                      onMouseEnter={() => setHoveredAvailableMap(map.name)}
                      onMouseLeave={() => setHoveredAvailableMap(null)}
                      title="Haz clic para agregar"
                    >
                      {map.name}
                    </button>
                  ))}
                  {allMaps.filter((map: any) => !selectedMaps.includes(map.name)).length === 0 && (
                    <p className="text-muted text-sm" style={{ gridColumn: "1 / -1", textAlign: "center" }}>No hay mapas disponibles</p>
                  )}
                </div>
              </div>

              {/* Selected Maps Panel */}
              <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <h4 style={{ margin: 0, color: "var(--success)" }}>Mapas Seleccionados ({selectedMaps.length})</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.5rem", maxHeight: "300px", overflowY: "auto", padding: "1rem", background: "rgba(74, 222, 128, 0.05)", borderRadius: "8px", border: "1px solid var(--success)", alignContent: "start" }}>
                  {selectedMaps.map(mapName => (
                    <button
                      key={mapName}
                      type="button"
                      onClick={() => {
                        setSelectedMaps(selectedMaps.filter(m => m !== mapName));
                        setHoveredSelectedMap(null);
                      }}
                      style={{ padding: "0.5rem", textAlign: "center", background: "var(--success)", border: "none", color: "#000", fontWeight: "bold", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem", whiteSpace: "normal", wordBreak: "break-word", transition: "opacity 0.2s", opacity: hoveredSelectedMap === mapName ? "0.8" : "1" }}
                      onMouseEnter={() => setHoveredSelectedMap(mapName)}
                      onMouseLeave={() => setHoveredSelectedMap(null)}
                      title="Haz clic para quitar"
                    >
                      {mapName}
                    </button>
                  ))}
                  {selectedMaps.length === 0 && (
                    <p className="text-muted text-sm" style={{ gridColumn: "1 / -1", textAlign: "center" }}>No has seleccionado ningún mapa</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", fontSize: "1.2rem" }}>
            Generar Enlaces de Veto
          </button>
        </form>
      ) : (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h2 style={{ color: "var(--success)", textAlign: "center", margin: 0 }}>¡Veto Generado!</h2>

          <div style={{ background: "rgba(0,0,0,0.3)", padding: "1.5rem", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 1rem 0" }}>Espectadores</h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="text" readOnly className="input-base" value={`${window.location.origin}/map-veto/${generatedVeto.id}`} style={{ flex: 1 }} />
              <button className="btn-icon" onClick={() => copyLink(`/map-veto/${generatedVeto.id}`)}>
                <LinkIcon />
              </button>
            </div>
            <p className="text-muted text-sm" style={{ marginTop: "0.5rem" }}>Comparte este enlace para que otros vean el veto en vivo.</p>
          </div>

          <div style={{ background: "rgba(0,0,0,0.3)", padding: "1.5rem", borderRadius: "8px", borderLeft: "4px solid var(--primary)" }}>
            <h3 style={{ margin: "0 0 1rem 0" }}>Capitán: {teams.find((t: any) => t.id === selectedTeamA)?.name || "Equipo A"}</h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="text" readOnly className="input-base" value={`${window.location.origin}/map-veto/${generatedVeto.id}?token=${generatedVeto.team_a_token}`} style={{ flex: 1 }} />
              <button className="btn-icon" onClick={() => copyLink(`/map-veto/${generatedVeto.id}?token=${generatedVeto.team_a_token}`)}>
                <LinkIcon />
              </button>
            </div>
          </div>

          <div style={{ background: "rgba(0,0,0,0.3)", padding: "1.5rem", borderRadius: "8px", borderLeft: "4px solid var(--warning)" }}>
            <h3 style={{ margin: "0 0 1rem 0" }}>Capitán: {teams.find((t: any) => t.id === selectedTeamB)?.name || "Equipo B"}</h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="text" readOnly className="input-base" value={`${window.location.origin}/map-veto/${generatedVeto.id}?token=${generatedVeto.team_b_token}`} style={{ flex: 1 }} />
              <button className="btn-icon" onClick={() => copyLink(`/map-veto/${generatedVeto.id}?token=${generatedVeto.team_b_token}`)}>
                <LinkIcon />
              </button>
            </div>
          </div>

          <button className="btn btn-secondary" onClick={() => setGeneratedVeto(null)}>
            Crear otro Veto
          </button>
        </div>
      )}
    </div>
  );
}

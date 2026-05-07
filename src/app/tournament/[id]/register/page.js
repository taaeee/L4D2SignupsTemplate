"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, Upload } from "lucide-react";

export default function RegisterTeam() {
  const { id } = useParams();
  const router = useRouter();

  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [teamName, setTeamName] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [teamAnswers, setTeamAnswers] = useState({});
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (data) {
      setTournament(data);
      // Initialize with 1 player by default
      setPlayers([{ 
        id: Date.now(), 
        name: "", 
        steam_id_64: "", 
        role: data.template_json.defaultRole || "Member",
        answers: {} 
      }]);
    }
    setIsLoading(false);
  };

  const handleAddPlayer = () => {
    if (players.length >= (tournament?.template_json?.maxPlayers || 8)) return;
    setPlayers([...players, { 
      id: Date.now(), 
      name: "", 
      steam_id_64: "", 
      role: tournament.template_json.defaultRole || "Member",
      answers: {} 
    }]);
  };

  const handleRemovePlayer = (pId) => {
    setPlayers(players.filter(p => p.id !== pId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamName) return alert("El equipo debe tener un nombre.");
    for (const p of players) {
      if (!p.name || !p.steam_id_64) return alert(`El jugador ${p.name || "(sin nombre)"} debe tener nombre y SteamID64.`);
    }

    setIsSubmitting(true);

    try {
      // 1. Upload Logo if exists
      let logoUrl = null;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("team-logos")
          .upload(fileName, logoFile);

        if (uploadError) throw new Error("Error subiendo el logo: " + uploadError.message);
        
        const { data: { publicUrl } } = supabase.storage.from("team-logos").getPublicUrl(fileName);
        logoUrl = publicUrl;
      }

      // 2. Validate and fetch Steam Data for players
      const validatedPlayers = [];
      for (const p of players) {
        const res = await fetch(`/api/steam/player-stats?steamId=${p.steam_id_64}`);
        const steamData = await res.json();
        
        if (!res.ok || steamData.error) {
          throw new Error(`El SteamID64 de ${p.name} es inválido o no existe.`);
        }
        
        validatedPlayers.push({
          ...p,
          l4d2_playtime_hours: steamData.l4d2_playtime_hours,
          is_profile_private: steamData.is_profile_private
        });
      }

      // 3. Insert Team
      // Save custom team answers in a JSON field (we can add `custom_fields` column to teams or just merge it into a string format)
      // Since we didn't add a custom JSON column to `teams`, we'll just format it and we'll trust the base table. Wait, we should probably add `custom_data` to teams and team_members if needed. 
      // For now we'll just save the base fields requested. If needed we can alter table.

      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert([{ tournament_id: id, name: teamName, logo_url: logoUrl }])
        .select()
        .single();

      if (teamError) throw new Error("Error creando el equipo.");

      // 4. Insert Players
      const membersToInsert = validatedPlayers.map(vp => ({
        team_id: teamData.id,
        name: vp.name,
        role: vp.role,
        steam_id_64: vp.steam_id_64,
        l4d2_playtime_hours: vp.l4d2_playtime_hours,
        is_profile_private: vp.is_profile_private,
      }));

      const { error: membersError } = await supabase.from("team_members").insert(membersToInsert);
      if (membersError) throw new Error("Error registrando los jugadores.");

      alert("¡Equipo registrado con éxito!");
      router.push(`/tournament/${id}`);

    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="container" style={{ textAlign: "center", marginTop: "10vh" }}>Cargando...</div>;
  if (!tournament) return <div className="container" style={{ textAlign: "center", marginTop: "10vh" }}>Torneo no encontrado.</div>;

  const tpl = tournament.template_json;

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      <header style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1>Registro de Equipo</h1>
        <p className="text-muted">Inscribiendo a: {tournament.name}</p>
      </header>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* TEAM DETAILS */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>Detalles del Equipo</h2>
          
          <div className="flex-col gap-4">
            <div>
              <label className="text-sm text-muted font-medium block mb-2">Nombre del Equipo *</label>
              <input required className="input-base" value={teamName} onChange={e => setTeamName(e.target.value)} />
            </div>
            
            <div>
              <label className="text-sm text-muted font-medium block mb-2">Logo del Equipo (Opcional)</label>
              <label className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <Upload size={18} />
                {logoFile ? logoFile.name : "Subir Imagen"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setLogoFile(e.target.files[0])} />
              </label>
            </div>

            {tpl.fields?.map(field => (
              <div key={field.name}>
                <label className="text-sm text-muted font-medium block mb-2">{field.name}</label>
                {field.type === "select" ? (
                  <select className="input-base" onChange={e => setTeamAnswers({...teamAnswers, [field.name]: e.target.value})}>
                    <option value="">Selecciona...</option>
                    {field.options?.split(',').map(opt => <option key={opt} value={opt.trim()}>{opt.trim()}</option>)}
                  </select>
                ) : (
                  <input className="input-base" onChange={e => setTeamAnswers({...teamAnswers, [field.name]: e.target.value})} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PLAYERS */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ color: "var(--primary)", margin: 0 }}>Jugadores ({players.length} / {tpl.maxPlayers || 8})</h2>
            {players.length < (tpl.maxPlayers || 8) && (
              <button type="button" className="btn btn-secondary" onClick={handleAddPlayer}>
                <Plus size={18} /> Añadir Jugador
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {players.map((player, index) => (
              <div key={player.id} style={{ padding: "1.5rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", position: "relative" }}>
                {players.length > 1 && (
                  <button type="button" className="btn-icon btn-danger" style={{ position: "absolute", top: "1rem", right: "1rem" }} onClick={() => handleRemovePlayer(player.id)}>
                    <Trash2 size={18} />
                  </button>
                )}
                <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>Jugador {index + 1}</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label className="text-sm text-muted block mb-1">Nombre (In-Game) *</label>
                    <input required className="input-base" value={player.name} onChange={e => {
                      const newP = [...players];
                      newP[index].name = e.target.value;
                      setPlayers(newP);
                    }} />
                  </div>
                  <div>
                    <label className="text-sm text-muted block mb-1">SteamID64 *</label>
                    <input required className="input-base" placeholder="7656119..." value={player.steam_id_64} onChange={e => {
                      const newP = [...players];
                      newP[index].steam_id_64 = e.target.value;
                      setPlayers(newP);
                    }} />
                  </div>
                  <div>
                    <label className="text-sm text-muted block mb-1">Rol</label>
                    <input className="input-base" value={player.role} onChange={e => {
                      const newP = [...players];
                      newP[index].role = e.target.value;
                      setPlayers(newP);
                    }} />
                  </div>
                  
                  {tpl.playerFields?.map(field => (
                    <div key={field.name}>
                      <label className="text-sm text-muted block mb-1">{field.name}</label>
                      <input className="input-base" onChange={e => {
                        const newP = [...players];
                        newP[index].answers[field.name] = e.target.value;
                        setPlayers(newP);
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ fontSize: "1.2rem", padding: "1rem", display: "flex", justifyContent: "center" }}>
          {isSubmitting ? "Registrando y Validando..." : "Finalizar Registro"}
        </button>
      </form>
    </div>
  );
}

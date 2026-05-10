"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, Upload, Users, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function RegisterTeam() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Steam Friends State
  const [friends, setFriends] = useState([]);
  const [friendsSearch, setFriendsSearch] = useState("");
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [activePlayerIndex, setActivePlayerIndex] = useState(null);

  // Form State
  const [teamName, setTeamName] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [teamAnswers, setTeamAnswers] = useState({});
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("Debes iniciar sesión para registrar un equipo.");
      router.push("/");
    } else if (status === "authenticated" && id) {
      fetchData();
    }
  }, [id, status, router]);

  const fetchData = async () => {
    const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (data) {
      setTournament(data);
      if (data.status === "locked") {
        toast.error("Las inscripciones para este torneo están cerradas.");
        router.push(`/tournament/${id}`);
        return;
      }

      // Check max 300 total registrations
      const { count } = await supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", id);
        
      if (count >= 300) {
        toast.error("Se ha alcanzado el límite máximo de registros (300) para este torneo.");
        router.push(`/tournament/${id}`);
        return;
      }

      setPlayers([{ 
        id: Date.now(), 
        name: session?.user?.name || "", 
        steam_id_64: "", 
        answers: {} 
      }]);
    }
    setIsLoading(false);
  };

  const loadFriends = async (index) => {
    setActivePlayerIndex(index);
    setFriendsSearch(""); // Reset search on open
    setShowFriendsModal(true);
    if (friends.length === 0) {
      setIsFriendsLoading(true);
      try {
        const res = await fetch("/api/steam/friends");
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          setFriends(data.friends || []);
        }
      } catch (err) {
        console.error("Error loading friends:", err);
      } finally {
        setIsFriendsLoading(false);
      }
    }
  };

  const selectFriend = (friend) => {
    if (activePlayerIndex === -1) {
      if (players.length >= (tournament?.template_json?.maxPlayers || 8)) {
        toast.error("El equipo está lleno.");
        setShowFriendsModal(false);
        return;
      }
      setPlayers([...players, {
        id: Date.now(),
        name: friend.name,
        steam_id_64: friend.profileUrl,
        answers: {}
      }]);
    } else {
      const newP = [...players];
      newP[activePlayerIndex].name = friend.name;
      newP[activePlayerIndex].steam_id_64 = friend.profileUrl;
      setPlayers(newP);
    }
    setShowFriendsModal(false);
  };

  const handleAddPlayer = () => {
    if (players.length >= (tournament?.template_json?.maxPlayers || 8)) return;
    setPlayers([...players, { 
      id: Date.now(), 
      name: "", 
      steam_id_64: "", 
      answers: {} 
    }]);
  };

  const handleRemovePlayer = (pId) => {
    setPlayers(players.filter(p => p.id !== pId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamName) return toast.error("El equipo debe tener un nombre.");
    for (const p of players) {
      if (!p.name || !p.steam_id_64) return toast.error(`El jugador ${p.name || "(sin nombre)"} debe tener nombre y URL de Steam.`);
    }

    setIsSubmitting(true);

    try {
      // Re-verify real-time tournament status before proceeding
      const { data: tData } = await supabase.from("tournaments").select("status").eq("id", id).single();
      if (tData?.status === "locked") {
        setIsSubmitting(false);
        return toast.error("Las inscripciones para este torneo acaban de cerrar.");
      }

      // Re-verify real-time total registrations limit
      const { count } = await supabase.from("teams").select("*", { count: "exact", head: true }).eq("tournament_id", id);
      if (count >= 300) {
        setIsSubmitting(false);
        return toast.error("Se ha alcanzado el límite máximo de registros (300) para este torneo.");
      }

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
        const res = await fetch(`/api/steam/player-stats?steamUrl=${encodeURIComponent(p.steam_id_64)}`);
        const steamData = await res.json();
        
        if (!res.ok || steamData.error) {
          throw new Error(`La URL de Steam de ${p.name} es inválida o no existe.`);
        }
        
        validatedPlayers.push({
          ...p,
          steam_id_64: steamData.steam_id_64,
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
        .insert([{ 
          tournament_id: id, 
          name: teamName, 
          logo_url: logoUrl,
          creator_id: session.user.id 
        }])
        .select()
        .single();

      if (teamError) throw new Error("Error creando el equipo.");

      // 4. Insert Players
      const membersToInsert = validatedPlayers.map((vp, idx) => ({
        team_id: teamData.id,
        name: vp.name,
        role: idx === 0 ? "Captain" : idx === 1 ? "Co-Captain" : "Member",
        steam_id_64: vp.steam_id_64, // the API now returns the resolved steam_id_64
        l4d2_playtime_hours: vp.l4d2_playtime_hours,
        is_profile_private: vp.is_profile_private,
      }));

      const { error: membersError } = await supabase.from("team_members").insert(membersToInsert);
      if (membersError) throw new Error("Error registrando los jugadores.");

      toast.success("¡Equipo registrado con éxito!");
      router.push(`/tournament/${id}`);

    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || isLoading) return <div className="container" style={{ textAlign: "center", marginTop: "10vh" }}>Cargando...</div>;
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
              <div style={{ display: "flex", gap: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => loadFriends(-1)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Users size={18} /> Añadir desde Steam
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleAddPlayer}>
                  <Plus size={18} /> Añadir Jugador
                </button>
              </div>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1.1rem", margin: 0 }}>
                    Jugador {index + 1} 
                    <span className="text-muted text-sm ml-2">
                      ({index === 0 ? "Captain" : index === 1 ? "Co-Captain" : "Member"})
                    </span>
                  </h3>
                </div>
                
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
                    <label className="text-sm text-muted block mb-1">URL de Steam *</label>
                    <input required className="input-base" placeholder="https://steamcommunity.com/id/..." value={player.steam_id_64} onChange={e => {
                      const newP = [...players];
                      newP[index].steam_id_64 = e.target.value;
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

      {/* Friends Modal */}
      {showFriendsModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div className="card" style={{ width: "90%", maxWidth: "500px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Mis Amigos de Steam</h3>
              <button className="btn-icon" onClick={() => setShowFriendsModal(false)}><X size={20} /></button>
            </div>
            
            <input 
              type="text" 
              className="input-base" 
              placeholder="Buscar amigo por nombre..." 
              value={friendsSearch}
              onChange={(e) => setFriendsSearch(e.target.value)}
              style={{ marginBottom: "1rem" }}
            />
            
            <div style={{ overflowY: "auto", flex: 1 }}>
              {isFriendsLoading ? (
                <p style={{ textAlign: "center", padding: "2rem" }}>Cargando amigos...</p>
              ) : friends.length === 0 ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-error)" }}>
                  No se encontraron amigos. Asegúrate de haber iniciado sesión con Steam y tener tu perfil público.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {friends.filter(f => f.name.toLowerCase().includes(friendsSearch.toLowerCase())).map(friend => (
                    <div key={friend.steamId} 
                         onClick={() => selectFriend(friend)}
                         style={{ 
                           display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem", 
                           borderRadius: "8px", cursor: "pointer", background: "rgba(255,255,255,0.05)" 
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                         onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    >
                      <img src={friend.avatar} alt={friend.name} style={{ width: 40, height: 40, borderRadius: "50%" }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: "bold" }}>{friend.name}</p>
                        <p className="text-muted text-sm" style={{ margin: 0 }}>{friend.steamId}</p>
                      </div>
                    </div>
                  ))}
                  
                  {friends.filter(f => f.name.toLowerCase().includes(friendsSearch.toLowerCase())).length === 0 && (
                    <p style={{ textAlign: "center", padding: "1rem", color: "var(--muted)" }}>No hay coincidencias.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

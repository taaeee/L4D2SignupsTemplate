"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trash2, Save, Users, Plus, X, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";

export default function TeamDetails() {
  const { id: tournamentId, teamId } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [tournament, setTournament] = useState(null);
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Steam Friends State
  const [friends, setFriends] = useState([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);

  // Community Bans State
  const [communityBans, setCommunityBans] = useState([]);

  // Logo Editing State
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [tempLogoFile, setTempLogoFile] = useState(null);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {}, isDanger: true });

  useEffect(() => {
    if (tournamentId && teamId && status !== "loading") {
      fetchData();
    }
  }, [tournamentId, teamId, status]);

  const fetchData = async () => {
    // 1. Fetch Tournament
    const { data: tData } = await supabase.from("tournaments").select("*").eq("id", tournamentId).single();
    
    // 2. Fetch Team
    const { data: teamData } = await supabase.from("teams").select("*").eq("id", teamId).single();
    
    // 3. Fetch Players
    const { data: membersData } = await supabase.from("team_members").select("*").eq("team_id", teamId).order("id", { ascending: true });

    if (tData && teamData) {
      if (teamData.status !== "accepted") {
        toast.error("No puedes acceder al panel de edición de este equipo porque aún no ha sido aceptado.");
        router.push(`/tournament/${tournamentId}`);
        return;
      }

      setTournament(tData);
      setTeam({ name: teamData.name, logo_url: teamData.logo_url, creator_id: teamData.creator_id });
      setPlayers(membersData || []);
    }

    // 4. Fetch Community Bans
    try {
      if (membersData && membersData.length > 0) {
        const steamIds = membersData.map(m => m.steam_id_64).filter(Boolean);
        const bansRes = await fetch("/api/bans/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steamIds })
        });
        if (bansRes.ok) {
          const bansData = await bansRes.json();
          setCommunityBans(bansData);
        }
      }
    } catch (e) {
      console.error("Failed to fetch community bans", e);
    }

    setIsLoading(false);
  };

  const getPlayerBan = (steamId64) => {
    if (!steamId64 || !communityBans[steamId64]) return null;
    if (communityBans[steamId64].isBanned) {
      return communityBans[steamId64];
    }
    return null;
  };

  const isCreator = session?.user?.id === tournament?.creator_id;
  const isModerator = tournament?.moderators?.includes(session?.user?.id);
  const isCaptain = session?.user?.id === team?.creator_id;
  
  const isLocked = tournament?.status === "locked";
  // Mod/Creator always edit. Captain only if open.
  const canEdit = isCreator || isModerator || (isCaptain && !isLocked);

  const checkPermissionToEdit = async () => {
    const { data: tData } = await supabase.from("tournaments").select("status, creator_id, moderators").eq("id", tournamentId).single();
    if (!tData) return false;

    const freshIsCreator = session?.user?.id === tData.creator_id;
    const freshIsModerator = tData.moderators?.includes(session?.user?.id);
    const freshIsCaptain = session?.user?.id === team?.creator_id;
    const freshIsLocked = tData.status === "locked";
    
    const freshCanEdit = freshIsCreator || freshIsModerator || (freshIsCaptain && !freshIsLocked);

    if (!freshCanEdit) {
      toast.error(freshIsLocked 
        ? "El torneo acaba de ser cerrado por un administrador. Ya no puedes hacer cambios."
        : "No tienes permisos para hacer esto.");
      
      if (freshIsLocked && tournament.status !== "locked") {
        setTournament(prev => ({...prev, status: "locked"}));
      }
      return false;
    }
    return true;
  };

  // -------------------------
  // PLAYERS MANAGEMENT
  // -------------------------
  const executeRemovePlayer = async (playerId) => {
    if (!(await checkPermissionToEdit())) return;
    setIsSaving(true);
    await supabase.from("team_members").delete().eq("id", playerId);
    setPlayers(players.filter(p => p.id !== playerId));
    setIsSaving(false);
    toast.success("Jugador eliminado.");
  };

  const handleRemovePlayer = (playerId) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Jugador",
      message: "¿Estás seguro de eliminar este jugador?",
      isDanger: true,
      onConfirm: () => executeRemovePlayer(playerId)
    });
  };

  const handleUpdatePlayer = async (index, field, value) => {
    const newP = [...players];
    newP[index][field] = value;
    setPlayers(newP);
  };

  const savePlayerChanges = async (player) => {
    if (!(await checkPermissionToEdit())) return;
    setIsSaving(true);
    await supabase.from("team_members").update({ name: player.name }).eq("id", player.id);
    toast.success("Jugador actualizado.");
    setIsSaving(false);
  };

  const executeDeleteTeam = async () => {
    if (!(await checkPermissionToEdit())) return;
    setIsSaving(true);
    await supabase.from("teams").delete().eq("id", teamId);
    toast.success("Equipo eliminado.");
    router.push(`/tournament/${tournamentId}`);
  };

  const handleDeleteTeam = () => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Equipo",
      message: "¿Estás seguro de eliminar todo el equipo? Esto es irreversible.",
      isDanger: true,
      onConfirm: executeDeleteTeam
    });
  };

  // -------------------------
  // UPDATE TEAM LOGO
  // -------------------------
  const handleSaveLogo = async () => {
    if (!(await checkPermissionToEdit())) return;
    if (!tempLogoFile) return toast.error("Selecciona una imagen primero.");
    
    setIsSaving(true);
    try {
      const fileExt = tempLogoFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(fileName, tempLogoFile);

      if (uploadError) throw new Error("Error subiendo el logo: " + uploadError.message);
      
      const { data: { publicUrl } } = supabase.storage.from("team-logos").getPublicUrl(fileName);

      const { error } = await supabase.from("teams").update({ logo_url: publicUrl }).eq("id", teamId);
      if (error) throw new Error("Error actualizando la base de datos.");

      setTeam({ ...team, logo_url: publicUrl });
      toast.success("Logo actualizado con éxito.");
      setIsEditingLogo(false);
      setTempLogoFile(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------
  // ADD NEW PLAYER
  // -------------------------
  const [newPlayer, setNewPlayer] = useState({ name: "", steam_id_64: "" });

  const loadFriends = async () => {
    setShowFriendsModal(true);
    if (friends.length === 0) {
      setIsFriendsLoading(true);
      try {
        const res = await fetch("/api/steam/friends");
        const data = await res.json();
        if (!data.error) setFriends(data.friends || []);
        else toast.error(data.error);
      } catch (err) {
        console.error(err);
      } finally {
        setIsFriendsLoading(false);
      }
    }
  };

  const selectFriend = async (friend) => {
    setShowFriendsModal(false);
    
    if (!(await checkPermissionToEdit())) return;

    if (players.length >= (tournament.template_json.maxPlayers || 8)) {
      return toast.error("El equipo está lleno.");
    }
    
    setIsSaving(true);
    try {
      // Usamos el profileUrl como el steamId a buscar
      const res = await fetch(`/api/steam/player-stats?steamUrl=${encodeURIComponent(friend.profileUrl)}`);
      const steamData = await res.json();
      if (!res.ok || steamData.error) throw new Error("La URL de Steam es inválida o no existe.");

      const { data, error } = await supabase.from("team_members").insert([{
        team_id: teamId,
        name: friend.name,
        role: "Member",
        steam_id_64: steamData.steam_id_64,
        l4d2_playtime_hours: steamData.l4d2_playtime_hours,
        is_profile_private: steamData.is_profile_private
      }]).select().single();

      if (error) throw new Error("Error guardando el jugador.");

      setPlayers([...players, data]);
      toast.success("Amigo añadido con éxito.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewPlayer = async () => {
    if (!newPlayer.name || !newPlayer.steam_id_64) {
      return toast.error("El nombre y el SteamID64 son obligatorios.");
    }

    if (!(await checkPermissionToEdit())) return;

    if (players.length >= (tournament.template_json.maxPlayers || 8)) {
      return toast.error("El equipo está lleno.");
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/steam/player-stats?steamUrl=${encodeURIComponent(newPlayer.steam_id_64)}`);
      const steamData = await res.json();
      
      if (!res.ok || steamData.error) throw new Error("La URL de Steam es inválida o no existe.");

      const { data, error } = await supabase.from("team_members").insert([{
        team_id: teamId,
        name: newPlayer.name,
        role: "Member", // Backend default, but UI uses index
        steam_id_64: steamData.steam_id_64, // API returns the resolved ID
        l4d2_playtime_hours: steamData.l4d2_playtime_hours,
        is_profile_private: steamData.is_profile_private
      }]).select().single();

      if (error) throw new Error("Error guardando el jugador.");

      setPlayers([...players, data]);
      setNewPlayer({ name: "", steam_id_64: "" });
      toast.success("Jugador añadido con éxito.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="container" style={{ textAlign: "center", marginTop: "10vh" }}>Cargando equipo...</div>;
  if (!team || !tournament) return <div className="container" style={{ textAlign: "center", marginTop: "10vh" }}>No encontrado.</div>;

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      <header style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <img 
            src={team.logo_url || "https://ui-avatars.com/api/?name=" + team.name} 
            alt={team.name} 
            style={{ width: "100px", height: "100px", borderRadius: "16px", objectFit: "cover" }} 
          />
          {canEdit && !isEditingLogo && (
            <button className="btn btn-secondary text-sm" style={{ padding: "0.3rem" }} onClick={() => { setIsEditingLogo(true); setTempLogoFile(null); }}>
              Editar Logo
            </button>
          )}
        </div>
        
        {isEditingLogo && canEdit && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, minWidth: "250px" }}>
            <label className="text-sm text-muted">Sube el nuevo logo</label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <label className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", flex: 1, justifyContent: "center" }}>
                <Upload size={18} />
                {tempLogoFile ? tempLogoFile.name : "Seleccionar Imagen"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setTempLogoFile(e.target.files[0])} />
              </label>
              <button className="btn btn-primary" onClick={handleSaveLogo} disabled={isSaving || !tempLogoFile}><Save size={18} /></button>
              <button className="btn-icon text-muted" onClick={() => setIsEditingLogo(false)}><X size={18} /></button>
            </div>
          </div>
        )}

        {!isEditingLogo && (
          <div>
          <h1 style={{ margin: 0, fontSize: "2.5rem" }}>{team.name}</h1>
          <p className="text-muted">Torneo: {tournament.name}</p>
          {!canEdit && isCaptain && isLocked && (
             <p className="text-danger">El torneo ha iniciado. No puedes editar tu equipo.</p>
          )}
        </div>
        )}
      </header>

      <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, color: "var(--primary)" }}>Roster ({players.length}/{tournament.template_json.maxPlayers || 8})</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {players.map((p, index) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr 1.5fr", gap: "1rem" }}>
                <div>
                  <label className="text-sm text-muted block mb-1">Nombre</label>
                  <input className="input-base" value={p.name} disabled={!canEdit} onChange={e => handleUpdatePlayer(index, "name", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Rol</label>
                  <div className="input-base" style={{ background: "rgba(0,0,0,0.1)", opacity: 0.8, color: "var(--muted)" }}>
                    {index === 0 ? "Captain" : index === 1 ? "Co-Captain" : "Member"}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">SteamID64</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input className="input-base" value={p.steam_id_64} disabled style={{ opacity: 0.7 }} />
                    <a href={`https://steamcommunity.com/profiles/${p.steam_id_64}`} target="_blank" rel="noreferrer" className="btn-icon" title="Ver Perfil">
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted block mb-1">Estado (Comunidad)</label>
                  {(() => {
                    const banInfo = getPlayerBan(p.steam_id_64);
                    if (banInfo && banInfo.isBanned) {
                      return (
                        <div style={{ display: "flex", flexDirection: "column", background: "rgba(239, 68, 68, 0.1)", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                          <span className="text-danger text-sm" style={{ fontWeight: "bold" }}>BANEADO</span>
                          {banInfo.bans && banInfo.bans.map((b, i) => (
                            <a key={i} href={b.url} target="_blank" rel="noreferrer" className="text-xs text-danger" style={{ display: "block", marginTop: "4px", textDecoration: "none", fontWeight: "bold" }}>
                              [{b.source}] Ver Ban ↗
                            </a>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: "flex", alignItems: "center", background: "rgba(34, 197, 94, 0.1)", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(34, 197, 94, 0.3)", height: "42px" }}>
                        <span className="text-success text-sm" style={{ fontWeight: "bold" }}>Legit</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              {canEdit && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button className="btn-icon text-success" onClick={() => savePlayerChanges(p)} title="Guardar Cambios del Jugador" disabled={isSaving}>
                    <Save size={18} />
                  </button>
                  <button className="btn-icon btn-danger" onClick={() => handleRemovePlayer(p.id)} title="Expulsar" disabled={isSaving}>
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {canEdit && players.length < (tournament.template_json.maxPlayers || 8) && (
        <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Añadir Nuevo Jugador</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
            <div>
              <label className="text-sm text-muted block mb-1">Nombre</label>
              <input className="input-base" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">URL de Steam</label>
              <input className="input-base" placeholder="https://steamcommunity..." value={newPlayer.steam_id_64} onChange={e => setNewPlayer({...newPlayer, steam_id_64: e.target.value})} />
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button type="button" className="btn btn-secondary" onClick={loadFriends} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} disabled={isSaving}>
                <Users size={20} /> Añadir desde Steam
              </button>
              <button className="btn btn-primary" onClick={handleAddNewPlayer} disabled={isSaving}>
                <Plus size={20} /> Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {canEdit && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
          <button className="btn text-danger" onClick={handleDeleteTeam} style={{ border: "1px solid var(--color-error)" }}>
            Eliminar Equipo
          </button>
          <button className="btn btn-secondary" onClick={() => router.push(`/tournament/${tournamentId}`)}>
            Volver
          </button>
        </div>
      )}

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
            <div style={{ overflowY: "auto", flex: 1 }}>
              {isFriendsLoading ? (
                <p style={{ textAlign: "center", padding: "2rem" }}>Cargando amigos...</p>
              ) : friends.length === 0 ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-error)" }}>
                  No se encontraron amigos. Inicia sesión con Steam.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {friends.map(friend => (
                    <div key={friend.steamId} 
                         onClick={() => selectFriend(friend)}
                         style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem", borderRadius: "8px", cursor: "pointer", background: "rgba(255,255,255,0.05)" }}
                    >
                      <img src={friend.avatar} alt={friend.name} style={{ width: 40, height: 40, borderRadius: "50%" }} />
                      <div>
                        <p style={{ margin: 0, fontWeight: "bold" }}>{friend.name}</p>
                        <p className="text-muted text-sm" style={{ margin: 0 }}>{friend.steamId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Sí, Eliminar"
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trash2, Save, Users, Plus, X, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";
import LoadingSpinner from "@/components/LoadingSpinner";

interface TeamMember {
  id: string;
  team_id: string;
  name: string;
  role: string | null;
  steam_id_64: string;
  l4d2_playtime_hours: number | null;
  is_profile_private: boolean | null;
}

interface Team {
  id?: string;
  name?: string;
  logo_url?: string | null;
  raw_logo_url?: string | null;
  creator_id?: string | null;
  status?: string;
}

import { Database } from '@/lib/database.types';
import { Country, getAvailableCountries } from '@/lib/countries';
type Tournament = Database['public']['Tables']['tournaments']['Row'];

interface Friend {
  name: string;
  steamId: string;
  avatar: string;
  profileUrl: string;
}

export default function TeamDetails() {
  const params = useParams();
  const tournamentId = params.id as string;
  const teamId = params.teamId as string;
  const router = useRouter();
  const { data: session, status } = useSession();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Steam Friends State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);

  // Community Bans State
  const [communityBans, setCommunityBans] = useState<Record<string, any>>({});

  // Info Editing State
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [tempLogoFile, setTempLogoFile] = useState<File | null>(null);
  
  const [teamTag, setTeamTag] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamCountries, setTeamCountries] = useState<Country[]>([]);
  const [availableCountries, setAvailableCountries] = useState<Country[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {}, isDanger: true });
  const [statusConfirmModal, setStatusConfirmModal] = useState<{ isOpen: boolean; newStatus: string; label: string }>({ isOpen: false, newStatus: "", label: "" });

  useEffect(() => {
    if (tournamentId && teamId && status !== "loading") {
      fetchData();
      fetchCountries();
    }
  }, [tournamentId, teamId, status]);

  const fetchCountries = async () => {
    try {
      const formatted = await getAvailableCountries();
      setAvailableCountries(formatted);
    } catch (err) {
      console.error("Error loading countries", err);
    }
  };

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

      let parsedLogo = teamData.logo_url;
      let initTag = "";
      let initCountries = [];
      if (teamData.logo_url && teamData.logo_url.startsWith("{")) {
        try {
          const parsed = JSON.parse(teamData.logo_url);
          parsedLogo = parsed.url;
          initTag = parsed.tag || "";
          initCountries = parsed.countries || [];
        } catch (e) {}
      }

      setTournament(tData as any);
      setTeam({ name: teamData.name, logo_url: parsedLogo, raw_logo_url: teamData.logo_url, creator_id: teamData.creator_id });
      setTeamName(teamData.name || "");
      setTeamTag(initTag);
      setTeamCountries(initCountries);
      setPlayers(membersData || []);
    }

    // 4. Fetch Community Bans
    try {
      if (membersData && membersData.length > 0) {
        const steamIds = membersData.map((m: any) => m.steam_id_64).filter(Boolean);
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

  const getPlayerBan = (steamId64?: string) => {
    if (!steamId64 || !communityBans[steamId64]) return null;
    if (communityBans[steamId64].isBanned) {
      return communityBans[steamId64];
    }
    return null;
  };

  const isCreator = session?.user?.id === tournament?.creator_id;
  const isModerator = !!(tournament?.moderators && Array.isArray(tournament.moderators) && tournament.moderators.includes(session?.user?.id as string));
  const isCaptain = session?.user?.id === team?.creator_id;
  
  const isLocked = tournament?.status === "locked";
  // Mod/Creator always edit. Captain only if open.
  const canEdit = isCreator || isModerator || (isCaptain && !isLocked);
  const isAdmin = isCreator || isModerator;

  const checkPermissionToEdit = async () => {
    const { data: tData } = await supabase.from("tournaments").select("status, creator_id, moderators").eq("id", tournamentId).single();
    if (!tData) return false;

    const typedData = tData as any;
    const freshIsCreator = session?.user?.id === typedData.creator_id;
    const freshIsModerator = typedData.moderators?.includes(session?.user?.id);
    const freshIsCaptain = session?.user?.id === team?.creator_id;
    const freshIsLocked = typedData.status === "locked";
    
    const freshCanEdit = freshIsCreator || freshIsModerator || (freshIsCaptain && !freshIsLocked);

    if (!freshCanEdit) {
      toast.error(freshIsLocked 
        ? "El torneo acaba de ser cerrado por un administrador. Ya no puedes hacer cambios."
        : "No tienes permisos para hacer esto.");
      
      if (freshIsLocked && tournament?.status !== "locked") {
        setTournament((prev: any) => prev ? {...prev, status: "locked"} : null);
      }
      return false;
    }
    return true;
  };

  // -------------------------
  // PLAYERS MANAGEMENT
  // -------------------------
  const executeRemovePlayer = async (playerId: string) => {
    if (!(await checkPermissionToEdit())) return;
    setIsSaving(true);
    await supabase.from("team_members").delete().eq("id", playerId);
    setPlayers(players.filter(p => p.id !== playerId));
    setIsSaving(false);
    toast.success("Jugador eliminado.");
  };

  const handleRemovePlayer = (playerId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Jugador",
      message: "¿Estás seguro de eliminar este jugador?",
      isDanger: true,
      onConfirm: () => executeRemovePlayer(playerId)
    });
  };

  const handleUpdatePlayer = async (index: number, field: string, value: string) => {
    const newP: any = [...players];
    newP[index][field] = value;
    setPlayers(newP);
  };

  const savePlayerChanges = async (player: TeamMember) => {
    if (!(await checkPermissionToEdit())) return;
    setIsSaving(true);
    await supabase.from("team_members").update({ name: player.name }).eq("id", player.id);
    
    // Sync team name if 1v1
    if ((tournament?.template_json as any)?.is1v1) {
      await supabase.from("teams").update({ name: player.name }).eq("id", teamId);
      setTeam(prev => ({ ...prev, name: player.name }));
    }

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

  const executeUpdateStatus = async (newStatus: string, label: string) => {
    if (!(await checkPermissionToEdit())) return;
    setIsSaving(true);
    const { error } = await supabase.from("teams").update({ status: newStatus }).eq("id", teamId);
    if (!error) {
      setTeam(prev => prev ? ({ ...prev, status: newStatus }) : null);
      toast.success(`Estado cambiado a: ${label}`);
    } else {
      toast.error("Error al actualizar el estado");
    }
    setIsSaving(false);
  };

  const handleUpdateStatus = (newStatus: string, label: string) => {
    setStatusConfirmModal({ isOpen: true, newStatus, label });
  };

  // -------------------------
  // UPDATE TEAM INFO (LOGO, TAG, COUNTRIES)
  // -------------------------
  const handleSaveInfo = async () => {
    if (!(await checkPermissionToEdit())) return;
    
    setIsSaving(true);
    try {
      let finalUrl = team?.logo_url;

      if (tempLogoFile) {
        const fileExt = tempLogoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("team-logos")
          .upload(fileName, tempLogoFile);

        if (uploadError) throw new Error("Error subiendo el logo: " + uploadError.message);
        
        const { data: { publicUrl } } = supabase.storage.from("team-logos").getPublicUrl(fileName);
        finalUrl = publicUrl;
      }

      let finalLogoString = finalUrl;
      if (teamTag || teamCountries.length > 0) {
        finalLogoString = JSON.stringify({
          url: finalUrl || "",
          tag: teamTag,
          countries: teamCountries
        });
      }

      const { error } = await supabase.from("teams").update({ logo_url: finalLogoString, name: teamName }).eq("id", teamId);
      if (error) throw new Error("Error actualizando la base de datos.");

      setTeam({ ...(team as Team), logo_url: finalUrl, raw_logo_url: finalLogoString, name: teamName });
      toast.success("Información del equipo actualizada con éxito.");
      setIsEditingInfo(false);
      setTempLogoFile(null);
    } catch (err: any) {
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

  const selectFriend = async (friend: Friend) => {
    setShowFriendsModal(false);
    
    if (!(await checkPermissionToEdit())) return;

    if (!tournament) return;
    if (players.length >= ((tournament.template_json as any)?.maxPlayers || 8)) {
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
        role: JSON.stringify({ title: "Member", answers: {} }),
        steam_id_64: steamData.steam_id_64,
        l4d2_playtime_hours: steamData.l4d2_playtime_hours,
        is_profile_private: steamData.is_profile_private
      }]).select().single();

      if (error) throw new Error("Error guardando el jugador.");

      // Sync team name if 1v1
      if ((tournament?.template_json as any)?.is1v1) {
        await supabase.from("teams").update({ name: friend.name }).eq("id", teamId);
        setTeam(prev => prev ? ({ ...prev, name: friend.name }) : null);
      }

      setPlayers([...players, data]);
      toast.success("Amigo añadido con éxito.");
    } catch (err: any) {
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

    if (!tournament) return;
    if (players.length >= ((tournament.template_json as any)?.maxPlayers || 8)) {
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
        role: JSON.stringify({ title: "Member", answers: {} }), // Backend default, but UI uses index
        steam_id_64: steamData.steam_id_64, // API returns the resolved ID
        l4d2_playtime_hours: steamData.l4d2_playtime_hours,
        is_profile_private: steamData.is_profile_private
      }]).select().single();

      if (error) throw new Error("Error guardando el jugador.");

      // Sync team name if 1v1
      if ((tournament?.template_json as any)?.is1v1) {
        await supabase.from("teams").update({ name: newPlayer.name }).eq("id", teamId);
        setTeam(prev => prev ? ({ ...prev, name: newPlayer.name }) : null);
      }

      setPlayers([...players, data]);
      setNewPlayer({ name: "", steam_id_64: "" });
      toast.success("Jugador añadido con éxito.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner text="Cargando equipo..." fullHeight={true} />;
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
          {canEdit && !isEditingInfo && (
            <button className="btn btn-secondary text-sm" style={{ padding: "0.3rem" }} onClick={() => { setIsEditingInfo(true); setTempLogoFile(null); }}>
              Editar Perfil
            </button>
          )}
        </div>
        
        {isEditingInfo && canEdit && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1, minWidth: "250px", background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "16px" }}>
            <div>
              <label className="text-sm text-muted">Sube un nuevo logo (Opcional)</label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <label className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", flex: 1, justifyContent: "center" }}>
                  <Upload size={18} />
                  {tempLogoFile ? tempLogoFile.name : "Seleccionar Imagen"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setTempLogoFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>

            {!((tournament?.template_json as any)?.is1v1) && (
              <div>
                <label className="text-sm text-muted block mb-1">Nombre del Equipo</label>
                <input className="input-base" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Nombre del Equipo" />
              </div>
            )}

            <div>
              <label className="text-sm text-muted block mb-1">Tag del Equipo</label>
              <input className="input-base" value={teamTag} onChange={e => setTeamTag(e.target.value)} placeholder="Ej: ^" />
            </div>

            <div style={{ position: "relative" }}>
              <label className="text-sm text-muted block mb-1">Países del Equipo</label>
              {teamCountries.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                  {teamCountries.map(c => (
                    <div key={c.code} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(255,255,255,0.1)", padding: "0.25rem 0.5rem", borderRadius: "16px", fontSize: "0.85rem" }}>
                      <img src={c.flag} alt={c.name} style={{ width: 16, height: 12, objectFit: "cover", borderRadius: 2 }} />
                      <span>{c.name}</span>
                      <button type="button" onClick={() => setTeamCountries(teamCountries.filter(tc => tc.code !== c.code))} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", marginLeft: "0.25rem" }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input 
                className="input-base" 
                placeholder="Buscar país..." 
                value={countrySearch} 
                onChange={e => {
                  setCountrySearch(e.target.value);
                  setShowCountryDropdown(true);
                }}
                onFocus={() => setShowCountryDropdown(true)}
              />
              {showCountryDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", maxHeight: "200px", overflowY: "auto", zIndex: 10, marginTop: "0.25rem" }}>
                  {availableCountries
                    .filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                    .map(c => (
                      <div 
                        key={c.code}
                        onClick={() => {
                          if (!teamCountries.find(tc => tc.code === c.code)) {
                            setTeamCountries([...teamCountries, c]);
                          }
                          setCountrySearch("");
                          setShowCountryDropdown(false);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", cursor: "pointer" }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <img src={c.flag} alt={c.name} style={{ width: 24, height: 16, objectFit: "cover", borderRadius: 2 }} />
                        <span>{c.name}</span>
                      </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button className="btn btn-primary" onClick={handleSaveInfo} disabled={isSaving} style={{ flex: 1 }}><Save size={18} /> Guardar Cambios</button>
              <button className="btn-icon text-muted" onClick={() => setIsEditingInfo(false)}><X size={18} /></button>
            </div>
          </div>
        )}

        {!isEditingInfo && (
          <div>
          <h1 style={{ margin: 0, fontSize: "2.5rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ textDecoration: team.status !== "accepted" && team.status !== "pending" ? "line-through" : "none", opacity: team.status !== "accepted" && team.status !== "pending" ? 0.75 : 1 }}>
              {team.name}
            </span>
            {teamCountries.length > 0 && (
              <div style={{ display: "flex", gap: "0.25rem", marginLeft: "0.5rem", flexWrap: "wrap" }}>
                {teamCountries.map(c => (
                  <img 
                    key={c.code} 
                    src={c.flag} 
                    alt={c.name} 
                    title={c.name}
                    style={{ height: "24px", borderRadius: "2px", boxShadow: "0 2px 4px rgba(0,0,0,0.5)", objectFit: "cover" }} 
                  />
                ))}
              </div>
            )}
            {team.status === "eliminated" && (
              <span className="badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.3)", fontWeight: "bold", fontSize: "0.85rem", padding: "4px 10px", marginLeft: "0.5rem" }}>
                ELIMINADO
              </span>
            )}
            {team.status === "disqualified" && (
              <span className="badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.3)", fontWeight: "bold", fontSize: "0.85rem", padding: "4px 10px", marginLeft: "0.5rem" }}>
                DESCALIFICADO
              </span>
            )}
            {team.status === "withdrawn" && (
              <span className="badge" style={{ background: "rgba(234, 179, 8, 0.15)", color: "#eab308", border: "1px solid rgba(234, 179, 8, 0.3)", fontWeight: "bold", fontSize: "0.85rem", padding: "4px 10px", marginLeft: "0.5rem" }}>
                RETIRADO (SALIDA PROPIA)
              </span>
            )}
          </h1>
          <p className="text-muted">Torneo: {tournament.name}</p>
          {!canEdit && isCaptain && isLocked && (
             <p className="text-danger">El torneo ha iniciado. No puedes editar tu equipo.</p>
          )}
        </div>
        )}
      </header>

      {isAdmin && (
        <div className="glass-panel" style={{ padding: "1.25rem 1.5rem", marginBottom: "2rem", borderLeft: "4px solid var(--primary)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                Estado del Equipo en la Competencia
              </h3>
              <p className="text-muted text-sm" style={{ margin: "0.25rem 0 0 0" }}>
                Cambia el estado para indicar si el equipo compite o si salió del torneo.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button 
                type="button"
                className={`btn ${team.status === "accepted" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => handleUpdateStatus("accepted", "En Competencia")}
                disabled={isSaving || team.status === "accepted"}
              >
                En Competencia
              </button>
              <button 
                type="button"
                className={`btn ${team.status === "eliminated" ? "btn-danger" : "btn-secondary text-danger"}`}
                onClick={() => handleUpdateStatus("eliminated", "Eliminado")}
                disabled={isSaving || team.status === "eliminated"}
              >
                Eliminado
              </button>
              <button 
                type="button"
                className={`btn ${team.status === "disqualified" ? "btn-danger" : "btn-secondary text-danger"}`}
                onClick={() => handleUpdateStatus("disqualified", "Descalificado")}
                disabled={isSaving || team.status === "disqualified"}
              >
                Descalificado
              </button>
              <button 
                type="button"
                className={`btn ${team.status === "withdrawn" ? "btn-warning" : "btn-secondary"}`}
                onClick={() => handleUpdateStatus("withdrawn", "Retirado (Salida propia)")}
                disabled={isSaving || team.status === "withdrawn"}
                style={{ color: team.status === "withdrawn" ? "#fff" : "#eab308" }}
              >
                Retirado
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, color: "var(--primary)" }}>Roster ({players.length}/{((tournament?.template_json as any)?.maxPlayers || 8)})</h2>
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
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {banInfo && banInfo.isBanned ? (
                          <div style={{ display: "flex", flexDirection: "column", background: "rgba(239, 68, 68, 0.1)", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                            <span className="text-danger text-sm" style={{ fontWeight: "bold" }}>BANEADO</span>
                            {banInfo.bans && banInfo.bans.map((b: any, i: number) => (
                              <a key={i} href={b.url} target="_blank" rel="noreferrer" className="text-xs text-danger" style={{ display: "block", marginTop: "4px", textDecoration: "none", fontWeight: "bold" }}>
                                [{b.source}] Ver Ban ↗
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", background: "rgba(34, 197, 94, 0.1)", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(34, 197, 94, 0.3)", minHeight: "42px" }}>
                            <span className="text-success text-sm" style={{ fontWeight: "bold" }}>Legit</span>
                          </div>
                        )}
                        {banInfo && banInfo.manualChecks && banInfo.manualChecks.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "2px" }}>
                            {banInfo.manualChecks.map((mc: any, idx: number) => (
                              <a key={idx} href={mc.url} target="_blank" rel="noreferrer" className="badge text-xs" style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-main)", textDecoration: "none", padding: "2px 6px" }} title={`Verificar ${mc.source} manualmente (Cloudflare antibot activo)`}>
                                Verificar {mc.source} ↗
                              </a>
                            ))}
                          </div>
                        )}
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

      {canEdit && tournament && players.length < ((tournament.template_json as any)?.maxPlayers || 8) && (
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
                <LoadingSpinner text="Cargando amigos..." size={30} />
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
      <ConfirmModal
        isOpen={statusConfirmModal.isOpen}
        title="Cambiar Estado de Competencia"
        message={`¿Seguro que deseas marcar este equipo como "${statusConfirmModal.label}"? Seguirá apareciendo en la lista pública pero como fuera de competencia.`}
        confirmText="Sí, Cambiar Estado"
        isDanger={statusConfirmModal.newStatus !== "accepted"}
        onConfirm={() => executeUpdateStatus(statusConfirmModal.newStatus, statusConfirmModal.label)}
        onCancel={() => setStatusConfirmModal({ isOpen: false, newStatus: "", label: "" })}
      />
    </div>
  );
}

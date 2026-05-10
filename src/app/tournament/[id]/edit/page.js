"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Save, Lock, Unlock, Users, Trash2 } from "lucide-react";

export default function EditTournament() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxTeams, setMaxTeams] = useState(16);
  const [tStatus, setTStatus] = useState("open");
  const [moderators, setModerators] = useState([]);
  
  // New Mod Input
  const [newModId, setNewModId] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && id) {
      fetchData();
    }
  }, [id, status, router]);

  const fetchData = async () => {
    const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).single();
    if (data) {
      if (data.creator_id !== session?.user?.id) {
        alert("No tienes permiso para editar este torneo.");
        router.push(`/tournament/${id}`);
        return;
      }
      setTournament(data);
      setName(data.name || "");
      setDescription(data.description || "");
      setMaxTeams(data.max_teams || 16);
      setTStatus(data.status || "open");
      setModerators(data.moderators || []);
    }
    setIsLoading(false);
  };

  const handleAddModerator = () => {
    if (!newModId.trim()) return;
    if (moderators.includes(newModId.trim())) {
      alert("Este usuario ya es moderador.");
      return;
    }
    setModerators([...moderators, newModId.trim()]);
    setNewModId("");
  };

  const handleRemoveModerator = (modId) => {
    setModerators(moderators.filter(m => m !== modId));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const { error } = await supabase
      .from("tournaments")
      .update({
        name,
        description,
        max_teams: maxTeams,
        status: tStatus,
        moderators: moderators
      })
      .eq("id", id);

    setIsSaving(false);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      alert("¡Torneo actualizado con éxito!");
      router.push(`/tournament/${id}`);
    }
  };

  const handleDeleteTournament = async () => {
    if (!confirm("¿Estás 100% seguro de que deseas eliminar este torneo? Esto borrará TODOS los equipos y jugadores. Esta acción no se puede deshacer.")) {
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    
    if (error) {
      alert("Error al eliminar: " + error.message);
      setIsSaving(false);
    } else {
      alert("Torneo eliminado.");
      router.push("/");
    }
  };

  if (status === "loading" || isLoading) return <div className="container" style={{ textAlign: "center", marginTop: "10vh" }}>Cargando...</div>;
  if (!tournament) return null;

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      <header style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1>Configuración del Torneo</h1>
        <p className="text-muted">ID: {id}</p>
      </header>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* BASIC INFO */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>Información Básica</h2>
          <div className="flex-col gap-4">
            <div>
              <label className="text-sm text-muted font-medium block mb-2">Nombre del Torneo *</label>
              <input required className="input-base" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted font-medium block mb-2">Descripción corta</label>
              <textarea className="input-base" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted font-medium block mb-2">Límite de Equipos *</label>
              <input type="number" min="2" max="128" required className="input-base" value={maxTeams} onChange={e => setMaxTeams(parseInt(e.target.value))} />
            </div>
          </div>
        </div>

        {/* STATUS & LOCK */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>Estado del Torneo</h2>
          <p className="text-muted mb-4">
            Si "Cierras" el torneo, nadie más podrá inscribirse y los capitanes no podrán modificar sus equipos ni jugadores. Solo tú y los moderadores podrán hacer cambios.
          </p>
          
          <div style={{ display: "flex", gap: "1rem" }}>
            <button 
              type="button" 
              className={`btn ${tStatus === "open" ? "btn-primary" : "btn-secondary"}`} 
              onClick={() => setTStatus("open")}
              style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
            >
              <Unlock size={20} /> Torneo Abierto
            </button>
            <button 
              type="button" 
              className={`btn ${tStatus === "locked" ? "btn-danger" : "btn-secondary"}`} 
              onClick={() => setTStatus("locked")}
              style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
            >
              <Lock size={20} /> Torneo Cerrado (Iniciado)
            </button>
          </div>
        </div>

        {/* MODERATORS */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <Users size={24} color="var(--primary)" />
            <h2 style={{ margin: 0, color: "var(--primary)" }}>Moderadores</h2>
          </div>
          <p className="text-muted mb-4">
            Añade el ID de la cuenta (UUID) de los usuarios a los que quieras darles permisos de moderación para editar y expulsar equipos/jugadores.
          </p>
          
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <input 
              className="input-base" 
              placeholder="UUID del usuario..." 
              value={newModId} 
              onChange={e => setNewModId(e.target.value)} 
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-secondary" onClick={handleAddModerator}>
              Añadir
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {moderators.length === 0 ? (
              <p className="text-muted">No hay moderadores añadidos.</p>
            ) : (
              moderators.map((mod, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                  <span style={{ fontFamily: "monospace" }}>{mod}</span>
                  <button type="button" className="btn-icon btn-danger" onClick={() => handleRemoveModerator(mod)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem" }}>
          <button type="button" className="btn text-danger" onClick={handleDeleteTournament} style={{ border: "1px solid var(--color-error)" }}>
            Eliminar Torneo
          </button>
          
          <div style={{ display: "flex", gap: "1rem" }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.push(`/tournament/${id}`)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Save size={20} /> {isSaving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Save, Lock, Unlock, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";

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
  
  // Extra Options
  const [logoUrl, setLogoUrl] = useState("");
  const [rules, setRules] = useState("");
  const [socialLinks, setSocialLinks] = useState({ twitch: "", twitter: "", youtube: "", discord: "" });
  const [isPrivate, setIsPrivate] = useState(false);
  
  // New Mod Input
  const [newModId, setNewModId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

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
        toast.error("No tienes permiso para editar este torneo.");
        router.push(`/tournament/${id}`);
        return;
      }
      setTournament(data);
      setName(data.name || "");
      setDescription(data.description || "");
      setMaxTeams(data.max_teams || 16);
      setTStatus(data.status || "open");
      setModerators(data.moderators || []);
      
      if (data.template_json) {
        setLogoUrl(data.template_json.logo_url || "");
        setRules(data.template_json.rules || "");
        setSocialLinks(data.template_json.social_links || { twitch: "", twitter: "", youtube: "", discord: "" });
        setIsPrivate(data.template_json.isPrivate || false);
      }
    }
    setIsLoading(false);
  };

  const handleAddModerator = () => {
    if (!newModId.trim()) return;
    if (moderators.includes(newModId.trim())) {
      toast.error("Este usuario ya es moderador.");
      return;
    }
    setModerators([...moderators, newModId.trim()]);
    setNewModId("");
  };

  const handleGenerateInvite = async () => {
    setIsGeneratingLink(true);
    setInviteLink("");
    try {
      const res = await fetch(`/api/tournament/${id}/mod-invite/generate`);
      const data = await res.json();
      if (res.ok) {
        setInviteLink(data.inviteUrl);
      } else {
        toast.error(data.error || "Error al generar el enlace");
      }
    } catch (e) {
      toast.error("Error de red");
    }
    setIsGeneratingLink(false);
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Enlace copiado al portapapeles");
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
        moderators: moderators,
        template_json: {
          ...tournament.template_json,
          logo_url: logoUrl,
          rules,
          social_links: socialLinks,
          isPrivate
        }
      })
      .eq("id", id);

    setIsSaving(false);

    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("¡Torneo actualizado con éxito!");
      router.push(`/tournament/${id}`);
    }
  };

  const executeDelete = async () => {
    setIsSaving(true);
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    
    if (error) {
      toast.error("Error al eliminar: " + error.message);
      setIsSaving(false);
    } else {
      toast.success("Torneo eliminado.");
      router.push("/");
    }
  };

  const handleDeleteTournament = () => {
    setShowConfirmDelete(true);
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
            <div style={{ marginTop: "1.5rem" }}>
              <label className="text-sm text-muted font-medium block mb-2">URL del Logo (Opcional)</label>
              <input className="input-base" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://ejemplo.com/logo.png" />
            </div>
            <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input 
                type="checkbox" 
                id="private-tournament"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="private-tournament" className="text-sm text-main" style={{ cursor: "pointer" }}>
                Torneo Privado (Oculto en Explorar)
              </label>
            </div>
          </div>
        </div>

        {/* Social & Rules */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>Redes y Reglas (Opcional)</h2>
          <div className="flex gap-4" style={{ flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium block mb-2">Twitch</label>
              <input className="input-base" value={socialLinks.twitch} onChange={e => setSocialLinks({...socialLinks, twitch: e.target.value})} placeholder="URL de Twitch" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium block mb-2">Twitter (X)</label>
              <input className="input-base" value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} placeholder="URL de Twitter" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium block mb-2">YouTube</label>
              <input className="input-base" value={socialLinks.youtube} onChange={e => setSocialLinks({...socialLinks, youtube: e.target.value})} placeholder="URL de YouTube" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium block mb-2">Discord</label>
              <input className="input-base" value={socialLinks.discord} onChange={e => setSocialLinks({...socialLinks, discord: e.target.value})} placeholder="URL de Discord" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted font-medium block mb-2">Página de Reglas (Markdown soportado o Texto Libre)</label>
            <textarea className="input-base" value={rules} onChange={e => setRules(e.target.value)} placeholder="Escribe las reglas completas aquí..." style={{ minHeight: "150px" }} />
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={24} color="var(--primary)" />
              <h2 style={{ margin: 0, color: "var(--primary)" }}>Moderadores</h2>
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleGenerateInvite} disabled={isGeneratingLink}>
              {isGeneratingLink ? "Generando..." : "Generar Enlace de Invitación"}
            </button>
          </div>

          {inviteLink && (
            <div style={{ background: "rgba(74, 222, 128, 0.1)", border: "1px solid var(--primary)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
              <p className="text-sm text-success" style={{ marginBottom: "0.5rem", fontWeight: "bold" }}>Enlace generado (válido por 1 día):</p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <input readOnly className="input-base" value={inviteLink} style={{ flex: 1, borderColor: "var(--primary)" }} />
                <button type="button" className="btn btn-primary" onClick={copyInviteLink}>Copiar</button>
              </div>
            </div>
          )}

          <p className="text-muted mb-4">
            También puedes añadir el ID de la cuenta (UUID) manualmente si lo prefieres.
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
              Añadir Manualmente
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

      <ConfirmModal 
        isOpen={showConfirmDelete}
        title="Eliminar Torneo"
        message="¿Estás 100% seguro de que deseas eliminar este torneo? Esto borrará TODOS los equipos y jugadores. Esta acción no se puede deshacer."
        confirmText="Sí, Eliminar"
        isDanger={true}
        onConfirm={executeDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
}

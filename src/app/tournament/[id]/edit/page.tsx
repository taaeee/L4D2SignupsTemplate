"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Save, Lock, Unlock, Users, Trash2, EyeOff, User, Check } from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TwitchIcon, DiscordIcon, YoutubeIcon, XIcon } from "@/components/SocialIcons";

import { Database } from '@/lib/database.types';

type Tournament = Database['public']['Tables']['tournaments']['Row'];

interface UserProfile {
  id: string;
  name: string | null;
  image: string | null;
}

export default function EditTournament() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session, status } = useSession();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxTeams, setMaxTeams] = useState(16);
  const [tStatus, setTStatus] = useState("open");
  const [moderators, setModerators] = useState<string[]>([]);

  // Extra Options
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [rules, setRules] = useState("");
  const [socialLinks, setSocialLinks] = useState({ twitch: "", twitter: "", youtube: "", discord: "" });
  const [isPrivate, setIsPrivate] = useState(false);
  const [is1v1, setIs1v1] = useState(false);
  const [tournamentFormat, setTournamentFormat] = useState("single_elimination");

  // New Mod Input
  const [newModId, setNewModId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [moderatorProfiles, setModeratorProfiles] = useState<UserProfile[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (status !== "loading") {
      fetchData();
    }
  }, [id, status, router]);

  useEffect(() => {
    if (moderators && moderators.length > 0) {
      supabase.from("users").select("id, name, image").in("id", moderators)
        .then(({ data }) => setModeratorProfiles(data || []));
    } else {
      setModeratorProfiles([]);
    }
  }, [moderators]);

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
      setModerators((data.moderators as string[]) || []);

      const templateJson: any = data.template_json || {};
      if (templateJson) {
        setLogoUrl(data.logo_url || templateJson.logo_url || "");
        setRules(templateJson.rules || "");
        setSocialLinks(templateJson.social_links || { twitch: "", twitter: "", youtube: "", discord: "" });
        setIsPrivate(templateJson.isPrivate || false);
        setIs1v1(templateJson.is1v1 || false);
        setTournamentFormat(templateJson.tournamentFormat || "single_elimination");
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

  const handleRemoveModerator = (modId: string) => {
    setModerators(moderators.filter(m => m !== modId));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    let finalLogoUrl = logoUrl;
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `tournament-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(fileName, logoFile);

      if (uploadError) {
        setIsSaving(false);
        return toast.error("Error subiendo el logo: " + uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage.from("team-logos").getPublicUrl(fileName);
      finalLogoUrl = publicUrl;
    }

    // Limpiamos logo_url de template_json si existía
    const newTemplateJson: any = { ...(tournament?.template_json as any || {}) };
    delete newTemplateJson.logo_url;

    const { error } = await supabase
      .from("tournaments")
      .update({
        name,
        description,
        max_teams: maxTeams,
        status: tStatus,
        moderators: moderators,
        logo_url: finalLogoUrl,
        template_json: {
          ...newTemplateJson,
          rules,
          social_links: socialLinks,
          isPrivate,
          is1v1,
          tournamentFormat
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

  if ((status === "loading" || isLoading) && !tournament) return <LoadingSpinner text="Cargando..." fullHeight={true} />;
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
            <div>
              <label className="text-sm text-muted font-medium block mb-2">Formato de Torneo</label>
              <select className="input-base" value={tournamentFormat} onChange={e => setTournamentFormat(e.target.value)}>
                <option value="single_elimination">Eliminación Simple</option>
                <option value="double_elimination">Doble Eliminación</option>
                <option value="swiss">Sistema Suizo (Swiss Stage)</option>
              </select>
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <label className="text-sm text-muted font-medium block mb-2">Logo del Torneo (Opcional)</label>
              {logoUrl && !logoFile && (
                <div style={{ marginBottom: "1rem" }}>
                  <img src={logoUrl} alt="Logo actual" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
                </div>
              )}
              <label className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <Users size={18} />
                {logoFile ? logoFile.name : "Subir Nueva Imagen"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setLogoFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {/* Private Tournament Option */}
              <div
                onClick={() => setIsPrivate(!isPrivate)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.9rem 1.15rem",
                  borderRadius: "10px",
                  background: isPrivate ? "rgba(111, 175, 58, 0.08)" : "rgba(255, 255, 255, 0.02)",
                  border: isPrivate ? "1px solid rgba(111, 175, 58, 0.4)" : "1px solid var(--border-light)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  userSelect: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: isPrivate ? "rgba(111, 175, 58, 0.15)" : "rgba(255, 255, 255, 0.04)",
                      border: isPrivate ? "1px solid rgba(111, 175, 58, 0.3)" : "1px solid var(--border-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isPrivate ? "var(--primary)" : "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    <EyeOff size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: "600", color: isPrivate ? "#FFFFFF" : "var(--text-main)" }}>
                      Torneo Privado
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Oculto en la sección de Explorar. Solo accesible mediante enlace directo o invitación.
                    </div>
                  </div>
                </div>

                {/* Custom Checkbox Indicator */}
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "6px",
                    border: isPrivate ? "2px solid var(--primary)" : "2px solid var(--border-medium)",
                    background: isPrivate ? "var(--primary)" : "rgba(0, 0, 0, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                    marginLeft: "1rem",
                  }}
                >
                  {isPrivate && <Check size={14} color="#000000" strokeWidth={3.5} />}
                </div>
              </div>

              {/* 1v1 Tournament Option */}
              <div
                onClick={() => setIs1v1(!is1v1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.9rem 1.15rem",
                  borderRadius: "10px",
                  background: is1v1 ? "rgba(111, 175, 58, 0.08)" : "rgba(255, 255, 255, 0.02)",
                  border: is1v1 ? "1px solid rgba(111, 175, 58, 0.4)" : "1px solid var(--border-light)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  userSelect: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: is1v1 ? "rgba(111, 175, 58, 0.15)" : "rgba(255, 255, 255, 0.04)",
                      border: is1v1 ? "1px solid rgba(111, 175, 58, 0.3)" : "1px solid var(--border-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: is1v1 ? "var(--primary)" : "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    <User size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: "600", color: is1v1 ? "#FFFFFF" : "var(--text-main)" }}>
                      Torneo 1v1 (Individual)
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Modalidad individual donde cada participante juega y compite por su propia cuenta.
                    </div>
                  </div>
                </div>

                {/* Custom Checkbox Indicator */}
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "6px",
                    border: is1v1 ? "2px solid var(--primary)" : "2px solid var(--border-medium)",
                    background: is1v1 ? "var(--primary)" : "rgba(0, 0, 0, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                    marginLeft: "1rem",
                  }}
                >
                  {is1v1 && <Check size={14} color="#000000" strokeWidth={3.5} />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social & Rules */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>Redes y Reglas (Opcional)</h2>
          <div className="flex gap-4" style={{ flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium flex items-center gap-1.5 mb-2">
                <TwitchIcon size={15} color="#9146FF" /> Twitch
              </label>
              <input className="input-base" value={socialLinks.twitch} onChange={e => setSocialLinks({ ...socialLinks, twitch: e.target.value })} placeholder="URL de Twitch" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium flex items-center gap-1.5 mb-2">
                <XIcon size={15} color="#ffffff" /> Twitter (X)
              </label>
              <input className="input-base" value={socialLinks.twitter} onChange={e => setSocialLinks({ ...socialLinks, twitter: e.target.value })} placeholder="URL de Twitter" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium flex items-center gap-1.5 mb-2">
                <YoutubeIcon size={15} color="#FF0000" /> YouTube
              </label>
              <input className="input-base" value={socialLinks.youtube} onChange={e => setSocialLinks({ ...socialLinks, youtube: e.target.value })} placeholder="URL de YouTube" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium flex items-center gap-1.5 mb-2">
                <DiscordIcon size={15} color="#5865F2" /> Discord
              </label>
              <input className="input-base" value={socialLinks.discord} onChange={e => setSocialLinks({ ...socialLinks, discord: e.target.value })} placeholder="URL de Discord" />
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
            También puedes añadir el ID de la cuenta manualmente si lo prefieres.
          </p>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <input
              className="input-base"
              placeholder="ID del usuario..."
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
              moderators.map((mod, i) => {
                const profile = moderatorProfiles.find(p => p.id === mod);
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      {profile?.image ? (
                        <img src={profile.image} alt={profile.name || ""} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold" }}>
                          {profile?.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <p style={{ margin: 0, fontWeight: "bold" }}>{profile?.name || "Usuario Desconocido"}</p>
                        <p className="text-muted text-xs" style={{ margin: 0, fontFamily: "monospace" }}>{mod}</p>
                      </div>
                    </div>
                    <button type="button" className="btn-icon btn-danger" onClick={() => handleRemoveModerator(mod)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
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

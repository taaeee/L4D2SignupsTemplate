"use client";

import React, { useState } from "react";
import { Plus, Trash2, Check, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function CreateTournament() {
  const { data: session } = useSession();
  const router = useRouter();

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDescription, setTournamentDescription] = useState("");
  const [maxTeams, setMaxTeams] = useState(8);
  const [isSaving, setIsSaving] = useState(false);

  // New Tournament Options
  const [logoFile, setLogoFile] = useState(null);
  const [rules, setRules] = useState("");
  const [socialLinks, setSocialLinks] = useState({ twitch: "", twitter: "", youtube: "", discord: "" });
  const [isPrivate, setIsPrivate] = useState(false);
  const [is1v1, setIs1v1] = useState(false);
  const [tournamentFormat, setTournamentFormat] = useState("single_elimination");

  // Template fields
  const [fields, setFields] = useState([
    { id: Date.now(), name: "Country", type: "text", options: "" },
    { id: Date.now() + 1, name: "Tag", type: "text", options: "" },
  ]);
  const [playerFields, setPlayerFields] = useState([
    { id: Date.now() + 2, name: "Discord", type: "text", options: "" },
  ]);

  const [generalFormat, setGeneralFormat] = useState(
    `Team: [Team]\nCountry: [Country]\nTag: [Tag]`
  );
  const [playerFormat, setPlayerFormat] = useState(
    `[ROLE] - [NAME] [STEAMID]\nSteam: [STEAMURL]\nDiscord: [Discord]`
  );

  const [maxPlayers, setMaxPlayers] = useState(8);
  const [defaultRole, setDefaultRole] = useState("Member");

  const addField = () => setFields([...fields, { id: Date.now(), name: "New Field", type: "text", options: "" }]);
  const updateField = (id, key, value) => setFields(fields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  const removeField = (id) => setFields(fields.filter((f) => f.id !== id));

  const addPlayerField = () => setPlayerFields([...playerFields, { id: Date.now(), name: "New Field", type: "text", options: "" }]);
  const updatePlayerField = (id, key, value) => setPlayerFields(playerFields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  const removePlayerField = (id) => setPlayerFields(playerFields.filter((f) => f.id !== id));

  const handleSave = async () => {
    if (!tournamentName) return toast.error("Por favor, ponle un nombre al torneo");
    if (!session?.user?.id) return toast.error("Debes iniciar sesión para crear un torneo");

    setIsSaving(true);

    const template_json = {
      fields: fields.map(f => ({ name: f.name, type: f.type, options: f.options })),
      playerFields: playerFields.map(f => ({ name: f.name, type: f.type, options: f.options })),
      generalFormat,
      playerFormat,
      maxPlayers: is1v1 ? 1 : (Number(maxPlayers) || 8),
      defaultRole,
      rules,
      social_links: socialLinks,
      isPrivate,
      is1v1,
      tournamentFormat,
    };

    let finalLogoUrl = null;
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `tournament-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("team-logos") // Reusing team-logos bucket for tournament logos
        .upload(fileName, logoFile);

      if (uploadError) {
        setIsSaving(false);
        return toast.error("Error subiendo el logo: " + uploadError.message);
      }
      
      const { data: { publicUrl } } = supabase.storage.from("team-logos").getPublicUrl(fileName);
      finalLogoUrl = publicUrl;
    }

    const { data, error } = await supabase
      .from("tournaments")
      .insert([
        {
          creator_id: session.user.id,
          name: tournamentName,
          description: tournamentDescription,
          max_teams: Number(maxTeams) || 8,
          template_json,
          logo_url: finalLogoUrl,
        }
      ])
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      console.error(error);
      toast.error("Error al crear el torneo");
    } else if (data) {
      toast.success("¡Torneo creado exitosamente!");
      router.push(`/tournament/${data.id}`);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Crear Nuevo Torneo</h1>
        <button className="btn btn-secondary mt-2" onClick={() => router.push("/")}>
          Volver al Inicio
        </button>
      </header>

      <div className="flex-col gap-6" style={{ display: "flex", flexDirection: "column" }}>
        
        {/* Basic Info */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>Información Básica</h2>
          <div className="flex gap-4" style={{ flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={{ flex: "2 1 300px" }}>
              <label className="text-sm text-muted font-medium block mb-2">Nombre del Torneo</label>
              <input className="input-base" value={tournamentName} onChange={e => setTournamentName(e.target.value)} placeholder="Ej: L4D2 Pro League Season 1" />
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label className="text-sm text-muted font-medium block mb-2">Límite de Equipos</label>
              <input type="number" className="input-base" value={maxTeams} onChange={e => setMaxTeams(e.target.value)} min="2" />
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label className="text-sm text-muted font-medium block mb-2">Jugadores por Equipo</label>
              <input type="number" className="input-base" value={is1v1 ? 1 : maxPlayers} onChange={e => setMaxPlayers(e.target.value)} min={is1v1 ? "1" : "4"} disabled={is1v1} />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium block mb-2">Formato de Torneo</label>
              <select className="input-base" value={tournamentFormat} onChange={e => setTournamentFormat(e.target.value)}>
                <option value="single_elimination">Eliminación Simple</option>
                <option value="double_elimination">Doble Eliminación</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted font-medium block mb-2">Descripción (Opcional)</label>
            <textarea className="input-base" value={tournamentDescription} onChange={e => setTournamentDescription(e.target.value)} placeholder="Reglas o descripción corta..." style={{ minHeight: "80px" }} />
          </div>
          <div style={{ marginTop: "1.5rem" }}>
            <label className="text-sm text-muted font-medium block mb-2">Logo del Torneo (Opcional)</label>
            <label className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <Plus size={18} />
              {logoFile ? logoFile.name : "Subir Imagen"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setLogoFile(e.target.files[0])} />
            </label>
          </div>
          <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input 
                type="checkbox" 
                id="is1v1-tournament"
                checked={is1v1}
                onChange={e => setIs1v1(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--primary)" }}
              />
              <label htmlFor="is1v1-tournament" className="text-sm text-main" style={{ cursor: "pointer", color: "var(--primary)", fontWeight: "bold" }}>
                Torneo 1v1 (Individual)
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

        {/* Custom Fields (Copied mostly from TemplateBuilder) */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>Campos Personalizados (Equipo)</h2>
          <div className="flex-col gap-4" style={{ marginBottom: "1.5rem" }}>
            {fields.map((field) => (
              <div key={field.id} className="flex gap-4 items-center" style={{ flexWrap: "wrap" }}>
                <input className="input-base" style={{ flex: "1 1 200px" }} value={field.name} onChange={(e) => updateField(field.id, "name", e.target.value)} placeholder="Field Name" />
                <select className="input-base" style={{ flex: "0 0 150px" }} value={field.type} onChange={(e) => updateField(field.id, "type", e.target.value)}>
                  <option value="text">Texto Libre</option>
                  <option value="select">Lista de Opciones</option>
                </select>
                {field.type === "select" && (
                  <input className="input-base" style={{ flex: "2 1 200px" }} value={field.options} onChange={(e) => updateField(field.id, "options", e.target.value)} placeholder="Opciones (separadas por coma)" />
                )}
                <button className="btn-icon btn-danger" onClick={() => removeField(field.id)}><Trash2 size={20} /></button>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={addField}><Plus size={18} /> Agregar Campo</button>
        </div>

        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>Campos de Jugador</h2>
          <div className="flex-col gap-4" style={{ marginBottom: "1.5rem" }}>
            {playerFields.map((field) => (
              <div key={field.id} className="flex gap-4 items-center" style={{ flexWrap: "wrap" }}>
                <input className="input-base" style={{ flex: "1 1 200px" }} value={field.name} onChange={(e) => updatePlayerField(field.id, "name", e.target.value)} placeholder="Field Name" />
                <select className="input-base" style={{ flex: "0 0 150px" }} value={field.type} onChange={(e) => updatePlayerField(field.id, "type", e.target.value)}>
                  <option value="text">Texto Libre</option>
                  <option value="select">Lista de Opciones</option>
                </select>
                {field.type === "select" && (
                  <input className="input-base" style={{ flex: "2 1 200px" }} value={field.options} onChange={(e) => updatePlayerField(field.id, "options", e.target.value)} placeholder="Opciones (separadas por coma)" />
                )}
                <button className="btn-icon btn-danger" onClick={() => removePlayerField(field.id)}><Trash2 size={20} /></button>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={addPlayerField}><Plus size={18} /> Agregar Campo Jugador</button>
        </div>

        {/* Save */}
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
          <h2>¿Todo listo?</h2>
          <p className="text-muted text-sm" style={{ marginBottom: "1.5rem" }}>Una vez creado, podrás compartir el enlace del torneo para que los equipos se registren.</p>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ fontSize: "1.2rem", padding: "1rem 2rem" }}>
            <Save size={20} /> {isSaving ? "Guardando..." : "Guardar Torneo"}
          </button>
        </div>

      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Plus, Trash2, Save, Radio } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { TwitchIcon, DiscordIcon, YoutubeIcon, XIcon } from "@/components/SocialIcons";
import MorphEyeIcon from "@/components/MorphEyeIcon";
import MorphUserIcon from "@/components/MorphUserIcon";
import { useTranslation } from "@/lib/i18n";

export default function CreateTournament() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDescription, setTournamentDescription] = useState("");
  const [maxTeams, setMaxTeams] = useState(8);
  const [isSaving, setIsSaving] = useState(false);

  // New Tournament Options
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [rules, setRules] = useState("");
  const [socialLinks, setSocialLinks] = useState({ twitch: "", twitter: "", youtube: "", discord: "" });
  const [isPrivate, setIsPrivate] = useState(false);
  const [is1v1, setIs1v1] = useState(false);
  const [allowMultipleCasters, setAllowMultipleCasters] = useState(false);
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
  const updateField = (id: number, key: string, value: string) => setFields(fields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  const removeField = (id: number) => setFields(fields.filter((f) => f.id !== id));

  const addPlayerField = () => setPlayerFields([...playerFields, { id: Date.now(), name: "New Field", type: "text", options: "" }]);
  const updatePlayerField = (id: number, key: string, value: string) => setPlayerFields(playerFields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  const removePlayerField = (id: number) => setPlayerFields(playerFields.filter((f) => f.id !== id));

  const handleSave = async () => {
    if (!tournamentName) return toast.error(t("tournament_create.error_name_required"));
    if (!session?.user?.id) return toast.error(t("tournament_create.error_login_required"));

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
      allowMultipleCasters,
      allow_multiple_casters: allowMultipleCasters,
      tournamentFormat,
    };

    let finalLogoUrl = null;
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `tournament-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("team-logos")
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
      toast.error(t("common.error_network"));
    } else if (data) {
      toast.success(t("tournament_create.create_success"));
      router.push(`/tournament/${data.id}`);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem" }}>{t("tournament_create.title")}</h1>
        <button className="btn btn-secondary mt-2" onClick={() => router.push("/")}>
          {t("common.back_to_home")}
        </button>
      </header>

      <div className="flex-col gap-6" style={{ display: "flex", flexDirection: "column" }}>
        
        {/* Basic Info */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>{t("tournament_create.basic_info")}</h2>
          <div className="flex gap-4" style={{ flexWrap: "wrap", marginBottom: "1rem" }}>
            <div style={{ flex: "2 1 300px" }}>
              <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.name_label")}</label>
              <input className="input-base" value={tournamentName} onChange={e => setTournamentName(e.target.value)} placeholder={t("tournament_create.name_placeholder")} />
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.max_teams_label")}</label>
              <input type="number" className="input-base" value={maxTeams} onChange={e => setMaxTeams(parseInt(e.target.value) || 2)} min="2" />
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.players_per_team_label")}</label>
              <input type="number" className="input-base" value={is1v1 ? 1 : maxPlayers} onChange={e => setMaxPlayers(parseInt(e.target.value) || 4)} min={is1v1 ? "1" : "4"} disabled={is1v1} />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.format_label")}</label>
              <select className="input-base" value={tournamentFormat} onChange={e => setTournamentFormat(e.target.value)}>
                <option value="single_elimination">{t("tournament_create.format_single_elim")}</option>
                <option value="double_elimination">{t("tournament_create.format_double_elim")}</option>
                <option value="swiss">{t("tournament_create.format_swiss")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.desc_label")}</label>
            <textarea className="input-base" value={tournamentDescription} onChange={e => setTournamentDescription(e.target.value)} placeholder={t("tournament_create.desc_placeholder")} style={{ minHeight: "80px" }} />
          </div>
          <div style={{ marginTop: "1.5rem" }}>
            <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.logo_label")}</label>
            <label className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <Plus size={18} />
              {logoFile ? logoFile.name : t("tournament_create.upload_image")}
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
                padding: "0.9rem 1.15rem",
                borderRadius: "10px",
                background: isPrivate ? "rgba(111, 175, 58, 0.09)" : "rgba(255, 255, 255, 0.02)",
                border: isPrivate ? "1px solid rgba(111, 175, 58, 0.5)" : "1px solid var(--border-light)",
                boxShadow: isPrivate ? "0 0 16px rgba(111, 175, 58, 0.12), inset 0 0 12px rgba(111, 175, 58, 0.04)" : "none",
                cursor: "pointer",
                transition: "all 0.25s ease",
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: isPrivate ? "rgba(111, 175, 58, 0.22)" : "rgba(255, 255, 255, 0.04)",
                    border: isPrivate ? "1px solid var(--primary)" : "1px solid var(--border-light)",
                    boxShadow: isPrivate ? "0 0 12px rgba(111, 175, 58, 0.35)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isPrivate ? "var(--primary)" : "var(--text-muted)",
                    flexShrink: 0,
                    transition: "all 0.25s ease",
                  }}
                >
                  <MorphEyeIcon isPrivate={isPrivate} size={18} spring="snappy" />
                </div>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "600", color: isPrivate ? "#FFFFFF" : "var(--text-main)", transition: "color 0.2s ease" }}>
                    {t("tournament_create.private_option_title")}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {t("tournament_create.private_option_desc")}
                  </div>
                </div>
              </div>
            </div>

            {/* 1v1 Tournament Option */}
            <div
              onClick={() => setIs1v1(!is1v1)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0.9rem 1.15rem",
                borderRadius: "10px",
                background: is1v1 ? "rgba(111, 175, 58, 0.09)" : "rgba(255, 255, 255, 0.02)",
                border: is1v1 ? "1px solid rgba(111, 175, 58, 0.5)" : "1px solid var(--border-light)",
                boxShadow: is1v1 ? "0 0 16px rgba(111, 175, 58, 0.12), inset 0 0 12px rgba(111, 175, 58, 0.04)" : "none",
                cursor: "pointer",
                transition: "all 0.25s ease",
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: is1v1 ? "rgba(111, 175, 58, 0.22)" : "rgba(255, 255, 255, 0.04)",
                    border: is1v1 ? "1px solid var(--primary)" : "1px solid var(--border-light)",
                    boxShadow: is1v1 ? "0 0 12px rgba(111, 175, 58, 0.35)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: is1v1 ? "var(--primary)" : "var(--text-muted)",
                    flexShrink: 0,
                    transition: "all 0.25s ease",
                  }}
                >
                  <MorphUserIcon is1v1={is1v1} size={18} spring="snappy" />
                </div>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "600", color: is1v1 ? "#FFFFFF" : "var(--text-main)", transition: "color 0.2s ease" }}>
                    {t("tournament_create.one_vs_one_title")}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {t("tournament_create.one_vs_one_desc")}
                  </div>
                </div>
              </div>
            </div>

            {/* Multiple Casters Option */}
            <div
              onClick={() => setAllowMultipleCasters(!allowMultipleCasters)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0.9rem 1.15rem",
                borderRadius: "10px",
                background: allowMultipleCasters ? "rgba(111, 175, 58, 0.09)" : "rgba(255, 255, 255, 0.02)",
                border: allowMultipleCasters ? "1px solid rgba(111, 175, 58, 0.5)" : "1px solid var(--border-light)",
                boxShadow: allowMultipleCasters ? "0 0 16px rgba(111, 175, 58, 0.12), inset 0 0 12px rgba(111, 175, 58, 0.04)" : "none",
                cursor: "pointer",
                transition: "all 0.25s ease",
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: allowMultipleCasters ? "rgba(111, 175, 58, 0.22)" : "rgba(255, 255, 255, 0.04)",
                    border: allowMultipleCasters ? "1px solid var(--primary)" : "1px solid var(--border-light)",
                    boxShadow: allowMultipleCasters ? "0 0 12px rgba(111, 175, 58, 0.35)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: allowMultipleCasters ? "var(--primary)" : "var(--text-muted)",
                    flexShrink: 0,
                    transition: "all 0.25s ease",
                  }}
                >
                  <Radio size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "600", color: allowMultipleCasters ? "#FFFFFF" : "var(--text-main)", transition: "color 0.2s ease" }}>
                    {t("tournament_create.multiple_casters_title")}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {t("tournament_create.multiple_casters_desc")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social & Rules */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>{t("tournament_create.social_and_rules")}</h2>
          <div className="flex gap-4" style={{ flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium flex items-center gap-1.5 mb-2">
                <TwitchIcon size={15} color="#9146FF" /> Twitch
              </label>
              <input className="input-base" value={socialLinks.twitch} onChange={e => setSocialLinks({...socialLinks, twitch: e.target.value})} placeholder="URL de Twitch" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium flex items-center gap-1.5 mb-2">
                <XIcon size={15} color="#ffffff" /> Twitter (X)
              </label>
              <input className="input-base" value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} placeholder="URL de Twitter" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium flex items-center gap-1.5 mb-2">
                <YoutubeIcon size={15} color="#FF0000" /> YouTube
              </label>
              <input className="input-base" value={socialLinks.youtube} onChange={e => setSocialLinks({...socialLinks, youtube: e.target.value})} placeholder="URL de YouTube" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label className="text-sm text-muted font-medium flex items-center gap-1.5 mb-2">
                <DiscordIcon size={15} color="#5865F2" /> Discord
              </label>
              <input className="input-base" value={socialLinks.discord} onChange={e => setSocialLinks({...socialLinks, discord: e.target.value})} placeholder="URL de Discord" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.rules_label")}</label>
            <textarea className="input-base" value={rules} onChange={e => setRules(e.target.value)} placeholder={t("tournament_create.rules_placeholder")} style={{ minHeight: "150px" }} />
          </div>
        </div>

        {/* Custom Fields */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>{t("tournament_create.custom_team_fields")}</h2>
          <div className="flex-col gap-4" style={{ marginBottom: "1.5rem" }}>
            {fields.map((field) => (
              <div key={field.id} className="flex gap-4 items-center" style={{ flexWrap: "wrap" }}>
                <input className="input-base" style={{ flex: "1 1 200px" }} value={field.name} onChange={(e) => updateField(field.id, "name", e.target.value)} placeholder={t("tournament_create.field_name_placeholder")} />
                <select className="input-base" style={{ flex: "0 0 150px" }} value={field.type} onChange={(e) => updateField(field.id, "type", e.target.value)}>
                  <option value="text">{t("tournament_create.field_type_text")}</option>
                  <option value="select">{t("tournament_create.field_type_select")}</option>
                </select>
                {field.type === "select" && (
                  <input className="input-base" style={{ flex: "2 1 200px" }} value={field.options} onChange={(e) => updateField(field.id, "options", e.target.value)} placeholder={t("tournament_create.field_options_placeholder")} />
                )}
                <button className="btn-icon btn-danger" onClick={() => removeField(field.id)}><Trash2 size={20} /></button>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={addField}><Plus size={18} /> {t("tournament_create.add_field")}</button>
        </div>

        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>{t("tournament_create.custom_player_fields")}</h2>
          <div className="flex-col gap-4" style={{ marginBottom: "1.5rem" }}>
            {playerFields.map((field) => (
              <div key={field.id} className="flex gap-4 items-center" style={{ flexWrap: "wrap" }}>
                <input className="input-base" style={{ flex: "1 1 200px" }} value={field.name} onChange={(e) => updatePlayerField(field.id, "name", e.target.value)} placeholder={t("tournament_create.field_name_placeholder")} />
                <select className="input-base" style={{ flex: "0 0 150px" }} value={field.type} onChange={(e) => updatePlayerField(field.id, "type", e.target.value)}>
                  <option value="text">{t("tournament_create.field_type_text")}</option>
                  <option value="select">{t("tournament_create.field_type_select")}</option>
                </select>
                {field.type === "select" && (
                  <input className="input-base" style={{ flex: "2 1 200px" }} value={field.options} onChange={(e) => updatePlayerField(field.id, "options", e.target.value)} placeholder={t("tournament_create.field_options_placeholder")} />
                )}
                <button className="btn-icon btn-danger" onClick={() => removePlayerField(field.id)}><Trash2 size={20} /></button>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={addPlayerField}><Plus size={18} /> {t("tournament_create.add_player_field")}</button>
        </div>

        {/* Save */}
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
          <h2>{t("common.ready")}</h2>
          <p className="text-muted text-sm" style={{ marginBottom: "1.5rem" }}>{t("tournament_create.save_ready_desc")}</p>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ fontSize: "1.2rem", padding: "1rem 2rem" }}>
            <Save size={20} /> {isSaving ? t("tournament_create.saving_tournament") : t("tournament_create.save_tournament")}
          </button>
        </div>

      </div>
    </div>
  );
}

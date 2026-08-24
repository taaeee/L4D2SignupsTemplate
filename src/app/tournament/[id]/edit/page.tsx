"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Save, Users, Trash2, Radio } from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TwitchIcon, DiscordIcon, YoutubeIcon, XIcon } from "@/components/SocialIcons";
import MorphEyeIcon from "@/components/MorphEyeIcon";
import MorphUserIcon from "@/components/MorphUserIcon";
import MorphLockIcon from "@/components/MorphLockIcon";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();

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
  const [allowMultipleCasters, setAllowMultipleCasters] = useState(false);
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
        toast.error(t("tournament_edit.no_permission"));
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
        setAllowMultipleCasters(templateJson.allowMultipleCasters ?? templateJson.allow_multiple_casters ?? (data as any).allow_multiple_casters ?? false);
        setTournamentFormat(templateJson.tournamentFormat || "single_elimination");
      }
    }
    setIsLoading(false);
  };

  const handleAddModerator = () => {
    if (!newModId.trim()) return;
    if (moderators.includes(newModId.trim())) {
      toast.error(t("tournament_edit.mod_already_added"));
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
        toast.error(data.error || t("common.error_network"));
      }
    } catch (e) {
      toast.error(t("common.error_network"));
    }
    setIsGeneratingLink(false);
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success(t("common.copied_to_clipboard"));
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
          allowMultipleCasters,
          allow_multiple_casters: allowMultipleCasters,
          tournamentFormat
        }
      })
      .eq("id", id);

    setIsSaving(false);

    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success(t("tournament_edit.update_success"));
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
      toast.success(t("tournament_edit.delete_success"));
      router.push("/");
    }
  };

  const handleDeleteTournament = () => {
    setShowConfirmDelete(true);
  };

  if ((status === "loading" || isLoading) && !tournament) return <LoadingSpinner fullHeight={true} />;
  if (!tournament) return null;

  return (
    <div className="container" style={{ paddingBottom: "4rem" }}>
      <header style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1>{t("tournament_edit.title")}</h1>
        <p className="text-muted">ID: {id}</p>
      </header>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* BASIC INFO */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>{t("tournament_create.basic_info")}</h2>
          <div className="flex-col gap-4">
            <div>
              <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.name_label")} *</label>
              <input required className="input-base" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.desc_label")}</label>
              <textarea className="input-base" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.max_teams_label")} *</label>
              <input type="number" min="2" max="128" required className="input-base" value={maxTeams} onChange={e => setMaxTeams(parseInt(e.target.value))} />
            </div>
            <div>
              <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.format_label")}</label>
              <select className="input-base" value={tournamentFormat} onChange={e => setTournamentFormat(e.target.value)}>
                <option value="single_elimination">{t("tournament_create.format_single_elim")}</option>
                <option value="double_elimination">{t("tournament_create.format_double_elim")}</option>
                <option value="swiss">{t("tournament_create.format_swiss")}</option>
              </select>
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.logo_label")}</label>
              {logoUrl && !logoFile && (
                <div style={{ marginBottom: "1rem" }}>
                  <img src={logoUrl} alt="Logo actual" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
                </div>
              )}
              <label className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <Users size={18} />
                {logoFile ? logoFile.name : t("tournament_edit.upload_new_image")}
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
        </div>

        {/* Social & Rules */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>{t("tournament_create.social_and_rules")}</h2>
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
            <label className="text-sm text-muted font-medium block mb-2">{t("tournament_create.rules_label")}</label>
            <textarea className="input-base" value={rules} onChange={e => setRules(e.target.value)} placeholder={t("tournament_create.rules_placeholder")} style={{ minHeight: "150px" }} />
          </div>
        </div>

        {/* STATUS & LOCK */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "0.5rem", color: "var(--primary)" }}>{t("tournament_edit.status_title")}</h2>
          <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
            {t("tournament_edit.status_desc")}
          </p>

          <div
            onClick={() => setTStatus(tStatus === "locked" ? "open" : "locked")}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.95rem 1.25rem",
              borderRadius: "10px",
              background: tStatus === "locked" ? "rgba(239, 68, 68, 0.09)" : "rgba(111, 175, 58, 0.09)",
              border: tStatus === "locked" ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(111, 175, 58, 0.5)",
              boxShadow: tStatus === "locked"
                ? "0 0 16px rgba(239, 68, 68, 0.12), inset 0 0 12px rgba(239, 68, 68, 0.04)"
                : "0 0 16px rgba(111, 175, 58, 0.12), inset 0 0 12px rgba(111, 175, 58, 0.04)",
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
                  background: tStatus === "locked" ? "rgba(239, 68, 68, 0.22)" : "rgba(111, 175, 58, 0.22)",
                  border: tStatus === "locked" ? "1px solid #ef4444" : "1px solid var(--primary)",
                  boxShadow: tStatus === "locked" ? "0 0 12px rgba(239, 68, 68, 0.35)" : "0 0 12px rgba(111, 175, 58, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tStatus === "locked" ? "#ef4444" : "var(--primary)",
                  flexShrink: 0,
                  transition: "all 0.25s ease",
                }}
              >
                <MorphLockIcon isLocked={tStatus === "locked"} size={18} spring="snappy" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    color: "#FFFFFF",
                    transition: "color 0.2s ease",
                  }}
                >
                  {tStatus === "locked" ? t("tournament_edit.status_locked_label") : t("tournament_edit.status_open_label")}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {tStatus === "locked"
                    ? t("tournament_edit.status_locked_desc")
                    : t("tournament_edit.status_open_desc")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODERATORS */}
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={24} color="var(--primary)" />
              <h2 style={{ margin: 0, color: "var(--primary)" }}>{t("tournament_edit.moderators_title")}</h2>
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleGenerateInvite} disabled={isGeneratingLink}>
              {isGeneratingLink ? t("tournament_edit.generating_link") : t("tournament_edit.generate_invite_link")}
            </button>
          </div>

          {inviteLink && (
            <div style={{ background: "rgba(74, 222, 128, 0.1)", border: "1px solid var(--primary)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
              <p className="text-sm text-success" style={{ marginBottom: "0.5rem", fontWeight: "bold" }}>{t("tournament_edit.invite_link_generated")}</p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <input readOnly className="input-base" value={inviteLink} style={{ flex: 1, borderColor: "var(--primary)" }} />
                <button type="button" className="btn btn-primary" onClick={copyInviteLink}>{t("common.copy")}</button>
              </div>
            </div>
          )}

          <p className="text-muted mb-4">
            {t("tournament_edit.mod_manual_hint")}
          </p>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <input
              className="input-base"
              placeholder={t("tournament_edit.user_id_placeholder")}
              value={newModId}
              onChange={e => setNewModId(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-secondary" onClick={handleAddModerator}>
              {t("tournament_edit.add_manual_mod")}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {moderators.length === 0 ? (
              <p className="text-muted">{t("tournament_edit.no_mods_added")}</p>
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
                        <p style={{ margin: 0, fontWeight: "bold" }}>{profile?.name || t("common.unknown_user")}</p>
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
            {t("tournament_edit.delete_tournament_btn")}
          </button>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button type="button" className="btn btn-secondary" onClick={() => router.push(`/tournament/${id}`)}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Save size={20} /> {isSaving ? t("common.saving") : t("common.save_changes")}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        isOpen={showConfirmDelete}
        title={t("tournament_edit.delete_tournament_btn")}
        message={t("tournament_edit.delete_confirm_msg")}
        confirmText={t("tournament_edit.confirm_delete_btn")}
        isDanger={true}
        onConfirm={executeDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
}

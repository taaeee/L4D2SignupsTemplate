"use client";

import React, { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmModal from "@/components/ConfirmModal";
import {
  LinkIcon,
  Unlink,
  ArrowLeft,
  User,
  Mail,
  Lock,
  KeyRound,
  Save,
  Radio,
  Tv,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Send,
  X,
  Plus
} from "lucide-react";
import { toast } from "sonner";

// Twitch SVG Icon
const TwitchIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
  </svg>
);

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [hasSteamLinked, setHasSteamLinked] = useState(false);
  const [hasDiscordLinked, setHasDiscordLinked] = useState(false);
  const [hasTwitchLinked, setHasTwitchLinked] = useState(false);
  const [steamInfo, setSteamInfo] = useState<any>(null);
  const [twitchInfo, setTwitchInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unlinkProvider, setUnlinkProvider] = useState<string>("steam");

  // Profile Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Caster Application State
  const [casterApp, setCasterApp] = useState<any>(null);
  const [casterProfile, setCasterProfile] = useState<any>(null);
  const [isCaster, setIsCaster] = useState(false);
  const [showCasterModal, setShowCasterModal] = useState(false);
  const [casterAlias, setCasterAlias] = useState("");
  const [casterBio, setCasterBio] = useState("");
  const [casterTwitch, setCasterTwitch] = useState("");
  const [casterYoutube, setCasterYoutube] = useState("");
  const [casterLanguages, setCasterLanguages] = useState("Español");
  const [submittingCasterApp, setSubmittingCasterApp] = useState(false);

  // Admin Caster Applications State
  const [adminApplications, setAdminApplications] = useState<any[]>([]);
  const [isAdminOrOrg, setIsAdminOrOrg] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchAccounts();
      fetchCasterStatus();
      fetchAdminApplications();
      if (session?.user) {
        setName(session.user.name || "");
        setEmail(session.user.email || "");
      }
    }
  }, [status, router, session]);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/accounts");
      const accountData = await res.json();
      if (accountData.accounts) {
        const steamAccount = accountData.accounts.find((acc: any) => acc.provider === "steam");
        const discordAccount = accountData.accounts.find((acc: any) => acc.provider === "discord");
        const twitchAccount = accountData.accounts.find((acc: any) => acc.provider === "twitch");

        if (discordAccount) {
          setHasDiscordLinked(true);
        }

        if (twitchAccount) {
          setHasTwitchLinked(true);
          setTwitchInfo({
            accountId: twitchAccount.providerAccountId,
          });
        }

        if (steamAccount) {
          setHasSteamLinked(true);
          try {
            const steamRes = await fetch(`/api/steam/player-stats?steamId=${steamAccount.providerAccountId}`);
            const steamData = await steamRes.json();
            if (!steamData.error) {
              setSteamInfo({
                name: steamData.personaname,
                avatar: steamData.avatar,
              });
            }
          } catch (e) {
            console.error("Error fetching steam info", e);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching accounts:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCasterStatus = async () => {
    try {
      const res = await fetch("/api/casters/apply");
      const data = await res.json();
      if (data.application) {
        setCasterApp(data.application);
        setCasterAlias(data.application.alias || "");
        setCasterBio(data.application.bio || "");
        setCasterTwitch(data.application.twitch_channel || "");
        setCasterYoutube(data.application.youtube_channel || "");
        setCasterLanguages(data.application.languages?.join(", ") || "Español");
      }
      if (data.caster) {
        setCasterProfile(data.caster);
      }
      setIsCaster(data.isCaster || false);
    } catch (e) {
      console.error("Error fetching caster status:", e);
    }
  };

  const fetchAdminApplications = async () => {
    try {
      const res = await fetch("/api/casters/admin/applications");
      if (res.ok) {
        const data = await res.json();
        if (data.applications && data.applications.length > 0) {
          setAdminApplications(data.applications);
          setIsAdminOrOrg(true);
        }
      }
    } catch (e) {
      console.error("Error fetching admin applications:", e);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al actualizar el perfil.");
      } else {
        toast.success("Perfil actualizado correctamente.");
        await update({ name, email });
      }
    } catch (err) {
      toast.error("Error de red al guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden.");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al cambiar la contraseña.");
      } else {
        toast.success("Contraseña actualizada con éxito.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleUnlink = async () => {
    try {
      const res = await fetch(`/api/user/accounts?provider=${unlinkProvider}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Cuenta de ${unlinkProvider.toUpperCase()} desvinculada.`);
        if (unlinkProvider === "steam") {
          setHasSteamLinked(false);
          setSteamInfo(null);
        } else if (unlinkProvider === "discord") {
          setHasDiscordLinked(false);
        } else if (unlinkProvider === "twitch") {
          setHasTwitchLinked(false);
          setTwitchInfo(null);
        }
      } else {
        toast.error(data.error || "Error al desvincular la cuenta.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de red al desvincular.");
    } finally {
      setShowConfirmModal(false);
    }
  };

  const handleSubmitCasterApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCasterApp(true);

    const languagesArray = casterLanguages
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/casters/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: casterAlias,
          bio: casterBio,
          twitch_channel: casterTwitch,
          youtube_channel: casterYoutube,
          languages: languagesArray,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al enviar la solicitud.");
      } else {
        toast.success("Solicitud enviada con éxito.");
        setCasterApp(data.application);
        setShowCasterModal(false);
      }
    } catch (err) {
      toast.error("Error de conexión al enviar la solicitud.");
    } finally {
      setSubmittingCasterApp(false);
    }
  };

  const handleReviewApplication = async (applicationId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/casters/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al procesar la solicitud.");
      } else {
        toast.success(action === "approve" ? "Caster aprobado con éxito." : "Solicitud rechazada.");
        fetchAdminApplications();
      }
    } catch (err) {
      toast.error("Error de red al revisar la solicitud.");
    }
  };

  if (status === "loading" || isLoading) {
    return <LoadingSpinner text="Cargando Ajustes..." fullHeight={true} />;
  }

  if (!session) return null;

  return (
    <div className="container" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingBottom: "4rem" }}>
      <header style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.5rem 0", marginBottom: "2rem", borderBottom: "1px solid var(--border)" }}>
        <button className="btn-icon" onClick={() => router.back()} title="Volver">
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Ajustes de Cuenta</h1>
      </header>

      <main style={{ flex: 1, maxWidth: "680px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Profile Card */}
        <div className="card">
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>Perfil de Usuario</h2>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <img
              src={session.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user?.name || "User")}`}
              alt="Avatar"
              style={{ width: "72px", height: "72px", borderRadius: "50%", border: "2px solid var(--border-light)" }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: "1.2rem" }}>{session.user?.name}</p>
              <p className="text-muted" style={{ margin: "0.25rem 0 0 0" }}>{session.user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem", color: "var(--muted)" }}>
                Nombre de usuario
              </label>
              <div className="settings-input-group">
                <User size={18} className="settings-input-icon" />
                <input
                  type="text"
                  className="settings-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem", color: "var(--muted)" }}>
                Correo electrónico asociado
              </label>
              <div className="settings-input-group">
                <Mail size={18} className="settings-input-icon" />
                <input
                  type="email"
                  className="settings-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="btn btn-primary"
              style={{ alignSelf: "flex-start", marginTop: "0.5rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Save size={18} />
              {savingProfile ? "Guardando..." : "Guardar Perfil"}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>Seguridad & Contraseña</h2>

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem", color: "var(--muted)" }}>
                Contraseña actual
              </label>
              <div className="settings-input-group">
                <Lock size={18} className="settings-input-icon" />
                <input
                  type="password"
                  placeholder="Ingresa tu contraseña actual"
                  className="settings-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem", color: "var(--muted)" }}>
                Nueva contraseña
              </label>
              <div className="settings-input-group">
                <KeyRound size={18} className="settings-input-icon" />
                <input
                  type="password"
                  placeholder="Nueva contraseña (mín. 8 caracteres)"
                  className="settings-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.875rem", color: "var(--muted)" }}>
                Confirmar nueva contraseña
              </label>
              <div className="settings-input-group">
                <KeyRound size={18} className="settings-input-icon" />
                <input
                  type="password"
                  placeholder="Repite la nueva contraseña"
                  className="settings-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="btn btn-primary"
              style={{ alignSelf: "flex-start", marginTop: "0.5rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Lock size={18} />
              {savingPassword ? "Actualizando..." : "Cambiar Contraseña"}
            </button>
          </form>
        </div>

        {/* Linked Accounts Card */}
        <div className="card">
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>Cuentas Vinculadas</h2>

          {/* Steam */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {steamInfo?.avatar ? (
                <img src={steamInfo.avatar} alt={steamInfo.name} style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
              ) : (
                <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.5rem", borderRadius: "8px", display: "flex" }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.36c.55 0 1 .45 1 1v4.28c0 .55-.45 1-1 1h-4.28c-.55 0-1-.45-1-1V9.36c0-.55.45-1 1-1h4.28zM8.36 15.64c-.55 0-1-.45-1-1v-4.28c0-.55.45-1 1-1h4.28c.55 0 1 .45 1 1v4.28c0 .55-.45 1-1 1H8.36z"></path>
                  </svg>
                </div>
              )}
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>{steamInfo?.name || "Steam"}</p>
                <p className="text-sm" style={{ margin: 0, color: hasSteamLinked ? "var(--success)" : "var(--muted)" }}>
                  {hasSteamLinked ? "Vinculada" : "No vinculada"}
                </p>
              </div>
            </div>

            {hasSteamLinked ? (
              <button
                className="btn btn-danger"
                onClick={() => {
                  setUnlinkProvider("steam");
                  setShowConfirmModal(true);
                }}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Unlink size={18} /> Desvincular
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => signIn("steam")} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <LinkIcon size={18} /> Vincular
              </button>
            )}
          </div>

          {/* Discord */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)",
              marginTop: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ background: "rgba(88, 101, 242, 0.1)", padding: "0.5rem", borderRadius: "8px", display: "flex" }}>
                <svg viewBox="0 0 127.14 96.36" width="24" height="24" fill="#5865F2">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.7,77.7,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.09,53,91.04,65.69,84.69,65.69Z" />
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>Discord</p>
                <p className="text-sm" style={{ margin: 0, color: hasDiscordLinked ? "var(--success)" : "var(--muted)" }}>
                  {hasDiscordLinked ? "Vinculada" : "No vinculada"}
                </p>
              </div>
            </div>

            {hasDiscordLinked ? (
              <button
                className="btn btn-danger"
                onClick={() => {
                  setUnlinkProvider("discord");
                  setShowConfirmModal(true);
                }}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Unlink size={18} /> Desvincular
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => signIn("discord")} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <LinkIcon size={18} /> Vincular
              </button>
            )}
          </div>

          {/* Twitch */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)",
              marginTop: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ background: "rgba(145, 70, 255, 0.15)", padding: "0.5rem", borderRadius: "8px", display: "flex", color: "#9146FF" }}>
                <TwitchIcon size={24} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>Twitch</p>
                <p className="text-sm" style={{ margin: 0, color: hasTwitchLinked ? "var(--success)" : "var(--muted)" }}>
                  {hasTwitchLinked ? "Vinculada" : "No vinculada"}
                </p>
              </div>
            </div>

            {hasTwitchLinked ? (
              <button
                className="btn btn-danger"
                onClick={() => {
                  setUnlinkProvider("twitch");
                  setShowConfirmModal(true);
                }}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Unlink size={18} /> Desvincular
              </button>
            ) : (
              <button
                className="btn"
                onClick={() => signIn("twitch")}
                style={{
                  background: "#9146FF",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: "none",
                  padding: "0.6rem 1.2rem",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                <LinkIcon size={18} /> Vincular Twitch
              </button>
            )}
          </div>
        </div>

        {/* Official Caster Section */}
        <div className="card" style={{ border: "1px solid rgba(145, 70, 255, 0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ background: "rgba(145, 70, 255, 0.2)", padding: "0.5rem", borderRadius: "8px", color: "#C499FF", display: "flex" }}>
                <Tv size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Caster Oficial</h2>
                <p className="text-muted text-sm" style={{ margin: 0 }}>
                  Transmite partidos oficiales de torneos en tu canal de streaming
                </p>
              </div>
            </div>

            {isCaster ? (
              <span
                style={{
                  background: "rgba(74, 222, 128, 0.15)",
                  color: "var(--success)",
                  border: "1px solid rgba(74, 222, 128, 0.3)",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "100px",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <CheckCircle2 size={16} /> Caster Oficial Aprobado
              </span>
            ) : casterApp?.status === "pending" ? (
              <span
                style={{
                  background: "rgba(250, 204, 21, 0.15)",
                  color: "var(--warning)",
                  border: "1px solid rgba(250, 204, 21, 0.3)",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "100px",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <Clock size={16} /> Solicitud en Revisión
              </span>
            ) : casterApp?.status === "rejected" ? (
              <span
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#EF4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "100px",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <XCircle size={16} /> Solicitud Rechazada
              </span>
            ) : null}
          </div>

          {/* Caster Content based on state */}
          {isCaster ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>Perfil de Caster Activo</p>
                <p className="text-sm text-muted" style={{ margin: "0 0 0.25rem 0" }}>
                  <strong>Alias:</strong> {casterApp?.alias || casterProfile?.alias || session.user?.name}
                </p>
                <p className="text-sm text-muted" style={{ margin: "0 0 0.25rem 0" }}>
                  <strong>Canal de Twitch:</strong>{" "}
                  {casterApp?.twitch_channel || casterProfile?.twitch_channel ? (
                    <a
                      href={`https://twitch.tv/${casterApp?.twitch_channel || casterProfile?.twitch_channel}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#9146FF", textDecoration: "none" }}
                    >
                      twitch.tv/{casterApp?.twitch_channel || casterProfile?.twitch_channel}
                    </a>
                  ) : (
                    "No configurado"
                  )}
                </p>
                {casterApp?.bio && (
                  <p className="text-sm text-muted" style={{ margin: "0.5rem 0 0 0" }}>
                    <strong>Bio / Experiencia:</strong> {casterApp.bio}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => router.push("/matches")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <Radio size={16} /> Explorar Matches para Castear
                </button>
                <button
                  className="btn"
                  onClick={() => setShowCasterModal(true)}
                  style={{
                    background: "rgba(145, 70, 255, 0.2)",
                    border: "1px solid rgba(145, 70, 255, 0.4)",
                    color: "#C499FF",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.6rem 1.2rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Editar Datos de Caster
                </button>
              </div>
            </div>
          ) : casterApp?.status === "pending" ? (
            <div style={{ background: "rgba(250, 204, 21, 0.05)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(250, 204, 21, 0.2)" }}>
              <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>Tu postulación está siendo revisada por los organizadores.</p>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                Alias enviado: <strong>{casterApp.alias}</strong> (Canal: twitch.tv/{casterApp.twitch_channel}). Te notificaremos una vez sea aprobada.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted" style={{ marginBottom: "1rem" }}>
                ¿Te gusta narrar o castear torneos de Left 4 Dead 2? Envía tu solicitud para obtener el rol de Caster Oficial y transmitir partidos directamente en la plataforma.
              </p>
              {casterApp?.status === "rejected" && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)", marginBottom: "1rem" }}>
                  <p className="text-sm" style={{ margin: 0, color: "#EF4444" }}>
                    Nota de revisión: {casterApp.reviewer_notes || "Solicitud rechazada previamente."}
                  </p>
                </div>
              )}
              <button
                className="btn btn-primary"
                onClick={() => setShowCasterModal(true)}
                style={{
                  background: "#9146FF",
                  borderColor: "#9146FF",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Tv size={18} /> {casterApp?.status === "rejected" ? "Volver a Postularse" : "Postularse como Caster Oficial"}
              </button>
            </div>
          )}
        </div>

        {/* Admin Applications Review Panel */}
        {isAdminOrOrg && adminApplications.length > 0 && (
          <div className="card" style={{ border: "1px solid var(--border-light)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <ShieldCheck size={22} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Administración de Solicitudes de Casters</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {adminApplications.map((app) => (
                <div
                  key={app.id}
                  style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid var(--border-light)",
                    borderRadius: "8px",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: "bold", fontSize: "1rem" }}>{app.alias}</p>
                      <p className="text-sm text-muted" style={{ margin: "0.2rem 0 0 0" }}>
                        Usuario: {app.users?.name || app.user_id} ({app.users?.email || "Sin email"})
                      </p>
                    </div>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "100px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        background:
                          app.status === "approved"
                            ? "rgba(74, 222, 128, 0.1)"
                            : app.status === "rejected"
                            ? "rgba(239, 68, 68, 0.1)"
                            : "rgba(250, 204, 21, 0.1)",
                        color:
                          app.status === "approved"
                            ? "var(--success)"
                            : app.status === "rejected"
                            ? "#EF4444"
                            : "var(--warning)",
                      }}
                    >
                      {app.status === "approved" ? "Aprobado" : app.status === "rejected" ? "Rechazado" : "Pendiente"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--muted)" }}>
                    {app.twitch_channel && (
                      <a
                        href={`https://twitch.tv/${app.twitch_channel}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#9146FF", display: "flex", alignItems: "center", gap: "0.3rem", textDecoration: "none" }}
                      >
                        <TwitchIcon size={14} /> twitch.tv/{app.twitch_channel}
                      </a>
                    )}
                    {app.youtube_channel && <span>YouTube: {app.youtube_channel}</span>}
                    {app.languages && <span>Idiomas: {app.languages.join(", ")}</span>}
                  </div>

                  {app.bio && (
                    <p className="text-sm text-muted" style={{ margin: 0, background: "rgba(255,255,255,0.02)", padding: "0.5rem", borderRadius: "6px" }}>
                      {app.bio}
                    </p>
                  )}

                  {app.status === "pending" && (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleReviewApplication(app.id, "approve")}
                        style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
                      >
                        Aprobar Caster
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleReviewApplication(app.id, "reject")}
                        style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Caster Application Modal */}
      {showCasterModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setShowCasterModal(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "540px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Tv size={22} color="#9146FF" />
                <h3 style={{ margin: 0, fontSize: "1.25rem" }}>Solicitud de Caster Oficial</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowCasterModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitCasterApp} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                  Alias de Caster *
                </label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="ej. CastMaster"
                  value={casterAlias}
                  onChange={(e) => setCasterAlias(e.target.value)}
                  style={{ width: "100%" }}
                  required
                  minLength={2}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                  Canal de Twitch * (usuario o enlace)
                </label>
                <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="ej. tu_canal o https://twitch.tv/tu_canal"
                    value={casterTwitch}
                    onChange={(e) => setCasterTwitch(e.target.value)}
                    style={{ width: "100%" }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                  Canal de YouTube (opcional)
                </label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="ej. https://youtube.com/@tucanal"
                  value={casterYoutube}
                  onChange={(e) => setCasterYoutube(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                  Idiomas de transmisión
                </label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="ej. Español, English"
                  value={casterLanguages}
                  onChange={(e) => setCasterLanguages(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                  Experiencia o Motivación
                </label>
                <textarea
                  className="input-base"
                  rows={3}
                  placeholder="Cuéntanos brevemente sobre tu experiencia casteando torneos o partidas de L4D2..."
                  value={casterBio}
                  onChange={(e) => setCasterBio(e.target.value)}
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCasterModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingCasterApp}
                  style={{ background: "#9146FF", borderColor: "#9146FF", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <Send size={16} /> {submittingCasterApp ? "Enviando..." : "Enviar Solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal for unlinking */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={`Desvincular ${unlinkProvider.toUpperCase()}`}
        message={`¿Estás seguro de que deseas desvincular tu cuenta de ${unlinkProvider.toUpperCase()}?`}
        onConfirm={handleUnlink}
        onCancel={() => setShowConfirmModal(false)}
        confirmText="Sí, Desvincular"
        cancelText="Cancelar"
        isDanger={true}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .settings-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        .settings-input-icon {
          position: absolute;
          left: 12px;
          color: #6b7280;
          pointer-events: none;
        }
        .settings-input {
          width: 100%;
          padding: 0.75rem 0.75rem 0.75rem 2.5rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border, #374151);
          border-radius: 8px;
          color: white;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .settings-input:focus {
          border-color: var(--primary, #3b82f6);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
      `,
        }}
      />
    </div>
  );
}

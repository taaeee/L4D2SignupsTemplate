"use client";

import React, { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmModal from "@/components/ConfirmModal";
import { LinkIcon, Unlink, ArrowLeft, User, Mail, Lock, KeyRound, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const [hasSteamLinked, setHasSteamLinked] = useState(false);
  const [hasDiscordLinked, setHasDiscordLinked] = useState(false);
  const [steamInfo, setSteamInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();

  // Profile Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchAccounts();
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
        
        if (discordAccount) {
          setHasDiscordLinked(true);
        }

        if (steamAccount) {
          setHasSteamLinked(true);
          try {
            const steamRes = await fetch(`/api/steam/player-stats?steamId=${steamAccount.providerAccountId}`);
            const steamData = await steamRes.json();
            if (!steamData.error) {
              setSteamInfo({
                name: steamData.personaname,
                avatar: steamData.avatar
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
        toast.success("¡Contraseña actualizada con éxito!");
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

  const handleUnlinkSteam = async () => {
    try {
      const res = await fetch("/api/user/accounts?provider=steam", {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cuenta de Steam desvinculada.");
        setHasSteamLinked(false);
        setSteamInfo(null);
      } else {
        toast.error(data.error || "Error al desvincular la cuenta.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de red al desvincular.");
    }
  };

  const handleUnlinkDiscord = async () => {
    try {
      const res = await fetch("/api/user/accounts?provider=discord", {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cuenta de Discord desvinculada.");
        setHasDiscordLinked(false);
      } else {
        toast.error(data.error || "Error al desvincular la cuenta.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error de red al desvincular.");
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

      <main style={{ flex: 1, maxWidth: "640px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Profile Card */}
        <div className="card">
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>Perfil de Usuario</h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <img 
              src={session.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.name || "User")}`} 
              alt="Avatar" 
              style={{ width: "72px", height: "72px", borderRadius: "50%", border: "2px solid var(--border-light)" }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: "1.2rem" }}>{session.user.name}</p>
              <p className="text-muted" style={{ margin: "0.25rem 0 0 0" }}>{session.user.email}</p>
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
          
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: "1rem", 
            background: "rgba(0,0,0,0.2)", 
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-light)"
          }}>
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
              <button className="btn btn-danger" onClick={() => setShowConfirmModal(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Unlink size={18} /> Desvincular
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => signIn("steam")} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <LinkIcon size={18} /> Vincular
              </button>
            )}
          </div>

          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: "1rem", 
            background: "rgba(0,0,0,0.2)", 
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-light)",
            marginTop: "1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ background: "rgba(88, 101, 242, 0.1)", padding: "0.5rem", borderRadius: "8px", display: "flex" }}>
                <svg viewBox="0 0 127.14 96.36" width="24" height="24" fill="#5865F2">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.7,77.7,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.09,53,91.04,65.69,84.69,65.69Z"/>
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
              <button className="btn btn-danger" onClick={handleUnlinkDiscord} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Unlink size={18} /> Desvincular
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => signIn("discord")} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <LinkIcon size={18} /> Vincular
              </button>
            )}
          </div>
        </div>
      </main>

      <ConfirmModal 
        isOpen={showConfirmModal}
        title="Desvincular Steam"
        message="¿Estás seguro de que deseas desvincular tu cuenta de Steam?"
        onConfirm={handleUnlinkSteam}
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

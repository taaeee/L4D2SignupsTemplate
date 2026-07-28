"use client";

import React, { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmModal from "@/components/ConfirmModal";
import { LinkIcon, Unlink, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [hasSteamLinked, setHasSteamLinked] = useState(false);
  const [hasDiscordLinked, setHasDiscordLinked] = useState(false);
  const [steamInfo, setSteamInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchAccounts();
    }
  }, [status, router]);

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
      <header style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.5rem 0", marginBottom: "3rem", borderBottom: "1px solid var(--border)" }}>
        <button className="btn-icon" onClick={() => router.back()} title="Volver">
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Ajustes de Cuenta</h1>
      </header>

      <main style={{ flex: 1, maxWidth: "600px", margin: "0 auto", width: "100%" }}>
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>Perfil</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <img 
              src={session.user.image || `https://ui-avatars.com/api/?name=${session.user.name}`} 
              alt="Avatar" 
              style={{ width: "80px", height: "80px", borderRadius: "50%" }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: "1.2rem" }}>{session.user.name}</p>
              <p className="text-muted" style={{ margin: "0.25rem 0 0 0" }}>{session.user.email}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: "1.5rem" }}>Cuentas Vinculadas</h2>
          
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

          <p className="text-muted text-sm" style={{ marginTop: "1rem" }}>
            Vincular tus cuentas te permite registrar equipos de forma rápida y utilizar otras funciones automatizadas.
          </p>
        </div>
      </main>

      <ConfirmModal 
        isOpen={showConfirmModal}
        title="Desvincular Steam"
        message="¿Estás seguro de que deseas desvincular tu cuenta de Steam? Si lo haces, no podrás importar jugadores desde tu lista de amigos hasta que la vuelvas a vincular."
        onConfirm={handleUnlinkSteam}
        onCancel={() => setShowConfirmModal(false)}
        confirmText="Sí, Desvincular"
        cancelText="Cancelar"
        isDanger={true}
      />
    </div>
  );
}

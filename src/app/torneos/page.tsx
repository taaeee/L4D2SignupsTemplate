"use client";

import React, { useEffect, useState } from "react";
import LoginButton from "@/components/LoginButton";
import { useSession, signIn } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Copy,
  Link as LinkIcon,
  CheckCircle,
  Trophy,
  Settings,
  Users,
  Gamepad2,
  ShieldCheck,
  AlignEndHorizontal
} from "lucide-react";

import { toast } from "sonner";

let cachedDashboardData: any = null;

export default function TorneosDashboard() {
  const { data: session, status } = useSession();
  const [tournaments, setTournaments] = useState(cachedDashboardData?.tournaments || []);
  const [publicTournaments, setPublicTournaments] = useState(cachedDashboardData?.publicTournaments || []);
  const [myTeams, setMyTeams] = useState(cachedDashboardData?.myTeams || []);
  const [activeTab, setActiveTab] = useState("explorar");
  const [searchExplore, setSearchExplore] = useState("");
  const [searchTournaments, setSearchTournaments] = useState("");
  const [searchRegistrations, setSearchRegistrations] = useState("");
  const [hasSteamLinked, setHasSteamLinked] = useState(cachedDashboardData?.hasSteamLinked || false);
  const [hasDiscordLinked, setHasDiscordLinked] = useState(cachedDashboardData?.hasDiscordLinked || false);
  const [isLoading, setIsLoading] = useState(!cachedDashboardData);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (session?.user?.id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, status]);

  const fetchData = async () => {
    if (!cachedDashboardData) setIsLoading(true);

    // Check if Steam is linked
    let accountData = null;
    try {
      const res = await fetch("/api/user/accounts");
      accountData = await res.json();
      if (accountData.accounts) {
        setHasSteamLinked(
          accountData.accounts.some((acc: any) => acc.provider === "steam")
        );
        setHasDiscordLinked(
          accountData.accounts.some((acc: any) => acc.provider === "discord")
        );
      }
    } catch (e) {
      console.error("Error fetching accounts:", e);
    }

    // Fetch Tournaments (created)
    const { data: createdTournaments, error: error1 } = await supabase
      .from("tournaments")
      .select("*, teams(status)")
      .eq("creator_id", session?.user?.id as string)
      .order("created_at", { ascending: false });

    // Fetch Tournaments (moderated)
    const { data: moderatedTournaments, error: error2 } = await supabase
      .from("tournaments")
      .select("*, teams(status)")
      .contains("moderators", JSON.stringify([session!.user!.id as string]))
      .order("created_at", { ascending: false });

    let uniqueTournaments: any[] = [];
    if (!error1 && !error2) {
      // Combine and remove duplicates
      const allTournaments = [
        ...(createdTournaments || []),
        ...(moderatedTournaments || []),
      ];
      uniqueTournaments = Array.from(
        new Map(allTournaments.map((t) => [t.id, t])).values()
      );
      uniqueTournaments.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTournaments(uniqueTournaments);
    } else {
      console.error("Error fetching tournaments:", error1 || error2);
    }

    // Fetch User's Teams
    const { data: teamsData, error: error3 } = await supabase
      .from("teams")
      .select("*, tournaments(name, status, logo_url, template_json)")
      .eq("creator_id", session?.user?.id as string)
      .order("created_at", { ascending: false });

    if (!error3 && teamsData) {
      setMyTeams(teamsData);
    } else {
      console.error("Error fetching teams:", error3);
    }

    // Fetch Public Tournaments
    const { data: publicTData, error: error4 } = await supabase
      .from("tournaments")
      .select("*, teams(status)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error4 && publicTData) {
      setPublicTournaments(
        publicTData.filter((t: any) => !(t.template_json as any)?.isPrivate)
      );
    } else {
      console.error("Error fetching public tournaments:", error4);
    }

    cachedDashboardData = {
      tournaments: uniqueTournaments,
      myTeams: teamsData || [],
      publicTournaments: publicTData ? publicTData.filter((t: any) => !(t.template_json as any)?.isPrivate) : [],
      hasSteamLinked: accountData?.accounts?.some((acc: any) => acc.provider === "steam") || false,
      hasDiscordLinked: accountData?.accounts?.some((acc: any) => acc.provider === "discord") || false
    };

    setIsLoading(false);
  };

  const copyToClipboard = () => {
    if (session?.user?.id) {
      navigator.clipboard.writeText(session.user.id);
      toast.success("¡ID copiado al portapapeles!");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <LoadingSpinner text="Cargando Panel..." fullHeight={true} />
    );
  }

  if (!session) return null;

  return (
    <div
      className="container"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 0",
          marginBottom: "3rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
          <span className="text-gradient">L4D2</span> Dashboard
        </h1>
        <LoginButton />
      </header>

      <main style={{ flex: 1 }}>
        {/* User Profile Card */}
        <div
          className="card"
          style={{
            marginBottom: "3rem",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 0.5rem 0" }}>
              Hola, {session.user.name}
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span className="text-muted">
                Tu ID de usuario:
              </span>
              <code
                style={{
                  background: "rgba(0,0,0,0.2)",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                }}
              >
                {session.user.id}
              </code>
              <button
                className="btn-icon"
                onClick={copyToClipboard}
                title="Copiar ID"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {hasSteamLinked ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--success)",
                  background: "rgba(34, 197, 94, 0.1)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px"
                }}
              >
                <CheckCircle size={18} />
                <span className="text-sm font-bold">Steam Vinculado</span>
              </div>
            ) : (
              <button
                className="btn btn-secondary text-sm"
                onClick={() => signIn("steam")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem"
                }}
              >
                <LinkIcon size={16} /> Vincular Steam
              </button>
            )}

            {hasDiscordLinked ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#5865F2",
                  background: "rgba(88, 101, 242, 0.1)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px"
                }}
              >
                <CheckCircle size={18} />
                <span className="text-sm font-bold">Discord Vinculado</span>
              </div>
            ) : (
              <button
                className="btn btn-secondary text-sm"
                onClick={() => signIn("discord")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem"
                }}
              >
                <LinkIcon size={16} /> Vincular Discord
              </button>
            )}
          </div>
        </div>

        <div className="tab-container">
          <button
            onClick={() => setActiveTab("explorar")}
            className={`tab-btn ${activeTab === "explorar" ? "active" : ""}`}
          >
            Explorar Torneos
          </button>
          <button
            onClick={() => setActiveTab("torneos")}
            className={`tab-btn ${activeTab === "torneos" ? "active" : ""}`}
          >
            Mis Torneos
          </button>
          <button
            onClick={() => setActiveTab("inscripciones")}
            className={`tab-btn ${activeTab === "inscripciones" ? "active" : ""}`}
          >
            Mis Inscripciones
          </button>
        </div>

        {activeTab === "explorar" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h2 style={{ margin: 0 }}>Torneos Públicos</h2>
              <input
                type="text"
                className="input-base"
                placeholder="Buscar torneo público..."
                value={searchExplore}
                onChange={(e) => setSearchExplore(e.target.value)}
                style={{ width: "100%", maxWidth: "300px" }}
              />
            </div>

            {publicTournaments.filter((t: any) => t.name.toLowerCase().includes(searchExplore.toLowerCase())).length === 0 ? (
              <div
                className="card"
                style={{ textAlign: "center", padding: "3rem" }}
              >
                <p className="text-muted">
                  No hay torneos disponibles en este momento.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(300px, 1fr))",
                }}
              >
                {publicTournaments.filter((t: any) => t.name.toLowerCase().includes(searchExplore.toLowerCase())).map((t: any) => (
                  <div
                    key={t.id}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center",
                      }}
                    >
                      {t.logo_url || t.template_json?.logo_url ? (
                        <img
                          src={t.logo_url || t.template_json.logo_url}
                          alt="Logo"
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "8px",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "8px",
                            background: "rgba(255,255,255,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trophy size={24} color="var(--primary)" />
                        </div>
                      )}
                      <h3 style={{ margin: 0 }}>{t.name}</h3>
                    </div>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      {t.description || "Sin descripción"}
                    </p>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      <strong>Estado:</strong>{" "}
                      <span
                        className={
                          t.status === "locked"
                            ? "text-danger"
                            : "text-success"
                        }
                      >
                        {t.status === "locked" ? "Cerrado" : "Abierto"}
                      </span>
                    </p>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      <strong>Slots:</strong>{" "}
                      {t.teams?.filter((team: any) => team.status === "accepted").length || 0} / {t.max_teams || "?"}
                    </p>
                    <div
                      style={{
                        marginTop: "auto",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => router.push(`/tournament/${t.id}`)}
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "torneos" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h2 style={{ margin: 0 }}>Mis Torneos</h2>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
                <input
                  type="text"
                  className="input-base"
                  placeholder="Buscar torneo..."
                  value={searchTournaments}
                  onChange={(e) => setSearchTournaments(e.target.value)}
                  style={{ width: "100%", maxWidth: "300px" }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => router.push("/tournament/create")}
                >
                  Crear Nuevo Torneo
                </button>
              </div>
            </div>

            {tournaments.filter((t: any) => t.name.toLowerCase().includes(searchTournaments.toLowerCase())).length === 0 ? (
              <div
                className="card"
                style={{ textAlign: "center", padding: "3rem" }}
              >
                <p className="text-muted">
                  No has creado ni moderas ningún torneo todavía.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(300px, 1fr))",
                }}
              >
                {tournaments.filter((t: any) => t.name.toLowerCase().includes(searchTournaments.toLowerCase())).map((t: any) => (
                  <div
                    key={t.id}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center",
                      }}
                    >
                      {t.logo_url || t.template_json?.logo_url ? (
                        <img
                          src={t.logo_url || t.template_json.logo_url}
                          alt="Logo"
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "8px",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "8px",
                            background: "rgba(255,255,255,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trophy size={24} color="var(--primary)" />
                        </div>
                      )}
                      <h3 style={{ margin: 0 }}>{t.name}</h3>
                    </div>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      {t.description || "Sin descripción"}
                    </p>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      <strong>Equipos Aceptados:</strong> {t.teams?.filter((team: any) => team.status === "accepted").length || 0} / {t.max_teams || "?"}
                    </p>
                    <div
                      style={{
                        marginTop: "auto",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => router.push(`/tournament/${t.id}`)}
                      >
                        Gestionar
                      </button>
                      <button
                        className="btn btn-secondary btn-icon"
                        title="Configuración"
                        onClick={() =>
                          router.push(`/tournament/${t.id}/edit`)
                        }
                        style={{
                          padding: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Settings size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "inscripciones" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h2 style={{ margin: 0 }}>Equipos Registrados</h2>
              <input
                type="text"
                className="input-base"
                placeholder="Buscar por equipo o torneo..."
                value={searchRegistrations}
                onChange={(e) => setSearchRegistrations(e.target.value)}
                style={{ width: "100%", maxWidth: "300px" }}
              />
            </div>

            {myTeams.filter((t: any) => t.name.toLowerCase().includes(searchRegistrations.toLowerCase()) || t.tournaments?.name.toLowerCase().includes(searchRegistrations.toLowerCase())).length === 0 ? (
              <div
                className="card"
                style={{ textAlign: "center", padding: "3rem" }}
              >
                <p className="text-muted">
                  No te has inscrito a ningún torneo todavía.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(300px, 1fr))",
                }}
              >
                {myTeams.filter((t: any) => t.name.toLowerCase().includes(searchRegistrations.toLowerCase()) || t.tournaments?.name.toLowerCase().includes(searchRegistrations.toLowerCase())).map((team: any) => {
                  const isPending = team.status === "pending";
                  const isAccepted = team.status === "accepted";
                  const isLocked = team.tournaments?.status === "locked";

                  return (
                    <div
                      key={team.id}
                      className="card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            paddingRight: "1rem",
                            wordBreak: "break-word",
                          }}
                        >
                          {team.name}
                        </h3>
                        {/* Badge Status */}
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "100px",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            background: isAccepted
                              ? "rgba(74, 222, 128, 0.1)"
                              : "rgba(250, 204, 21, 0.1)",
                            color: isAccepted
                              ? "var(--success)"
                              : "var(--warning)",
                            border: `1px solid ${isAccepted ? "var(--success)" : "var(--warning)"
                              }`,
                          }}
                        >
                          {isAccepted ? "Aceptado" : "Pendiente"}
                        </span>
                      </div>

                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          transition: "background 0.2s ease",
                        }}
                        onMouseOver={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.06)")
                        }
                        onMouseOut={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.03)")
                        }
                      >
                        <div
                          style={{
                            background: "rgba(74, 222, 128, 0.1)",
                            padding: (team.tournaments?.logo_url || team.tournaments?.template_json?.logo_url) ? "0" : "0.5rem",
                            borderRadius: "6px",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px"
                          }}
                        >
                          {(team.tournaments?.logo_url || team.tournaments?.template_json?.logo_url) ? (
                            <img src={team.tournaments.logo_url || team.tournaments.template_json.logo_url} alt="Tournament Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <Trophy size={16} color="var(--primary)" />
                          )}
                        </div>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span className="text-xs text-muted">
                            Torneo Inscrito
                          </span>
                          <span
                            style={{
                              fontWeight: "bold",
                              color: "var(--text-main)",
                              fontSize: "0.95rem",
                            }}
                          >
                            {team.tournaments?.name || "Desconocido"}
                          </span>
                        </div>
                      </div>

                      {isLocked && (
                        <p
                          className="text-danger text-sm"
                          style={{ margin: 0, fontWeight: "bold" }}
                        >
                          Torneo cerrado (En progreso)
                        </p>
                      )}

                      <div
                        style={{
                          marginTop: "auto",
                          display: "flex",
                          gap: "0.5rem",
                        }}
                      >
                        <button
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                          onClick={() =>
                            router.push(`/tournament/${team.tournament_id}`)
                          }
                        >
                          Ver Torneo
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                          onClick={() =>
                            router.push(
                              `/tournament/${team.tournament_id}/team/${team.id}`
                            )
                          }
                        >
                          Ver Equipo
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <footer
        style={{
          textAlign: "center",
          marginTop: "4rem",
          paddingBottom: "2rem",
        }}
      >
        <p className="text-muted text-sm">Powered by Colossus Corporation®</p>
      </footer>
    </div>
  );
}

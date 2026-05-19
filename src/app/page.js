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

export default function Home() {
  const { data: session, status } = useSession();
  const [tournaments, setTournaments] = useState([]);
  const [publicTournaments, setPublicTournaments] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [activeTab, setActiveTab] = useState("explorar");
  const [searchExplore, setSearchExplore] = useState("");
  const [searchTournaments, setSearchTournaments] = useState("");
  const [searchRegistrations, setSearchRegistrations] = useState("");
  const [hasSteamLinked, setHasSteamLinked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    } else if (status === "unauthenticated") {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, status]);

  const fetchData = async () => {
    setIsLoading(true);

    // Check if Steam is linked
    try {
      const res = await fetch("/api/user/accounts");
      const accountData = await res.json();
      if (accountData.accounts) {
        setHasSteamLinked(
          accountData.accounts.some((acc) => acc.provider === "steam")
        );
      }
    } catch (e) {
      console.error("Error fetching accounts:", e);
    }

    // Fetch Tournaments (created)
    const { data: createdTournaments, error: error1 } = await supabase
      .from("tournaments")
      .select("*")
      .eq("creator_id", session.user.id)
      .order("created_at", { ascending: false });

    // Fetch Tournaments (moderated)
    const { data: moderatedTournaments, error: error2 } = await supabase
      .from("tournaments")
      .select("*")
      .contains("moderators", JSON.stringify([session.user.id]))
      .order("created_at", { ascending: false });

    if (!error1 && !error2) {
      // Combine and remove duplicates
      const allTournaments = [
        ...(createdTournaments || []),
        ...(moderatedTournaments || []),
      ];
      const uniqueTournaments = Array.from(
        new Map(allTournaments.map((t) => [t.id, t])).values()
      );
      uniqueTournaments.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setTournaments(uniqueTournaments);
    } else {
      console.error("Error fetching tournaments:", error1 || error2);
    }

    // Fetch User's Teams
    const { data: teamsData, error: error3 } = await supabase
      .from("teams")
      .select("*, tournaments(name, status)")
      .eq("creator_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error3 && teamsData) {
      setMyTeams(teamsData);
    } else {
      console.error("Error fetching teams:", error3);
    }

    // Fetch Public Tournaments
    const { data: publicTData, error: error4 } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error4 && publicTData) {
      setPublicTournaments(
        publicTData.filter((t) => !t.template_json?.isPrivate)
      );
    } else {
      console.error("Error fetching public tournaments:", error4);
    }

    setIsLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(session.user.id);
    toast.success("¡ID copiado al portapapeles!");
  };

  if (status === "loading" || (session && isLoading)) {
    return (
      <LoadingSpinner text="Cargando..." fullHeight={true} />
    );
  }

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
          <span className="text-gradient">L4D2</span> Tournament
        </h1>
        <LoginButton />
      </header>

      {!session ? (
        <main style={{ flex: 1 }}>
          <section
            style={{
              textAlign: "center",
              marginBottom: "5rem",
              marginTop: "2rem",
            }}
          >
            <h2
              style={{
                fontSize: "3rem",
                marginBottom: "1.5rem",
                lineHeight: 1.2,
              }}
            >
              Organiza tus Torneos <br /> de forma{" "}
              <span className="text-gradient">Profesional</span>
            </h2>
            <p
              className="text-muted"
              style={{
                fontSize: "1.2rem",
                maxWidth: "600px",
                margin: "0 auto 2.5rem",
              }}
            >
              Plataforma integral de gestión de torneos y registros de equipos
              diseñada específicamente para la comunidad de Left 4 Dead 2.
            </p>
            <button
              className="btn btn-primary"
              style={{
                fontSize: "1.1rem",
                padding: "0.8rem 2rem",
                borderRadius: "100px",
              }}
              onClick={() => router.push("/login")}
            >
              Empezar ahora
            </button>
          </section>

          <section id="como-funciona" style={{ marginBottom: "5rem" }}>
            <h3
              style={{
                textAlign: "center",
                fontSize: "2.5rem",
                marginBottom: "4rem",
              }}
            >
              ¿Cómo funciona?
            </h3>

            {/* ORGANIZADOR */}
            <div style={{ marginBottom: "5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", justifyContent: "center" }}>
                <Trophy size={32} color="var(--primary)" />
                <h4 style={{ fontSize: "1.8rem", margin: 0 }}>Para Organizadores</h4>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "2rem",
                }}
              >
                <div
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "2.5rem 2rem",
                    transition: "transform 0.2s",
                    borderTop: "3px solid var(--primary)",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div
                    style={{
                      background: "rgba(255, 60, 60, 0.1)",
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.5rem",
                    }}
                  >
                    <Settings size={32} color="var(--primary)" />
                  </div>
                  <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                    1. Crea tu torneo
                  </h4>
                  <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                    Configura las reglas, regiones, límite de equipos y personaliza los campos de registro en segundos.
                  </p>
                </div>

                <div
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "2.5rem 2rem",
                    transition: "transform 0.2s",
                    borderTop: "3px solid var(--primary)",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div
                    style={{
                      background: "rgba(255, 60, 60, 0.1)",
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.5rem",
                    }}
                  >
                    <LinkIcon size={32} color="var(--primary)" />
                  </div>
                  <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                    2. Comparte el enlace
                  </h4>
                  <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                    Envía el enlace de registro a los capitanes. El sistema recopilará automáticamente los Steam IDs reales.
                  </p>
                </div>

                <div
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "2.5rem 2rem",
                    transition: "transform 0.2s",
                    borderTop: "3px solid var(--primary)",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div
                    style={{
                      background: "rgba(255, 60, 60, 0.1)",
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.5rem",
                    }}
                  >
                    <AlignEndHorizontal size={32} color="var(--primary)" />
                  </div>
                  <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                    3. Gestiona y Genera Llaves
                  </h4>
                  <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                    Revisa las inscripciones, gestiona baneos y genera automáticamente las llaves del torneo (bracket).
                  </p>
                </div>
              </div>
            </div>

            {/* PARTICIPANTE */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", justifyContent: "center" }}>
                <Gamepad2 size={32} color="var(--success)" />
                <h4 style={{ fontSize: "1.8rem", margin: 0 }}>Para Participantes</h4>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "2rem",
                }}
              >
                <div
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "2.5rem 2rem",
                    transition: "transform 0.2s",
                    borderTop: "3px solid var(--success)",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div
                    style={{
                      background: "rgba(34, 197, 94, 0.1)",
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.5rem",
                    }}
                  >
                    <ShieldCheck size={32} color="var(--success)" />
                  </div>
                  <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                    1. Vincula tu cuenta
                  </h4>
                  <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                    Inicia sesión de forma segura a través de Steam. Esto garantiza la integridad de la competencia.
                  </p>
                </div>

                <div
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "2.5rem 2rem",
                    transition: "transform 0.2s",
                    borderTop: "3px solid var(--success)",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div
                    style={{
                      background: "rgba(34, 197, 94, 0.1)",
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.5rem",
                    }}
                  >
                    <Users size={32} color="var(--success)" />
                  </div>
                  <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                    2. Inscribe a tu equipo
                  </h4>
                  <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                    Añade a tus amigos a la lista directamente desde tu perfil de Steam, elige un tag, país y un logo.
                  </p>
                </div>

                <div
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "2.5rem 2rem",
                    transition: "transform 0.2s",
                    borderTop: "3px solid var(--success)",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-5px)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div
                    style={{
                      background: "rgba(34, 197, 94, 0.1)",
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.5rem",
                    }}
                  >
                    <Trophy size={32} color="var(--success)" />
                  </div>
                  <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                    3. Compite y avanza
                  </h4>
                  <p className="text-muted" style={{ fontSize: "0.95rem" }}>
                    Sigue tu progreso en vivo desde el panel del torneo y visualiza de forma dinámica a tus contrincantes.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      ) : (
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
                  Tu ID de usuario (para invitaciones de moderador):
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

            <div>
              {hasSteamLinked ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "var(--success)",
                  }}
                >
                  <CheckCircle size={20} />
                  <span>Steam Vinculado</span>
                </div>
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => signIn("steam")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <LinkIcon size={18} /> Vincular cuenta de Steam
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "3rem",
              borderBottom: "1px solid var(--border-light)",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setActiveTab("explorar")}
              style={{
                background: "none",
                border: "none",
                padding: "1rem 2rem",
                fontSize: "1.1rem",
                color:
                  activeTab === "explorar" ? "var(--primary)" : "var(--muted)",
                borderBottom:
                  activeTab === "explorar"
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s ease",
                outline: "none",
              }}
            >
              Explorar Torneos
            </button>
            <button
              onClick={() => setActiveTab("torneos")}
              style={{
                background: "none",
                border: "none",
                padding: "1rem 2rem",
                fontSize: "1.1rem",
                color:
                  activeTab === "torneos" ? "var(--primary)" : "var(--muted)",
                borderBottom:
                  activeTab === "torneos"
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s ease",
                outline: "none",
              }}
            >
              Mis Torneos
            </button>
            <button
              onClick={() => setActiveTab("inscripciones")}
              style={{
                background: "none",
                border: "none",
                padding: "1rem 2rem",
                fontSize: "1.1rem",
                color:
                  activeTab === "inscripciones"
                    ? "var(--primary)"
                    : "var(--muted)",
                borderBottom:
                  activeTab === "inscripciones"
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s ease",
                outline: "none",
              }}
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

              {publicTournaments.filter(t => t.name.toLowerCase().includes(searchExplore.toLowerCase())).length === 0 ? (
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
                  {publicTournaments.filter(t => t.name.toLowerCase().includes(searchExplore.toLowerCase())).map((t) => (
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
                        {t.template_json?.logo_url ? (
                          <img
                            src={t.template_json.logo_url}
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

              {tournaments.filter(t => t.name.toLowerCase().includes(searchTournaments.toLowerCase())).length === 0 ? (
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
                  {tournaments.filter(t => t.name.toLowerCase().includes(searchTournaments.toLowerCase())).map((t) => (
                    <div
                      key={t.id}
                      className="card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      <h3 style={{ margin: 0 }}>{t.name}</h3>
                      <p className="text-muted text-sm" style={{ margin: 0 }}>
                        {t.description || "Sin descripción"}
                      </p>
                      <p className="text-muted text-sm" style={{ margin: 0 }}>
                        <strong>Equipos Máx:</strong> {t.max_teams}
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

              {myTeams.filter(t => t.name.toLowerCase().includes(searchRegistrations.toLowerCase()) || t.tournaments?.name.toLowerCase().includes(searchRegistrations.toLowerCase())).length === 0 ? (
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
                  {myTeams.filter(t => t.name.toLowerCase().includes(searchRegistrations.toLowerCase()) || t.tournaments?.name.toLowerCase().includes(searchRegistrations.toLowerCase())).map((team) => {
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
                              border: `1px solid ${
                                isAccepted ? "var(--success)" : "var(--warning)"
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
                              padding: "0.5rem",
                              borderRadius: "6px",
                            }}
                          >
                            <Trophy size={16} color="var(--primary)" />
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
      )}

      <footer
        style={{
          textAlign: "center",
          marginTop: "4rem",
          paddingBottom: "2rem",
        }}
      >
        <p className="text-muted text-sm">Powered by taeyong</p>
      </footer>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import LoginButton from "@/components/LoginButton";
import { useSession, signIn } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Copy, Link as LinkIcon, CheckCircle } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const [tournaments, setTournaments] = useState([]);
  const [hasSteamLinked, setHasSteamLinked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    } else if (status === "unauthenticated") {
      setIsLoading(false);
    }
  }, [session, status]);

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

    // Fetch Tournaments
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("creator_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTournaments(data);
    }
    setIsLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(session.user.id);
    alert("¡ID copiado al portapapeles!");
  };

  if (status === "loading" || (session && isLoading)) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", marginTop: "10vh" }}
      >
        Cargando...
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', marginBottom: '3rem', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
          <span className="text-gradient">L4D2</span> Tournament
        </h1>
        <LoginButton />
      </header>

      {!session ? (
        <main style={{ flex: 1 }}>
          <section style={{ textAlign: "center", marginBottom: "5rem", marginTop: "2rem" }}>
            <h2 style={{ fontSize: "3rem", marginBottom: "1.5rem", lineHeight: 1.2 }}>
              Organiza tus Torneos <br/> de forma <span className="text-gradient">Profesional</span>
            </h2>
            <p className="text-muted" style={{ fontSize: "1.2rem", maxWidth: "600px", margin: "0 auto 2.5rem" }}>
              Plataforma integral de gestión de torneos y registros de equipos diseñada específicamente para la comunidad de Left 4 Dead 2.
            </p>
            <button className="btn btn-primary" style={{ fontSize: "1.1rem", padding: "0.8rem 2rem", borderRadius: "100px" }} onClick={() => router.push('/login')}>
              Empezar ahora
            </button>
          </section>

          <section id="como-funciona" style={{ marginBottom: "5rem" }}>
            <h3 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "3rem" }}>¿Cómo funciona?</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "2rem" }}>
              
              <div className="card" style={{ textAlign: "center", padding: "2.5rem 2rem", transition: "transform 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'none'}>
                <div style={{ background: "rgba(255, 60, 60, 0.1)", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                </div>
                <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>1. Crea tu torneo</h4>
                <p className="text-muted" style={{ fontSize: "0.95rem" }}>Configura las reglas, regiones, límite de equipos y requisitos de registro en segundos.</p>
              </div>

              <div className="card" style={{ textAlign: "center", padding: "2.5rem 2rem", transition: "transform 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'none'}>
                <div style={{ background: "rgba(255, 60, 60, 0.1)", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                  <LinkIcon size={32} color="var(--primary)" />
                </div>
                <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>2. Comparte el enlace</h4>
                <p className="text-muted" style={{ fontSize: "0.95rem" }}>Envía el enlace de registro a los capitanes. El sistema recopilará automáticamente los Steam IDs reales.</p>
              </div>

              <div className="card" style={{ textAlign: "center", padding: "2.5rem 2rem", transition: "transform 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'none'}>
                <div style={{ background: "rgba(255, 60, 60, 0.1)", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <h4 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>3. Gestiona equipos</h4>
                <p className="text-muted" style={{ fontSize: "0.95rem" }}>Revisa, acepta o rechaza las inscripciones desde un panel de administración unificado.</p>
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
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <h2 style={{ margin: 0 }}>Mis Torneos</h2>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/tournament/create")}
            >
              Crear Nuevo Torneo
            </button>
          </div>

          {tournaments.length === 0 ? (
            <div
              className="card"
              style={{ textAlign: "center", padding: "3rem" }}
            >
              <p className="text-muted">No has creado ningún torneo todavía.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              }}
            >
              {tournaments.map((t) => (
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
                  </div>
                </div>
              ))}
            </div>
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

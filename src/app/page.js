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
    <div className="container">
      <header style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
          <span className="text-gradient">L4D2</span> Tournament Creator
        </h1>
        <p className="text-muted">
          Plataforma de gestión de torneos y registros para Left 4 Dead 2
        </p>
        <div style={{ marginTop: "2rem" }}>
          <LoginButton />
        </div>
      </header>

      {session && (
        <main>
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

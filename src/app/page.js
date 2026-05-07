"use client";

import React, { useEffect, useState } from "react";
import LoginButton from "@/components/LoginButton";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (session) {
      fetchTournaments();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  const fetchTournaments = async () => {
    setIsLoading(true);
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

  if (status === "loading" || (session && isLoading)) {
    return (
      <div className="container" style={{ textAlign: "center", marginTop: "10vh" }}>
        Cargando...
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
          <span className="text-gradient">L4D2</span> Tournament Center
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ margin: 0 }}>Mis Torneos</h2>
            <button className="btn btn-primary" onClick={() => router.push("/tournament/create")}>
              Crear Nuevo Torneo
            </button>
          </div>

          {tournaments.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
              <p className="text-muted">No has creado ningún torneo todavía.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {tournaments.map((t) => (
                <div key={t.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <h3 style={{ margin: 0 }}>{t.name}</h3>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>
                    {t.description || "Sin descripción"}
                  </p>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>
                    <strong>Equipos Máx:</strong> {t.max_teams}
                  </p>
                  <div style={{ marginTop: "auto", display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => router.push(`/tournament/${t.id}`)}>
                      Gestionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      <footer style={{ textAlign: "center", marginTop: "4rem", paddingBottom: "2rem" }}>
        <p className="text-muted text-sm">Powered by taeyong</p>
      </footer>
    </div>
  );
}

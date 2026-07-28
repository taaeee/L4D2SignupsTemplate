"use client";

import React, { useEffect } from "react";
import LoginButton from "@/components/LoginButton";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Link as LinkIcon,
  Trophy,
  Settings,
  Users,
  Gamepad2,
  ShieldCheck,
  AlignEndHorizontal
} from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.id) {
      router.push("/torneos");
    }
  }, [session, router]);

  if (status === "loading" || session) {
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

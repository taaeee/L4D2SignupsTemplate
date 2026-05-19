"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShieldCheck, LogIn, AlertCircle } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ModInvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [tournamentId, setTournamentId] = useState(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tournament/mod-invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ocurrió un error al aceptar la invitación.");
      } else {
        setSuccess(true);
        setTournamentId(data.tournamentId);
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/tournament/${data.tournamentId}`);
        }, 2000);
      }
    } catch (e) {
      setError("Error de red.");
    }
    setIsLoading(false);
  };

  if (status === "loading") {
    return <LoadingSpinner text="Cargando..." fullHeight={true} />;
  }

  return (
    <div className="container" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", maxWidth: "500px", width: "100%" }}>
        
        {success ? (
          <>
            <ShieldCheck size={64} style={{ color: "var(--success)", margin: "0 auto 1.5rem" }} />
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>¡Invitación Aceptada!</h1>
            <p className="text-muted">Ahora eres moderador del torneo. Redirigiendo al panel...</p>
          </>
        ) : (
          <>
            <ShieldCheck size={64} style={{ color: "var(--primary)", margin: "0 auto 1.5rem" }} />
            <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Invitación de Moderador</h1>
            
            {status === "unauthenticated" ? (
              <>
                <p className="text-muted" style={{ marginBottom: "2rem" }}>
                  Debes iniciar sesión para aceptar esta invitación y convertirte en moderador.
                </p>
                <button 
                  className="btn btn-primary" 
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => router.push(`/login?callbackUrl=/tournament/invite/${token}`)}
                >
                  <LogIn size={20} /> Iniciar Sesión para Aceptar
                </button>
              </>
            ) : (
              <>
                <p className="text-muted" style={{ marginBottom: "2rem" }}>
                  Estás a punto de aceptar una invitación para moderar este torneo como <strong>{session.user.name}</strong>.
                </p>
                
                {error && (
                  <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#f87171", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", textAlign: "left" }}>
                    <AlertCircle size={20} />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={handleAccept}
                  disabled={isLoading}
                >
                  {isLoading ? "Aceptando..." : "Aceptar Invitación"}
                </button>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}

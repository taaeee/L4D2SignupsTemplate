"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, KeyRound, CheckCircle2 } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!token || !email) {
    return (
      <div className="reset-card card" style={{ textAlign: "center" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Enlace Inválido</h2>
        <p className="text-muted">
          El enlace de recuperación es incompleto o no es válido. Por favor solicita uno nuevo desde la página de inicio de sesión.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
          Volver a Iniciar Sesión
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      const msg = "Las contraseñas no coinciden.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Ocurrió un error al restablecer la contraseña.";
        setErrorMsg(msg);
        toast.error(msg);
      } else {
        setSuccess(true);
        toast.success("¡Tu contraseña ha sido restablecida con éxito!");
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      }
    } catch (err) {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-card card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
        <CheckCircle2 size={56} style={{ color: "#22c55e", margin: "0 auto 1rem" }} />
        <h2 style={{ marginBottom: "0.5rem" }}>¡Contraseña Restablecida!</h2>
        <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
          Tu contraseña ha sido actualizada correctamente. Redirigiendo al inicio de sesión...
        </p>
        <Link href="/login" className="btn btn-primary">
          Ir al Inicio de Sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="reset-card card">
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
          Restablecer <span className="text-gradient">Contraseña</span>
        </h1>
        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
          Ingresa tu nueva contraseña para <strong>{email}</strong>
        </p>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="input-group">
          <Lock size={18} className="input-icon" />
          <input
            type="password"
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            className="form-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div className="input-group">
          <KeyRound size={18} className="input-icon" />
          <input
            type="password"
            placeholder="Confirmar nueva contraseña"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary submit-btn">
          {loading ? "Guardando..." : "Actualizar Contraseña"}
        </button>
      </form>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .reset-card {
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          padding: 2.5rem 2rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        }
        .error-banner {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          text-align: center;
        }
        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          color: #6b7280;
          pointer-events: none;
        }
        .form-input {
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
        .form-input:focus {
          border-color: var(--primary, #3b82f6);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .submit-btn {
          width: 100%;
          padding: 0.8rem;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 8px;
          margin-top: 0.5rem;
          cursor: pointer;
        }
      `,
        }}
      />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      className="container"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header style={{ padding: "1.5rem 0" }}>
        <Link
          href="/login"
          className="btn btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            border: "none",
            background: "transparent",
          }}
        >
          <ArrowLeft size={18} /> Volver a Iniciar Sesión
        </Link>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Suspense fallback={<LoadingSpinner text="Cargando formulario..." />}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}

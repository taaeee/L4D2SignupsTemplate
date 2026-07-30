"use client";

import React, { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowLeft, KeyRound, Mail, User as UserIcon, Lock, X } from "lucide-react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password reset modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        const msg = res.error === "CredentialsSignin" ? "Correo o contraseña incorrectos." : res.error;
        setErrorMessage(msg);
        toast.error(msg);
      } else if (res?.ok) {
        toast.success("¡Sesión iniciada correctamente!");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      toast.error("Ocurrió un error al intentar iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      const msg = "Las contraseñas no coinciden.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Ocurrió un error al registrar la cuenta.";
        setErrorMessage(msg);
        toast.error(msg);
      } else {
        toast.success("¡Cuenta creada exitosamente! Iniciando sesión...");
        
        // Auto sign-in after registration
        const loginRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (loginRes?.ok) {
          router.push(callbackUrl);
          router.refresh();
        } else {
          setActiveTab("login");
        }
      }
    } catch (err) {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingReset(true);

    try {
      const res = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al solicitar la recuperación.");
      } else {
        toast.success(data.message, { duration: 6000 });
        setShowForgotModal(false);
        setResetEmail("");
      }
    } catch (err) {
      toast.error("Error al enviar la solicitud.");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="login-card card">
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          Bienvenido a <span className="text-gradient">L4D2</span>
        </h1>
        <p className="text-muted">
          Inicia sesión o crea tu cuenta para organizar torneos
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="tab-container">
        <button
          type="button"
          className={`tab-btn ${activeTab === "login" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("login");
            setErrorMessage(null);
          }}
        >
          Iniciar Sesión
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "register" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("register");
            setErrorMessage(null);
          }}
        >
          Crear Cuenta
        </button>
      </div>

      {errorMessage && (
        <div className="error-banner">
          {errorMessage}
        </div>
      )}

      {/* Credentials Form */}
      {activeTab === "login" ? (
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder="Correo electrónico"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Contraseña"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="forgot-link"
              onClick={() => {
                setResetEmail(email);
                setShowForgotModal(true);
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary submit-btn"
          >
            {loading ? "Ingresando..." : "Ingresar con correo"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="input-group">
            <UserIcon size={18} className="input-icon" />
            <input
              type="text"
              placeholder="Nombre de usuario"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              required
            />
          </div>

          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              placeholder="Correo electrónico"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Contraseña (mín. 8 caracteres)"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="input-group">
            <KeyRound size={18} className="input-icon" />
            <input
              type="password"
              placeholder="Confirmar contraseña"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary submit-btn"
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>
      )}

      {/* Separator */}
      <div className="divider">
        <span>O continúa con</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Steam Button */}
        <button
          className="btn btn-secondary login-btn"
          style={{
            backgroundColor: "#171a21",
            color: "white",
            borderColor: "#2a2e38",
          }}
          onClick={() => signIn("steam", { callbackUrl })}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <title>steam</title>
            <path
              fill="currentColor"
              d="M12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10c-4.6 0-8.45-3.08-9.64-7.27l3.83 1.58a2.84 2.84 0 0 0 2.78 2.27c1.56 0 2.83-1.27 2.83-2.83v-.13l3.4-2.43h.08c2.08 0 3.77-1.69 3.77-3.77s-1.69-3.77-3.77-3.77s-3.78 1.69-3.78 3.77v.05l-2.37 3.46l-.16-.01c-.59 0-1.14.18-1.59.49L2 11.2C2.43 6.05 6.73 2 12 2M8.28 17.17c.8.33 1.72-.04 2.05-.84s-.05-1.71-.83-2.04l-1.28-.53c.49-.18 1.04-.19 1.56.03c.53.21.94.62 1.15 1.15c.22.52.22 1.1 0 1.62c-.43 1.08-1.7 1.6-2.78 1.15c-.5-.21-.88-.59-1.09-1.04zm9.52-7.75c0 1.39-1.13 2.52-2.52 2.52a2.52 2.52 0 0 1-2.51-2.52a2.5 2.5 0 0 1 2.51-2.51a2.52 2.52 0 0 1 2.52 2.51m-4.4 0c0 1.04.84 1.89 1.89 1.89c1.04 0 1.88-.85 1.88-1.89s-.84-1.89-1.88-1.89c-1.05 0-1.89.85-1.89 1.89"
            />
          </svg>
          Iniciar sesión con Steam
        </button>

        {/* Discord Button */}
        <button
          className="btn btn-secondary login-btn"
          style={{
            backgroundColor: "#5865F2",
            color: "white",
            borderColor: "#5865F2",
          }}
          onClick={() => signIn("discord", { callbackUrl })}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
          </svg>
          Iniciar sesión con Discord
        </button>

        {/* Google Button */}
        <button
          className="btn btn-secondary login-btn"
          style={{
            backgroundColor: "white",
            color: "#3c4043",
            borderColor: "#dadce0",
          }}
          onClick={() => signIn("google", { callbackUrl })}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 16 16"
          >
            <title>google</title>
            <g fill="none" fillRule="evenodd" clipRule="evenodd">
              <path
                fill="#f44336"
                d="M7.209 1.061c.725-.081 1.154-.081 1.933 0a6.57 6.57 0 0 1 3.65 1.82a100 100 0 0 0-1.986 1.93q-1.876-1.59-4.188-.734q-1.696.78-2.362 2.528a78 78 0 0 1-2.148-1.658a.26.26 0 0 0-.16-.027q1.683-3.245 5.26-3.86"
                opacity=".987"
              />
              <path
                fill="#ffc107"
                d="M1.946 4.92q.085-.013.161.027a78 78 0 0 0 2.148 1.658A7.6 7.6 0 0 0 4.04 7.99q.037.678.215 1.331L2 11.116Q.527 8.038 1.946 4.92"
                opacity=".997"
              />
              <path
                fill="#448aff"
                d="M12.685 13.29a26 26 0 0 0-2.202-1.74q1.15-.812 1.396-2.228H8.122V6.713q3.25-.027 6.497.055q.616 3.345-1.423 6.032a7 7 0 0 1-.51.49"
                opacity=".999"
              />
              <path
                fill="#43a047"
                d="M4.255 9.322q1.23 3.057 4.51 2.854a3.94 3.94 0 0 0 1.718-.626q1.148.812 2.202 1.74a6.62 6.62 0 0 1-4.027 1.684a6.4 6.4 0 0 1-1.02 0Q3.82 14.524 2 11.116z"
                opacity=".993"
              />
            </g>
          </svg>
          Iniciar sesión con Google
        </button>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Recuperar Contraseña</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowForgotModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-muted" style={{ fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Ingresa tu correo electrónico. Si la cuenta existe, te enviaremos un enlace seguro para restablecer tu contraseña.
            </p>

            <form onSubmit={handleRequestReset} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="input-group">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="Tu correo electrónico"
                  className="form-input"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sendingReset}
                className="btn btn-primary submit-btn"
              >
                {sendingReset ? "Enviando correo..." : "Enviar Correo de Recuperación"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .login-card {
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          padding: 2.5rem 2rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        }
        .tab-container {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          gap: 4px;
        }
        .tab-btn {
          flex: 1;
          padding: 0.6rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-muted, #a0aec0);
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          background: var(--primary, #3b82f6);
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .tab-btn:hover:not(.active) {
          color: white;
          background: rgba(255, 255, 255, 0.1);
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
        .forgot-link {
          background: none;
          border: none;
          color: var(--primary, #3b82f6);
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }
        .forgot-link:hover {
          color: #60a5fa;
        }
        .submit-btn {
          width: 100%;
          padding: 0.8rem;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 8px;
          margin-top: 0.25rem;
          cursor: pointer;
        }
        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1.5rem 0;
          color: #6b7280;
          font-size: 0.85rem;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border, #374151);
        }
        .divider span {
          padding: 0 0.75rem;
        }
        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem;
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: 8px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          width: 100%;
          max-width: 400px;
          padding: 2rem;
        }
      `,
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="container"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header style={{ padding: "1.5rem 0" }}>
        <Link
          href="/"
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
          <ArrowLeft size={18} /> Volver al inicio
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
          <LoginContent />
        </Suspense>
      </main>
    </div>
  );
}

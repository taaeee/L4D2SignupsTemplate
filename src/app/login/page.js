"use client";

import React, { Suspense } from "react";
import { signIn } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <div className="login-card card">
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          Bienvenido a <span className="text-gradient">L4D2</span>
        </h1>
        <p className="text-muted">Inicia sesión para crear o administrar torneos</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Steam Button */}
        <button
          className="btn btn-secondary login-btn"
          style={{ backgroundColor: "#171a21", color: "white", borderColor: "#2a2e38" }}
          onClick={() => signIn("steam", { callbackUrl })}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M11.97 0C5.35 0 0 5.37 0 12c0 6.63 5.35 12 11.97 12 6.63 0 12-5.37 12-12C23.97 5.37 18.6 0 11.97 0zm-1.8 17.6c-1.3-.6-2-1.7-2-2.8 0-1.2.9-2.2 2.2-2.2.3 0 .7.1 1 .2l2.3-3.4c-.1 0-.2 0-.3 0-3.3 0-6 2.7-6 6 0 1.2.3 2.3.9 3.2L6.8 20.3c-.6.3-1.4.3-2 .2-.2-.2-.5-.4-.7-.6-.2-.2-.3-.5-.3-.7 0-.3.1-.6.3-.9l3.5-3.5c-.3-1-.5-2-.5-3.1 0-4.4 3.6-8 8-8s8 3.6 8 8c0 4.2-3.3 7.6-7.5 7.9l-2.4-1.2c.2-.2.3-.5.3-.8.1-.5-.1-1-.5-1.3z" />
          </svg>
          Iniciar sesión con Steam
        </button>

        {/* Discord Button */}
        <button
          className="btn btn-secondary login-btn"
          style={{ backgroundColor: "#5865F2", color: "white", borderColor: "#5865F2" }}
          onClick={() => signIn("discord", { callbackUrl })}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
          </svg>
          Iniciar sesión con Discord
        </button>

        {/* Google Button */}
        <button
          className="btn btn-secondary login-btn"
          style={{ backgroundColor: "white", color: "#3c4043", borderColor: "#dadce0" }}
          onClick={() => signIn("google", { callbackUrl })}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44-3.96 0-7.14-3.26-7.14-7.27s3.18-7.27 7.14-7.27c1.78 0 3.4.67 4.66 1.88l2.13-2.13C17.2 2.76 14.86 1.5 12.18 1.5 6.38 1.5 1.68 6.2 1.68 12s4.7 10.5 10.5 10.5c5.38 0 10.35-3.88 10.35-10.5 0-.71-.09-1.42-.23-2.13z" fill="#4285F4"/>
            <path d="M5.38 14.73L2.24 17.2C3.89 20.46 7.24 22.5 11.03 22.5c2.65 0 4.88-.88 6.5-2.38l-3.04-2.36c-.88.59-2.02.94-3.46.94-2.65 0-4.9-1.78-5.71-4.17L5.38 14.73z" fill="#34A853"/>
            <path d="M11.03 1.5c1.9 0 3.6.65 4.95 1.9l2.2-2.2C16.48-.12 13.93-1.05 11.03-1.05 7.24-1.05 3.89.99 2.24 4.25l3.14 2.47c.81-2.43 3.06-4.22 5.71-4.22z" fill="#EA4335" transform="translate(0, 1.05)" />
            <path d="M4.66 10.45c-.21.62-.32 1.28-.32 1.95 0 .67.11 1.33.32 1.95l-3.14 2.47C.55 15.35 0 13.73 0 12c0-1.73.55-3.35 1.52-4.82l3.14 3.27z" fill="#FBBC05"/>
          </svg>
          Iniciar sesión con Google
        </button>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .login-card {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          padding: 3rem 2rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          width: 100%;
          padding: 0.8rem;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `}} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="container" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1.5rem 0" }}>
        <Link href="/" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", border: "none", background: "transparent" }}>
          <ArrowLeft size={18} /> Volver al inicio
        </Link>
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Suspense fallback={<div className="card">Cargando opciones...</div>}>
          <LoginContent />
        </Suspense>
      </main>
    </div>
  );
}

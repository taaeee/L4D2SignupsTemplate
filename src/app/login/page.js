"use client";

import React, { Suspense } from "react";

import { signIn } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
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
        <p className="text-muted">
          Inicia sesión para crear o administrar torneos
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <title xmlns="">steam</title>
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
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
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
            width="24"
            height="24"
            viewBox="0 0 16 16"
          >
            <title xmlns="">google</title>
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

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
        <Suspense fallback={<LoadingSpinner text="Cargando opciones..." />}>
          <LoginContent />
        </Suspense>
      </main>
    </div>
  );
}

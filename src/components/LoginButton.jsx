"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <button className="btn btn-secondary" disabled>Cargando...</button>;
  }

  if (session) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <img 
          src={session.user.image || `https://ui-avatars.com/api/?name=${session.user.name}`} 
          alt="Avatar" 
          style={{ width: "40px", height: "40px", borderRadius: "50%" }}
        />
        <div>
          <p style={{ margin: 0, fontWeight: "bold" }}>{session.user.name}</p>
        </div>
        <button className="btn btn-danger" onClick={() => signOut()}>
          Cerrar Sesión
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
      <button className="btn btn-primary" onClick={() => signIn("steam")}>
        Iniciar con Steam
      </button>
      <button className="btn btn-secondary" onClick={() => signIn("discord")}>
        Iniciar con Discord
      </button>
      <button className="btn btn-secondary" style={{ backgroundColor: "#db4437", color: "white" }} onClick={() => signIn("google")}>
        Iniciar con Google
      </button>
    </div>
  );
}

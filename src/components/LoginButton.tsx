"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <button className="btn btn-secondary" disabled style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LoadingSpinner size={16} text="" inline={true} /> Cargando...</button>;
  }

  if (session) {
    return null;
  }

  return (
    <Link href="/login" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
      <LogIn size={18} /> Iniciar Sesión
    </Link>
  );
}

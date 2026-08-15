"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Swords, Map, Menu, X, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const navItems = [
    { name: "Torneos", href: "/torneos", icon: Trophy },
    { name: "Matches", href: "/matches", icon: Swords },
    { name: "Map Veto", href: "/map-veto", icon: Map },
  ];

  return (
    <aside
      style={{
        width: isExpanded ? "250px" : "80px",
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(10px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
        position: "sticky",
        top: 0,
        height: "100vh",
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isExpanded ? "flex-end" : "center",
          padding: isExpanded ? "1.5rem" : "0",
          height: "80px",
        }}
      >
        <button
          className="btn-icon"
          onClick={toggleSidebar}
          style={{
            background: "transparent",
            color: "var(--primary)",
          }}
        >
          {isExpanded ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      <nav style={{ flex: 1, padding: "1rem 0" }}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isExpanded ? "flex-start" : "center",
                padding: isExpanded ? "1rem 1.5rem" : "1rem 0",
                textDecoration: "none",
                color: isActive ? "#fff" : "var(--muted)",
                background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                borderLeft: isActive
                  ? "4px solid var(--primary)"
                  : "4px solid transparent",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              <div
                style={{
                  minWidth: "40px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <item.icon size={24} color={isActive ? "var(--primary)" : "currentColor"} />
              </div>
              <span
                style={{
                  marginLeft: isExpanded ? "1rem" : "0",
                  fontSize: "1.1rem",
                  fontWeight: isActive ? "bold" : "normal",
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : "0",
                  overflow: "hidden",
                  transition: "opacity 0.3s ease, margin 0.3s ease",
                }}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {session && (
        <div
          style={{
            padding: isExpanded ? "1.5rem" : "1.5rem 0",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <Link href="/settings" style={{ display: "flex", alignItems: "center", gap: isExpanded ? "1rem" : "0", width: "100%", justifyContent: isExpanded ? "flex-start" : "center", textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <img
              src={session.user?.image || `https://ui-avatars.com/api/?name=${session.user?.name}`}
              alt="Avatar"
              style={{ width: "40px", height: "40px", borderRadius: "50%", minWidth: "40px", border: "2px solid transparent", transition: "border-color 0.2s" }}
            />
            {isExpanded && (
              <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                <p style={{ margin: 0, fontWeight: "bold", fontSize: "0.9rem", transition: "color 0.2s" }}
                >{session.user?.name}</p>
              </div>
            )}
          </Link>
          
          <button
            className="btn btn-danger"
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              width: isExpanded ? "100%" : "40px",
              height: "40px",
              padding: isExpanded ? "0.5rem" : "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
            {isExpanded && <span>Cerrar Sesión</span>}
          </button>
        </div>
      )}
    </aside>
  );
}

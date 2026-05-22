"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Map, Menu, X } from "lucide-react";

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const navItems = [
    { name: "Torneos", href: "/torneos", icon: Trophy },
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
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                }
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
    </aside>
  );
}

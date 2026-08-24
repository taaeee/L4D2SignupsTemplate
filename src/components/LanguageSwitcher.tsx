"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  variant?: "pill" | "compact" | "dropdown";
  className?: string;
  style?: React.CSSProperties;
}

export default function LanguageSwitcher({
  variant = "pill",
  className = "",
  style,
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === "es" ? "en" : "es");
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        title={language === "es" ? "Cambiar a Inglés" : "Switch to Spanish"}
        className={`lang-btn-compact ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "8px",
          padding: "0.4rem 0.65rem",
          color: "var(--text-main, #fff)",
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
          ...style,
        }}
      >
        <Globe size={14} className="text-muted" />
        <span>{language.toUpperCase()}</span>
      </button>
    );
  }

  return (
    <div
      className={`lang-switcher-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "rgba(0, 0, 0, 0.35)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "9999px",
        padding: "2px",
        backdropFilter: "blur(8px)",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setLanguage("es")}
        className="lang-option-btn"
        style={{
          padding: "0.3rem 0.75rem",
          border: "none",
          borderRadius: "9999px",
          background: language === "es" ? "var(--primary, #6FAF3A)" : "transparent",
          color: language === "es" ? "#000" : "var(--text-muted, #9ca3af)",
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: language === "es" ? "0 2px 8px rgba(111, 175, 58, 0.3)" : "none",
        }}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className="lang-option-btn"
        style={{
          padding: "0.3rem 0.75rem",
          border: "none",
          borderRadius: "9999px",
          background: language === "en" ? "var(--primary, #6FAF3A)" : "transparent",
          color: language === "en" ? "#000" : "var(--text-muted, #9ca3af)",
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: language === "en" ? "0 2px 8px rgba(111, 175, 58, 0.3)" : "none",
        }}
      >
        EN
      </button>
    </div>
  );
}

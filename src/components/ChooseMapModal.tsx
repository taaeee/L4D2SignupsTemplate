"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Map as MapIcon, X, Search, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export const DEFAULT_OFFICIAL_MAPS = [
  { name: "Dead Center", type: "official" as const },
  { name: "Dark Carnival", type: "official" as const },
  { name: "Swamp Fever", type: "official" as const },
  { name: "Hard Rain", type: "official" as const },
  { name: "The Parish", type: "official" as const },
  { name: "The Passing", type: "official" as const },
  { name: "The Sacrifice", type: "official" as const },
  { name: "No Mercy", type: "official" as const },
  { name: "Crash Course", type: "official" as const },
  { name: "Death Toll", type: "official" as const },
  { name: "Dead Air", type: "official" as const },
  { name: "Blood Harvest", type: "official" as const },
  { name: "Cold Stream", type: "official" as const },
  { name: "The Last Stand", type: "official" as const },
];

export const DEFAULT_CUSTOM_MAPS = [
  { name: "Dark Wood", type: "custom" as const },
  { name: "Suicide Blitz 2", type: "custom" as const },
  { name: "Detour Ahead", type: "custom" as const },
  { name: "Urban Flight", type: "custom" as const },
  { name: "I Hate Mountains 2", type: "custom" as const },
  { name: "Warcelona", type: "custom" as const },
  { name: "Yama", type: "custom" as const },
  { name: "Day Break", type: "custom" as const },
  { name: "Dies Scraper Redux", type: "custom" as const },
  { name: "Fairfield Terror", type: "custom" as const },
  { name: "Plan B", type: "custom" as const },
  { name: "Questionable Ethics", type: "custom" as const },
];

interface ChooseMapModalProps {
  isOpen: boolean;
  match: any | null;
  onClose: () => void;
  onSave: (selectedMaps: string[]) => Promise<void> | void;
  isSaving?: boolean;
  availableMaps?: any[];
}

export default function ChooseMapModal({
  isOpen,
  match,
  onClose,
  onSave,
  isSaving = false,
  availableMaps = [],
}: ChooseMapModalProps) {
  const { t } = useTranslation();
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "official" | "custom">("all");
  const [customInput, setCustomInput] = useState<string>("");

  useEffect(() => {
    if (match) {
      setSelectedMaps(Array.isArray(match.selected_maps) ? [...match.selected_maps] : []);
      setSearchQuery("");
      setTypeFilter("all");
      setCustomInput("");
    }
  }, [match, isOpen]);

  const combinedMapCatalog = useMemo(() => {
    const mapSet = new Map<string, { name: string; type: "official" | "custom"; imageUrl?: string }>();

    DEFAULT_OFFICIAL_MAPS.forEach((m) =>
      mapSet.set(m.name.toUpperCase(), { name: m.name, type: "official" })
    );
    DEFAULT_CUSTOM_MAPS.forEach((m) =>
      mapSet.set(m.name.toUpperCase(), { name: m.name, type: "custom" })
    );

    if (Array.isArray(availableMaps)) {
      availableMaps.forEach((m: any) => {
        const type = m.type === "official" ? "official" : "custom";
        mapSet.set(m.name.toUpperCase(), { name: m.name, type, imageUrl: m.imageUrl });
      });
    }

    return Array.from(mapSet.values());
  }, [availableMaps]);

  if (!isOpen || !match) return null;

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selectedMaps.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedMaps((prev) => [...prev, trimmed]);
      setCustomInput("");
    }
  };

  const handleToggleMap = (mapName: string) => {
    if (selectedMaps.some((m) => m.toLowerCase() === mapName.toLowerCase())) {
      setSelectedMaps((prev) => prev.filter((m) => m.toLowerCase() !== mapName.toLowerCase()));
    } else {
      setSelectedMaps((prev) => [...prev, mapName]);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        className="card modal-card"
        style={{
          width: "100%",
          maxWidth: "580px",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          background: "#14161A",
          border: "1px solid var(--border-light)",
          borderRadius: "12px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapIcon size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{t("modals.choose_maps_title")}</h3>
          </div>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <p className="text-muted text-sm" style={{ margin: 0 }}>
          {t("matches.round")}: <strong>{match.team1?.name || "Equipo 1"} vs {match.team2?.name || "Equipo 2"}</strong>
        </p>

        {/* Selected Maps Chips */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: "600" }}>
              {t("modals.selected_maps_label")} ({selectedMaps.length})
            </label>
            {selectedMaps.length > 0 && (
              <button
                type="button"
                className="text-xs text-muted"
                style={{ background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => setSelectedMaps([])}
              >
                {t("modals.clear_all")}
              </button>
            )}
          </div>

          {selectedMaps.length > 0 ? (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", padding: "0.5rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              {selectedMaps.map((mapName, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.55rem",
                    borderRadius: "4px",
                    background: "rgba(111, 175, 58, 0.18)",
                    color: "var(--primary)",
                    border: "1px solid rgba(111, 175, 58, 0.35)",
                    fontWeight: "bold",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {mapName}
                  <button
                    type="button"
                    onClick={() => setSelectedMaps((prev) => prev.filter((m) => m !== mapName))}
                    style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "var(--primary)", display: "flex" }}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted text-xs" style={{ margin: 0, fontStyle: "italic" }}>
              {t("modals.no_maps_selected_yet")}
            </p>
          )}
        </div>

        {/* Search & Type Filter Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {/* Search */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", color: "var(--muted)", pointerEvents: "none" }} />
            <input
              type="text"
              className="input-base text-sm"
              placeholder={t("modals.search_map_name_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", paddingLeft: "2.1rem", paddingRight: searchQuery ? "2rem" : "0.75rem", paddingBlock: "0.45rem" }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: "8px", background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Tabs: Todos, Oficiales, Customs */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {(["all", "official", "custom"] as const).map((type) => {
              const isActive = typeFilter === type;
              const label = type === "all" ? t("map_veto.filter_all") : type === "official" ? t("map_veto.filter_official") : t("map_veto.filter_custom");
              return (
                <button
                  key={type}
                  type="button"
                  className="btn text-xs"
                  style={{
                    padding: "0.25rem 0.65rem",
                    borderRadius: "var(--radius-md)",
                    background: isActive ? "var(--primary-glow)" : "rgba(255, 255, 255, 0.05)",
                    color: isActive ? "var(--primary)" : "var(--muted)",
                    border: isActive ? "1px solid rgba(111, 175, 58, 0.4)" : "1px solid var(--border-light)",
                    fontWeight: isActive ? "bold" : "normal",
                  }}
                  onClick={() => setTypeFilter(type)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Available Maps Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "0.45rem",
            maxHeight: "190px",
            overflowY: "auto",
            padding: "0.5rem",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "8px",
            border: "1px solid var(--border-light)",
          }}
        >
          {(() => {
            const filtered = combinedMapCatalog.filter((m) => {
              if (typeFilter !== "all" && m.type !== typeFilter) return false;
              if (searchQuery.trim() && !m.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
                return false;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "1.5rem 0" }} className="text-muted text-xs">
                  {t("modals.no_maps_found_filter")}
                </div>
              );
            }

            return filtered.map((mapItem) => {
              const isSelected = selectedMaps.some((sm) => sm.toLowerCase() === mapItem.name.toLowerCase());
              return (
                <button
                  key={mapItem.name}
                  type="button"
                  className="btn text-xs"
                  style={{
                    padding: "0.4rem 0.6rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "0.2rem",
                    background: isSelected ? "rgba(111, 175, 58, 0.22)" : "rgba(255, 255, 255, 0.04)",
                    border: isSelected ? "1px solid var(--primary)" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    textAlign: "left",
                  }}
                  onClick={() => handleToggleMap(mapItem.name)}
                >
                  <span style={{ fontWeight: "700", color: isSelected ? "var(--primary)" : "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                    {mapItem.name}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: mapItem.type === "official" ? "var(--primary)" : "#60a5fa", opacity: 0.85 }}>
                    {mapItem.type === "official" ? t("map_veto.filter_official") : t("map_veto.filter_custom")}
                  </span>
                </button>
              );
            });
          })()}
        </div>

        {/* Add Custom Map Input */}
        <div>
          <label style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
            {t("modals.add_custom_map_label")}
          </label>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <input
              type="text"
              className="input-base text-sm"
              placeholder="Ej. Dark Wood, Yama, etc..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              style={{ flex: 1, paddingBlock: "0.4rem" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary text-sm"
              style={{ padding: "0.4rem 0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
              onClick={handleAddCustom}
            >
              <Plus size={14} /> {t("common.add")}
            </button>
          </div>
        </div>

        {/* Action Footer */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onSave(selectedMaps)}
            disabled={isSaving}
          >
            {isSaving ? t("common.saving") : t("modals.save_maps_btn")}
          </button>
        </div>
      </div>
    </div>
  );
}

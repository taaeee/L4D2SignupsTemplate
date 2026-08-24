"use client";

import React, { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { LinkIcon, Swords, ArrowRight, ShieldCheck, Check, Sparkles, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

let cachedTournaments: any = null;
let cachedMaps: any = null;

function MapVetoDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  // URL Query Params
  const queryMatchId = searchParams.get("matchId");
  const queryTournamentId = searchParams.get("tournamentId");
  const queryTeamA = searchParams.get("teamA");
  const queryTeamB = searchParams.get("teamB");
  const queryFormat = searchParams.get("format");
  const queryMaps = searchParams.get("maps");

  const [tournaments, setTournaments] = useState<any[]>(cachedTournaments || []);
  const [selectedTournament, setSelectedTournament] = useState(queryTournamentId || "");
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamA, setSelectedTeamA] = useState(queryTeamA || "");
  const [selectedTeamB, setSelectedTeamB] = useState(queryTeamB || "");
  const [format, setFormat] = useState(
    queryFormat === "bo2" ? "to2" : queryFormat || "bo1"
  );
  const [linkedMatchId, setLinkedMatchId] = useState<string | null>(queryMatchId || null);
  const [isLoading, setIsLoading] = useState(!cachedTournaments || !cachedMaps);

  const [allMaps, setAllMaps] = useState<any[]>(cachedMaps || []);
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  const [searchMap, setSearchMap] = useState("");
  const [mapFilter, setMapFilter] = useState("all");
  const [randomCount, setRandomCount] = useState(7);

  const [generatedVeto, setGeneratedVeto] = useState<any>(null);
  const [hoveredAvailableMap, setHoveredAvailableMap] = useState<string | null>(null);
  const [hoveredSelectedMap, setHoveredSelectedMap] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (session?.user?.id) {
      fetchTournaments();
      fetchMaps();
      cleanupOldVetoes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, status]);

  // If maps are passed in query params
  useEffect(() => {
    if (queryMaps) {
      try {
        const parsed = decodeURIComponent(queryMaps)
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
        if (parsed.length > 0) {
          setSelectedMaps(parsed);
        }
      } catch (e) {
        console.warn("Could not parse query maps:", e);
      }
    }
  }, [queryMaps]);

  // When tournament selection changes or queryTournamentId changes
  useEffect(() => {
    if (selectedTournament) {
      fetchTeams(selectedTournament);
    } else {
      setTeams([]);
      setSelectedTeamA("");
      setSelectedTeamB("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournament]);

  const cleanupOldVetoes = async () => {
    try {
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      await supabase
        .from("map_vetoes")
        .delete()
        .lt("created_at", twentyFourHoursAgo);
    } catch (e) {
      console.error("Error cleaning up old vetoes:", e);
    }
  };

  const fetchTournaments = async () => {
    if (!cachedTournaments) setIsLoading(true);

    try {
      // 1. Fetch Tournaments (created)
      const { data: createdTournaments } = await supabase
        .from("tournaments")
        .select("id, name, creator_id, moderators")
        .eq("creator_id", session!.user!.id);

      // 2. Fetch Tournaments (moderated)
      const { data: moderatedTournaments } = await supabase
        .from("tournaments")
        .select("id, name, creator_id, moderators")
        .contains("moderators", JSON.stringify([session!.user!.id]));

      // 3. If queryTournamentId is passed and not in user list (e.g. caster or player creating veto)
      let queryTourney: any[] = [];
      if (queryTournamentId) {
        const { data: specificTourney } = await supabase
          .from("tournaments")
          .select("id, name, creator_id, moderators")
          .eq("id", queryTournamentId);
        if (specificTourney) {
          queryTourney = specificTourney;
        }
      }

      const allTournaments = [
        ...(createdTournaments || []),
        ...(moderatedTournaments || []),
        ...queryTourney,
      ];

      // Remove duplicates
      const uniqueTournaments = Array.from(
        new Map(allTournaments.map((t) => [t.id, t])).values()
      );

      cachedTournaments = uniqueTournaments;
      setTournaments(uniqueTournaments);

      if (queryTournamentId) {
        setSelectedTournament(queryTournamentId);
      }
    } catch (e) {
      console.error("Error loading tournaments for veto:", e);
    } finally {
      if (cachedMaps) setIsLoading(false);
    }
  };

  const fetchTeams = async (tournamentId: string) => {
    const { data } = await supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("tournament_id", tournamentId)
      .eq("status", "accepted");

    if (data) {
      setTeams(data);
      // If query teams were specified, pre-select them
      if (queryTeamA && data.some((t) => t.id === queryTeamA)) {
        setSelectedTeamA(queryTeamA);
      }
      if (queryTeamB && data.some((t) => t.id === queryTeamB)) {
        setSelectedTeamB(queryTeamB);
      }
    }
  };

  const fetchMaps = async () => {
    try {
      const res = await fetch("/api/maps");
      const data = await res.json();
      const sortedMaps = data.all.sort((a: any, b: any) =>
        a.name.localeCompare(b.name)
      );
      cachedMaps = sortedMaps;
      setAllMaps(sortedMaps);

      // If no query maps were passed and selectedMaps is empty, select all default official maps
      if (!queryMaps && selectedMaps.length === 0) {
        const official = sortedMaps
          .filter((m: any) => m.type === "official")
          .map((m: any) => m.name);
        if (official.length > 0) {
          setSelectedMaps(official);
        }
      }
    } catch (e) {
      console.error("Error fetching maps", e);
    } finally {
      if (cachedTournaments) setIsLoading(false);
    }
  };

  const handleRandomPool = () => {
    const filtered = allMaps.filter(
      (map: any) => mapFilter === "all" || map.type === mapFilter
    );
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, randomCount).map((m: any) => m.name);
    setSelectedMaps(selected);
  };

  const generateToken = () => Math.random().toString(36).substring(2, 11);

  const handleCreateVeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedTournament ||
      !selectedTeamA ||
      !selectedTeamB ||
      selectedTeamA === selectedTeamB
    ) {
      toast.error(t("map_veto.error_select_two_teams"));
      return;
    }

    const teamAToken = generateToken();
    const teamBToken = generateToken();

    try {
      const visibleMaps = allMaps.filter(
        (map: any) =>
          map.name.toLowerCase().includes(searchMap.toLowerCase()) &&
          (mapFilter === "all" || map.type === mapFilter)
      );

      const poolMaps = visibleMaps
        .filter((m: any) => selectedMaps.includes(m.name))
        .map((m: any) => ({
          ...m,
          status: "available",
        }));

      if (poolMaps.length === 0) {
        toast.error(t("map_veto.error_no_maps_in_pool"));
        return;
      }

      const initialState = {
        status: "in_progress",
        currentTurn: selectedTeamA,
        history: [],
        maps: poolMaps,
      };

      const { data, error } = await supabase
        .from("map_vetoes")
        .insert({
          tournament_id: selectedTournament,
          team_a_id: selectedTeamA,
          team_b_id: selectedTeamB,
          format: format,
          team_a_token: teamAToken,
          team_b_token: teamBToken,
          state: initialState,
          match_id: linkedMatchId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // If linked to a match, update the match's map_veto_id
      if (linkedMatchId) {
        await supabase
          .from("matches")
          .update({ map_veto_id: data.id })
          .eq("id", linkedMatchId);
      }

      setGeneratedVeto(data);
      toast.success(t("map_veto.veto_created_success"));
    } catch (e) {
      console.error("Veto creation error:", e);
      toast.error(
        `Error: ${(e as any).message || (e as any).details || JSON.stringify(e)}`
      );
    }
  };

  const copyLink = (path: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
    toast.success(t("common.copied_to_clipboard"));
  };

  if (isLoading && (!cachedTournaments || !cachedMaps)) {
    return <LoadingSpinner fullHeight={true} />;
  }

  const teamAName = teams.find((tItem) => tItem.id === selectedTeamA)?.name || "Equipo A";
  const teamBName = teams.find((tItem) => tItem.id === selectedTeamB)?.name || "Equipo B";

  return (
    <div className="container" style={{ maxWidth: "900px", padding: "2rem 1rem" }}>
      <header style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: "0 0 0.5rem" }}>
          <span className="text-gradient">Map Veto</span> {t("map_veto.creator_title")}
        </h1>
        <p className="text-muted text-sm" style={{ margin: 0 }}>
          {t("map_veto.creator_subtitle")}
        </p>
      </header>

      {/* Linked Match Info Banner */}
      {linkedMatchId && (
        <div
          style={{
            background: "rgba(111, 175, 58, 0.1)",
            border: "1px solid rgba(111, 175, 58, 0.3)",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                background: "rgba(111, 175, 58, 0.2)",
                padding: "0.5rem",
                borderRadius: "8px",
                display: "flex",
              }}
            >
              <Swords size={20} color="var(--primary)" />
            </div>
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  color: "var(--primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {t("map_veto.linked_match")}
              </span>
              <h4 style={{ margin: 0, fontSize: "1rem" }}>
                {teamAName} vs {teamBName}
              </h4>
              <p className="text-muted text-xs" style={{ margin: 0 }}>
                {t("map_veto.linked_match_desc")}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary text-xs"
            onClick={() => setLinkedMatchId(null)}
            style={{ padding: "0.3rem 0.6rem" }}
          >
            {t("map_veto.unlink")}
          </button>
        </div>
      )}

      {!generatedVeto ? (
        <form onSubmit={handleCreateVeto} className="card" style={{ padding: "1.75rem" }}>
          {/* Tournament Selection */}
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.4rem" }}>
              {t("map_veto.select_tournament_label")}
            </label>
            <select
              className="input-base"
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              required
              style={{ width: "100%", padding: "0.6rem" }}
            >
              <option value="">{t("map_veto.select_tournament_placeholder")}</option>
              {tournaments.map((tItem: any) => (
                <option key={tItem.id} value={tItem.id}>
                  {tItem.name}
                </option>
              ))}
            </select>
          </div>

          {/* Teams Selection */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <div className="form-group" style={{ flex: "1 1 250px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.4rem" }}>
                {t("map_veto.team_a_label")}
              </label>
              <select
                className="input-base"
                value={selectedTeamA}
                onChange={(e) => setSelectedTeamA(e.target.value)}
                required
                disabled={!selectedTournament || teams.length === 0}
                style={{ width: "100%", padding: "0.6rem" }}
              >
                <option value="">{t("map_veto.select_team_a")}</option>
                {teams.map((tItem: any) => (
                  <option key={tItem.id} value={tItem.id}>
                    {tItem.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: "1 1 250px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.4rem" }}>
                {t("map_veto.team_b_label")}
              </label>
              <select
                className="input-base"
                value={selectedTeamB}
                onChange={(e) => setSelectedTeamB(e.target.value)}
                required
                disabled={!selectedTournament || teams.length === 0}
                style={{ width: "100%", padding: "0.6rem" }}
              >
                <option value="">{t("map_veto.select_team_b")}</option>
                {teams.map((tItem: any) => (
                  <option key={tItem.id} value={tItem.id}>
                    {tItem.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Format Selection */}
          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.4rem" }}>
              {t("map_veto.format_label")}
            </label>
            <select
              className="input-base"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              style={{ width: "100%", padding: "0.6rem" }}
            >
              <option value="bo1">{t("map_veto.format_bo1")}</option>
              <option value="to2">{t("map_veto.format_to2")}</option>
              <option value="bo3">{t("map_veto.format_bo3")}</option>
              <option value="bo5">{t("map_veto.format_bo5")}</option>
            </select>
          </div>

          {/* Map Pool Configuration */}
          <div style={{ marginBottom: "2rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <label style={{ margin: 0, fontWeight: "bold", fontSize: "0.95rem" }}>
                  Map Pool ({selectedMaps.length} {t("map_veto.selected_maps_count")})
                </label>
                <p className="text-muted text-xs" style={{ margin: "0.2rem 0 0" }}>
                  {t("map_veto.map_pool_desc")}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary text-xs"
                  onClick={() =>
                    setSelectedMaps(
                      allMaps
                        .filter(
                          (map: any) =>
                            map.name.toLowerCase().includes(searchMap.toLowerCase()) &&
                            (mapFilter === "all" || map.type === mapFilter)
                        )
                        .map((m: any) => m.name)
                    )
                  }
                >
                  {t("map_veto.select_all")}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary text-xs"
                  onClick={() => setSelectedMaps([])}
                >
                  {t("map_veto.clear_pool")}
                </button>
              </div>
            </div>

            {/* Random Pool Generator Tool */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                flexWrap: "wrap",
              }}
            >
              <label style={{ margin: 0, fontSize: "0.85rem" }}>{t("map_veto.generate_random")}:</label>
              <input
                type="number"
                className="input-base"
                value={randomCount}
                onChange={(e) =>
                  setRandomCount(Math.max(1, parseInt(e.target.value) || 1))
                }
                style={{ width: "70px", textAlign: "center", padding: "0.3rem" }}
                min="1"
                max={allMaps.length}
              />
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={handleRandomPool}
              >
                {t("map_veto.generate_pool_btn")}
              </button>
              <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>
                {t("map_veto.total_available")}: {allMaps.filter((map: any) => mapFilter === "all" || map.type === mapFilter).length} {t("map_veto.maps_unit")}
              </span>
            </div>

            {/* Search and Filters */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <input
                type="text"
                className="input-base"
                placeholder={t("map_veto.search_map_placeholder")}
                value={searchMap}
                onChange={(e) => setSearchMap(e.target.value)}
                style={{ flex: "1 1 200px", padding: "0.5rem" }}
              />
              <select
                className="input-base"
                value={mapFilter}
                onChange={(e) => setMapFilter(e.target.value)}
                style={{ minWidth: "150px", padding: "0.5rem" }}
              >
                <option value="all">{t("map_veto.filter_all")}</option>
                <option value="official">{t("map_veto.filter_official")}</option>
                <option value="custom">{t("map_veto.filter_custom")}</option>
              </select>
            </div>

            {/* Available & Selected Maps Columns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              {/* Available Maps Panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--primary)" }}>
                  {t("map_veto.available_maps_header")}
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                    gap: "0.5rem",
                    maxHeight: "260px",
                    overflowY: "auto",
                    padding: "0.75rem",
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-light)",
                    alignContent: "start",
                  }}
                >
                  {allMaps
                    .filter((map: any) => !selectedMaps.includes(map.name))
                    .filter(
                      (map: any) =>
                        map.name.toLowerCase().includes(searchMap.toLowerCase()) &&
                        (mapFilter === "all" || map.type === mapFilter)
                    )
                    .map((map: any) => (
                      <button
                        key={map.name}
                        type="button"
                        onClick={() => {
                          setSelectedMaps([...selectedMaps, map.name]);
                          setHoveredAvailableMap(null);
                        }}
                        style={{
                          padding: "0.45rem 0.6rem",
                          textAlign: "center",
                          background:
                            hoveredAvailableMap === map.name
                              ? "rgba(111, 175, 58, 0.2)"
                              : "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          color: "var(--text-main)",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={() => setHoveredAvailableMap(map.name)}
                        onMouseLeave={() => setHoveredAvailableMap(null)}
                      >
                        + {map.name}
                      </button>
                    ))}
                  {allMaps.filter((map: any) => !selectedMaps.includes(map.name)).length === 0 && (
                    <p className="text-muted text-xs" style={{ gridColumn: "1 / -1", textAlign: "center", margin: "1rem 0" }}>
                      {t("map_veto.all_maps_selected")}
                    </p>
                  )}
                </div>
              </div>

              {/* Selected Maps Panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--success)" }}>
                  {t("map_veto.active_pool_header")} ({selectedMaps.length} {t("map_veto.maps_unit")})
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                    gap: "0.5rem",
                    maxHeight: "260px",
                    overflowY: "auto",
                    padding: "0.75rem",
                    background: "rgba(34, 197, 94, 0.05)",
                    borderRadius: "8px",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    alignContent: "start",
                  }}
                >
                  {selectedMaps.map((mapName) => (
                    <button
                      key={mapName}
                      type="button"
                      onClick={() => {
                        setSelectedMaps(selectedMaps.filter((m) => m !== mapName));
                        setHoveredSelectedMap(null);
                      }}
                      style={{
                        padding: "0.45rem 0.6rem",
                        textAlign: "center",
                        background:
                          hoveredSelectedMap === mapName
                            ? "rgba(239, 68, 68, 0.8)"
                            : "var(--primary)",
                        border: "none",
                        color: "#000",
                        fontWeight: "bold",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={() => setHoveredSelectedMap(mapName)}
                      onMouseLeave={() => setHoveredSelectedMap(null)}
                      title={t("map_veto.click_to_remove")}
                    >
                      {hoveredSelectedMap === mapName ? `x ${mapName}` : mapName}
                    </button>
                  ))}
                  {selectedMaps.length === 0 && (
                    <p className="text-muted text-xs" style={{ gridColumn: "1 / -1", textAlign: "center", margin: "1rem 0" }}>
                      {t("map_veto.no_maps_in_pool")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "0.8rem",
              fontSize: "1.1rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <Sparkles size={20} /> {t("map_veto.generate_veto_links_btn")}
          </button>
        </form>
      ) : (
        /* Veto Result Links */
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "2rem" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
              }}
            >
              <Check size={28} color="var(--success)" />
            </div>
            <h2 style={{ color: "var(--success)", margin: "0 0 0.5rem" }}>{t("map_veto.veto_success_title")}</h2>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              {t("map_veto.veto_success_desc")}
            </p>
          </div>

          {/* Spectator Link */}
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--border-light)" }}>
            <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>{t("map_veto.spectator_link_title")}</h4>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                readOnly
                className="input-base"
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/map-veto/${generatedVeto.id}`}
                style={{ flex: 1, fontSize: "0.85rem" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => copyLink(`/map-veto/${generatedVeto.id}`)}
                style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <LinkIcon size={14} /> {t("common.copy")}
              </button>
            </div>
          </div>

          {/* Captain A Link */}
          <div
            style={{
              background: "rgba(0,0,0,0.3)",
              padding: "1.25rem",
              borderRadius: "10px",
              borderLeft: "4px solid var(--primary)",
              borderTop: "1px solid var(--border-light)",
              borderRight: "1px solid var(--border-light)",
              borderBottom: "1px solid var(--border-light)",
            }}
          >
            <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", color: "var(--primary)" }}>
              {t("map_veto.captain_of")} {teamAName} ({t("map_veto.turn")} 1)
            </h4>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                readOnly
                className="input-base"
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/map-veto/${generatedVeto.id}?token=${generatedVeto.team_a_token}`}
                style={{ flex: 1, fontSize: "0.85rem" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => copyLink(`/map-veto/${generatedVeto.id}?token=${generatedVeto.team_a_token}`)}
                style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <LinkIcon size={14} /> {t("common.copy")}
              </button>
            </div>
          </div>

          {/* Captain B Link */}
          <div
            style={{
              background: "rgba(0,0,0,0.3)",
              padding: "1.25rem",
              borderRadius: "10px",
              borderLeft: "4px solid var(--warning)",
              borderTop: "1px solid var(--border-light)",
              borderRight: "1px solid var(--border-light)",
              borderBottom: "1px solid var(--border-light)",
            }}
          >
            <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", color: "var(--warning)" }}>
              {t("map_veto.captain_of")} {teamBName} ({t("map_veto.turn")} 2)
            </h4>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                readOnly
                className="input-base"
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/map-veto/${generatedVeto.id}?token=${generatedVeto.team_b_token}`}
                style={{ flex: 1, fontSize: "0.85rem" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => copyLink(`/map-veto/${generatedVeto.id}?token=${generatedVeto.team_b_token}`)}
                style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <LinkIcon size={14} /> {t("common.copy")}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => router.push(`/map-veto/${generatedVeto.id}`)}
            >
              {t("map_veto.go_to_veto_room")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setGeneratedVeto(null)}
            >
              {t("map_veto.create_another_veto")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MapVetoDashboard() {
  return (
    <Suspense fallback={<LoadingSpinner fullHeight={true} />}>
      <MapVetoDashboardContent />
    </Suspense>
  );
}

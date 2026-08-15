"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Swords,
  Trophy,
  Radio,
  Clock,
  CheckCircle2,
  Search,
  Tv,
  ExternalLink,
  User,
  X,
  Play,
  Calendar,
  AlertCircle,
  MapPin,
  Edit,
  ShieldCheck,
  Flame,
  Shuffle
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";

// Twitch SVG Icon
const TwitchIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
  </svg>
);

let cachedMatchesData: {
  matches: any[];
  tournaments: any[];
  casters: any[];
} | null = null;

// Helper to determine accurate status
export const getMatchStatus = (m: any): "live" | "completed" | "upcoming" => {
  if (m.status === "in_progress") return "live";

  // Only matches with a real marked score / result are completed
  const hasScore =
    m.score1 !== null &&
    m.score2 !== null &&
    (m.score1 > 0 || m.score2 > 0);

  const isCompleted =
    hasScore ||
    (m.status === "completed" && m.winner_id && (m.score1 > 0 || m.score2 > 0));

  return isCompleted ? "completed" : "upcoming";
};

// Default competitive maps list
const COMPETITIVE_MAPS = [
  "Dead Center",
  "Dark Carnival",
  "Swamp Fever",
  "Hard Rain",
  "The Parish",
  "The Passing",
  "No Mercy",
  "Blood Harvest",
  "Crash Course",
  "Death Toll",
  "Cold Stream",
  "The Sacrifice"
];

export default function MatchesPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [matches, setMatches] = useState<any[]>(cachedMatchesData?.matches || []);
  const [tournaments, setTournaments] = useState<any[]>(cachedMatchesData?.tournaments || []);
  const [casters, setCasters] = useState<any[]>(cachedMatchesData?.casters || []);
  const [isLoading, setIsLoading] = useState(!cachedMatchesData);

  // User Steam status
  const [userSteamId, setUserSteamId] = useState<string | null>(null);

  // Filter States
  const [selectedTournament, setSelectedTournament] = useState<string>("all");
  const [selectedCaster, setSelectedCaster] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Caster User Info
  const [userCasterInfo, setUserCasterInfo] = useState<any>(null);
  const [isCaster, setIsCaster] = useState(false);

  // Stream Player Modal State
  const [activeStreamModal, setActiveStreamModal] = useState<{
    isOpen: boolean;
    channel: string;
    matchTitle: string;
    casterName: string;
  }>({
    isOpen: false,
    channel: "",
    matchTitle: "",
    casterName: "",
  });

  // Assign Caster Modal State
  const [assignCasterModal, setAssignCasterModal] = useState<{
    isOpen: boolean;
    matchId: string;
    matchTitle: string;
    customStreamUrl: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    matchId: "",
    matchTitle: "",
    customStreamUrl: "",
    isSubmitting: false,
  });

  // Edit Schedule & Maps Modal State
  const [scheduleModal, setScheduleModal] = useState<{
    isOpen: boolean;
    match: any | null;
    scheduledDate: string;
    scheduledTime: string;
    selectedMaps: string[];
    customMapInput: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    match: null,
    scheduledDate: "",
    scheduledTime: "",
    selectedMaps: [],
    customMapInput: "",
    isSubmitting: false,
  });

  // Finalize Match Modal State
  const [finalizeModal, setFinalizeModal] = useState<{
    isOpen: boolean;
    match: any | null;
    score1: number;
    score2: number;
    winnerId: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    match: null,
    score1: 0,
    score2: 0,
    winnerId: "",
    isSubmitting: false,
  });

  // Generate Veto Modal State
  const [vetoModal, setVetoModal] = useState<{
    isOpen: boolean;
    match: any | null;
    format: string;
    isGenerating: boolean;
  }>({
    isOpen: false,
    match: null,
    format: "bo1",
    isGenerating: false,
  });

  useEffect(() => {
    fetchInitialData();
    checkUserCasterStatus();
    fetchUserAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const fetchUserAccounts = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/user/accounts");
      if (res.ok) {
        const data = await res.json();
        const steamAcc = data.accounts?.find((a: any) => a.provider === "steam");
        if (steamAcc) {
          setUserSteamId(steamAcc.steamId || steamAcc.providerAccountId || "linked");
        }
      }
    } catch (e) {
      console.warn("Could not load user accounts:", e);
    }
  };

  const fetchInitialData = async () => {
    if (!cachedMatchesData) setIsLoading(true);
    try {
      // 1. Fetch matches
      const matchesRes = await fetch("/api/matches");
      const matchesData = await matchesRes.json();

      // 2. Fetch official casters
      const castersRes = await fetch("/api/casters");
      const castersData = await castersRes.json();

      // 3. Extract unique tournaments from valid matches
      const fetchedMatches = matchesData.matches || [];
      const tournamentMap = new Map();
      fetchedMatches.forEach((m: any) => {
        if (m.tournaments?.id) {
          tournamentMap.set(m.tournaments.id, m.tournaments);
        }
      });
      const uniqueTournaments = Array.from(tournamentMap.values());

      setMatches(fetchedMatches);
      setTournaments(uniqueTournaments);
      setCasters(castersData.casters || []);

      cachedMatchesData = {
        matches: fetchedMatches,
        tournaments: uniqueTournaments,
        casters: castersData.casters || [],
      };
    } catch (e) {
      console.error("Error loading matches data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserCasterStatus = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/casters/apply");
      const data = await res.json();
      if (data.isCaster) {
        setIsCaster(true);
        setUserCasterInfo(data.caster || data.application);
      }
    } catch (e) {
      console.error("Error checking caster status:", e);
    }
  };

  // Only valid matches that have both real teams and are not BYEs
  const validMatches = useMemo(() => {
    return matches.filter((m) => {
      if (m.is_bye === true) return false;
      if (!m.team1_id || !m.team2_id) return false;
      if (!m.team1 || !m.team2) return false;
      return true;
    });
  }, [matches]);

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return validMatches.filter((m) => {
      // Tournament Filter
      if (selectedTournament !== "all" && m.tournament_id !== selectedTournament) {
        return false;
      }

      // Caster Filter
      if (selectedCaster !== "all") {
        if (selectedCaster === "has_caster") {
          if (!m.assigned_casters || m.assigned_casters.length === 0) return false;
        } else {
          const matchHasCaster = m.assigned_casters?.some(
            (c: any) =>
              c.caster_id === selectedCaster ||
              c.casters?.user_id === selectedCaster ||
              c.casters?.alias?.toLowerCase() === selectedCaster.toLowerCase()
          );
          if (!matchHasCaster) return false;
        }
      }

      // Status Filter based on actual result
      const currentStatus = getMatchStatus(m);
      if (statusFilter === "live" && currentStatus !== "live") return false;
      if (statusFilter === "upcoming" && currentStatus !== "upcoming") return false;
      if (statusFilter === "completed" && currentStatus !== "completed") return false;

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const tournamentName = m.tournaments?.name?.toLowerCase() || "";
        const team1Name = m.team1?.name?.toLowerCase() || "";
        const team2Name = m.team2?.name?.toLowerCase() || "";
        const castersNames =
          m.assigned_casters
            ?.map((c: any) => c.casters?.alias?.toLowerCase() || "")
            .join(" ") || "";

        const matchesQuery =
          tournamentName.includes(query) ||
          team1Name.includes(query) ||
          team2Name.includes(query) ||
          castersNames.includes(query);

        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [validMatches, selectedTournament, selectedCaster, statusFilter, searchQuery]);

  // Counts for status tabs
  const liveCount = useMemo(
    () => validMatches.filter((m) => getMatchStatus(m) === "live").length,
    [validMatches]
  );
  const upcomingCount = useMemo(
    () => validMatches.filter((m) => getMatchStatus(m) === "upcoming").length,
    [validMatches]
  );
  const completedCount = useMemo(
    () => validMatches.filter((m) => getMatchStatus(m) === "completed").length,
    [validMatches]
  );

  // Timezone formatting helper
  const formatScheduleInfo = (scheduledAt: string | null) => {
    if (!scheduledAt) {
      return {
        formattedDate: "Horario por definir",
        formattedTime: "",
        timezone: "",
        isTBD: true,
      };
    }

    try {
      const date = new Date(scheduledAt);
      if (isNaN(date.getTime())) {
        return {
          formattedDate: "Horario por definir",
          formattedTime: "",
          timezone: "",
          isTBD: true,
        };
      }

      const dateStr = date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const timeStr = date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Browser local timezone code
      let tz = "";
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      } catch (e) {}

      return {
        formattedDate: dateStr,
        formattedTime: timeStr,
        timezone: tz,
        isTBD: false,
      };
    } catch (e) {
      return {
        formattedDate: "Horario por definir",
        formattedTime: "",
        timezone: "",
        isTBD: true,
      };
    }
  };

  // Check permissions for a match
  const checkPermissions = (match: any) => {
    if (!session?.user?.id) return { canEditSchedule: false, canAdmin: false, isAssignedCaster: false };

    const userId = session.user.id;
    const isTournamentCreator = match.tournaments?.creator_id === userId;
    const isTournamentMod =
      Array.isArray(match.tournaments?.moderators) &&
      match.tournaments.moderators.includes(userId);

    const isCaptain1 = match.team1?.creator_id === userId;
    const isCaptain2 = match.team2?.creator_id === userId;

    let isSteamVerifiedMember = false;
    if (userSteamId) {
      const isMember1 = match.team1?.team_members?.some(
        (m: any) => m.steam_id_64 === userSteamId
      );
      const isMember2 = match.team2?.team_members?.some(
        (m: any) => m.steam_id_64 === userSteamId
      );
      if (isMember1 || isMember2) {
        isSteamVerifiedMember = true;
      }
    }

    const isAssignedCaster =
      isCaster &&
      match.assigned_casters?.some(
        (c: any) =>
          c.caster_id === userCasterInfo?.id || c.casters?.user_id === userId
      );

    const canAdmin = isTournamentCreator || isTournamentMod;
    const canEditSchedule =
      canAdmin ||
      isCaptain1 ||
      isCaptain2 ||
      isSteamVerifiedMember ||
      isAssignedCaster;

    return { canEditSchedule, canAdmin, isAssignedCaster };
  };

  // Open Edit Schedule & Maps Modal
  const handleOpenScheduleModal = (match: any) => {
    let dateStr = "";
    let timeStr = "";

    if (match.scheduled_at) {
      const d = new Date(match.scheduled_at);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        dateStr = `${year}-${month}-${day}`;

        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        timeStr = `${hours}:${minutes}`;
      }
    }

    setScheduleModal({
      isOpen: true,
      match,
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      selectedMaps: Array.isArray(match.selected_maps) ? [...match.selected_maps] : [],
      customMapInput: "",
      isSubmitting: false,
    });
  };

  // Save Schedule & Maps
  const handleSaveSchedule = async () => {
    if (!scheduleModal.match) return;

    setScheduleModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      let isoString: string | null = null;
      if (scheduleModal.scheduledDate) {
        const timePart = scheduleModal.scheduledTime || "00:00";
        const localDateTime = new Date(`${scheduleModal.scheduledDate}T${timePart}:00`);
        if (!isNaN(localDateTime.getTime())) {
          isoString = localDateTime.toISOString();
        }
      }

      const res = await fetch(`/api/matches/${scheduleModal.match.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: isoString,
          selectedMaps: scheduleModal.selectedMaps,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo actualizar el schedule.");
      } else {
        toast.success("Schedule y mapas actualizados correctamente.");
        setScheduleModal((prev) => ({ ...prev, isOpen: false }));
        fetchInitialData();
      }
    } catch (e) {
      toast.error("Error al guardar el schedule.");
    } finally {
      setScheduleModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Quick Match Status Toggle (Admin)
  const handleSetMatchStatus = async (matchId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar estado del partido.");
      } else {
        toast.success(
          newStatus === "in_progress"
            ? "Partido marcado como EN VIVO. Transmisión iniciada."
            : "Estado del partido actualizado."
        );
        fetchInitialData();
      }
    } catch (e) {
      toast.error("Error de red al actualizar estado.");
    }
  };

  // Open Finalize Match Modal
  const handleOpenFinalizeModal = (match: any) => {
    setFinalizeModal({
      isOpen: true,
      match,
      score1: match.score1 || 0,
      score2: match.score2 || 0,
      winnerId: match.winner_id || match.team1_id,
      isSubmitting: false,
    });
  };

  // Submit Finalize Match (Calls report API to advance brackets properly)
  const handleFinalizeMatch = async () => {
    if (!finalizeModal.match) return;

    setFinalizeModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const res = await fetch(`/api/matches/${finalizeModal.match.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score1: finalizeModal.score1,
          score2: finalizeModal.score2,
          winner_id: finalizeModal.winnerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al registrar el resultado.");
      } else {
        toast.success("Resultado guardado y llaves del torneo actualizadas.");
        setFinalizeModal((prev) => ({ ...prev, isOpen: false }));
        fetchInitialData();
      }
    } catch (e) {
      toast.error("Error de red al registrar el resultado.");
    } finally {
      setFinalizeModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Generate Direct Veto for Match
  const handleGenerateVeto = async (match: any) => {
    setVetoModal({
      isOpen: true,
      match,
      format: "bo1",
      isGenerating: false,
    });
  };

  const handleExecuteCreateVeto = async () => {
    if (!vetoModal.match) return;
    setVetoModal((prev) => ({ ...prev, isGenerating: true }));

    try {
      const res = await fetch(`/api/matches/${vetoModal.match.id}/veto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: vetoModal.format }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo generar el veto.");
      } else {
        toast.success("Veto de mapas generado correctamente para este match.");
        setVetoModal((prev) => ({ ...prev, isOpen: false }));
        fetchInitialData();
        router.push(data.spectatorUrl);
      }
    } catch (e) {
      toast.error("Error al generar el veto de mapas.");
    } finally {
      setVetoModal((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  // Handle stream player open (ONLY allowed when match is in_progress / live)
  const handleOpenStream = (channel: string, matchTitle: string, casterName: string) => {
    let cleanChannel = channel.trim();
    if (cleanChannel.startsWith("http://") || cleanChannel.startsWith("https://")) {
      const parts = cleanChannel.split("/").filter(Boolean);
      cleanChannel = parts[parts.length - 1] || cleanChannel;
    }
    setActiveStreamModal({
      isOpen: true,
      channel: cleanChannel,
      matchTitle,
      casterName,
    });
  };

  // Handle Caster Match Binding
  const handleClaimCast = async (matchId: string) => {
    setAssignCasterModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const res = await fetch(`/api/matches/${matchId}/caster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamUrl: assignCasterModal.customStreamUrl || userCasterInfo?.twitch_channel || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo vincular la transmisión.");
      } else {
        toast.success("Transmisión asignada correctamente al match.");
        setAssignCasterModal({
          isOpen: false,
          matchId: "",
          matchTitle: "",
          customStreamUrl: "",
          isSubmitting: false,
        });
        fetchInitialData();
      }
    } catch (e) {
      toast.error("Error de red al asignar la transmisión.");
    } finally {
      setAssignCasterModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleUnlinkCast = async (matchId: string) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/caster`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo desvincular.");
      } else {
        toast.success("Transmisión desvinculada del match.");
        fetchInitialData();
      }
    } catch (e) {
      toast.error("Error al desvincular la transmisión.");
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Cargando Matches..." fullHeight={true} />;
  }

  return (
    <div className="container" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 0",
          marginBottom: "2rem",
          borderBottom: "1px solid var(--border)",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              background: "rgba(111, 175, 58, 0.15)",
              padding: "0.6rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Swords size={26} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.6rem", margin: 0, fontWeight: "bold" }}>
              <span className="text-gradient">Matches</span> Hub
            </h1>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              Partidos, horarios adaptados a tu zona horaria local, mapas y transmisiones oficiales
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {isCaster && (
            <div
              style={{
                background: "rgba(145, 70, 255, 0.15)",
                border: "1px solid rgba(145, 70, 255, 0.3)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <TwitchIcon size={18} className="text-[#9146FF]" />
              <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#C499FF" }}>
                Caster Oficial: {userCasterInfo?.alias || session?.user?.name}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: "2rem",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          background: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(8px)",
          border: "1px solid var(--border-light)",
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setStatusFilter("all")}
            className={`btn ${statusFilter === "all" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Swords size={16} /> Todos ({validMatches.length})
          </button>
          <button
            onClick={() => setStatusFilter("live")}
            className={`btn ${statusFilter === "live" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Radio size={16} color={statusFilter === "live" ? "#000" : "#EF4444"} /> En Vivo ({liveCount})
          </button>
          <button
            onClick={() => setStatusFilter("upcoming")}
            className={`btn ${statusFilter === "upcoming" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Clock size={16} /> Próximos ({upcomingCount})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`btn ${statusFilter === "completed" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <CheckCircle2 size={16} /> Finalizados ({completedCount})
          </button>
        </div>

        {/* Dropdowns & Search Input */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Tournament Dropdown */}
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
              Torneo Activo
            </label>
            <select
              className="input-base"
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              style={{ width: "100%", fontSize: "0.9rem", padding: "0.6rem" }}
            >
              <option value="all">Todos los Torneos</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Caster Dropdown */}
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
              Casters Oficiales
            </label>
            <select
              className="input-base"
              value={selectedCaster}
              onChange={(e) => setSelectedCaster(e.target.value)}
              style={{ width: "100%", fontSize: "0.9rem", padding: "0.6rem" }}
            >
              <option value="all">Todos los Casters</option>
              <option value="has_caster">Solo con Caster asignado</option>
              {casters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.alias || c.twitch_channel} (Twitch)
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div style={{ flex: "2 1 250px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
              Buscar por equipo, torneo o caster
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={18} style={{ position: "absolute", left: "12px", color: "var(--muted)", pointerEvents: "none" }} />
              <input
                type="text"
                className="input-base"
                placeholder="Buscar partido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.4rem", fontSize: "0.9rem", paddingRight: searchQuery ? "2rem" : "0.75rem" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="btn-icon"
                  style={{ position: "absolute", right: "8px", background: "transparent", border: "none", color: "var(--muted)" }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      <main style={{ flex: 1, marginBottom: "4rem" }}>
        {filteredMatches.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <Swords size={30} color="var(--muted)" />
            </div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem" }}>No se encontraron matches</h3>
            <p className="text-muted text-sm" style={{ maxWidth: "400px", margin: "0 auto" }}>
              No hay partidos con rivales definidos que coincidan con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "1.5rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
            }}
          >
            {filteredMatches.map((match) => {
              const statusType = getMatchStatus(match);
              const isLive = statusType === "live";
              const isCompleted = statusType === "completed";
              const isUpcoming = statusType === "upcoming";

              const team1 = match.team1;
              const team2 = match.team2;
              const tournament = match.tournaments;
              const assignedCasters = match.assigned_casters || [];
              const hasCaster = assignedCasters.length > 0;
              const streamChannel =
                assignedCasters[0]?.stream_url || assignedCasters[0]?.casters?.twitch_channel || "";

              const { canEditSchedule, canAdmin, isAssignedCaster } = checkPermissions(match);
              const scheduleInfo = formatScheduleInfo(match.scheduled_at);
              const selectedMaps: string[] = Array.isArray(match.selected_maps) ? match.selected_maps : [];

              return (
                <div
                  key={match.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    position: "relative",
                    background: isLive
                      ? "linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(20, 22, 26, 0.95) 100%)"
                      : "rgba(20, 22, 26, 0.75)",
                    border: isLive
                      ? "1px solid rgba(239, 68, 68, 0.5)"
                      : "1px solid var(--border-light)",
                    borderRadius: "14px",
                    padding: "1.25rem",
                    transition: "border-color 0.2s, transform 0.2s",
                  }}
                >
                  {/* Top Bar: Tournament Name & Status Badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                      {tournament?.logo_url ? (
                        <img
                          src={tournament.logo_url}
                          alt="Torneo"
                          style={{ width: "22px", height: "22px", borderRadius: "4px", objectFit: "cover" }}
                        />
                      ) : (
                        <Trophy size={16} color="var(--primary)" />
                      )}
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          color: "var(--muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {tournament?.name || "Torneo"}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {isLive ? (
                      <span
                        style={{
                          background: "rgba(239, 68, 68, 0.2)",
                          color: "#EF4444",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "100px",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#EF4444",
                            boxShadow: "0 0 8px #EF4444",
                          }}
                        />
                        EN VIVO
                      </span>
                    ) : isCompleted ? (
                      <span
                        style={{
                          background: "rgba(74, 222, 128, 0.1)",
                          color: "var(--success)",
                          border: "1px solid rgba(74, 222, 128, 0.3)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "100px",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <CheckCircle2 size={13} /> Finalizado
                      </span>
                    ) : (
                      <span
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "var(--muted)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "100px",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <Clock size={13} /> Ronda {match.round || 1}
                      </span>
                    )}
                  </div>

                  {/* Schedule Info Box (Localized Timezone) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(255, 255, 255, 0.03)",
                      borderRadius: "8px",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                      <Calendar size={15} color="var(--primary)" />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: scheduleInfo.isTBD ? "var(--muted)" : "var(--text-main)" }}>
                          {scheduleInfo.formattedDate} {scheduleInfo.formattedTime && `• ${scheduleInfo.formattedTime}`}
                        </span>
                        {scheduleInfo.timezone && !scheduleInfo.isTBD && (
                          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                            Hora local ({scheduleInfo.timezone})
                          </span>
                        )}
                      </div>
                    </div>

                    {canEditSchedule && (
                      <button
                        className="btn btn-secondary text-xs"
                        style={{ padding: "0.25rem 0.6rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                        onClick={() => handleOpenScheduleModal(match)}
                        title="Editar fecha, hora y mapas del partido"
                      >
                        <Edit size={12} /> Horario/Mapas
                      </button>
                    )}
                  </div>

                  {/* Teams Matchup Card */}
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      borderRadius: "10px",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    {/* Team 1 */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden" }}>
                        {team1?.logo_url ? (
                          <img
                            src={team1.logo_url}
                            alt={team1.name}
                            style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.85rem",
                              fontWeight: "bold",
                            }}
                          >
                            {team1?.name?.slice(0, 2).toUpperCase() || "T1"}
                          </div>
                        )}
                        <span
                          style={{
                            fontWeight: isCompleted && match.winner_id === team1?.id ? "bold" : "normal",
                            color: isCompleted && match.winner_id === team1?.id ? "var(--success)" : "var(--text-main)",
                            fontSize: "0.95rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {team1?.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: "bold",
                          padding: "0.1rem 0.5rem",
                          borderRadius: "4px",
                          background: "rgba(255, 255, 255, 0.05)",
                          minWidth: "28px",
                          textAlign: "center",
                          color: isCompleted ? "var(--text-main)" : "var(--muted)",
                        }}
                      >
                        {isCompleted || isLive ? (match.score1 !== null ? match.score1 : 0) : "-"}
                      </span>
                    </div>

                    {/* Team 2 */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden" }}>
                        {team2?.logo_url ? (
                          <img
                            src={team2.logo_url}
                            alt={team2.name}
                            style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              background: "rgba(255, 255, 255, 0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.85rem",
                              fontWeight: "bold",
                            }}
                          >
                            {team2?.name?.slice(0, 2).toUpperCase() || "T2"}
                          </div>
                        )}
                        <span
                          style={{
                            fontWeight: isCompleted && match.winner_id === team2?.id ? "bold" : "normal",
                            color: isCompleted && match.winner_id === team2?.id ? "var(--success)" : "var(--text-main)",
                            fontSize: "0.95rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {team2?.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: "bold",
                          padding: "0.1rem 0.5rem",
                          borderRadius: "4px",
                          background: "rgba(255, 255, 255, 0.05)",
                          minWidth: "28px",
                          textAlign: "center",
                          color: isCompleted ? "var(--text-main)" : "var(--muted)",
                        }}
                      >
                        {isCompleted || isLive ? (match.score2 !== null ? match.score2 : 0) : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Maps Section */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      borderRadius: "8px",
                      padding: "0.6rem 0.75rem",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <MapPin size={13} color="var(--primary)" /> Mapas a Jugar
                      </span>

                      {match.map_veto_id ? (
                        <button
                          className="btn btn-secondary text-xs"
                          style={{ padding: "0.2rem 0.5rem" }}
                          onClick={() => router.push(`/map-veto/${match.map_veto_id}`)}
                        >
                          Ver Veto de Mapas
                        </button>
                      ) : (
                        (canAdmin || isAssignedCaster) && (
                          <button
                            className="btn btn-secondary text-xs"
                            style={{ padding: "0.2rem 0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                            onClick={() => handleGenerateVeto(match)}
                          >
                            <Shuffle size={12} /> Generar Veto
                          </button>
                        )
                      )}
                    </div>

                    {selectedMaps.length > 0 ? (
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {selectedMaps.map((mapName, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              background: "rgba(111, 175, 58, 0.15)",
                              color: "var(--primary)",
                              border: "1px solid rgba(111, 175, 58, 0.3)",
                              fontWeight: "bold",
                            }}
                          >
                            {mapName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>
                        {match.map_veto_id ? "Veto de mapas en proceso..." : "Mapas pendientes de selección o veto"}
                      </span>
                    )}
                  </div>

                  {/* Casters & Stream Access Section */}
                  {hasCaster && (
                    <div
                      style={{
                        background: isLive ? "rgba(239, 68, 68, 0.08)" : "rgba(145, 70, 255, 0.08)",
                        border: isLive ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(145, 70, 255, 0.2)",
                        borderRadius: "8px",
                        padding: "0.6rem 0.75rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                        <TwitchIcon size={16} className="text-[#9146FF]" />
                        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#E0D0FF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            Caster:{" "}
                            <a
                              href={`https://twitch.tv/${streamChannel}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#C499FF", textDecoration: "underline" }}
                            >
                              {assignedCasters[0]?.casters?.alias || assignedCasters[0]?.casters?.twitch_channel || "Oficial"}
                            </a>
                          </span>
                          {!isLive && (
                            <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                              (Stream visible al iniciar el partido)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stream Direct Access Button ONLY when match is in_progress (Live) */}
                      {isLive ? (
                        <button
                          className="btn"
                          onClick={() =>
                            handleOpenStream(
                              streamChannel,
                              `${team1?.name} vs ${team2?.name}`,
                              assignedCasters[0]?.casters?.alias || "Caster Oficial"
                            )
                          }
                          style={{
                            background: "#EF4444",
                            color: "#fff",
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            border: "none",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            boxShadow: "0 0 10px rgba(239, 68, 68, 0.4)",
                          }}
                        >
                          <Play size={12} fill="#fff" /> Ver Transmisión
                        </button>
                      ) : (
                        <a
                          href={`https://twitch.tv/${streamChannel}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary text-xs"
                          style={{ padding: "0.3rem 0.5rem", display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}
                        >
                          <ExternalLink size={12} /> Canal
                        </a>
                      )}
                    </div>
                  )}

                  {/* Actions & Organizer Admin Controls */}
                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {/* Admin Status Controls */}
                    {canAdmin && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.4rem",
                          padding: "0.4rem",
                          background: "rgba(0, 0, 0, 0.3)",
                          borderRadius: "6px",
                          border: "1px solid var(--border-light)",
                        }}
                      >
                        {!isLive && !isCompleted && (
                          <button
                            className="btn text-xs"
                            style={{ flex: 1, background: "rgba(239, 68, 68, 0.2)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.4)", padding: "0.35rem" }}
                            onClick={() => handleSetMatchStatus(match.id, "in_progress")}
                          >
                            Iniciar Transmisión
                          </button>
                        )}
                        {isLive && (
                          <>
                            <button
                              className="btn text-xs"
                              style={{ flex: 1, background: "rgba(34, 197, 94, 0.2)", color: "var(--success)", border: "1px solid rgba(34, 197, 94, 0.4)", padding: "0.35rem" }}
                              onClick={() => handleOpenFinalizeModal(match)}
                            >
                              Finalizar Partido
                            </button>
                            <button
                              className="btn btn-secondary text-xs"
                              style={{ padding: "0.35rem 0.6rem" }}
                              onClick={() => handleSetMatchStatus(match.id, "pending")}
                            >
                              Pausar
                            </button>
                          </>
                        )}
                        {isCompleted && (
                          <button
                            className="btn btn-secondary text-xs"
                            style={{ flex: 1, padding: "0.35rem" }}
                            onClick={() => handleOpenFinalizeModal(match)}
                          >
                            Modificar Resultado
                          </button>
                        )}
                      </div>
                    )}

                    {/* Bottom Nav Actions */}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: "0.85rem", padding: "0.5rem" }}
                        onClick={() => router.push(`/tournament/${match.tournament_id}`)}
                      >
                        Ver Torneo
                      </button>

                      {isCaster && (
                        <>
                          {hasCaster && assignedCasters.some((c: any) => c.caster_id === userCasterInfo?.id || c.casters?.user_id === session?.user?.id) ? (
                            <button
                              className="btn btn-danger"
                              style={{ fontSize: "0.85rem", padding: "0.5rem" }}
                              onClick={() => handleUnlinkCast(match.id)}
                              title="Desvincular mi stream de este match"
                            >
                              Quitar Cast
                            </button>
                          ) : (
                            <button
                              className="btn"
                              style={{
                                background: "rgba(145, 70, 255, 0.2)",
                                border: "1px solid rgba(145, 70, 255, 0.4)",
                                color: "#C499FF",
                                fontSize: "0.85rem",
                                padding: "0.5rem 0.75rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                              }}
                              onClick={() =>
                                setAssignCasterModal({
                                  isOpen: true,
                                  matchId: match.id,
                                  matchTitle: `${team1?.name} vs ${team2?.name}`,
                                  customStreamUrl: userCasterInfo?.twitch_channel || "",
                                  isSubmitting: false,
                                })
                              }
                            >
                              <TwitchIcon size={14} /> Castear
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Twitch Embedded Stream Modal */}
      {activeStreamModal.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setActiveStreamModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "1000px",
              background: "#0E0E10",
              border: "1px solid rgba(145, 70, 255, 0.4)",
              borderRadius: "16px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ background: "#9146FF", padding: "0.4rem", borderRadius: "8px", display: "flex" }}>
                  <TwitchIcon size={20} className="text-white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>
                    {activeStreamModal.matchTitle}
                  </h3>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>
                    Transmisión en vivo por <span style={{ color: "#9146FF", fontWeight: "bold" }}>{activeStreamModal.casterName}</span> ({activeStreamModal.channel})
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <a
                  href={`https://twitch.tv/${activeStreamModal.channel}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary text-sm"
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.4rem 0.75rem" }}
                >
                  <ExternalLink size={14} /> Abrir en Twitch
                </a>
                <button
                  className="btn-icon"
                  onClick={() => setActiveStreamModal((prev) => ({ ...prev, isOpen: false }))}
                  title="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Embedded Player */}
            <div
              style={{
                position: "relative",
                width: "100%",
                paddingTop: "56.25%", // 16:9 Aspect Ratio
                borderRadius: "10px",
                overflow: "hidden",
                background: "#000",
              }}
            >
              <iframe
                src={`https://player.twitch.tv/?channel=${activeStreamModal.channel}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}&autoplay=true`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                allowFullScreen={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Schedule & Maps Modal */}
      {scheduleModal.isOpen && (
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
          onClick={() => setScheduleModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "550px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              background: "#14161A",
              border: "1px solid var(--border-light)",
              borderRadius: "12px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Calendar size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: "1.25rem" }}>Editar Horario y Mapas</h3>
              </div>
              <button className="btn-icon" onClick={() => setScheduleModal((prev) => ({ ...prev, isOpen: false }))}>
                <X size={20} />
              </button>
            </div>

            <p className="text-muted text-sm" style={{ margin: 0 }}>
              Partido: <strong>{scheduleModal.match?.team1?.name} vs {scheduleModal.match?.team2?.name}</strong>
            </p>

            {/* Date & Time Picker */}
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                  Fecha (Hora Local)
                </label>
                <input
                  type="date"
                  className="input-base"
                  value={scheduleModal.scheduledDate}
                  onChange={(e) => setScheduleModal({ ...scheduleModal, scheduledDate: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                  Hora (Hora Local)
                </label>
                <input
                  type="time"
                  className="input-base"
                  value={scheduleModal.scheduledTime}
                  onChange={(e) => setScheduleModal({ ...scheduleModal, scheduledTime: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Map Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                Mapas a Jugar (Selecciona o escribe)
              </label>

              {/* Competitive Map Buttons */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {COMPETITIVE_MAPS.map((mapName) => {
                  const isSelected = scheduleModal.selectedMaps.includes(mapName);
                  return (
                    <button
                      key={mapName}
                      type="button"
                      className="btn text-xs"
                      style={{
                        padding: "0.25rem 0.5rem",
                        background: isSelected ? "rgba(111, 175, 58, 0.25)" : "rgba(255, 255, 255, 0.05)",
                        border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border-light)",
                        color: isSelected ? "var(--primary)" : "var(--muted)",
                      }}
                      onClick={() => {
                        if (isSelected) {
                          setScheduleModal({
                            ...scheduleModal,
                            selectedMaps: scheduleModal.selectedMaps.filter((m) => m !== mapName),
                          });
                        } else {
                          setScheduleModal({
                            ...scheduleModal,
                            selectedMaps: [...scheduleModal.selectedMaps, mapName],
                          });
                        }
                      }}
                    >
                      {mapName}
                    </button>
                  );
                })}
              </div>

              {/* Custom Map text add */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  className="input-base"
                  placeholder="Agregar otro mapa personalizado..."
                  value={scheduleModal.customMapInput}
                  onChange={(e) => setScheduleModal({ ...scheduleModal, customMapInput: e.target.value })}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary text-sm"
                  onClick={() => {
                    if (scheduleModal.customMapInput.trim()) {
                      setScheduleModal({
                        ...scheduleModal,
                        selectedMaps: [...scheduleModal.selectedMaps, scheduleModal.customMapInput.trim()],
                        customMapInput: "",
                      });
                    }
                  }}
                >
                  Agregar
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setScheduleModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={scheduleModal.isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveSchedule}
                disabled={scheduleModal.isSubmitting}
              >
                {scheduleModal.isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Match / Score Modal */}
      {finalizeModal.isOpen && (
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
          onClick={() => setFinalizeModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              background: "#14161A",
              border: "1px solid var(--border-light)",
              borderRadius: "12px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={20} color="var(--success)" />
                <h3 style={{ margin: 0, fontSize: "1.25rem" }}>Finalizar Partido</h3>
              </div>
              <button className="btn-icon" onClick={() => setFinalizeModal((prev) => ({ ...prev, isOpen: false }))}>
                <X size={20} />
              </button>
            </div>

            <p className="text-muted text-sm" style={{ margin: 0 }}>
              Ingresa el marcador oficial para registrar el resultado final del partido y avanzar las llaves.
            </p>

            <div style={{ display: "flex", gap: "1rem", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(0, 0, 0, 0.3)", borderRadius: "8px" }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.4rem" }}>
                  {finalizeModal.match?.team1?.name}
                </label>
                <input
                  type="number"
                  min={0}
                  className="input-base"
                  value={finalizeModal.score1}
                  onChange={(e) => setFinalizeModal({ ...finalizeModal, score1: parseInt(e.target.value) || 0 })}
                  style={{ width: "80px", textAlign: "center", fontSize: "1.2rem", fontWeight: "bold" }}
                />
              </div>

              <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--muted)" }}>-</span>

              <div style={{ textAlign: "center", flex: 1 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.4rem" }}>
                  {finalizeModal.match?.team2?.name}
                </label>
                <input
                  type="number"
                  min={0}
                  className="input-base"
                  value={finalizeModal.score2}
                  onChange={(e) => setFinalizeModal({ ...finalizeModal, score2: parseInt(e.target.value) || 0 })}
                  style={{ width: "80px", textAlign: "center", fontSize: "1.2rem", fontWeight: "bold" }}
                />
              </div>
            </div>

            {/* Winner Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                Equipo Ganador
              </label>
              <select
                className="input-base"
                value={finalizeModal.winnerId}
                onChange={(e) => setFinalizeModal({ ...finalizeModal, winnerId: e.target.value })}
                style={{ width: "100%" }}
              >
                <option value={finalizeModal.match?.team1_id}>{finalizeModal.match?.team1?.name}</option>
                <option value={finalizeModal.match?.team2_id}>{finalizeModal.match?.team2?.name}</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFinalizeModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={finalizeModal.isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinalizeMatch}
                disabled={finalizeModal.isSubmitting}
              >
                {finalizeModal.isSubmitting ? "Guardando..." : "Confirmar Resultado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Veto Modal */}
      {vetoModal.isOpen && (
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
          onClick={() => setVetoModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              background: "#14161A",
              border: "1px solid var(--border-light)",
              borderRadius: "12px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Shuffle size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: "1.25rem" }}>Generar Veto de Mapas</h3>
              </div>
              <button className="btn-icon" onClick={() => setVetoModal((prev) => ({ ...prev, isOpen: false }))}>
                <X size={20} />
              </button>
            </div>

            <p className="text-muted text-sm" style={{ margin: 0 }}>
              Se creará una sesión interactiva de veto entre <strong>{vetoModal.match?.team1?.name}</strong> y <strong>{vetoModal.match?.team2?.name}</strong>. Al finalizar el veto, los mapas elegidos se asignarán automáticamente a este partido.
            </p>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                Formato de Veto
              </label>
              <select
                className="input-base"
                value={vetoModal.format}
                onChange={(e) => setVetoModal({ ...vetoModal, format: e.target.value })}
                style={{ width: "100%" }}
              >
                <option value="bo1">Al Mejor de 1 (BO1 - 1 Mapa)</option>
                <option value="to2">Al Mejor de 2 (TO2 - 2 Mapas)</option>
                <option value="bo3">Al Mejor de 3 (BO3 - 3 Mapas)</option>
                <option value="bo5">Al Mejor de 5 (BO5 - 5 Mapas)</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setVetoModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={vetoModal.isGenerating}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteCreateVeto}
                disabled={vetoModal.isGenerating}
              >
                {vetoModal.isGenerating ? "Generando..." : "Crear y Abrir Veto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Assign Stream as Caster */}
      {assignCasterModal.isOpen && (
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
          onClick={() => setAssignCasterModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <TwitchIcon size={22} className="text-[#9146FF]" />
                <h3 style={{ margin: 0, fontSize: "1.25rem" }}>Transmitir Match</h3>
              </div>
              <button
                className="btn-icon"
                onClick={() => setAssignCasterModal((prev) => ({ ...prev, isOpen: false }))}
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-muted text-sm" style={{ margin: 0 }}>
              Estás a punto de vincular tu canal de transmisión al match: <strong>{assignCasterModal.matchTitle}</strong>.
            </p>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                Canal de Twitch o URL de transmisión
              </label>
              <input
                type="text"
                className="input-base"
                placeholder="ej. nombre_de_usuario o https://twitch.tv/..."
                value={assignCasterModal.customStreamUrl}
                onChange={(e) =>
                  setAssignCasterModal((prev) => ({ ...prev, customStreamUrl: e.target.value }))
                }
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setAssignCasterModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={assignCasterModal.isSubmitting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleClaimCast(assignCasterModal.matchId)}
                disabled={assignCasterModal.isSubmitting}
                style={{ background: "#9146FF", borderColor: "#9146FF" }}
              >
                {assignCasterModal.isSubmitting ? "Vinculando..." : "Confirmar Transmisión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

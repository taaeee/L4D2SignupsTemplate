"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  Tv,
  Swords,
  Trophy,
  Users,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Play,
  Trash2,
  RefreshCw,
  Search,
  Send,
  Settings,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  UserCheck,
  Mic,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConfirmModal from "@/components/ConfirmModal";
import ScoreModal from "@/components/ScoreModal";
import ChooseMapModal from "@/components/ChooseMapModal";
import CasterMatchCard from "@/components/CasterMatchCard";
import { useCasterStatus } from "@/lib/useCasterStatus";
import { fetchBansInBatches } from "@/lib/ban-checker";
import { supabase } from "@/lib/supabase";
import { normalizeLanguages, MAIN_CASTER_LANGUAGES } from "@/lib/language-helper";
import { useTranslation } from "@/lib/i18n";

// Brand Platform SVGs
const TwitchIcon = ({ size = 16, className = "", color, style }: { size?: number; className?: string; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"} className={className} style={style}>
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
  </svg>
);

const KickIcon = ({ size = 16, className = "", color, style }: { size?: number; className?: string; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"} className={className} style={style}>
    <path d="M3 3h6v5.5l4-5.5h7l-6.5 8.5L20 21h-7l-4-6v6H3V3z" />
  </svg>
);

const YoutubeIcon = ({ size = 16, className = "", color, style }: { size?: number; className?: string; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"} className={className} style={style}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const SteamIcon = ({ size = 14, className = "", color, style }: { size?: number; className?: string; color?: string; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "currentColor"} className={className} style={style}>
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.811c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 14.819C1.675 20.05 6.377 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12zM7.544 14.832l-.08.033c-.347.142-.647.375-.87.671l-.105.139-2.072-.857c.433-.923 1.22-1.637 2.193-1.986.326.685.748 1.39 1.434 2.003v-.003zm4.414-5.922c0-1.895 1.542-3.438 3.438-3.438 1.895 0 3.438 1.543 3.438 3.438 0 1.896-1.543 3.438-3.438 3.438-1.896 0-3.438-1.542-3.438-3.438zm5.794 0c0-1.3-1.055-2.355-2.356-2.355-1.3 0-2.355 1.055-2.355 2.355 0 1.3 1.055 2.355 2.355 2.355 1.301 0 2.356-1.055 2.356-2.355zm-8.835 7.422c-.939 0-1.701-.762-1.701-1.702 0-.342.102-.661.277-.928l2.259.933c-.114.945-.443 1.697-.835 1.697z" />
  </svg>
);

// Verified Badge SVG (X / Facebook style)
const VerifiedBadgeIcon = ({ size = 18, color = "var(--primary)", checkColor = "#000", className = "", style }: { size?: number; color?: string; checkColor?: string; className?: string; style?: React.CSSProperties }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
  >
    <path
      fill={color}
      d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
    />
    <path
      fill={checkColor}
      d="M10.5 16.5l-4-4 1.41-1.41L10.5 13.67l6.59-6.59 1.41 1.41-8 8z"
    />
  </svg>
);

import {
  extractPlatformUsername,
  parseTeamData,
  parsePlayerRoleTitle,
  detectPlatform,
  getMatchStatus,
} from "@/lib/match-utils";

export { extractPlatformUsername, parseTeamData, parsePlayerRoleTitle, detectPlatform, getMatchStatus };

export const formatYoutubeUrl = (channelOrUrl?: string | null) => {
  if (!channelOrUrl) return "https://youtube.com";
  const trimmed = channelOrUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("@")) {
    return `https://www.youtube.com/${trimmed}`;
  }
  if (trimmed.startsWith("UC") && trimmed.length >= 20) {
    return `https://www.youtube.com/channel/${trimmed}`;
  }
  return `https://www.youtube.com/@${trimmed}`;
};

export const invalidateCasterCache = () => {
  cachedCasterDashboardData = null;
};

// Client-side cache to eliminate full-page loading flashes
let cachedCasterDashboardData: {
  matches: any[];
  tournaments: any[];
  timestamp: number;
} | null = null;

// Client-safe formatted date component to avoid SSR timezone/locale hydration mismatches
function MatchFormattedDate({ date }: { date: string | null | undefined }) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    try {
      setFormatted(
        new Date(date).toLocaleDateString("es-ES", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      setFormatted(null);
    }
  }, [date]);

  if (!date || !formatted) return null;

  return (
    <span className="text-muted" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }} suppressHydrationWarning>
      <Calendar size={12} />
      {formatted}
    </span>
  );
}

export default function CasterHubPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { isCaster, caster, application, casterData, isLoading: isCasterLoading, refreshCasterStatus } = useCasterStatus();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"my_matches" | "available_matches" | "profile_requests">("my_matches");

  // Matches State
  const [matches, setMatches] = useState<any[]>(cachedCasterDashboardData?.matches || []);
  const [tournaments, setTournaments] = useState<any[]>(cachedCasterDashboardData?.tournaments || []);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(!cachedCasterDashboardData);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [selectedTournament, setSelectedTournament] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "live" | "upcoming" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // UI Interactive States
  const [expandedRosters, setExpandedRosters] = useState<Record<string, boolean>>({});
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);
  const [copiedProfile, setCopiedProfile] = useState<boolean>(false);
  const [communityBans, setCommunityBans] = useState<Record<string, any>>({});

  // Stream Management Modal State
  const [streamModal, setStreamModal] = useState<{
    isOpen: boolean;
    match: any | null;
    streamUrl: string;
    startLiveNow: boolean;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    match: null,
    streamUrl: "",
    startLiveNow: false,
    isSubmitting: false,
  });

  // Unassign Confirm Modal State
  const [unassignModal, setUnassignModal] = useState<{
    isOpen: boolean;
    matchId: string | null;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    matchId: null,
    isSubmitting: false,
  });

  // Score Modal State for Caster
  const [scoreModal, setScoreModal] = useState<{
    isOpen: boolean;
    match: any | null;
    team1: any | null;
    team2: any | null;
    isSaving: boolean;
  }>({
    isOpen: false,
    match: null,
    team1: null,
    team2: null,
    isSaving: false,
  });

  // Choose Map Modal State for Caster
  const [chooseMapModal, setChooseMapModal] = useState<{
    isOpen: boolean;
    match: any | null;
    isSaving: boolean;
  }>({
    isOpen: false,
    match: null,
    isSaving: false,
  });

  // Profile Edit Request Form State
  const [editForm, setEditForm] = useState({
    alias: "",
    bio: "",
    twitch_channel: "",
    kick_channel: "",
    youtube_channel: "",
    languages: ["Español"],
    primary_platform: "twitch" as "twitch" | "kick" | "youtube",
    isSubmitting: false,
  });

  // Synchronize edit form when caster or application loads
  useEffect(() => {
    const activeAlias = application?.alias || caster?.alias || session?.user?.name || "";
    const activeBio = application?.bio || caster?.bio || "";
    const activeTwitch = application?.twitch_channel || caster?.twitch_channel || casterData?.verifiedTwitchChannel || "";
    const activeKick = application?.kick_channel || caster?.kick_channel || casterData?.verifiedKickChannel || "";
    const activeYoutube = application?.youtube_channel || caster?.youtube_channel || "";
    const activeLangs = normalizeLanguages(
      application?.languages || caster?.languages || casterData?.languages || (casterData?.application as any)?.languages || (casterData?.caster as any)?.languages
    );
    const activePlatform = (application?.primary_platform || casterData?.primaryPlatform || "twitch") as "twitch" | "kick" | "youtube";

    setEditForm((prev) => ({
      ...prev,
      alias: activeAlias,
      bio: activeBio,
      twitch_channel: activeTwitch,
      kick_channel: activeKick,
      youtube_channel: activeYoutube,
      languages: activeLangs,
      primary_platform: activePlatform,
    }));
  }, [application, caster, casterData, session]);

  const userLinkedAccounts = useMemo(() => {
    const activeTwitch = caster?.twitch_channel || application?.twitch_channel || casterData?.verifiedTwitchChannel || "";
    const activeKick = caster?.kick_channel || application?.kick_channel || casterData?.verifiedKickChannel || "";
    const activeYoutube = caster?.youtube_channel || application?.youtube_channel || "";

    const accounts: {
      platform: "twitch" | "kick" | "youtube";
      label: string;
      channelName: string;
      url: string;
      icon: React.ReactNode;
      color: string;
      bgColor: string;
      borderColor: string;
    }[] = [];

    if (activeTwitch) {
      const channel = activeTwitch.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").trim();
      if (channel) {
        accounts.push({
          platform: "twitch",
          label: "Twitch",
          channelName: channel,
          url: `https://twitch.tv/${channel}`,
          icon: <TwitchIcon size={16} />,
          color: "#bf94ff",
          bgColor: "rgba(145, 70, 255, 0.15)",
          borderColor: "rgba(145, 70, 255, 0.4)",
        });
      }
    }

    if (activeKick) {
      const channel = activeKick.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").trim();
      if (channel) {
        accounts.push({
          platform: "kick",
          label: "Kick",
          channelName: channel,
          url: `https://kick.com/${channel}`,
          icon: <KickIcon size={16} />,
          color: "#53FC18",
          bgColor: "rgba(83, 252, 24, 0.15)",
          borderColor: "rgba(83, 252, 24, 0.4)",
        });
      }
    }

    if (activeYoutube) {
      const channel = activeYoutube.trim();
      if (channel) {
        accounts.push({
          platform: "youtube",
          label: "YouTube",
          channelName: channel.replace(/^https?:\/\/(www\.)?youtube\.com\/(@|channel\/)?/i, ""),
          url: channel.startsWith("http") ? channel : `https://youtube.com/${channel.startsWith("@") ? channel : `@${channel}`}`,
          icon: <YoutubeIcon size={16} />,
          color: "#f87171",
          bgColor: "rgba(239, 68, 68, 0.15)",
          borderColor: "rgba(239, 68, 68, 0.4)",
        });
      }
    }

    return accounts;
  }, [caster, application, casterData]);

  // Fetch Matches Data
  const fetchMatches = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const res = await fetch("/api/matches");
      if (res.ok) {
        const data = await res.json();
        const rawMatches: any[] = data.matches || [];
        setMatches(rawMatches);

        // Unique Tournaments Map
        const tMap = new Map<string, any>();
        rawMatches.forEach((m) => {
          if (m.tournaments?.id) {
            tMap.set(m.tournaments.id, m.tournaments);
          }
        });
        const tourneys = Array.from(tMap.values());
        setTournaments(tourneys);

        cachedCasterDashboardData = {
          matches: rawMatches,
          tournaments: tourneys,
          timestamp: Date.now(),
        };

        // Fetch Community Bans in background
        const steamIds: string[] = [];
        rawMatches.forEach((m) => {
          (m.team1?.team_members || []).forEach((p: any) => {
            if (p.steam_id_64) steamIds.push(p.steam_id_64);
          });
          (m.team2?.team_members || []).forEach((p: any) => {
            if (p.steam_id_64) steamIds.push(p.steam_id_64);
          });
        });

        if (steamIds.length > 0) {
          fetchBansInBatches(steamIds, (batchData) => {
            setCommunityBans((prev) => ({ ...prev, ...batchData }));
          }).catch((e) => console.warn("Ban checker warning:", e));
        }
      }
    } catch (e) {
      console.error("Error loading matches for caster hub:", e);
    } finally {
      setIsLoadingMatches(false);
      if (isManualRefresh) {
        setIsRefreshing(false);
        toast.success("Matches y estadísticas actualizados.");
      }
    }
  }, []);

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel("caster_matches_hub_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        fetchMatches();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_casters" }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMatches]);

  const currentUserId = session?.user?.id;
  const currentCasterId = caster?.id || application?.id;

  // Filter My Matches
  const myMatches = useMemo(() => {
    if (!currentUserId && !currentCasterId) return [];

    return matches.filter((m) => {
      const isAssigned = (m.assigned_casters || []).some(
        (c: any) =>
          c.caster_id === currentCasterId ||
          c.casters?.user_id === currentUserId ||
          c.casters?.id === currentCasterId
      );
      if (!isAssigned) return false;

      if (selectedTournament !== "all" && m.tournament_id !== selectedTournament) return false;

      if (selectedStatus === "live" && !m.is_live) return false;
      if (selectedStatus === "upcoming" && (m.is_live || m.is_completed)) return false;
      if (selectedStatus === "completed" && !m.is_completed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t1 = (m.team1?.name || "").toLowerCase();
        const t2 = (m.team2?.name || "").toLowerCase();
        const tourney = (m.tournaments?.name || "").toLowerCase();
        if (!t1.includes(q) && !t2.includes(q) && !tourney.includes(q)) return false;
      }

      return true;
    });
  }, [matches, currentUserId, currentCasterId, selectedTournament, selectedStatus, searchQuery]);

  // Filter Available Matches
  const availableMatches = useMemo(() => {
    return matches.filter((m) => {
      if (m.is_completed) return false;

      const isAlreadyAssigned = (m.assigned_casters || []).some(
        (c: any) =>
          c.caster_id === currentCasterId ||
          c.casters?.user_id === currentUserId ||
          c.casters?.id === currentCasterId
      );
      if (isAlreadyAssigned) return false;

      if (selectedTournament !== "all" && m.tournament_id !== selectedTournament) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t1 = (m.team1?.name || "").toLowerCase();
        const t2 = (m.team2?.name || "").toLowerCase();
        const tourney = (m.tournaments?.name || "").toLowerCase();
        if (!t1.includes(q) && !t2.includes(q) && !tourney.includes(q)) return false;
      }

      return true;
    });
  }, [matches, currentUserId, currentCasterId, selectedTournament, searchQuery]);

  // Stats Counters
  const stats = useMemo(() => {
    const allMy = matches.filter((m) =>
      (m.assigned_casters || []).some(
        (c: any) =>
          c.caster_id === currentCasterId ||
          c.casters?.user_id === currentUserId ||
          c.casters?.id === currentCasterId
      )
    );
    const live = allMy.filter((m) => m.is_live).length;
    const upcoming = allMy.filter((m) => !m.is_live && !m.is_completed).length;
    const completed = allMy.filter((m) => m.is_completed).length;

    return { total: allMy.length, live, upcoming, completed };
  }, [matches, currentUserId, currentCasterId]);

  const toggleRoster = (matchId: string) => {
    setExpandedRosters((prev) => ({
      ...prev,
      [matchId]: !prev[matchId],
    }));
  };

  // Copy Lineup for Stream
  const handleCopyLineup = (match: any) => {
    const t1 = parseTeamData(match.team1);
    const t2 = parseTeamData(match.team2);

    const t1Countries = t1.countries.map((c: any) => c.name).join(", ");
    const t2Countries = t2.countries.map((c: any) => c.name).join(", ");

    const t1Roster = (match.team1?.team_members || [])
      .map((p: any) => `  • ${p.name} (${parsePlayerRoleTitle(p.role)}) ${p.l4d2_playtime_hours ? `[${p.l4d2_playtime_hours}h]` : ""}`)
      .join("\n");

    const t2Roster = (match.team2?.team_members || [])
      .map((p: any) => `  • ${p.name} (${parsePlayerRoleTitle(p.role)}) ${p.l4d2_playtime_hours ? `[${p.l4d2_playtime_hours}h]` : ""}`)
      .join("\n");

    const maps = Array.isArray(match.selected_maps) && match.selected_maps.length > 0
      ? match.selected_maps.join(" ➔ ")
      : "Por definir en Map Veto";

    const casterName = application?.alias || caster?.alias || session?.user?.name || "Caster Oficial";
    const assignedStream = match.assigned_casters?.[0]?.stream_url || caster?.twitch_channel || "";

    const textToCopy = `[FICHA DE TRANSMISIÓN OFICIAL]
=============================
TORNEO: ${match.tournaments?.name || "Torneo L4D2"}
PARTIDO: ${match.team1?.name || "Equipo 1"} ${t1Countries ? `(${t1Countries})` : ""} vs ${match.team2?.name || "Equipo 2"} ${t2Countries ? `(${t2Countries})` : ""}
ESTADO: ${match.is_live ? "EN VIVO" : match.is_completed ? "FINALIZADO" : "PRÓXIMO"}
MAPAS: ${maps}
CASTER: ${casterName}
${assignedStream ? `TRANSMISIÓN: ${assignedStream}` : ""}
=============================

ROSTER ${match.team1?.name || "Equipo 1"}:
${t1Roster || "  • Sin jugadores registrados"}

ROSTER ${match.team2?.name || "Equipo 2"}:
${t2Roster || "  • Sin jugadores registrados"}
=============================`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedMatchId(match.id);
    toast.success("¡Ficha del match copiada al portapapeles para tu transmisión!");
    setTimeout(() => setCopiedMatchId(null), 3000);
  };

  const handleShareProfile = () => {
    const casterName = application?.alias || caster?.alias || session?.user?.name || "Caster Oficial";
    const twitch = caster?.twitch_channel || application?.twitch_channel;
    const kick = caster?.kick_channel || application?.kick_channel;
    const stream = twitch ? `https://twitch.tv/${twitch}` : kick ? `https://kick.com/${kick}` : window.location.href;

    navigator.clipboard.writeText(`Sigue las transmisiones oficiales de Left 4 Dead 2 narradas por ${casterName}: ${stream}`);
    setCopiedProfile(true);
    toast.success("¡Enlace de caster copiado al portapapeles!");
    setTimeout(() => setCopiedProfile(false), 3000);
  };

  const openStreamManager = (match: any) => {
    const defaultStream =
      match.assigned_casters?.[0]?.stream_url ||
      (caster?.twitch_channel ? `https://twitch.tv/${caster.twitch_channel}` : "") ||
      (caster?.kick_channel ? `https://kick.com/${caster.kick_channel}` : "") ||
      (application?.twitch_channel ? `https://twitch.tv/${application.twitch_channel}` : "") ||
      "";

    setStreamModal({
      isOpen: true,
      match,
      streamUrl: defaultStream,
      startLiveNow: match.is_live || match.status === "in_progress",
      isSubmitting: false,
    });
  };

  const handleSaveStream = async () => {
    if (!streamModal.match?.id) return;
    setStreamModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const res = await fetch(`/api/matches/${streamModal.match.id}/caster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamUrl: streamModal.streamUrl.trim(),
          startStreamNow: streamModal.startLiveNow,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar la transmisión.");
      }

      toast.success(data.message || "Transmisión vinculada al match correctamente.");
      setStreamModal((prev) => ({ ...prev, isOpen: false }));
      fetchMatches();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar transmisión.");
    } finally {
      setStreamModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Match Status update (Pause stream / Start stream)
  const handleSetMatchStatus = async (matchId: string, status: string) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo actualizar el estado del partido.");
      } else {
        toast.success(
          status === "in_progress"
            ? "Partido iniciado EN VIVO."
            : "Transmisión pausada exitosamente."
        );
        fetchMatches();
      }
    } catch (e) {
      toast.error("Error de red al actualizar estado.");
    }
  };

  const handleOpenFinalizeMatch = (match: any) => {
    setScoreModal({
      isOpen: true,
      match,
      team1: match.team1 || { id: match.team1_id, name: match.team1_id ? "Equipo 1" : "Por Definir" },
      team2: match.team2 || { id: match.team2_id, name: match.team2_id ? "Equipo 2" : "Por Definir" },
      isSaving: false,
    });
  };

  const handleSaveScore = async (data: { score1: number; score2: number; winner_id: string }) => {
    if (!scoreModal.match) return;
    setScoreModal((prev) => ({ ...prev, isSaving: true }));
    try {
      const res = await fetch(`/api/matches/${scoreModal.match.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Error al registrar el resultado.");
      } else {
        toast.success("Resultado guardado y partido finalizado exitosamente.");
        setScoreModal({ isOpen: false, match: null, team1: null, team2: null, isSaving: false });
        fetchMatches();
      }
    } catch (e) {
      toast.error("Error de red al registrar el resultado.");
    } finally {
      setScoreModal((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // Choose Maps Handlers
  const handleOpenChooseMapModal = (match: any) => {
    setChooseMapModal({
      isOpen: true,
      match,
      isSaving: false,
    });
  };

  const handleSaveChosenMaps = async (selectedMaps: string[]) => {
    if (!chooseMapModal.match) return;
    setChooseMapModal((prev) => ({ ...prev, isSaving: true }));
    try {
      const res = await fetch(`/api/matches/${chooseMapModal.match.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedMaps }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo actualizar los mapas.");
      } else {
        toast.success("Mapas del partido actualizados correctamente.");
        setChooseMapModal({ isOpen: false, match: null, isSaving: false });
        fetchMatches();
      }
    } catch (e) {
      toast.error("Error al guardar los mapas.");
    } finally {
      setChooseMapModal((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // Generate Direct Veto for Match
  const handleGenerateVeto = (match: any) => {
    if (match.map_veto_id) {
      router.push(`/map-veto/${match.map_veto_id}`);
      return;
    }
    const templateJson = match.tournaments?.template_json || {};
    const roundMetadata = templateJson.round_metadata || {};
    const roundKey = match.is_upper ? `Upper Bracket-${match.round}` : `Lower Bracket-${match.round}`;
    const fallbackKey1 = `null-${match.round}`;
    const fallbackKey2 = `Ronda ${match.round}`;
    const fallbackKey3 = `${match.round}`;

    const rawMeta =
      roundMetadata[roundKey] ||
      roundMetadata[fallbackKey1] ||
      roundMetadata[fallbackKey2] ||
      roundMetadata[fallbackKey3];

    let format = "bo1";
    let maps: string[] = [];

    if (typeof rawMeta === "string") {
      const lower = rawMeta.toLowerCase();
      if (lower.includes("bo3") || lower.includes("3")) format = "bo3";
      else if (lower.includes("bo5") || lower.includes("5")) format = "bo5";
      else if (lower.includes("bo2") || lower.includes("to2") || lower.includes("2")) format = "to2";
    } else if (rawMeta && typeof rawMeta === "object") {
      format = rawMeta.format || "bo1";
      if (Array.isArray(rawMeta.maps) && rawMeta.maps.length > 0) {
        maps = rawMeta.maps;
      }
    }

    if (maps.length === 0 && Array.isArray(match.selected_maps) && match.selected_maps.length > 0) {
      maps = match.selected_maps;
    }

    const mapsParam = maps.length > 0 ? `&maps=${encodeURIComponent(maps.join(","))}` : "";
    router.push(
      `/map-veto?matchId=${match.id}&tournamentId=${match.tournament_id}&teamA=${match.team1_id}&teamB=${match.team2_id}&format=${format}${mapsParam}`
    );
  };

  const handleExecuteUnassign = async () => {
    if (!unassignModal.matchId) return;
    setUnassignModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const res = await fetch(`/api/matches/${unassignModal.matchId}/caster`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo desvincular del match.");
      }

      toast.success("Te has desvinculado de la transmisión de este match.");
      setUnassignModal({ isOpen: false, matchId: null, isSubmitting: false });
      fetchMatches();
    } catch (err: any) {
      toast.error(err.message || "Error al desvincularse.");
      setUnassignModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editForm.alias.trim() || editForm.alias.trim().length < 2) {
      toast.error("Por favor ingresa un alias de al menos 2 caracteres.");
      return;
    }

    const hasTwitch = Boolean(casterData?.hasTwitchLinked || casterData?.verifiedTwitchChannel || caster?.twitch_channel || application?.twitch_channel);
    const twitchUsername = casterData?.verifiedTwitchChannel || extractPlatformUsername(caster?.twitch_channel || application?.twitch_channel);

    const hasKick = Boolean(casterData?.hasKickLinked || casterData?.verifiedKickChannel || caster?.kick_channel || application?.kick_channel);
    const kickUsername = casterData?.verifiedKickChannel || extractPlatformUsername(caster?.kick_channel || application?.kick_channel);

    const finalTwitch = hasTwitch ? twitchUsername : null;
    const finalKick = hasKick ? kickUsername : null;
    const finalYoutube = editForm.youtube_channel.trim() || null;

    if (!finalTwitch && !finalKick && !finalYoutube) {
      toast.error("Debes vincular una cuenta de Twitch o Kick, o ingresar un canal de YouTube.");
      return;
    }

    setEditForm((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const res = await fetch("/api/casters/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: editForm.alias.trim(),
          bio: editForm.bio.trim(),
          twitch_channel: finalTwitch,
          kick_channel: finalKick,
          youtube_channel: finalYoutube,
          languages: editForm.languages,
          primary_platform: editForm.primary_platform,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al enviar la solicitud de cambio.");
      }

      toast.success(data.message || "Solicitud de actualización enviada a revisión.");
      await refreshCasterStatus();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar cambios de perfil.");
    } finally {
      setEditForm((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleCancelEdit = async () => {
    try {
      const res = await fetch("/api/casters/apply?action=cancel_edit", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Solicitud de edición cancelada. Tu perfil actual sigue activo.");
        await refreshCasterStatus();
      } else {
        toast.error(data.error || "No se pudo cancelar la solicitud.");
      }
    } catch (e) {
      toast.error("Error al cancelar la solicitud de edición.");
    }
  };

  // ─── Auth & Permissions fallback states ───────────────────────────────

  if (!mounted || sessionStatus === "loading" || (sessionStatus === "authenticated" && isCasterLoading)) {
    return (
      <div className="container" style={{ display: "flex", flexDirection: "column", minHeight: "80vh", justifyContent: "center", alignItems: "center" }}>
        <LoadingSpinner text={t("common.loading")} />
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="container" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            className="card animate-fadeIn"
            style={{ maxWidth: "520px", width: "100%", textAlign: "center", padding: "3rem 2rem" }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "var(--radius-xl)",
                background: "var(--primary-glow)",
                border: "1px solid rgba(111, 175, 58, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <Radio size={32} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.75rem" }}>
              {t("caster.hub_title")}
            </h1>
            <p className="text-muted" style={{ margin: "0 0 2rem", lineHeight: 1.6 }}>
              {t("caster.login_to_cast")}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/login" id="login-caster-hub-btn" className="btn btn-primary" style={{ fontWeight: "bold" }}>
                <Sparkles size={18} /> {t("auth.login_btn")}
              </Link>
              <Link href="/matches" id="view-matches-guest-btn" className="btn btn-secondary">
                <Swords size={18} /> {t("caster.explore_matches")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sessionStatus === "authenticated" && !isCaster) {
    return (
      <div className="container" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 0" }}>
          <div
            className="card animate-fadeIn"
            style={{ maxWidth: "640px", width: "100%", textAlign: "center", padding: "2.5rem 2rem" }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "var(--radius-xl)",
                background: "var(--primary-glow)",
                border: "1px solid rgba(111, 175, 58, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <Mic size={32} color="var(--primary)" />
            </div>

            <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.75rem" }}>
              {t("caster.join_team_title")}
            </h1>
            <p className="text-muted" style={{ margin: "0 0 2rem", lineHeight: 1.6 }}>
              {t("caster.join_team_desc")}
            </p>

            {/* Feature Highlights */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "2rem", textAlign: "left" }}>
              <div style={{ padding: "1rem", borderRadius: "var(--radius-lg)", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-light)" }}>
                <Tv size={16} color="var(--primary)" style={{ marginBottom: "0.5rem" }} />
                <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Stream en Brackets</div>
                <div className="text-muted" style={{ fontSize: "0.7rem", lineHeight: 1.4 }}>{t("caster.feature_brackets")}</div>
              </div>
              <div style={{ padding: "1rem", borderRadius: "var(--radius-lg)", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-light)" }}>
                <Users size={16} color="#9146FF" style={{ marginBottom: "0.5rem" }} />
                <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Rosters & Fichas</div>
                <div className="text-muted" style={{ fontSize: "0.7rem", lineHeight: 1.4 }}>{t("caster.feature_rosters")}</div>
              </div>
              <div style={{ padding: "1rem", borderRadius: "var(--radius-lg)", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-light)" }}>
                <ShieldCheck size={16} color="#facc15" style={{ marginBottom: "0.5rem" }} />
                <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.25rem" }}>{t("caster.feature_badge")}</div>
                <div className="text-muted" style={{ fontSize: "0.7rem", lineHeight: 1.4 }}>{t("caster.official_caster_badge")}</div>
              </div>
            </div>

            {application?.status === "pending" ? (
              <div
                style={{
                  background: "rgba(250, 204, 21, 0.1)",
                  border: "1px solid rgba(250, 204, 21, 0.3)",
                  padding: "1.25rem",
                  borderRadius: "var(--radius-lg)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  justifyContent: "center",
                }}
              >
                <Clock size={20} color="#facc15" />
                <div style={{ textAlign: "left" }}>
                  <strong style={{ color: "#facc15", display: "block" }}>{t("caster.pending_review_title")}</strong>
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {t("caster.pending_review_desc")}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/settings#caster" id="apply-caster-hub-btn" className="btn btn-primary" style={{ fontWeight: "bold" }}>
                  <Sparkles size={18} /> {t("caster.request_caster_role")}
                </Link>
                <Link href="/matches" id="explore-matches-hub-btn" className="btn btn-secondary">
                  <Swords size={18} /> {t("caster.explore_matches")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isPendingReview = application?.status === "pending";
  const casterDisplayName = application?.alias || caster?.alias || session?.user?.name || "Caster Oficial";

  // ─── Main Caster Hub Dashboard ────────────────────────────────────────

  return (
    <div className="container" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 0",
          marginBottom: "2rem",
          borderBottom: "1px solid var(--border-light)",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              background: "var(--primary-glow)",
              padding: "0.6rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Radio size={26} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.6rem", margin: 0, fontWeight: "bold" }}>
              <span className="text-gradient">Caster</span> Hub
            </h1>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              {t("caster.hub_desc")}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Share Profile */}
          <button
            onClick={handleShareProfile}
            id="btn-share-caster-profile"
            title={t("caster.share_profile_tooltip")}
            className="btn-icon"
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}
          >
            {copiedProfile ? <Check size={16} color="var(--primary)" /> : <Share2 size={16} />}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchMatches(true)}
            id="btn-refresh-caster-hub"
            title={t("common.refresh")}
            disabled={isRefreshing}
            className="btn-icon"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} style={isRefreshing ? { color: "var(--primary)" } : {}} />
          </button>
        </div>
      </header>

      {/* ─── Caster Profile Summary Card ──────────────────────── */}
      <div
        className="card"
        style={{
          marginBottom: "2rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <img
            src={
              session?.user?.image ||
              caster?.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(casterDisplayName)}&background=1B1E22&color=6FAF3A`
            }
            alt="Avatar"
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "var(--radius-lg)",
              objectFit: "cover",
              border: "2px solid var(--border-light)",
            }}
          />
          <div>
            <h2
              style={{
                margin: "0 0 0.25rem",
                fontSize: "1.15rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
              suppressHydrationWarning
            >
              <span>{casterDisplayName}</span>
              <VerifiedBadgeIcon size={18} color="var(--primary)" checkColor="#000" />
            </h2>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              {application?.bio || caster?.bio || t("caster.no_bio")}
            </p>
            {/* Streaming Channel Links */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              {(caster?.twitch_channel || application?.twitch_channel) && (
                <a
                  href={`https://twitch.tv/${extractPlatformUsername(caster?.twitch_channel || application?.twitch_channel)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#9146FF", textDecoration: "none", fontWeight: "bold", fontSize: "0.9rem" }}
                  title={`Twitch: ${extractPlatformUsername(caster?.twitch_channel || application?.twitch_channel)}`}
                >
                  <TwitchIcon size={14} /> {extractPlatformUsername(caster?.twitch_channel || application?.twitch_channel)}
                </a>
              )}
              {(caster?.kick_channel || application?.kick_channel) && (
                <a
                  href={`https://kick.com/${extractPlatformUsername(caster?.kick_channel || application?.kick_channel)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#53FC18", textDecoration: "none", fontWeight: "bold", fontSize: "0.9rem" }}
                  title={`Kick: ${extractPlatformUsername(caster?.kick_channel || application?.kick_channel)}`}
                >
                  <KickIcon size={14} /> {extractPlatformUsername(caster?.kick_channel || application?.kick_channel)}
                </a>
              )}
              {(caster?.youtube_channel || application?.youtube_channel) && (
                <a
                  href={formatYoutubeUrl(caster?.youtube_channel || application?.youtube_channel)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#FF0000", textDecoration: "none", fontWeight: "bold", fontSize: "0.9rem" }}
                  title={`YouTube: ${extractPlatformUsername(caster?.youtube_channel || application?.youtube_channel)}`}
                >
                  <YoutubeIcon size={14} /> {extractPlatformUsername(caster?.youtube_channel || application?.youtube_channel)}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center", padding: "0.5rem 1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", minWidth: "70px" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--primary)", fontFamily: "monospace" }}>{stats.total}</div>
            <div className="text-muted" style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "bold" }}>{t("caster.assigned_stat")}</div>
          </div>
          <div style={{ textAlign: "center", padding: "0.5rem 1rem", background: "rgba(239, 68, 68, 0.05)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239, 68, 68, 0.2)", minWidth: "70px" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#f87171", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
              {stats.live > 0 && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", animation: "fadeIn 1s ease infinite alternate" }} />}
              {stats.live}
            </div>
            <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "bold", color: "#fca5a5" }}>{t("matches.live_badge")}</div>
          </div>
          <div style={{ textAlign: "center", padding: "0.5rem 1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", minWidth: "70px" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#facc15", fontFamily: "monospace" }}>{stats.upcoming}</div>
            <div className="text-muted" style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "bold" }}>{t("matches.tab_upcoming")}</div>
          </div>
        </div>
      </div>

      {/* Pending Review Notice */}
      {isPendingReview && (
        <div
          className="animate-fadeIn"
          style={{
            marginBottom: "1.5rem",
            padding: "1rem 1.25rem",
            background: "rgba(250, 204, 21, 0.1)",
            border: "1px solid rgba(250, 204, 21, 0.3)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertCircle size={18} color="#facc15" />
            <div>
              <strong style={{ color: "#facc15" }}>{t("caster.changes_pending_notice")}</strong>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("profile_requests")}
            id="view-pending-request-banner-btn"
            className="btn btn-secondary text-sm"
            style={{ padding: "0.4rem 0.8rem" }}
          >
            {t("caster.tab_profile")}
          </button>
        </div>
      )}

      {/* ─── Tab Navigation ──────────────────────────────────── */}
      <div className="tab-container">
        <button
          onClick={() => setActiveTab("my_matches")}
          id="tab-btn-my-matches"
          className={`tab-btn ${activeTab === "my_matches" ? "active" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <Tv size={16} /> {t("caster.tab_my_matches")}
            <span className="badge" style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>{myMatches.length}</span>
            {stats.live > 0 && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("available_matches")}
          id="tab-btn-available-matches"
          className={`tab-btn ${activeTab === "available_matches" ? "active" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <Swords size={16} /> {t("caster.tab_available")}
            <span className="badge" style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>{availableMatches.length}</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab("profile_requests")}
          id="tab-btn-profile-requests"
          className={`tab-btn ${activeTab === "profile_requests" ? "active" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <Settings size={16} /> {t("caster.tab_profile")}
            {isPendingReview && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#facc15" }} />}
          </span>
        </button>
      </div>

      {/* ─── TAB 1: MIS MATCHES ──────────────────────────────── */}
      {activeTab === "my_matches" && (
        <div className="animate-fadeIn">
          {/* Filter Bar */}
          <div
            className="card"
            style={{
              marginBottom: "2rem",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              background: "rgba(0, 0, 0, 0.3)",
              backdropFilter: "blur(8px)",
            }}
          >
            {/* Status Filters */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { id: "all" as const, label: t("common.all"), count: stats.total, icon: <Swords size={16} /> },
                { id: "live" as const, label: t("matches.live_badge"), count: stats.live, icon: <Radio size={16} /> },
                { id: "upcoming" as const, label: t("matches.tab_upcoming"), count: stats.upcoming, icon: <Clock size={16} /> },
                { id: "completed" as const, label: t("matches.tab_completed"), count: stats.completed, icon: <CheckCircle2 size={16} /> },
              ].map((pill) => (
                <button
                  key={pill.id}
                  id={`pill-filter-${pill.id}`}
                  onClick={() => setSelectedStatus(pill.id)}
                  className={`btn ${selectedStatus === pill.id ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}
                >
                  {pill.icon} {pill.label} ({pill.count})
                </button>
              ))}
            </div>

            {/* Search & Tournament Filter */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              {tournaments.length > 0 && (
                <div style={{ flex: "1 1 200px" }}>
                  <label className="text-muted" style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.3rem" }}>
                    {t("matches.active_tournament")}
                  </label>
                  <select
                    className="input-base"
                    value={selectedTournament}
                    onChange={(e) => setSelectedTournament(e.target.value)}
                    style={{ width: "100%", fontSize: "0.9rem", padding: "0.6rem" }}
                  >
                    <option value="all">{t("matches.filter_all_tournaments")}</option>
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ flex: "2 1 250px" }}>
                <label className="text-muted" style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.3rem" }}>
                  {t("matches.search_placeholder")}
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Search size={18} style={{ position: "absolute", left: "12px", color: "var(--text-muted)", pointerEvents: "none" }} />
                  <input
                    type="text"
                    className="input-base"
                    placeholder={t("matches.search_match_placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "100%", paddingLeft: "2.4rem", fontSize: "0.9rem" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Matches List */}
          {isLoadingMatches && !cachedCasterDashboardData ? (
            <LoadingSpinner text={t("common.loading")} />
          ) : myMatches.length === 0 ? (
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
                  margin: "0 auto 1rem",
                }}
              >
                <Tv size={28} color="var(--text-muted)" />
              </div>
              <h3 style={{ margin: "0 0 0.5rem" }}>{t("caster.no_my_matches")}</h3>
              <p className="text-muted text-sm" style={{ margin: "0 0 1.5rem" }}>
                {stats.total === 0
                  ? t("caster.no_my_matches_desc")
                  : t("matches.no_matches_desc")}
              </p>
              {stats.total === 0 && (
                <button
                  onClick={() => setActiveTab("available_matches")}
                  id="browse-available-matches-btn"
                  className="btn btn-primary"
                >
                  <Swords size={16} /> {t("caster.browse_available_btn")}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {myMatches.map((match) => (
                <CasterMatchCard
                  key={match.id}
                  match={match}
                  currentUserId={currentUserId}
                  currentCasterId={currentCasterId}
                  isExpanded={!!expandedRosters[match.id]}
                  onToggleRoster={toggleRoster}
                  onCopyLineup={handleCopyLineup}
                  isCopied={copiedMatchId === match.id}
                  onOpenStreamManager={openStreamManager}
                  onUnassign={(matchId: string) => setUnassignModal({ isOpen: true, matchId, isSubmitting: false })}
                  onPauseStream={(matchId: string) => handleSetMatchStatus(matchId, "pending")}
                  onStartStream={(matchId: string) => handleSetMatchStatus(matchId, "in_progress")}
                  onFinalizeMatch={handleOpenFinalizeMatch}
                  onChooseMaps={handleOpenChooseMapModal}
                  onGenerateVeto={handleGenerateVeto}
                  communityBans={communityBans}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: MATCHES DISPONIBLES ──────────────────────── */}
      {activeTab === "available_matches" && (
        <div className="animate-fadeIn">
          {/* Info Banner */}
          <div
            className="glass-panel"
            style={{
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-lg)",
                background: "rgba(96, 165, 250, 0.15)",
                border: "1px solid rgba(96, 165, 250, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Swords size={20} color="#60a5fa" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>{t("caster.available_banner_title")}</h3>
              <p className="text-muted text-sm" style={{ margin: "0.25rem 0 0" }}>
                {t("caster.available_banner_desc")}
              </p>
            </div>
          </div>

          {isLoadingMatches && !cachedCasterDashboardData ? (
            <LoadingSpinner text={t("common.loading")} />
          ) : availableMatches.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
              <CheckCircle2 size={40} color="var(--primary)" style={{ margin: "0 auto 1rem", display: "block" }} />
              <h3 style={{ margin: "0 0 0.5rem" }}>{t("caster.all_covered_title")}</h3>
              <p className="text-muted text-sm" style={{ margin: 0 }}>
                {t("caster.all_covered_desc")}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {availableMatches.map((match) => {
                const t1Data = parseTeamData(match.team1);
                const t2Data = parseTeamData(match.team2);

                return (
                  <div
                    key={match.id}
                    className="card"
                    style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                  >
                    {/* Top Bar */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-light)", marginBottom: "0.75rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: "bold" }}>
                          <Trophy size={13} color="var(--primary)" /> {match.tournaments?.name || "Torneo"}
                        </span>
                        <MatchFormattedDate date={match.scheduled_at} />
                      </div>

                      {/* VS Card */}
                      <div
                        style={{
                          background: "rgba(0, 0, 0, 0.25)",
                          borderRadius: "var(--radius-md)",
                          padding: "0.75rem",
                          margin: "0.75rem 0",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.6rem",
                          border: "1px solid var(--border-light)",
                        }}
                      >
                        {/* Team 1 */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <img
                            src={t1Data.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.team1?.name || "T1")}&background=252A30&color=6FAF3A`}
                            alt={match.team1?.name}
                            style={{ width: "36px", height: "36px", borderRadius: "var(--radius-md)", objectFit: "cover", border: "1px solid var(--border-light)", flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--text-main)", wordBreak: "break-word", lineHeight: 1.3 }}>
                                {match.team1?.name}
                              </span>
                              {t1Data.tag && (
                                <code style={{ fontSize: "0.65rem", color: "var(--primary)", background: "rgba(0,0,0,0.3)", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                                  [{t1Data.tag}]
                                </code>
                              )}
                            </div>
                            {t1Data.countries.length > 0 && (
                              <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                                {t1Data.countries.map((c: any) => (
                                  <span key={c.code} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem" }} className="text-muted">
                                    <img src={c.flag} alt={c.name} title={c.name} style={{ width: "13px", height: "9px", borderRadius: "2px" }} />
                                    {c.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* VS Divider */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ flex: 1, height: "1px", background: "var(--border-light)" }} />
                          <span style={{ fontSize: "0.65rem", fontWeight: "bold", color: "var(--text-muted)", background: "rgba(255,255,255,0.05)", padding: "0.15rem 0.45rem", borderRadius: "4px", textTransform: "uppercase" }}>
                            VS
                          </span>
                          <div style={{ flex: 1, height: "1px", background: "var(--border-light)" }} />
                        </div>

                        {/* Team 2 */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <img
                            src={t2Data.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.team2?.name || "T2")}&background=252A30&color=6FAF3A`}
                            alt={match.team2?.name}
                            style={{ width: "36px", height: "36px", borderRadius: "var(--radius-md)", objectFit: "cover", border: "1px solid var(--border-light)", flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--text-main)", wordBreak: "break-word", lineHeight: 1.3 }}>
                                {match.team2?.name}
                              </span>
                              {t2Data.tag && (
                                <code style={{ fontSize: "0.65rem", color: "var(--primary)", background: "rgba(0,0,0,0.3)", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                                  [{t2Data.tag}]
                                </code>
                              )}
                            </div>
                            {t2Data.countries.length > 0 && (
                              <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                                {t2Data.countries.map((c: any) => (
                                  <span key={c.code} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem" }} className="text-muted">
                                    <img src={c.flag} alt={c.name} title={c.name} style={{ width: "13px", height: "9px", borderRadius: "2px" }} />
                                    {c.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--border-light)", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span className="text-muted text-xs">
                        {match.assigned_casters?.length > 0
                          ? `${t("caster.broadcasted_by", { caster: match.assigned_casters[0].casters?.alias || "Caster" })}`
                          : t("caster.no_caster_assigned")}
                      </span>
                      <button
                        onClick={() => openStreamManager(match)}
                        id={`claim-available-match-${match.id}`}
                        className="btn btn-primary"
                        style={{ fontSize: "0.8rem", padding: "0.45rem 0.75rem" }}
                      >
                        <Radio size={13} /> {t("caster.cast_this_match_btn")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: MI PERFIL & SOLICITUD ────────────────────── */}
      {activeTab === "profile_requests" && (
        <div className="animate-fadeIn" style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* Active Public Profile Card */}
          <div className="card" style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid var(--border-light)", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <UserCheck size={20} color="var(--primary)" /> {t("caster.public_profile_title")}
                </h2>
                <p className="text-muted text-xs" style={{ margin: "0.25rem 0 0" }}>
                  {t("caster.public_profile_desc")}
                </p>
              </div>
              <span className="badge" style={{ background: "var(--primary-glow)", color: "var(--primary)", border: "1px solid rgba(111, 175, 58, 0.3)" }}>
                {t("caster.approved_badge")}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1.5rem", alignItems: "start" }}>
              <div style={{ textAlign: "center" }}>
                <img
                  src={
                    session?.user?.image ||
                    caster?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(casterDisplayName)}&background=1B1E22&color=6FAF3A`
                  }
                  alt="Avatar"
                  style={{ width: "80px", height: "80px", borderRadius: "var(--radius-lg)", objectFit: "cover", border: "2px solid var(--border-light)" }}
                />
                <div style={{ fontWeight: "bold", fontSize: "1rem", marginTop: "0.5rem" }} suppressHydrationWarning>{casterDisplayName}</div>
                <div className="text-muted text-xs" suppressHydrationWarning>{session?.user?.email}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <span className="text-muted" style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.05em" }}>{t("caster.bio_label")}:</span>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", lineHeight: 1.5 }}>
                    {caster?.bio || application?.bio || t("caster.no_bio")}
                  </p>
                </div>

                <div>
                  <span className="text-muted" style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.05em" }}>{t("caster.channels_label")}:</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.35rem" }}>
                    {(caster?.twitch_channel || application?.twitch_channel) && (
                      <a
                        href={`https://twitch.tv/${extractPlatformUsername(caster?.twitch_channel || application?.twitch_channel)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#9146FF", textDecoration: "none", fontWeight: "bold", fontSize: "0.85rem" }}
                        title={`Twitch: ${extractPlatformUsername(caster?.twitch_channel || application?.twitch_channel)}`}
                      >
                        <TwitchIcon size={14} /> {extractPlatformUsername(caster?.twitch_channel || application?.twitch_channel)}
                      </a>
                    )}
                    {(caster?.kick_channel || application?.kick_channel) && (
                      <a
                        href={`https://kick.com/${extractPlatformUsername(caster?.kick_channel || application?.kick_channel)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#53FC18", textDecoration: "none", fontWeight: "bold", fontSize: "0.85rem" }}
                        title={`Kick: ${extractPlatformUsername(caster?.kick_channel || application?.kick_channel)}`}
                      >
                        <KickIcon size={14} /> {extractPlatformUsername(caster?.kick_channel || application?.kick_channel)}
                      </a>
                    )}
                    {(caster?.youtube_channel || application?.youtube_channel) && (
                      <a
                        href={formatYoutubeUrl(caster?.youtube_channel || application?.youtube_channel)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#FF0000", textDecoration: "none", fontWeight: "bold", fontSize: "0.85rem" }}
                        title={`YouTube: ${extractPlatformUsername(caster?.youtube_channel || application?.youtube_channel)}`}
                      >
                        <YoutubeIcon size={14} /> {extractPlatformUsername(caster?.youtube_channel || application?.youtube_channel)}
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-muted" style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.05em" }}>{t("caster.languages_label")}:</span>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
                    {normalizeLanguages(
                      caster?.languages || application?.languages || casterData?.languages || (casterData?.application as any)?.languages || (casterData?.caster as any)?.languages
                    ).map((lang: string) => (
                      <span key={lang} className="badge" style={{ background: "rgba(111, 175, 58, 0.12)", color: "var(--primary)", border: "1px solid rgba(111, 175, 58, 0.3)" }}>
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form to Request Changes */}
          <div className="card">
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Send size={18} color="#facc15" /> {t("caster.request_changes_title")}
              </h3>
              <p className="text-muted text-sm" style={{ margin: "0.25rem 0 0" }}>
                {t("caster.request_changes_desc")}
              </p>
            </div>

            {isPendingReview && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem",
                  background: "rgba(250, 204, 21, 0.1)",
                  border: "1px solid rgba(250, 204, 21, 0.3)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  fontSize: "0.85rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <Clock size={18} color="#facc15" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                  <div>
                    <strong style={{ color: "#facc15" }}>{t("caster.pending_review_title")}</strong>
                    <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                      {t("caster.changes_pending_notice")}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "0.4rem 0.85rem", whiteSpace: "nowrap" }}
                >
                  {t("common.cancel")}
                </button>
              </div>
            )}

            {!isPendingReview && application?.reviewer_notes && isCaster && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem 1.25rem",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  fontSize: "0.85rem",
                }}
              >
                <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ color: "#ef4444" }}>Aviso: Solicitud de edición no aprobada</strong>
                  <div style={{ color: "var(--foreground)", marginTop: "0.25rem", fontSize: "0.85rem" }}>
                    {application.reviewer_notes}
                  </div>
                  <div className="text-muted text-xs" style={{ marginTop: "0.4rem" }}>
                    Tus datos actuales no fueron modificados y tu perfil de Caster Oficial sigue 100% activo. Si lo deseas, puedes volver a intentar o contactar al administrador.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Alias */}
              <div>
                <label className="text-muted" style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                  {t("caster.caster_alias_label")} <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  id="input-caster-alias"
                  placeholder="Ej. ProCaster, L4D2King"
                  value={editForm.alias}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, alias: e.target.value }))}
                  className="input-base"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-muted" style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                  {t("caster.caster_bio_label")}
                </label>
                <textarea
                  rows={3}
                  id="input-caster-bio"
                  placeholder={t("caster.bio_placeholder")}
                  value={editForm.bio}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className="input-base"
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Streaming Channels (Locked OAuth for Twitch/Kick, Editable URL for YouTube) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
                {/* Twitch */}
                <div>
                  <label className="text-muted" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <TwitchIcon size={14} color="#9146FF" /> Twitch
                    </span>
                    {Boolean(casterData?.hasTwitchLinked || casterData?.verifiedTwitchChannel || caster?.twitch_channel || application?.twitch_channel) ? (
                      <span style={{ color: "#9146FF", fontSize: "0.7rem", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <ShieldCheck size={13} /> {t("settings.linked_badge")}
                      </span>
                    ) : (
                      <span style={{ color: "var(--warning)", fontSize: "0.7rem" }}>{t("common.none")}</span>
                    )}
                  </label>

                  {Boolean(casterData?.hasTwitchLinked || casterData?.verifiedTwitchChannel || caster?.twitch_channel || application?.twitch_channel) ? (
                    <div
                      style={{
                        background: "rgba(145, 70, 255, 0.08)",
                        border: "1px solid rgba(145, 70, 255, 0.3)",
                        borderRadius: "8px",
                        padding: "0.6rem 0.85rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", overflow: "hidden" }}>
                        <TwitchIcon size={16} color="#9146FF" />
                        <span style={{ color: "#9146FF", fontWeight: "bold", fontSize: "0.9rem" }}>
                          {casterData?.verifiedTwitchChannel || extractPlatformUsername(caster?.twitch_channel || application?.twitch_channel)}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontStyle: "italic" }}>
                        {t("caster.locked_by_oauth")}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => signIn("twitch")}
                      className="btn"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        padding: "0.6rem 0.85rem",
                        borderRadius: "8px",
                        background: "rgba(145, 70, 255, 0.1)",
                        border: "1px dashed rgba(145, 70, 255, 0.4)",
                        color: "#bf94ff",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      <TwitchIcon size={16} color="#9146FF" /> {t("settings.connect_twitch")}
                    </button>
                  )}
                </div>

                {/* Kick */}
                <div>
                  <label className="text-muted" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <KickIcon size={14} color="#53FC18" /> Kick
                    </span>
                    {Boolean(casterData?.hasKickLinked || casterData?.verifiedKickChannel || caster?.kick_channel || application?.kick_channel) ? (
                      <span style={{ color: "#53FC18", fontSize: "0.7rem", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <ShieldCheck size={13} /> {t("settings.linked_badge")}
                      </span>
                    ) : (
                      <span style={{ color: "var(--warning)", fontSize: "0.7rem" }}>{t("common.none")}</span>
                    )}
                  </label>

                  {Boolean(casterData?.hasKickLinked || casterData?.verifiedKickChannel || caster?.kick_channel || application?.kick_channel) ? (
                    <div
                      style={{
                        background: "rgba(83, 252, 24, 0.08)",
                        border: "1px solid rgba(83, 252, 24, 0.3)",
                        borderRadius: "8px",
                        padding: "0.6rem 0.85rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", overflow: "hidden" }}>
                        <KickIcon size={16} color="#53FC18" />
                        <span style={{ color: "#53FC18", fontWeight: "bold", fontSize: "0.9rem" }}>
                          {casterData?.verifiedKickChannel || extractPlatformUsername(caster?.kick_channel || application?.kick_channel)}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontStyle: "italic" }}>
                        {t("caster.locked_by_oauth")}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => signIn("kick")}
                      className="btn"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        padding: "0.6rem 0.85rem",
                        borderRadius: "8px",
                        background: "rgba(83, 252, 24, 0.1)",
                        border: "1px dashed rgba(83, 252, 24, 0.4)",
                        color: "#53FC18",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      <KickIcon size={16} color="#53FC18" /> {t("settings.connect_kick")}
                    </button>
                  )}
                </div>

                {/* YouTube (Configured via URL / Handle) */}
                <div>
                  <label className="text-muted" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <YoutubeIcon size={14} color="#FF0000" /> YouTube
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>Por URL / @handle</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      id="input-caster-youtube"
                      placeholder="ej. @miCanal o https://youtube.com/@miCanal"
                      value={editForm.youtube_channel}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, youtube_channel: e.target.value }))}
                      className="input-base"
                      style={{ width: "100%", paddingLeft: "2.2rem" }}
                    />
                    <div style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                      <YoutubeIcon size={15} color="#FF0000" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform & Languages */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="text-muted" style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                    {t("caster.primary_platform_label")}
                  </label>
                  <select
                    value={editForm.primary_platform}
                    id="select-caster-platform"
                    onChange={(e) => setEditForm((prev) => ({ ...prev, primary_platform: e.target.value as any }))}
                    className="input-base"
                  >
                    <option value="twitch">Twitch</option>
                    <option value="kick">Kick</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted" style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                    {t("caster.languages_label")}
                  </label>
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", paddingTop: "0.4rem" }}>
                    {MAIN_CASTER_LANGUAGES.map((lang) => {
                      const isSelected = editForm.languages.includes(lang);
                      return (
                        <label
                          key={lang}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 0.95rem",
                            borderRadius: "8px",
                            cursor: "pointer",
                            userSelect: "none",
                            fontSize: "0.85rem",
                            fontWeight: isSelected ? "bold" : "500",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            background: isSelected
                              ? "rgba(111, 175, 58, 0.15)"
                              : "rgba(255, 255, 255, 0.03)",
                            border: isSelected
                              ? "1px solid var(--primary)"
                              : "1px solid rgba(255, 255, 255, 0.08)",
                            boxShadow: isSelected
                              ? "0 0 14px rgba(111, 175, 58, 0.35), inset 0 0 8px rgba(111, 175, 58, 0.1)"
                              : "none",
                            color: isSelected ? "#ffffff" : "var(--muted)",
                            transform: isSelected ? "translateY(-1px)" : "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm((prev) => ({ ...prev, languages: normalizeLanguages([...prev.languages, lang]) }));
                              } else {
                                setEditForm((prev) => ({
                                  ...prev,
                                  languages: prev.languages.filter((l) => l !== lang),
                                }));
                              }
                            }}
                            style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
                          />
                          <div
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "4px",
                              border: isSelected ? "1px solid var(--primary)" : "1px solid rgba(255, 255, 255, 0.2)",
                              background: isSelected ? "var(--primary)" : "rgba(0, 0, 0, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {isSelected && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#000"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span>{lang}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div style={{ paddingTop: "1.25rem", borderTop: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={editForm.isSubmitting}
                  id="submit-caster-changes-btn"
                  className="btn btn-primary"
                  style={{ fontWeight: "bold" }}
                >
                  {editForm.isSubmitting ? (
                    <><RefreshCw size={16} className="animate-spin" /> {t("common.loading")}</>
                  ) : (
                    <><Send size={16} /> {t("caster.submit_request_btn")}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: GESTIONAR TRANSMISIÓN ────────────────────── */}
      {streamModal.isOpen && streamModal.match && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setStreamModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="card animate-modalFadeIn"
            style={{ width: "100%", maxWidth: "480px", padding: "1.75rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid var(--border-light)", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Play size={18} color="var(--primary)" /> {t("caster.stream_modal_title")}
              </h3>
              <button
                onClick={() => setStreamModal((prev) => ({ ...prev, isOpen: false }))}
                id="close-stream-modal-x"
                aria-label="Cerrar modal"
                className="btn-icon"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-light)", marginBottom: "1rem" }}>
              <strong style={{ fontSize: "0.9rem" }}>{streamModal.match.team1?.name} vs {streamModal.match.team2?.name}</strong>
              <div className="text-muted text-xs" style={{ marginTop: "0.2rem" }}>{streamModal.match.tournaments?.name}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="text-muted" style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  {t("matches.broadcast_account_label")}
                </label>

                {/* 1-Click Selectable Linked Accounts */}
                {userLinkedAccounts.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    {userLinkedAccounts.map((acc) => {
                      const isSelected =
                        streamModal.streamUrl === acc.url ||
                        streamModal.streamUrl === acc.channelName ||
                        (streamModal.streamUrl && streamModal.streamUrl.toLowerCase().includes(acc.channelName.toLowerCase()));
                      return (
                        <button
                          key={acc.platform}
                          type="button"
                          onClick={() =>
                            setStreamModal((prev) => ({
                              ...prev,
                              streamUrl: acc.url,
                            }))
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.75rem 1rem",
                            borderRadius: "var(--radius-md)",
                            background: isSelected ? "rgba(111, 175, 58, 0.15)" : "rgba(255, 255, 255, 0.03)",
                            border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-light)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            textAlign: "left",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ color: acc.color, display: "flex", alignItems: "center" }}>
                              {acc.icon}
                            </span>
                            <div>
                              <div style={{ fontWeight: "bold", fontSize: "0.85rem", color: "var(--text-main)" }}>
                                {acc.label} <span className="text-muted" style={{ fontWeight: "normal", fontSize: "0.75rem" }}>({acc.channelName})</span>
                              </div>
                              <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                                {acc.url}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              border: isSelected ? "2px solid var(--primary)" : "2px solid var(--border-light)",
                              background: isSelected ? "var(--primary)" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && <span style={{ color: "#000", fontSize: "12px", fontWeight: "bold" }}>✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>
                    {t("matches.no_caster_channels")}
                  </p>
                )}

                {/* Custom URL Input fallback */}
                <details style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  <summary style={{ cursor: "pointer", marginBottom: "0.4rem", userSelect: "none" }}>
                    {userLinkedAccounts.length > 0 ? t("matches.custom_url_link_label") : t("matches.custom_url_input_label")}
                  </summary>
                  <input
                    type="text"
                    id="modal-stream-url"
                    placeholder="https://twitch.tv/mi_canal o https://kick.com/mi_canal"
                    value={streamModal.streamUrl}
                    onChange={(e) => setStreamModal((prev) => ({ ...prev, streamUrl: e.target.value }))}
                    className="input-base"
                    style={{ width: "100%", marginTop: "0.35rem" }}
                  />
                </details>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-light)",
                }}
              >
                <input
                  type="checkbox"
                  id="modal-stream-live-now"
                  checked={streamModal.startLiveNow}
                  onChange={(e) => setStreamModal((prev) => ({ ...prev, startLiveNow: e.target.checked }))}
                  style={{ accentColor: "var(--primary)", width: "16px", height: "16px" }}
                />
                <div>
                  <div style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Radio size={13} color="#ef4444" /> {t("matches.start_stream_now_checkbox")}
                  </div>
                  <p className="text-muted" style={{ margin: "0.15rem 0 0", fontSize: "0.7rem" }}>
                    {t("matches.start_stream_now_hint")}
                  </p>
                </div>
              </label>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem" }}>
                <button
                  onClick={() => setStreamModal((prev) => ({ ...prev, isOpen: false }))}
                  id="btn-cancel-stream"
                  className="btn btn-secondary"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleSaveStream}
                  disabled={streamModal.isSubmitting}
                  id="btn-save-stream"
                  className="btn btn-primary"
                  style={{ fontWeight: "bold" }}
                >
                  {streamModal.isSubmitting ? (
                    <><RefreshCw size={14} className="animate-spin" /> {t("common.saving")}</>
                  ) : (
                    <><Check size={14} /> {t("common.save")}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRM MODAL: DESVINCULAR ─────────────────────── */}
      <ConfirmModal
        isOpen={unassignModal.isOpen}
        title={t("caster.unassign_modal_title")}
        message={t("caster.unassign_modal_desc")}
        confirmText={t("caster.unassign_confirm_btn")}
        cancelText={t("common.cancel")}
        isDanger={true}
        onConfirm={handleExecuteUnassign}
        onCancel={() => setUnassignModal({ isOpen: false, matchId: null, isSubmitting: false })}
      />

      {/* ─── SCORE MODAL: FINALIZAR / REPORTAR RESULTADO ─────── */}
      {scoreModal.isOpen && scoreModal.match && (
        <ScoreModal
          match={scoreModal.match}
          team1={scoreModal.team1}
          team2={scoreModal.team2}
          onClose={() => setScoreModal({ isOpen: false, match: null, team1: null, team2: null, isSaving: false })}
          onSave={handleSaveScore}
          isSaving={scoreModal.isSaving}
        />
      )}

      {/* ─── CHOOSE MAP MODAL: ELEGIR MAPAS ─────────────────── */}
      {chooseMapModal.isOpen && chooseMapModal.match && (
        <ChooseMapModal
          isOpen={chooseMapModal.isOpen}
          match={chooseMapModal.match}
          onClose={() => setChooseMapModal({ isOpen: false, match: null, isSaving: false })}
          onSave={handleSaveChosenMaps}
          isSaving={chooseMapModal.isSaving}
        />
      )}
    </div>
  );
}

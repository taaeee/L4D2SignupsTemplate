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
  ExternalLink,
  X,
  Play,
  Calendar,
  MapPin,
  Edit,
  Shuffle,
  Tv
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { supabase } from "@/lib/supabase";

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

// Kick SVG Icon
const KickIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3 3h6v5.5l4-5.5h7l-6.5 8.5L20 21h-7l-4-6v6H3V3z" />
  </svg>
);

// YouTube SVG Icon
const YoutubeIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// Helpers to format streaming URLs properly
const formatYoutubeUrl = (channelOrUrl?: string | null) => {
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

const formatYoutubeEmbedUrl = (channelOrUrl?: string | null) => {
  if (!channelOrUrl) return "";
  const trimmed = channelOrUrl.trim();
  if (trimmed.includes("/embed/")) return trimmed;
  const videoMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);
  if (videoMatch && videoMatch[1]) {
    return `https://www.youtube.com/embed/${videoMatch[1]}?autoplay=1`;
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/embed/${trimmed}?autoplay=1`;
  }
  return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(trimmed)}&autoplay=1`;
};

export const resolveStreamInfo = (streamUrl?: string | null, casterObj?: any) => {
  const raw = (streamUrl || "").trim();
  const twitchChan = (casterObj?.twitch_channel || "").trim();
  const kickChan = (casterObj?.kick_channel || "").trim();
  const ytChan = (casterObj?.youtube_channel || "").trim();
  const primaryPlatform = casterObj?.primary_platform || "";

  let platform: "twitch" | "kick" | "youtube" = "twitch";
  let channel = "";
  let directUrl = "";

  const lowerRaw = raw.toLowerCase();

  if (lowerRaw.includes("kick.com") || lowerRaw.startsWith("kick:")) {
    platform = "kick";
    channel = raw.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").replace(/^kick:/i, "").replace(/^\//, "").split("/")[0] || "";
    directUrl = `https://kick.com/${channel}`;
  } else if (lowerRaw.includes("youtube.com") || lowerRaw.includes("youtu.be")) {
    platform = "youtube";
    channel = raw;
    directUrl = formatYoutubeUrl(raw);
  } else if (lowerRaw.includes("twitch.tv") || lowerRaw.startsWith("twitch:")) {
    platform = "twitch";
    channel = raw.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").replace(/^twitch:/i, "").replace(/^\//, "").split("/")[0] || "";
    directUrl = `https://twitch.tv/${channel}`;
  } else if (raw) {
    if (primaryPlatform === "kick" || (kickChan && raw.toLowerCase() === kickChan.toLowerCase())) {
      platform = "kick";
      channel = kickChan ? kickChan.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").trim() : raw;
      directUrl = `https://kick.com/${channel}`;
    } else if (primaryPlatform === "youtube" || (ytChan && raw.toLowerCase() === ytChan.toLowerCase())) {
      platform = "youtube";
      channel = ytChan || raw;
      directUrl = formatYoutubeUrl(channel);
    } else if (kickChan && !twitchChan) {
      platform = "kick";
      channel = kickChan.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").trim();
      directUrl = `https://kick.com/${channel}`;
    } else if (ytChan && !twitchChan && !kickChan) {
      platform = "youtube";
      channel = ytChan;
      directUrl = formatYoutubeUrl(channel);
    } else {
      channel = raw.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").replace(/^@/, "").trim();
      directUrl = `https://twitch.tv/${channel}`;
      platform = "twitch";
    }
  } else {
    if (primaryPlatform === "kick" && kickChan) {
      platform = "kick";
      channel = kickChan.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").trim();
      directUrl = `https://kick.com/${channel}`;
    } else if (primaryPlatform === "youtube" && ytChan) {
      platform = "youtube";
      channel = ytChan;
      directUrl = formatYoutubeUrl(ytChan);
    } else if (twitchChan) {
      platform = "twitch";
      channel = twitchChan.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").trim();
      directUrl = `https://twitch.tv/${channel}`;
    } else if (kickChan) {
      platform = "kick";
      channel = kickChan.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").trim();
      directUrl = `https://kick.com/${channel}`;
    } else if (ytChan) {
      platform = "youtube";
      channel = ytChan;
      directUrl = formatYoutubeUrl(ytChan);
    }
  }

  return {
    platform,
    channel,
    directUrl,
    isKick: platform === "kick",
    isYoutube: platform === "youtube",
    isTwitch: platform === "twitch",
    platformName: platform === "kick" ? "Kick" : platform === "youtube" ? "YouTube" : "Twitch",
    brandColor: platform === "kick" ? "#53FC18" : platform === "youtube" ? "#EF4444" : "#9146FF",
  };
};

let cachedMatchesData: {
  matches: any[];
  tournaments: any[];
  casters: any[];
  maps: any[];
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

export default function MatchesPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [matches, setMatches] = useState<any[]>(cachedMatchesData?.matches || []);
  const [tournaments, setTournaments] = useState<any[]>(cachedMatchesData?.tournaments || []);
  const [casters, setCasters] = useState<any[]>(cachedMatchesData?.casters || []);
  const [availableMaps, setAvailableMaps] = useState<any[]>(cachedMatchesData?.maps || []);
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
  const [dismissedCasterBanner, setDismissedCasterBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem("hide_caster_promo_banner") === "true";
      setDismissedCasterBanner(isDismissed);
    }
  }, []);

  // Stream Player Modal State
  const [activeStreamModal, setActiveStreamModal] = useState<{
    isOpen: boolean;
    channel: string;
    matchTitle: string;
    casterName: string;
    platform: "twitch" | "kick" | "youtube";
  }>({
    isOpen: false,
    channel: "",
    matchTitle: "",
    casterName: "",
    platform: "twitch",
  });

  // Assign Caster Modal State
  const [assignCasterModal, setAssignCasterModal] = useState<{
    isOpen: boolean;
    matchId: string;
    matchTitle: string;
    customStreamUrl: string;
    startStreamNow: boolean;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    matchId: "",
    matchTitle: "",
    customStreamUrl: "",
    startStreamNow: true,
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

  useEffect(() => {
    fetchInitialData();
    checkUserCasterStatus();
    fetchUserAccounts();

    // Subscribe to realtime updates on matches and map_vetoes
    const realtimeChannel = supabase
      .channel("matches_realtime_hub")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload: any) => {
          if (payload.eventType === "UPDATE") {
            setMatches((prev) =>
              prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            );
          } else {
            fetchInitialData();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "map_vetoes" },
        () => {
          fetchInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
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

      // 3. Fetch all maps (official + custom)
      const mapsRes = await fetch("/api/maps");
      const mapsData = await mapsRes.json();
      const allMaps = mapsData?.all || [];

      // 4. Extract unique tournaments from valid matches
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
      setAvailableMaps(allMaps);

      cachedMatchesData = {
        matches: fetchedMatches,
        tournaments: uniqueTournaments,
        casters: castersData.casters || [],
        maps: allMaps,
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
        const casterInfo = data.caster || data.application || {};
        setUserCasterInfo({
          ...casterInfo,
          twitch_channel: casterInfo.twitch_channel || data.verifiedTwitchChannel || null,
          kick_channel: casterInfo.kick_channel || data.verifiedKickChannel || null,
          youtube_channel: casterInfo.youtube_channel || null,
        });
      }
    } catch (e) {
      console.error("Error checking caster status:", e);
    }
  };

  const userLinkedAccounts = useMemo(() => {
    if (!userCasterInfo) return [];
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

    if (userCasterInfo.twitch_channel) {
      const channel = userCasterInfo.twitch_channel.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").trim();
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

    if (userCasterInfo.kick_channel) {
      const channel = userCasterInfo.kick_channel.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").trim();
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

    if (userCasterInfo.youtube_channel) {
      const channel = userCasterInfo.youtube_channel.trim();
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

    // Sort according to primary platform if defined
    const primary = userCasterInfo.primary_platform || "";
    if (primary === "kick") {
      accounts.sort((a, b) => (a.platform === "kick" ? -1 : b.platform === "kick" ? 1 : 0));
    } else if (primary === "youtube") {
      accounts.sort((a, b) => (a.platform === "youtube" ? -1 : b.platform === "youtube" ? 1 : 0));
    }

    return accounts;
  }, [userCasterInfo]);

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
    const canManageStream = canAdmin || isCaster || isAssignedCaster;
    const canEditSchedule =
      canAdmin ||
      isCaptain1 ||
      isCaptain2 ||
      isSteamVerifiedMember ||
      isAssignedCaster;

    return { canEditSchedule, canAdmin, isAssignedCaster, canManageStream };
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

  // Generate Direct Veto for Match (Redirects to /map-veto with prefilled parameters)
  const handleGenerateVeto = (match: any) => {
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

  // Handle stream player open (ONLY allowed when match is in_progress / live)
  const handleOpenStream = (
    channelOrUrl: string,
    matchTitle: string,
    casterName: string,
    explicitPlatform?: "twitch" | "kick" | "youtube"
  ) => {
    let clean = (channelOrUrl || "").trim();
    let platform: "twitch" | "kick" | "youtube" = explicitPlatform || "twitch";

    if (!explicitPlatform) {
      if (clean.toLowerCase().includes("kick.com") || clean.toLowerCase().startsWith("kick:")) {
        platform = "kick";
      } else if (clean.toLowerCase().includes("youtube.com") || clean.toLowerCase().includes("youtu.be")) {
        platform = "youtube";
      } else {
        platform = "twitch";
      }
    }

    if (platform === "kick") {
      clean = clean.replace(/^https?:\/\/(www\.)?kick\.com\//i, "").replace(/^kick:/i, "").replace(/^\//, "");
      const parts = clean.split("/").filter(Boolean);
      clean = parts[0] || clean;
    } else if (platform === "youtube") {
      if (clean.includes("watch?v=")) {
        clean = clean.split("watch?v=")[1]?.split("&")[0] || clean;
      } else if (clean.includes("youtu.be/")) {
        clean = clean.split("youtu.be/")[1]?.split("?")[0] || clean;
      } else if (clean.includes("/embed/")) {
        clean = clean.split("/embed/")[1]?.split("?")[0] || clean;
      }
    } else {
      if (clean.startsWith("http://") || clean.startsWith("https://")) {
        clean = clean.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, "").replace(/^twitch:/i, "").replace(/^\//, "");
        const parts = clean.split("/").filter(Boolean);
        clean = parts[0] || clean;
      }
      clean = clean.replace(/^@/, "");
    }

    setActiveStreamModal({
      isOpen: true,
      channel: clean,
      matchTitle,
      casterName,
      platform,
    });
  };

  // Handle Caster Match Binding
  const handleClaimCast = async (matchId: string, startNow?: boolean) => {
    setAssignCasterModal((prev) => ({ ...prev, isSubmitting: true }));
    const shouldStartNow = startNow !== undefined ? startNow : assignCasterModal.startStreamNow;
    const targetUrl =
      assignCasterModal.customStreamUrl ||
      userLinkedAccounts[0]?.url ||
      userCasterInfo?.kick_channel ||
      userCasterInfo?.twitch_channel ||
      userCasterInfo?.youtube_channel ||
      "";

    try {
      const res = await fetch(`/api/matches/${matchId}/caster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamUrl: targetUrl,
          startStreamNow: shouldStartNow,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo vincular la transmisión.");
      } else {
        toast.success(
          shouldStartNow
            ? "Transmisión vinculada y partido iniciado EN VIVO."
            : "Transmisión asignada correctamente al match."
        );
        const streamInfo = resolveStreamInfo(targetUrl, userCasterInfo);
        const matchTitle = assignCasterModal.matchTitle;
        const casterName = userCasterInfo?.alias || session?.user?.name || "Caster";

        setAssignCasterModal({
          isOpen: false,
          matchId: "",
          matchTitle: "",
          customStreamUrl: "",
          startStreamNow: false,
          isSubmitting: false,
        });

        fetchInitialData();

        if (shouldStartNow) {
          handleOpenStream(
            streamInfo.directUrl || streamInfo.channel,
            matchTitle,
            casterName,
            streamInfo.platform
          );
        }
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

  if (isLoading && !cachedMatchesData) {
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

      {/* Caster Promo Notice Banner */}
      {session?.user && !isCaster && !dismissedCasterBanner && (
        <div
          className="glass-panel"
          style={{
            marginBottom: "1.75rem",
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(135deg, rgba(145, 70, 255, 0.12) 0%, rgba(111, 175, 58, 0.08) 100%)",
            border: "1px solid rgba(145, 70, 255, 0.3)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flex: 1, minWidth: "280px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(145, 70, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid rgba(145, 70, 255, 0.4)",
              }}
            >
              <Tv size={22} color="#C499FF" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "bold", color: "#FFFFFF" }}>
                  ¿Eres streamer o te gustaría castear partidos oficiales?
                </h3>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                    background: "rgba(145, 70, 255, 0.25)",
                    color: "#C499FF",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "100px",
                    border: "1px solid rgba(145, 70, 255, 0.4)",
                  }}
                >
                  Rol Caster
                </span>
              </div>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                Postúlate como <strong>Caster Oficial</strong> para poder transmitir y narrar los partidos de los torneos en vivo.
              </p>
              <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--text-disabled)" }}>
                (Recuerda que siempre puedes encontrar y gestionar esta opción en <strong>Ajustes &gt; Caster Oficial</strong>)
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary text-sm"
              onClick={() => router.push("/settings#caster")}
              style={{
                background: "#9146FF",
                color: "#FFFFFF",
                padding: "0.6rem 1.2rem",
                fontWeight: "bold",
                border: "none",
                boxShadow: "0 4px 14px rgba(145, 70, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <TwitchIcon size={16} /> Postularme como Caster
            </button>
            <button
              className="btn text-sm"
              onClick={() => {
                localStorage.setItem("hide_caster_promo_banner", "true");
                setDismissedCasterBanner(true);
                toast.info("Aviso ocultado. Recuerda que puedes postularte en cualquier momento desde Ajustes > Caster Oficial.");
              }}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-light)",
                padding: "0.6rem 1rem",
              }}
            >
              No volver a mostrar
            </button>
          </div>
        </div>
      )}

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

              const team1 = match.team1;
              const team2 = match.team2;
              const tournament = match.tournaments;
              const assignedCasters = match.assigned_casters || [];
              const hasCaster = assignedCasters.length > 0;
              const assignedCaster = assignedCasters[0];
              const casterDetails = assignedCaster?.casters;
              const streamInfo = resolveStreamInfo(assignedCaster?.stream_url, casterDetails);

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
                  {/* Top Bar: Clickable Tournament Name & Status Badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => router.push(`/tournament/${match.tournament_id}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        overflow: "hidden",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textAlign: "left",
                        color: "inherit",
                      }}
                      title={`Ir al torneo ${tournament?.name || ""}`}
                    >
                      {tournament?.logo_url ? (
                        <img
                          src={tournament.logo_url}
                          alt="Torneo"
                          style={{ width: "22px", height: "22px", borderRadius: "4px", objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <Trophy size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          color: "var(--text-main)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textDecoration: "underline",
                          textDecorationColor: "rgba(255, 255, 255, 0.3)",
                        }}
                      >
                        {tournament?.name || "Torneo"}
                      </span>
                    </button>

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
                          Ver Sala de Veto
                        </button>
                      ) : (
                        (canAdmin || isAssignedCaster) && (
                          <button
                            className="btn btn-secondary text-xs"
                            style={{ padding: "0.2rem 0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
                            onClick={() => handleGenerateVeto(match)}
                            title="Ir a crear la sesión de veto con estos equipos y maps precargados"
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
                  {hasCaster && (() => {
                    const assignedCaster = assignedCasters[0];
                    const casterDetails = assignedCaster?.casters;
                    const streamInfo = resolveStreamInfo(assignedCaster?.stream_url, casterDetails);
                    const casterName = casterDetails?.alias || casterDetails?.twitch_channel || casterDetails?.kick_channel || "Caster Oficial";

                    return (
                      <div
                        style={{
                          background: isLive ? "rgba(239, 68, 68, 0.08)" : streamInfo.isKick ? "rgba(83, 252, 24, 0.08)" : streamInfo.isYoutube ? "rgba(239, 68, 68, 0.08)" : "rgba(145, 70, 255, 0.08)",
                          border: isLive ? "1px solid rgba(239, 68, 68, 0.3)" : streamInfo.isKick ? "1px solid rgba(83, 252, 24, 0.3)" : streamInfo.isYoutube ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(145, 70, 255, 0.2)",
                          borderRadius: "8px",
                          padding: "0.6rem 0.75rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                          {streamInfo.isKick ? (
                            <KickIcon size={16} className="text-[#53FC18]" />
                          ) : streamInfo.isYoutube ? (
                            <YoutubeIcon size={16} className="text-[#EF4444]" />
                          ) : (
                            <TwitchIcon size={16} className="text-[#9146FF]" />
                          )}
                          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              Caster:{" "}
                              <a
                                href={streamInfo.directUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: streamInfo.brandColor, textDecoration: "underline" }}
                              >
                                {casterName}
                              </a>{" "}
                              <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: "normal" }}>({streamInfo.platformName})</span>
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
                                streamInfo.directUrl || streamInfo.channel,
                                `${team1?.name} vs ${team2?.name}`,
                                casterName,
                                streamInfo.platform
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
                            href={streamInfo.directUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary text-xs"
                            style={{
                              padding: "0.3rem 0.5rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              whiteSpace: "nowrap",
                              color: streamInfo.isKick ? "#53FC18" : streamInfo.isYoutube ? "#EF4444" : undefined,
                              borderColor: streamInfo.isKick ? "rgba(83, 252, 24, 0.3)" : streamInfo.isYoutube ? "rgba(239, 68, 68, 0.3)" : undefined,
                            }}
                          >
                            <ExternalLink size={12} /> Canal
                          </a>
                        )}
                      </div>
                    );
                  })()}

                  {/* Actions & Organizer Admin / Caster Controls */}
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid var(--border-light)",
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {/* If match is Live */}
                    {isLive && (
                      <>
                        {canAdmin && (
                          <button
                            className="btn btn-primary text-xs"
                            style={{ flex: 1, padding: "0.45rem 0.75rem" }}
                            onClick={() => handleOpenFinalizeModal(match)}
                          >
                            <CheckCircle2 size={13} /> Finalizar Partido
                          </button>
                        )}
                        {(canAdmin || isAssignedCaster) && (
                          <button
                            className="btn btn-secondary text-xs"
                            style={{ flex: canAdmin ? 0 : 1, padding: "0.45rem 0.75rem" }}
                            onClick={() => handleSetMatchStatus(match.id, "pending")}
                          >
                            Pausar Transmisión
                          </button>
                        )}
                      </>
                    )}

                    {/* If match is Completed */}
                    {isCompleted && canAdmin && (
                      <button
                        className="btn btn-secondary text-xs"
                        style={{ flex: 1, padding: "0.45rem 0.75rem" }}
                        onClick={() => handleOpenFinalizeModal(match)}
                      >
                        <Edit size={13} /> Modificar Resultado
                      </button>
                    )}

                    {/* If match is Upcoming / Pending */}
                    {!isLive && !isCompleted && (
                      <>
                        {/* Caster / Claim controls */}
                        {isCaster && (
                          <>
                            {hasCaster && assignedCasters.some((c: any) => c.caster_id === userCasterInfo?.id || c.casters?.user_id === session?.user?.id) ? (
                              <>
                                <button
                                  className="btn text-xs"
                                  style={{
                                    flex: 1,
                                    background: "rgba(239, 68, 68, 0.15)",
                                    color: "#f87171",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    padding: "0.45rem 0.75rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.35rem",
                                    fontWeight: "bold",
                                  }}
                                  onClick={() => handleSetMatchStatus(match.id, "in_progress")}
                                >
                                  <Radio size={13} color="#ef4444" /> Iniciar Transmisión
                                </button>
                                <button
                                  className="btn btn-danger text-xs"
                                  style={{ padding: "0.45rem 0.75rem" }}
                                  onClick={() => handleUnlinkCast(match.id)}
                                  title="Desvincular mi stream de este match"
                                >
                                  Quitar Cast
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-primary"
                                style={{
                                  flex: 1,
                                  fontSize: "0.85rem",
                                  padding: "0.45rem 0.75rem",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "0.4rem",
                                  fontWeight: "bold",
                                }}
                                onClick={() => {
                                  const defaultUrl =
                                    userLinkedAccounts[0]?.url ||
                                    (userCasterInfo?.primary_platform === "kick" && userCasterInfo?.kick_channel ? `https://kick.com/${userCasterInfo.kick_channel}` : "") ||
                                    (userCasterInfo?.kick_channel ? `https://kick.com/${userCasterInfo.kick_channel}` : "") ||
                                    (userCasterInfo?.youtube_channel || "") ||
                                    (userCasterInfo?.twitch_channel ? `https://twitch.tv/${userCasterInfo.twitch_channel}` : "") ||
                                    "";
                                  setAssignCasterModal({
                                    isOpen: true,
                                    matchId: match.id,
                                    matchTitle: `${team1?.name} vs ${team2?.name}`,
                                    customStreamUrl: defaultUrl,
                                    startStreamNow: false,
                                    isSubmitting: false,
                                  });
                                }}
                              >
                                <Radio size={14} /> Castear
                              </button>
                            )}
                          </>
                        )}

                        {/* Admin Start Transmission if not already handled by assigned caster */}
                        {canAdmin && !isCaster && (
                          <button
                            className="btn text-xs"
                            style={{
                              flex: 1,
                              background: "rgba(239, 68, 68, 0.15)",
                              color: "#f87171",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              padding: "0.45rem 0.75rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.35rem",
                              fontWeight: "bold",
                            }}
                            onClick={() => {
                              if (!hasCaster) {
                                toast.error(
                                  "No se puede iniciar la transmisión sin un caster asignado al partido. Asigna un caster primero."
                                );
                                setAssignCasterModal({
                                  isOpen: true,
                                  matchId: match.id,
                                  matchTitle: `${team1?.name} vs ${team2?.name}`,
                                  customStreamUrl: "",
                                  startStreamNow: true,
                                  isSubmitting: false,
                                });
                                return;
                              }
                              handleSetMatchStatus(match.id, "in_progress");
                            }}
                          >
                            <Radio size={13} color="#ef4444" /> Iniciar Transmisión
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Embedded Stream Modal (Twitch / Kick / YouTube) */}
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
              border: activeStreamModal.platform === "kick"
                ? "1px solid rgba(83, 252, 24, 0.4)"
                : activeStreamModal.platform === "youtube"
                ? "1px solid rgba(239, 68, 68, 0.4)"
                : "1px solid rgba(145, 70, 255, 0.4)",
              borderRadius: "16px",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {activeStreamModal.platform === "kick" ? (
                  <KickIcon size={20} className="text-[#53FC18]" />
                ) : activeStreamModal.platform === "youtube" ? (
                  <YoutubeIcon size={20} className="text-[#EF4444]" />
                ) : (
                  <TwitchIcon size={20} className="text-[#9146FF]" />
                )}
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                  Transmisión en Vivo: {activeStreamModal.matchTitle}
                </h3>
              </div>
              <button
                className="btn-icon"
                onClick={() => setActiveStreamModal((prev) => ({ ...prev, isOpen: false }))}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                position: "relative",
                width: "100%",
                paddingBottom: "56.25%", // 16:9 Aspect Ratio
                height: 0,
                borderRadius: "8px",
                overflow: "hidden",
                background: "#000",
              }}
            >
              {activeStreamModal.platform === "kick" ? (
                <iframe
                  src={`https://player.kick.com/${activeStreamModal.channel}?autoplay=true&muted=false`}
                  height="100%"
                  width="100%"
                  allowFullScreen={true}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                />
              ) : activeStreamModal.platform === "youtube" ? (
                <iframe
                  src={formatYoutubeEmbedUrl(activeStreamModal.channel)}
                  height="100%"
                  width="100%"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen={true}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                />
              ) : (
                <iframe
                  src={`https://player.twitch.tv/?channel=${activeStreamModal.channel}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}&autoplay=true&muted=false`}
                  height="100%"
                  width="100%"
                  allowFullScreen={true}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                />
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
              <span className="text-muted">
                Narrado por: <strong>{activeStreamModal.casterName}</strong>
              </span>
              <a
                href={
                  activeStreamModal.platform === "kick"
                    ? `https://kick.com/${activeStreamModal.channel}`
                    : activeStreamModal.platform === "youtube"
                    ? formatYoutubeUrl(activeStreamModal.channel)
                    : `https://twitch.tv/${activeStreamModal.channel}`
                }
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary text-xs"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  color: activeStreamModal.platform === "kick" ? "#53FC18" : activeStreamModal.platform === "youtube" ? "#EF4444" : "#C499FF",
                }}
              >
                <ExternalLink size={14} /> Abrir en {activeStreamModal.platform === "kick" ? "Kick" : activeStreamModal.platform === "youtube" ? "YouTube" : "Twitch"}
              </a>
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
              maxWidth: "520px",
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
                <Edit size={20} color="var(--primary)" />
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

            {/* Map Selection from all available (official & custom) */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                Mapas a Jugar (Oficiales y Customs)
              </label>

              {/* Map Chips */}
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  flexWrap: "wrap",
                  maxHeight: "180px",
                  overflowY: "auto",
                  padding: "0.5rem",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  marginBottom: "0.75rem",
                }}
              >
                {availableMaps.map((mapItem: any) => {
                  const mapName = mapItem.name;
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
                  className="input-base text-sm"
                  placeholder="Agregar otro mapa por nombre..."
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
                        selectedMaps: [...scheduleModal.selectedMaps, scheduleModal.customMapInput.trim().toUpperCase()],
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
            className="card animate-modalFadeIn"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Radio size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Transmitir Match</h3>
              </div>
              <button
                className="btn-icon"
                onClick={() => setAssignCasterModal((prev) => ({ ...prev, isOpen: false }))}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "0.75rem 1rem", background: "rgba(0,0,0,0.3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
              <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{assignCasterModal.matchTitle}</div>
              <p className="text-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>
                Selecciona la cuenta con la que transmitirás este partido oficial.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="text-muted" style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Cuenta de Transmisión
                </label>

                {/* 1-Click Selectable Linked Accounts */}
                {userLinkedAccounts.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    {userLinkedAccounts.map((acc) => {
                      const isSelected =
                        assignCasterModal.customStreamUrl === acc.url ||
                        assignCasterModal.customStreamUrl === acc.channelName ||
                        (assignCasterModal.customStreamUrl && assignCasterModal.customStreamUrl.toLowerCase().includes(acc.channelName.toLowerCase()));
                      return (
                        <button
                          key={acc.platform}
                          type="button"
                          onClick={() =>
                            setAssignCasterModal((prev) => ({
                              ...prev,
                              customStreamUrl: acc.url,
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
                    No tienes canales configurados en tu perfil de caster. Ingresa el enlace manualmente:
                  </p>
                )}

                {/* Custom URL Input fallback */}
                <details style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  <summary style={{ cursor: "pointer", marginBottom: "0.4rem", userSelect: "none" }}>
                    {userLinkedAccounts.length > 0 ? "O ingresar un enlace personalizado..." : "Enlace personalizado"}
                  </summary>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="https://twitch.tv/canal o https://kick.com/canal"
                    value={assignCasterModal.customStreamUrl}
                    onChange={(e) =>
                      setAssignCasterModal((prev) => ({ ...prev, customStreamUrl: e.target.value }))
                    }
                    style={{ width: "100%", marginTop: "0.35rem" }}
                  />
                </details>
              </div>

              {/* Checkbox to start transmission immediately */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  cursor: "pointer",
                  padding: "0.6rem 0.8rem",
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-light)",
                }}
              >
                <input
                  type="checkbox"
                  checked={assignCasterModal.startStreamNow}
                  onChange={(e) =>
                    setAssignCasterModal((prev) => ({
                      ...prev,
                      startStreamNow: e.target.checked,
                    }))
                  }
                  style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-main)" }}>
                    Iniciar transmisión EN VIVO inmediatamente
                  </span>
                  <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Marca el partido como en progreso para que los espectadores puedan ver el reproductor
                  </span>
                </div>
              </label>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", paddingTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAssignCasterModal((prev) => ({ ...prev, isOpen: false }))}
                  disabled={assignCasterModal.isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleClaimCast(assignCasterModal.matchId)}
                  disabled={assignCasterModal.isSubmitting}
                  style={{ fontWeight: "bold" }}
                >
                  {assignCasterModal.isSubmitting
                    ? "Procesando..."
                    : assignCasterModal.startStreamNow
                    ? "Iniciar Transmisión En Vivo"
                    : "Vincular Transmisión"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

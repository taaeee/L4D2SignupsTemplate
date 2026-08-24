"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Users,
  Trophy,
  Download,
  Settings,
  Edit,
  FileText,
  X,
  Link as LinkIcon,
  Globe,
  Copy,
  Tv,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Radio,
  ChevronDown,
  Trash2,
  UserX,
  UserMinus,
  UserCheck,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";
import ReactMarkdown from "react-markdown";
import { fetchBansInBatches } from "@/lib/ban-checker";
import BracketViewer from "@/components/BracketViewer";
import SwissViewer from "@/components/SwissViewer";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  TwitchIcon,
  DiscordIcon,
  YoutubeIcon,
  XIcon,
  KickIcon,
  SteamIcon,
  InstagramIcon,
} from "@/components/SocialIcons";
import { normalizeLanguages, MAIN_CASTER_LANGUAGES } from "@/lib/language-helper";
import MorphPlusMinusIcon from "@/components/MorphPlusMinusIcon";
import { useTranslation } from "@/lib/i18n";

// Helper to format YouTube URLs properly
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

const extractPlatformUsername = (channelOrUrl?: string | null) => {
  if (!channelOrUrl) return "";
  let clean = channelOrUrl.trim();
  clean = clean.replace(/^https?:\/\//i, "");
  clean = clean.replace(/^www\./i, "");
  clean = clean.replace(/^(twitch\.tv|kick\.com|youtube\.com|youtu\.be)\//i, "");
  clean = clean.replace(/^(c\/|user\/|channel\/)/i, "");
  clean = clean.split("/")[0].split("?")[0];
  return clean || channelOrUrl;
};

import { Database } from '@/lib/database.types';

type Match = Database['public']['Tables']['matches']['Row'];
type TeamMember = Database['public']['Tables']['team_members']['Row'];
type TeamBase = Database['public']['Tables']['teams']['Row'];

interface Team extends TeamBase {
  team_members?: TeamMember[];
}

type Tournament = Database['public']['Tables']['tournaments']['Row'];

const generateId = (children: any): string => {
  const extractText = (node: any): string => {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (node && node.props && node.props.children)
      return extractText(node.props.children);
    return "";
  };
  return extractText(children)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");
};

let cachedTournamentDetails: Record<string, {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  tournamentCasters?: any[];
  tournamentApplications?: any[];
  userTournamentApp?: any;
  isGlobalCaster?: boolean;
  globalCasterProfile?: any;
}> = {};

export default function TournamentDetails() {
  const { t } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();

  const cached = id ? cachedTournamentDetails[id] : null;
  const [tournament, setTournament] = useState<Tournament | null>(cached?.tournament || null);
  const [teams, setTeams] = useState<Team[]>(cached?.teams || []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [teamsSearch, setTeamsSearch] = useState("");
  const [activeTab, setActiveTab] = useState("teams");
  const [matches, setMatches] = useState<Match[]>(cached?.matches || []);
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);

  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [bracketConfirmModal, setBracketConfirmModal] = useState({ isOpen: false, isRegen: false });
  const [statusConfirmModal, setStatusConfirmModal] = useState<{ isOpen: boolean; teamId: string; teamName: string; newStatus: string; statusLabel: string }>({ isOpen: false, teamId: "", teamName: "", newStatus: "", statusLabel: "" });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [replaceModal, setReplaceModal] = useState<{ isOpen: boolean; newTeamId: string; newTeamName: string }>({ isOpen: false, newTeamId: "", newTeamName: "" });
  const [targetReplaceTeamId, setTargetReplaceTeamId] = useState<string>("");
  const [swissRounds, setSwissRounds] = useState(0);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [communityBans, setCommunityBans] = useState<Record<string, any>>({});
  const [openActionMenuTeamId, setOpenActionMenuTeamId] = useState<string | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => {
      setOpenActionMenuTeamId(null);
    };
    window.addEventListener("click", handleCloseMenu);
    return () => window.removeEventListener("click", handleCloseMenu);
  }, []);

  // Tournament Casters State
  const [tournamentCasters, setTournamentCasters] = useState<any[]>([]);
  const [tournamentApplications, setTournamentApplications] = useState<any[]>([]);
  const [userTournamentApp, setUserTournamentApp] = useState<any>(null);
  const [isGlobalCaster, setIsGlobalCaster] = useState(false);
  const [globalCasterProfile, setGlobalCasterProfile] = useState<any>(null);
  const [isCasterModalOpen, setIsCasterModalOpen] = useState(false);
  const [casterForm, setCasterForm] = useState({
    alias: "",
    bio: "",
    twitch_channel: "",
    kick_channel: "",
    youtube_channel: "",
    languages: ["Español"],
  });
  const [isSubmittingCaster, setIsSubmittingCaster] = useState(false);

  const templateJson = (tournament?.template_json as any) || {};

  useEffect(() => {
    if (id) {
      fetchData();
      fetchTournamentCasters();

      // Realtime subscription for matches & tournament updates
      const tourneyChannel = supabase
        .channel(`tournament_realtime_${id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${id}` },
          (payload: any) => {
            if (payload.eventType === "UPDATE") {
              setMatches((prev) =>
                prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
              );
            } else {
              fetchData();
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "tournaments", filter: `id=eq.${id}` },
          () => fetchData()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tournament_casters", filter: `tournament_id=eq.${id}` },
          () => fetchTournamentCasters()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(tourneyChannel);
      };
    }
  }, [id]);

  const fetchTournamentCasters = async () => {
    try {
      const res = await fetch(`/api/tournament/${id}/casters`);
      if (res.ok) {
        const data = await res.json();
        setTournamentCasters(data.casters || []);
        setTournamentApplications(data.applications || []);
        setUserTournamentApp(data.userApplication || null);
        setIsGlobalCaster(!!data.isGlobalCaster);
        setGlobalCasterProfile(data.globalCasterProfile || null);

        if (data.userApplication) {
          setCasterForm({
            alias: data.userApplication.alias || "",
            bio: data.userApplication.bio || "",
            twitch_channel: data.userApplication.twitch_channel || "",
            kick_channel: data.userApplication.kick_channel || "",
            youtube_channel: data.userApplication.youtube_channel || "",
            languages: normalizeLanguages(data.userApplication.languages),
          });
        } else if (data.globalCasterProfile) {
          setCasterForm({
            alias: data.globalCasterProfile.alias || "",
            bio: data.globalCasterProfile.bio || "",
            twitch_channel: data.globalCasterProfile.twitch_channel || "",
            kick_channel: data.globalCasterProfile.kick_channel || "",
            youtube_channel: data.globalCasterProfile.youtube_channel || "",
            languages: normalizeLanguages(data.globalCasterProfile.languages),
          });
        }
      }
    } catch (e) {
      console.error("Error fetching tournament casters:", e);
    }
  };

  const fetchData = async () => {
    if (!cachedTournamentDetails[id]) setIsLoading(true);
    // Fetch Tournament
    const { data: tData, error: tError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (tError || !tData) {
      console.error(tError);
      setIsLoading(false);
      return;
    }
    setTournament(tData);

    // Fetch Teams
    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("*, team_members(*)")
      .eq("tournament_id", id);

    if (!teamsError && teamsData) {
      setTeams(teamsData);
    }

    // Fetch Matches
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", id);
    if (matchesData) {
      setMatches(matchesData);
    }

    cachedTournamentDetails[id] = {
      tournament: tData,
      teams: teamsData || [],
      matches: matchesData || [],
      tournamentCasters,
      tournamentApplications,
      userTournamentApp,
      isGlobalCaster,
      globalCasterProfile,
    };

    setIsLoading(false);

    // Fetch Community Bans in background batches without blocking page render
    if (teamsData && teamsData.length > 0) {
      const allSteamIds: string[] = [];
      teamsData.forEach((team) => {
        if (team.team_members) {
          team.team_members.forEach((m) => {
            if (m.steam_id_64) allSteamIds.push(m.steam_id_64);
          });
        }
      });

      if (allSteamIds.length > 0) {
        fetchBansInBatches(allSteamIds, (batchData) => {
          setCommunityBans((prev) => ({ ...prev, ...batchData }));
        }).catch((e) => {
          console.error("Failed to fetch community bans in background", e);
        });
      }
    }
  };

  const refreshMatches = async () => {
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", id);
    if (matchesData) {
      setMatches(matchesData);
      if (cachedTournamentDetails[id]) {
        cachedTournamentDetails[id].matches = matchesData;
      }
    }
  };

  const getPlayerBan = (steamId64?: string | null) => {
    if (!steamId64 || !communityBans[steamId64]) return null;
    return communityBans[steamId64];
  };

  const handleExport = () => {
    window.location.href = `/api/tournament/${id}/export`;
  };

  const handleExportLogos = () => {
    window.location.href = `/api/tournament/${id}/export-logos`;
  };

  if (isLoading && !cachedTournamentDetails[id]) {
    return <LoadingSpinner text="Cargando Torneo..." fullHeight={true} />;
  }

  if (!tournament) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", marginTop: "10vh" }}
      >
        Torneo no encontrado.
      </div>
    );
  }

  const isCreator = session?.user?.id === tournament.creator_id;
  const isModerator = !!(tournament.moderators && Array.isArray(tournament.moderators) && tournament.moderators.includes(session?.user?.id as string));
  const canManage = isCreator || isModerator;
  const isLocked = tournament.status === "locked";

  const acceptedTeamsAll = teams.filter((t) => t.status === "accepted");
  const participatingTeamsAll = teams.filter((t) => ["accepted", "eliminated", "disqualified", "withdrawn"].includes(t.status));
  const substitutableTeams = teams.filter((t) => ["disqualified", "withdrawn"].includes(t.status));
  const acceptedTeams = acceptedTeamsAll.filter((t) =>
    t.name.toLowerCase().includes(teamsSearch.toLowerCase())
  );
  const participatingTeams = participatingTeamsAll
    .filter((t) => t.name.toLowerCase().includes(teamsSearch.toLowerCase()))
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .sort((a, b) => {
      const isAActive = a.status === "accepted" ? 0 : 1;
      const isBActive = b.status === "accepted" ? 0 : 1;
      if (isAActive !== isBActive) return isAActive - isBActive;
      return a.name.localeCompare(b.name);
    });
  const pendingTeams = teams.filter(
    (t) =>
      t.status === "pending" &&
      t.name.toLowerCase().includes(teamsSearch.toLowerCase())
  );

  const isFull = acceptedTeamsAll.length >= tournament.max_teams;
  const isRegistrationFull = teams.length >= 300;

  const handleGenerateBracketClick = () => {
    if (acceptedTeamsAll.length % 2 !== 0 && templateJson.tournamentFormat !== 'swiss') {
      return toast.error("El número de equipos aceptados debe ser par para generar las llaves.");
    }
    const isRegen =
      tournament.bracket_status === "generated" ||
      tournament.bracket_status === "completed";

    const isSwiss = templateJson.tournamentFormat === 'swiss';
    if (isSwiss) {
      setSwissRounds(Math.ceil(Math.log2(acceptedTeamsAll.length)));
    }

    setBracketConfirmModal({ isOpen: true, isRegen });
  };

  const executeGenerateBracket = async () => {
    setBracketConfirmModal({ isOpen: false, isRegen: false });
    setIsGeneratingBracket(true);
    try {
      const payload: any = { force: bracketConfirmModal.isRegen };
      if (templateJson.tournamentFormat === 'swiss') {
        payload.swissRounds = swissRounds;
      }

      const res = await fetch(`/api/tournament/${id}/bracket/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Llaves generadas correctamente.");
      fetchData(); // Reload everything
      setActiveTab("bracket");
    } catch (e: any) {
      toast.error(e.message || "Error al generar llaves");
    } finally {
      setIsGeneratingBracket(false);
    }
  };

  const handleAcceptTeam = async (teamId: string) => {
    if (acceptedTeamsAll.length >= tournament.max_teams) {
      return toast.error(
        "No puedes aceptar más equipos. Se ha alcanzado el límite de equipos del torneo."
      );
    }
    const { error } = await supabase
      .from("teams")
      .update({ status: "accepted" })
      .eq("id", teamId);

    if (!error) {
      let insertedIntoBracket = false;
      if (tournament.bracket_status === "generated" || tournament.bracket_status === "completed") {
        const res = await fetch(`/api/tournament/${id}/bracket/sync-team`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "insert", teamId })
        });
        const data = await res.json();
        insertedIntoBracket = data.inserted;
      }

      if (insertedIntoBracket) {
        toast.success("Equipo aceptado e insertado automáticamente en una ranura vacía del bracket.");
      } else {
        toast.success("Equipo aceptado correctamente.");
      }

      fetchData(); // Reload everything to update UI immediately
    }
  };

  const executeDeleteTeam = async () => {
    if (!teamToDelete) return;

    // 1. Clean from bracket to avoid ghostly data (via Admin API to bypass RLS)
    await fetch(`/api/tournament/${id}/bracket/sync-team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", teamId: teamToDelete })
    });

    // 2. Delete team
    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamToDelete);

    if (!error) {
      toast.success("Equipo eliminado correctamente.");
      fetchData(); // Reload teams and matches to update bracket
    } else {
      toast.error("Error al eliminar el equipo.");
    }
    setTeamToDelete(null);
  };

  const handleRejectOrDelete = (teamId: string) => {
    setTeamToDelete(teamId);
  };

  const handleQuickApplyTournamentCaster = async () => {
    if (!isGlobalCaster) {
      setIsCasterModalOpen(true);
      return;
    }
    setIsSubmittingCaster(true);
    try {
      const res = await fetch(`/api/tournament/${id}/casters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al enviar postulación.");
      } else {
        toast.success(data.message || "Postulación enviada correctamente.");
        fetchTournamentCasters();
      }
    } catch (e) {
      toast.error("Error de red al enviar la postulación.");
    } finally {
      setIsSubmittingCaster(false);
    }
  };

  const handleApplyCaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCaster(true);
    try {
      const res = await fetch(`/api/tournament/${id}/casters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(casterForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al enviar solicitud.");
      } else {
        toast.success(data.message || "Solicitud enviada correctamente para este torneo.");
        setIsCasterModalOpen(false);
        fetchTournamentCasters();
      }
    } catch (e) {
      toast.error("Error de red al enviar la solicitud.");
    } finally {
      setIsSubmittingCaster(false);
    }
  };

  const handleReviewCaster = async (applicationId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/tournament/${id}/casters`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar la solicitud.");
      } else {
        toast.success(data.message || "Solicitud actualizada.");
        fetchTournamentCasters();
      }
    } catch (e) {
      toast.error("Error de red al procesar solicitud.");
    }
  };

  const handleUpdateTeamStatus = async (teamId: string, newStatus: string, statusLabel: string) => {
    const { error } = await supabase
      .from("teams")
      .update({ status: newStatus })
      .eq("id", teamId);

    if (!error) {
      toast.success(`Equipo marcado como: ${statusLabel}`);
      setStatusConfirmModal({ isOpen: false, teamId: "", teamName: "", newStatus: "", statusLabel: "" });
      fetchData();
    } else {
      toast.error("Error al actualizar el estado del equipo.");
    }
  };

  const executeSubstituteTeam = async () => {
    if (!replaceModal.newTeamId || !targetReplaceTeamId) {
      return toast.error("Por favor selecciona un equipo al cual sustituir.");
    }

    const res = await fetch(`/api/tournament/${id}/bracket/sync-team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "substitute",
        oldTeamId: targetReplaceTeamId,
        newTeamId: replaceModal.newTeamId,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      toast.success("Equipo aceptado y sustituido correctamente en el bracket.");
      setReplaceModal({ isOpen: false, newTeamId: "", newTeamName: "" });
      setTargetReplaceTeamId("");
      fetchData();
    } else {
      toast.error(data.error || "Error al sustituir el equipo.");
    }
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const handleToggleAllTeams = () => {
    const acceptedTeamsToToggle = participatingTeamsAll;
    const allExpanded =
      acceptedTeamsToToggle.length > 0 &&
      acceptedTeamsToToggle.every((t) => expandedTeams[t.id]);

    const newExpanded = { ...expandedTeams };
    acceptedTeamsToToggle.forEach((t) => {
      newExpanded[t.id] = !allExpanded;
    });
    setExpandedTeams(newExpanded);
  };

  const renderSocialLink = (
    linkType: string,
    url: string | undefined,
    Icon: any,
    label: string,
    brandColor: string = "var(--primary)"
  ) => {
    if (!url) return null;
    const formattedUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
    return (
      <a
        href={formattedUrl}
        target="_blank"
        rel="noreferrer"
        className="social-icon"
        style={{
          background: "transparent",
          color: brandColor,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.4rem",
        }}
        title={label}
      >
        <Icon size={24} color={brandColor} />
      </a>
    );
  };

  // Helper function to render a team card
  const renderTeamCard = (team: Team) => {
    const isAccepted = team.status === "accepted";
    const isParticipating = ["accepted", "eliminated", "disqualified", "withdrawn"].includes(team.status);
    const isExpanded = !isParticipating || expandedTeams[team.id];

    let parsedLogo = team.logo_url;
    let teamTag = "";
    let teamCountries = [];

    if (team.logo_url && team.logo_url.startsWith("{")) {
      try {
        const data = JSON.parse(team.logo_url);
        parsedLogo = data.url;
        teamTag = data.tag || "";
        teamCountries = data.countries || [];
      } catch (e) { }
    }

    const players = team.team_members || [];
    const validHours = players.map((p) => Number(p.l4d2_playtime_hours) || 0);
    const avgHours =
      validHours.length > 0
        ? (validHours.reduce((a, b) => a + b, 0) / validHours.length).toFixed(1)
        : 0;

    return (
      <div
        key={team.id}
        style={{
          display: "flex",
          flexDirection: "column",
          background: "rgba(0,0,0,0.3)",
          border: "1px solid var(--border-light)",
          borderRadius: "8px",
          marginBottom: "1rem",
          overflow: isExpanded ? "visible" : "hidden",
          position: "relative",
          zIndex: openActionMenuTeamId === team.id ? 30 : 1,
          cursor: isParticipating ? "pointer" : "default",
          transition: "background 0.3s ease",
        }}
        className={isParticipating ? "hover:bg-white/5 transition-colors" : ""}
        onClick={() => {
          if (isParticipating) toggleTeam(team.id);
        }}
      >
        {/* Top Header Row */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* Logo */}
          <div
            style={{
              flex: `0 0 ${isExpanded ? "120px" : "80px"}`,
              padding: "1rem",
              transition: "flex 0.4s ease",
            }}
          >
            <img
              src={
                parsedLogo || "https://ui-avatars.com/api/?name=" + team.name
              }
              alt={team.name}
              style={{
                width: "100%",
                aspectRatio: "1/1",
                objectFit: "cover",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            />
          </div>

          {/* Name & Flags */}
          <div style={{ flex: 1, padding: "1rem 1rem 1rem 0" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: isExpanded ? "1.6rem" : "1.2rem",
                  transition: "font-size 0.4s ease",
                  wordBreak: "break-word",
                  textDecoration: team.status !== "accepted" && team.status !== "pending" ? "line-through" : "none",
                  opacity: team.status !== "accepted" && team.status !== "pending" ? 0.75 : 1,
                }}
              >
                {team.name}
              </h3>
              {team.status === "eliminated" && (
                <span className="badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.3)", fontWeight: "bold", fontSize: "0.75rem", padding: "3px 8px" }}>
                  ELIMINADO
                </span>
              )}
              {team.status === "disqualified" && (
                <span className="badge" style={{ background: "rgba(249, 115, 22, 0.15)", color: "#F97316", border: "1px solid rgba(249, 115, 22, 0.3)", fontWeight: "bold", fontSize: "0.75rem", padding: "3px 8px" }}>
                  DESCALIFICADO
                </span>
              )}
              {team.status === "withdrawn" && (
                <span className="badge" style={{ background: "rgba(234, 179, 8, 0.15)", color: "#EAB308", border: "1px solid rgba(234, 179, 8, 0.3)", fontWeight: "bold", fontSize: "0.75rem", padding: "3px 8px" }}>
                  RETIRADO (SALIDA PROPIA)
                </span>
              )}
              {teamCountries.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.3rem",
                    marginLeft: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  {teamCountries.map((c: any) => (
                    <img
                      key={c.code}
                      src={c.flag}
                      alt={c.name}
                      title={c.name}
                      style={{
                        height: isExpanded ? "20px" : "16px",
                        borderRadius: "2px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                        transition: "height 0.4s ease",
                        objectFit: "cover",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expand Toggle */}
          {isParticipating && (
            <div
              style={{
                padding: "1rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: isExpanded ? "rgba(239, 68, 68, 0.12)" : "rgba(111, 175, 58, 0.12)",
                  border: isExpanded ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(111, 175, 58, 0.4)",
                  boxShadow: isExpanded ? "0 0 10px rgba(239, 68, 68, 0.25)" : "0 0 10px rgba(111, 175, 58, 0.25)",
                  transition: "all 0.25s ease",
                }}
              >
                <MorphPlusMinusIcon isExpanded={isExpanded} size={18} spring="snappy" />
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Area (Table + Actions) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            maxHeight: isExpanded ? "2000px" : "0px",
            opacity: isExpanded ? 1 : 0,
            overflow: isExpanded ? "visible" : "hidden",
            transition:
              "max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease, border 0.4s ease",
            borderTop: isExpanded ? "1px solid var(--border-light)" : "none",
          }}
        >
          {/* Table Column */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              overflowX: "auto",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid var(--border-light)",
            }}
            onClick={(e) => isAccepted && e.stopPropagation()}
          >
            <table
              style={{
                width: "100%",
                minWidth: "600px",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "0.9rem",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-light)",
                    color: "var(--muted)",
                  }}
                >
                  <th
                    style={{
                      padding: "0.5rem 1rem",
                      borderRight: "1px solid var(--border-light)",
                    }}
                  >
                    Player
                  </th>
                  <th
                    style={{
                      padding: "0.5rem 1rem",
                      borderRight: "1px solid var(--border-light)",
                    }}
                  >
                    Steam ID
                  </th>
                  <th
                    style={{
                      padding: "0.5rem 1rem",
                      borderRight: "1px solid var(--border-light)",
                      textAlign: "center",
                    }}
                  >
                    Horas
                  </th>
                  <th
                    style={{
                      padding: "0.5rem 1rem",
                      borderRight: "1px solid var(--border-light)",
                      textAlign: "center",
                    }}
                  >
                    ¿Horas públicas?
                  </th>
                  <th style={{ padding: "0.5rem 1rem", textAlign: "center" }}>
                    Ban Comunitario
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, idx) => {
                  return (
                    <tr
                      key={p.id}
                      style={{
                        background:
                          idx % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.5rem 1rem",
                          borderRight: "1px solid var(--border-light)",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "150px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={p.name}
                        >
                          <a
                            href={`https://steamcommunity.com/profiles/${p.steam_id_64}`}
                            target="_blank"
                            rel="noreferrer"
                            className="player-link"
                          >
                            {teamTag ? `${teamTag} ${p.name}` : p.name}
                          </a>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "0.5rem 1rem",
                          borderRight: "1px solid var(--border-light)",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "150px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "var(--muted)",
                          }}
                          title={p.steam_id_64 || "N/A"}
                        >
                          {p.steam_id_64 || "N/A"}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "0.5rem 1rem",
                          borderRight: "1px solid var(--border-light)",
                          textAlign: "center",
                        }}
                      >
                        {p.l4d2_playtime_hours !== null
                          ? p.l4d2_playtime_hours
                          : "-"}
                      </td>
                      <td
                        style={{
                          padding: "0.5rem 1rem",
                          borderRight: "1px solid var(--border-light)",
                          textAlign: "center",
                        }}
                      >
                        {p.is_profile_private || !p.l4d2_playtime_hours || Number(p.l4d2_playtime_hours) === 0 ? (
                          <span className="text-danger">No</span>
                        ) : (
                          <span className="text-success">Sí</span>
                        )}
                      </td>
                      <td
                        style={{ padding: "0.5rem 1rem", textAlign: "center" }}
                      >
                        {(() => {
                          const banInfo = getPlayerBan(p.steam_id_64);
                          if (!banInfo)
                            return (
                              <span
                                className="text-muted"
                                style={{ fontSize: "0.8rem" }}
                              >
                                -
                              </span>
                            );
                          return (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.25rem",
                                alignItems: "center",
                              }}
                            >
                              {banInfo.bans?.length > 0 ? (
                                banInfo.bans.map((b: any, i: number) => (
                                   <a
                                    key={`ban-${i}`}
                                    href={b.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="badge"
                                    style={{
                                      background: "rgba(239, 68, 68, 0.1)",
                                      color: "var(--danger)",
                                      border:
                                        "1px solid rgba(239, 68, 68, 0.3)",
                                      textDecoration: "none",
                                      width: "100%",
                                      padding: "2px 5px",
                                      fontSize: "0.7rem",
                                      display: "inline-block",
                                    }}
                                    title={`Ver baneo en ${b.source}`}
                                  >
                                    {b.source} (Ban)
                                  </a>
                                ))
                              ) : (
                                <span
                                  className="badge"
                                  style={{
                                    background: "rgba(34, 197, 94, 0.1)",
                                    color: "var(--success)",
                                    border: "1px solid rgba(34, 197, 94, 0.3)",
                                    padding: "2px 8px",
                                    fontSize: "0.75rem",
                                    display: "inline-block",
                                    fontWeight: "bold",
                                  }}
                                >
                                  Legit
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div
              style={{
                marginTop: "auto",
                borderTop: "1px solid var(--border-light)",
                padding: "0.75rem 1rem",
                textAlign: "right",
                fontWeight: "bold",
                background: "rgba(0,0,0,0.2)",
              }}
            >
              Promedio de horas jugadas:{" "}
              <span style={{ color: "var(--primary)" }}>{avgHours} hrs</span>
            </div>
          </div>

          {/* Action Column */}
          <div
            style={{
              flex: "0 0 200px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "stretch",
              padding: "1.25rem 1rem",
              gap: "0.65rem",
              background: "rgba(0,0,0,0.2)",
              position: "relative",
            }}
            onClick={(e) => isAccepted && e.stopPropagation()}
          >
            {team.status === "pending" && canManage && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    fontWeight: 700,
                  }}
                  onClick={() => handleAcceptTeam(team.id)}
                >
                  ACEPTAR
                </button>
                {(tournament.bracket_status === "generated" || tournament.bracket_status === "completed") && (
                  <button
                    type="button"
                    className="btn btn-secondary text-warning text-xs"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.6rem",
                      background: "rgba(234,179,8,0.08)",
                      border: "1px solid rgba(234,179,8,0.25)",
                    }}
                    onClick={() => {
                      setTargetReplaceTeamId("");
                      setReplaceModal({ isOpen: true, newTeamId: team.id, newTeamName: team.name });
                    }}
                    title="Sustituir a un equipo retirado/descalificado en las llaves"
                  >
                    Aceptar Reemplazo
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger text-sm"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.85rem",
                  }}
                  onClick={() => handleRejectOrDelete(team.id)}
                >
                  RECHAZAR
                </button>
              </div>
            )}
            {["accepted", "eliminated", "disqualified", "withdrawn"].includes(team.status) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", width: "100%" }}>
                {(canManage ||
                  (session?.user?.id === team.creator_id && !isLocked)) && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.85rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.45rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                      onClick={() =>
                        router.push(`/tournament/${id}/team/${team.id}`)
                      }
                    >
                      <Edit size={14} />
                      <span>Editar Equipo</span>
                    </button>
                  )}
                {canManage && (
                  <div style={{ position: "relative", width: "100%" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.6rem 0.85rem",
                        background: openActionMenuTeamId === team.id ? "rgba(255,255,255,0.1)" : "var(--bg-surface-elevated)",
                        border: openActionMenuTeamId === team.id ? "1px solid var(--primary)" : "1px solid var(--border-light)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        transition: "all 0.2s ease",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionMenuTeamId((prev) => (prev === team.id ? null : team.id));
                      }}
                      title="Acciones y estado del equipo"
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <Settings size={14} color="var(--primary)" />
                        <span>Acciones</span>
                      </span>
                      <ChevronDown
                        size={15}
                        style={{
                          transform: openActionMenuTeamId === team.id ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    </button>

                    {openActionMenuTeamId === team.id && (
                      <div
                        className="dropdown-menu"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          right: 0,
                          left: 0,
                          width: "100%",
                          minWidth: "180px",
                          zIndex: 9999,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            padding: "0.45rem 0.85rem",
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            borderBottom: "1px solid var(--border-light)",
                          }}
                        >
                          Estado del Equipo
                        </div>

                        {team.status !== "accepted" && (
                          <button
                            type="button"
                            className="dropdown-item dropdown-item-success"
                            onClick={() => {
                              setOpenActionMenuTeamId(null);
                              handleUpdateTeamStatus(team.id, "accepted", "En Competencia");
                            }}
                          >
                            <UserCheck size={14} />
                            <span>Reactivar</span>
                          </button>
                        )}

                        {team.status !== "eliminated" && (
                          <button
                            type="button"
                            className="dropdown-item dropdown-item-eliminated"
                            onClick={() => {
                              setOpenActionMenuTeamId(null);
                              setStatusConfirmModal({
                                isOpen: true,
                                teamId: team.id,
                                teamName: team.name,
                                newStatus: "eliminated",
                                statusLabel: "Eliminado",
                              });
                            }}
                          >
                            <UserX size={14} />
                            <span>Eliminado</span>
                          </button>
                        )}

                        {team.status !== "disqualified" && (
                          <button
                            type="button"
                            className="dropdown-item dropdown-item-disqualified"
                            onClick={() => {
                              setOpenActionMenuTeamId(null);
                              setStatusConfirmModal({
                                isOpen: true,
                                teamId: team.id,
                                teamName: team.name,
                                newStatus: "disqualified",
                                statusLabel: "Descalificado",
                              });
                            }}
                          >
                            <Ban size={14} />
                            <span>Descalificado</span>
                          </button>
                        )}

                        {team.status !== "withdrawn" && (
                          <button
                            type="button"
                            className="dropdown-item dropdown-item-withdrawn"
                            onClick={() => {
                              setOpenActionMenuTeamId(null);
                              setStatusConfirmModal({
                                isOpen: true,
                                teamId: team.id,
                                teamName: team.name,
                                newStatus: "withdrawn",
                                statusLabel: "Retirado (Salida propia)",
                              });
                            }}
                          >
                            <UserMinus size={14} />
                            <span>Retirado</span>
                          </button>
                        )}

                        <div className="dropdown-divider" />

                        <button
                          type="button"
                          className="dropdown-item dropdown-item-danger"
                          onClick={() => {
                            setOpenActionMenuTeamId(null);
                            handleRejectOrDelete(team.id);
                          }}
                          title="Eliminar registro completamente del torneo"
                        >
                          <Trash2 size={14} />
                          <span>Borrar Registro</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {team.status === "pending" &&
              !canManage &&
              session?.user?.id === team.creator_id && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1rem",
                    color: "var(--warning)",
                    textAlign: "center",
                    fontSize: "0.9rem",
                  }}
                >
                  Esperando revisión de un administrador
                </div>
              )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="container"
      style={{ paddingBottom: "4rem", maxWidth: "1400px" }}
    >
      <header
        style={{
          marginBottom: "3rem",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {(tournament.logo_url || templateJson.logo_url) && (
          <img
            src={tournament.logo_url || templateJson.logo_url}
            alt={tournament.name}
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "20px",
              objectFit: "cover",
              marginBottom: "0.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          />
        )}
        <h1 style={{ fontSize: "2.5rem", margin: 0 }}>{tournament.name}</h1>
        <p
          className="text-muted"
          style={{ maxWidth: "600px", margin: "0 auto" }}
        >
          {tournament.description}
        </p>


        {/* Social Links & Rules */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            alignItems: "center",
            marginTop: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {renderSocialLink("youtube", templateJson.social_links?.youtube, YoutubeIcon, "YouTube", "#FF0000")}
            {renderSocialLink("discord", templateJson.social_links?.discord, DiscordIcon, "Discord", "#5865F2")}
            {renderSocialLink("twitch", templateJson.social_links?.twitch, TwitchIcon, "Twitch", "#9146FF")}
            {renderSocialLink("twitter", templateJson.social_links?.twitter, XIcon, "X (Twitter)", "#FFFFFF")}
            {renderSocialLink("kick", templateJson.social_links?.kick, KickIcon, "Kick", "#53FC18")}
            {renderSocialLink("steam", templateJson.social_links?.steam, SteamIcon, "Steam", "#66C0F4")}
            {renderSocialLink("instagram", templateJson.social_links?.instagram, InstagramIcon, "Instagram", "#E1306C")}
            {renderSocialLink("website", templateJson.social_links?.website, Globe, "Sitio Web", "var(--primary)")}
          </div>
          {templateJson.rules && (
            <button
              className="btn btn-secondary text-sm"
              onClick={() => setShowRulesModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <FileText size={18} /> {t("tournament_detail.view_rules")}
            </button>
          )}

          {/* Invite / Share Links */}
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              className="btn btn-secondary"
              style={{
                padding: "0.75rem 2rem",
                fontSize: "1.1rem",
                borderRadius: "var(--radius-full)",
              }}
              onClick={() => {
                const url = `${window.location.origin}/tournament/${id}`;
                navigator.clipboard.writeText(url);
                toast.success("¡Enlace del torneo copiado!");
              }}
              title="Copia este enlace para compartir el torneo."
            >
              <LinkIcon size={20} /> {t("tournament_detail.tournament_link_btn")}
            </button>

            {!isLocked && !isRegistrationFull && (
              <button
                className="btn btn-primary"
                style={{
                  padding: "0.75rem 2rem",
                  fontSize: "1.1rem",
                  borderRadius: "var(--radius-full)",
                  boxShadow: "0 4px 15px rgba(111, 175, 58, 0.4)",
                }}
                onClick={() => {
                  const url = `${window.location.origin}/tournament/${id}/register`;
                  navigator.clipboard.writeText(url);
                  toast.success("¡Enlace de inscripción copiado!");
                }}
                title="Copia este enlace y envíalo para que se inscriban."
              >
                <LinkIcon size={20} /> {t("tournament_detail.register_link_btn")}
              </button>
            )}
          </div>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          gap: "2rem",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "3rem",
        }}
      >
        <div
          style={{
            flex: "1 1 200px",
            textAlign: "center",
            position: "relative",
          }}
        >
          <Trophy
            size={32}
            style={{ color: "var(--primary)", margin: "0 auto 1rem" }}
          />
          <h3>{t("tournament_detail.status_label")}</h3>
          <p
            className={
              isLocked
                ? "text-danger"
                : isFull
                  ? "text-warning"
                  : "text-success"
            }
          >
            {isLocked
              ? t("tournament_detail.status_closed")
              : isFull
                ? t("tournament_detail.status_full")
                : t("tournament_detail.status_open")}
          </p>
        </div>
        <div style={{ flex: "1 1 200px", textAlign: "center" }}>
          <Users
            size={32}
            style={{ color: "var(--primary)", margin: "0 auto 1rem" }}
          />
          <h3>{t("tournament_detail.stat_registered")}</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            {acceptedTeamsAll.length} / {tournament.max_teams}
          </p>
        </div>
        {(canManage || !isLocked) && (
          <div style={{ flex: "1 1 200px", textAlign: "center" }}>
            <Users
              size={32}
              style={{ color: "var(--muted)", margin: "0 auto 1rem" }}
            />
            <h3>{t("tournament_detail.stat_pending")}</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
              {pendingTeams.length}
            </p>
          </div>
        )}
        {isCreator && (
          <div style={{ flex: "1 1 200px", textAlign: "center" }}>
            <Download
              size={32}
              style={{ color: "var(--primary)", margin: "0 auto 1rem" }}
            />
            <h3>{t("tournament_detail.stat_export")}</h3>
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              style={{ marginTop: "0.5rem" }}
            >
              {t("tournament_detail.download_excel")}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportLogos}
              style={{ marginTop: "0.5rem", marginLeft: "0.5rem" }}
            >
              Logos (ZIP)
            </button>
          </div>
        )}
      </div>

      <main>
        {/* TABS */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "2rem",
            borderBottom: "1px solid var(--border-light)",
            paddingBottom: "0.5rem",
            overflowX: "auto",
          }}
        >
          <button
            className={`btn ${activeTab === "teams" ? "btn-primary" : "btn-secondary text-muted"
              }`}
            style={{ borderRadius: "8px", border: "none" }}
            onClick={() => setActiveTab("teams")}
          >
            {templateJson.is1v1
              ? t("tournament_detail.tab_teams_1v1")
              : t("tournament_detail.tab_teams")}
          </button>
          {(canManage || !isLocked) && (
            <button
              className={`btn ${activeTab === "pending"
                ? "btn-primary"
                : "btn-secondary text-muted"
                }`}
              style={{ borderRadius: "8px", border: "none" }}
              onClick={() => setActiveTab("pending")}
            >
              {t("tournament_detail.tab_pending", { count: pendingTeams.length })}
            </button>
          )}
          <button
            className={`btn ${activeTab === "bracket"
              ? "btn-primary"
              : "btn-secondary text-muted"
              }`}
            style={{ borderRadius: "8px", border: "none" }}
            onClick={() => setActiveTab("bracket")}
          >
            {t("tournament_detail.tab_bracket")}
          </button>
          <button
            className={`btn ${activeTab === "casters" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.85rem", padding: "0.5rem 0.85rem" }}
            onClick={() => setActiveTab("casters")}
          >
            {t("tournament_detail.tab_casters", { count: tournamentCasters.length })}
            {canManage && tournamentApplications.filter((a) => a.status === "pending").length > 0 && (
              <span
                style={{
                  background: "rgba(234, 179, 8, 0.25)",
                  color: "var(--warning)",
                  padding: "0.1rem 0.45rem",
                  borderRadius: "100px",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                }}
              >
                {tournamentApplications.filter((a) => a.status === "pending").length} {t("tournament_detail.pending_badge")}
              </span>
            )}
          </button>
        </div>

        {activeTab === "bracket" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <h2 style={{ margin: 0, color: "var(--primary)" }}>
                {t("tournament_detail.bracket_title")}
              </h2>
              {canManage && (
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateBracketClick}
                  disabled={isGeneratingBracket || acceptedTeamsAll.length < 2}
                  style={{
                    background:
                      tournament.bracket_status === "generated"
                        ? "var(--warning)"
                        : "var(--primary)",
                    color: "#000",
                  }}
                >
                  {isGeneratingBracket
                    ? t("tournament_detail.generating")
                    : tournament.bracket_status === "generated" ||
                      tournament.bracket_status === "completed"
                      ? t("tournament_detail.regen_bracket")
                      : t("tournament_detail.generate_bracket")}
                </button>
              )}
            </div>

            {tournament.bracket_status === "generated" ||
              tournament.bracket_status === "completed" ? (
              templateJson.tournamentFormat === "swiss" ? (
                <SwissViewer
                  matches={matches}
                  teams={participatingTeamsAll as any}
                  canManage={canManage}
                  onMatchUpdated={refreshMatches}
                  tournament={tournament as any}
                />
              ) : (
                <BracketViewer
                  matches={matches}
                  teams={participatingTeamsAll as any}
                  canManage={canManage}
                  onMatchUpdated={refreshMatches}
                  tournament={tournament as any}
                />
              )
            ) : (
              <div
                className="card"
                style={{ textAlign: "center", padding: "3rem" }}
              >
                <p className="text-muted">
                  {t("tournament_detail.bracket_not_generated")}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "teams" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <input
                  type="text"
                  className="input-base"
                  placeholder={
                    templateJson.is1v1
                      ? t("tournament_detail.search_player_placeholder")
                      : t("tournament_detail.search_team_placeholder")
                  }
                  value={teamsSearch}
                  onChange={(e) => setTeamsSearch(e.target.value)}
                  style={{ width: "100%", maxWidth: "400px" }}
                />
                {!isRegistrationFull && !isLocked && (
                  <button
                    className="btn btn-primary"
                    onClick={() => router.push(`/tournament/${id}/register`)}
                  >
                    {templateJson.is1v1
                      ? t("tournament_detail.register_player_btn")
                      : t("tournament_detail.register_team_btn")}
                  </button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span className="text-sm text-muted font-bold mr-1">Filtrar por estado:</span>
                <button
                  type="button"
                  className={`btn text-sm ${statusFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "4px 12px" }}
                  onClick={() => setStatusFilter("all")}
                >
                  Todos ({participatingTeamsAll.length})
                </button>
                <button
                  type="button"
                  className={`btn text-sm ${statusFilter === "accepted" ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "4px 12px" }}
                  onClick={() => setStatusFilter("accepted")}
                >
                  En Competencia ({participatingTeamsAll.filter(t => t.status === "accepted").length})
                </button>
                <button
                  type="button"
                  className={`btn text-sm ${statusFilter === "eliminated" ? "" : "btn-secondary"}`}
                  style={{
                    padding: "4px 12px",
                    background: statusFilter === "eliminated" ? "#EF4444" : "var(--bg-surface-elevated)",
                    color: statusFilter === "eliminated" ? "#fff" : "#EF4444",
                    border: statusFilter === "eliminated" ? "1px solid #EF4444" : "1px solid var(--border-light)",
                    fontWeight: statusFilter === "eliminated" ? 600 : "normal",
                  }}
                  onClick={() => setStatusFilter("eliminated")}
                >
                  Eliminados ({participatingTeamsAll.filter(t => t.status === "eliminated").length})
                </button>
                <button
                  type="button"
                  className={`btn text-sm ${statusFilter === "disqualified" ? "" : "btn-secondary"}`}
                  style={{
                    padding: "4px 12px",
                    background: statusFilter === "disqualified" ? "#F97316" : "var(--bg-surface-elevated)",
                    color: statusFilter === "disqualified" ? "#fff" : "#F97316",
                    border: statusFilter === "disqualified" ? "1px solid #F97316" : "1px solid var(--border-light)",
                    fontWeight: statusFilter === "disqualified" ? 600 : "normal",
                  }}
                  onClick={() => setStatusFilter("disqualified")}
                >
                  Descalificados ({participatingTeamsAll.filter(t => t.status === "disqualified").length})
                </button>
                <button
                  type="button"
                  className={`btn text-sm ${statusFilter === "withdrawn" ? "" : "btn-secondary"}`}
                  style={{
                    padding: "4px 12px",
                    background: statusFilter === "withdrawn" ? "#EAB308" : "var(--bg-surface-elevated)",
                    color: statusFilter === "withdrawn" ? "#000" : "#EAB308",
                    border: statusFilter === "withdrawn" ? "1px solid #EAB308" : "1px solid var(--border-light)",
                    fontWeight: statusFilter === "withdrawn" ? 600 : "normal",
                  }}
                  onClick={() => setStatusFilter("withdrawn")}
                >
                  Retirados ({participatingTeamsAll.filter(t => t.status === "withdrawn").length})
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <h2 style={{ margin: 0, color: "var(--success)" }}>
                {templateJson.is1v1
                  ? `Jugadores Participantes (${participatingTeams.length})`
                  : `Equipos Participantes (${participatingTeams.length})`}
              </h2>
              {participatingTeams.length > 0 && (
                <button
                  className="btn btn-secondary text-sm"
                  onClick={handleToggleAllTeams}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
                >
                  <MorphPlusMinusIcon
                    isExpanded={participatingTeams.every((t) => expandedTeams[t.id])}
                    size={14}
                    spring="snappy"
                  />
                  {participatingTeams.every((t) => expandedTeams[t.id])
                    ? "Contraer Todos"
                    : "Expandir Todos"}
                </button>
              )}
            </div>

            {participatingTeams.length === 0 ? (
              <div
                className="card"
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  marginBottom: "3rem",
                }}
              >
                <p className="text-muted">
                  Aún no hay equipos o jugadores participantes en este torneo.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginBottom: "3rem",
                }}
              >
                {participatingTeams.map((team) => renderTeamCard(team))}
              </div>
            )}
          </>
        )}

        {activeTab === "pending" && (canManage || !isLocked) && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <h2 style={{ margin: 0, color: "var(--warning)" }}>
                Registros (Pendientes)
              </h2>
            </div>

            {pendingTeams.length === 0 ? (
              <div
                className="card"
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  marginBottom: "3rem",
                }}
              >
                <p className="text-muted">
                  No hay equipos en cola de revisión.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginBottom: "3rem",
                }}
              >
                {pendingTeams.map((team) => renderTeamCard(team))}
              </div>
            )}
          </>
        )}

        {/* CASTERS TAB */}
        {activeTab === "casters" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* Casters Tab Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <h2 style={{ margin: 0, color: "var(--primary)" }}>
                  Casters Oficiales del Torneo
                </h2>
                <p className="text-muted text-sm" style={{ margin: "0.25rem 0 0" }}>
                  Transmisiones autorizadas y comentaristas oficiales para este torneo.
                </p>
              </div>

              {session?.user && (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  {userTournamentApp ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        background:
                          userTournamentApp.status === "approved"
                            ? "rgba(34, 197, 94, 0.15)"
                            : userTournamentApp.status === "rejected"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(234, 179, 8, 0.15)",
                        border: `1px solid ${userTournamentApp.status === "approved"
                          ? "rgba(34, 197, 94, 0.3)"
                          : userTournamentApp.status === "rejected"
                            ? "rgba(239, 68, 68, 0.3)"
                            : "rgba(234, 179, 8, 0.3)"
                          }`,
                      }}
                    >
                      {userTournamentApp.status === "approved" ? (
                        <CheckCircle2 size={16} color="var(--success)" />
                      ) : userTournamentApp.status === "rejected" ? (
                        <AlertCircle size={16} color="var(--danger)" />
                      ) : (
                        <Radio size={16} color="var(--warning)" />
                      )}
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          color:
                            userTournamentApp.status === "approved"
                              ? "var(--success)"
                              : userTournamentApp.status === "rejected"
                                ? "var(--danger)"
                                : "var(--warning)",
                        }}
                      >
                        {userTournamentApp.status === "approved"
                          ? "Caster Oficial Aprobado"
                          : userTournamentApp.status === "rejected"
                            ? "Solicitud Rechazada"
                            : "Solicitud en Revisión"}
                      </span>
                    </div>
                  ) : canManage ? (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => setIsCasterModalOpen(true)}
                        style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        Unirme como Caster Oficial
                      </button>
                    </div>
                  ) : isGlobalCaster ? (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleQuickApplyTournamentCaster}
                        disabled={isSubmittingCaster}
                        style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        <TwitchIcon size={16} />
                        {isSubmittingCaster
                          ? "Enviando..."
                          : `Postularme a este Torneo (${globalCasterProfile?.alias || "Caster"})`}
                      </button>
                      <button
                        className="btn btn-secondary text-xs"
                        onClick={() => setIsCasterModalOpen(true)}
                        style={{ padding: "0.5rem 0.75rem" }}
                      >
                        Personalizar
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn"
                      onClick={() => setIsCasterModalOpen(true)}
                      style={{
                        background: "#9146FF",
                        color: "#FFFFFF",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                      }}
                    >
                      <Radio size={16} /> Postularme como Caster
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Approved Casters Grid */}
            {tournamentCasters.length === 0 ? (
              <div
                className="card"
                style={{
                  textAlign: "center",
                  padding: "3.5rem 2rem",
                  background: "rgba(0, 0, 0, 0.2)",
                }}
              >
                <Radio size={32} style={{ color: "var(--primary)", margin: "0 auto 1rem", opacity: 0.8 }} />
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>
                  Aún no hay casters oficiales registrados para este torneo
                </h3>
                <p className="text-muted text-sm" style={{ maxWidth: "450px", margin: "0 auto" }}>
                  Si eres creador de contenido o comentarista, puedes postularte para transmitir y comentar los partidos de este torneo usando el botón superior.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "1.25rem",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                }}
              >
                {tournamentCasters.map((c) => (
                  <div
                    key={c.id}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      padding: "1.25rem",
                      background: "rgba(20, 22, 26, 0.7)",
                      border: "1px solid rgba(145, 70, 255, 0.25)",
                      borderRadius: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      {c.users?.image ? (
                        <img
                          src={c.users.image}
                          alt={c.alias}
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #9146FF",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: "rgba(145, 70, 255, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            color: "#C499FF",
                            border: "2px solid #9146FF",
                          }}
                        >
                          {c.alias?.slice(0, 2).toUpperCase() || "CA"}
                        </div>
                      )}
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "bold" }}>
                          {c.alias}
                        </h4>
                        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                          {c.users?.name || "Caster Oficial"}
                        </span>
                      </div>
                    </div>

                    {c.bio && (
                      <p
                        className="text-muted text-sm"
                        style={{
                          margin: 0,
                          lineHeight: "1.4",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {c.bio}
                      </p>
                    )}

                    {/* Languages */}
                    {c.languages && c.languages.length > 0 && (
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        {c.languages.map((lang: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "4px",
                              background: "rgba(255, 255, 255, 0.06)",
                              color: "var(--muted)",
                            }}
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stream Link Icons + Usernames */}
                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid var(--border-light)",
                        display: "flex",
                        gap: "0.85rem",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {c.twitch_channel && (
                        <a
                          href={`https://twitch.tv/${extractPlatformUsername(c.twitch_channel)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            color: "#9146FF",
                            textDecoration: "none",
                            fontWeight: "bold",
                            fontSize: "0.9rem",
                            background: "transparent",
                          }}
                          title={`Twitch: ${extractPlatformUsername(c.twitch_channel)}`}
                        >
                          <TwitchIcon size={16} color="#9146FF" />
                          <span>{extractPlatformUsername(c.twitch_channel)}</span>
                        </a>
                      )}

                      {c.kick_channel && (
                        <a
                          href={`https://kick.com/${extractPlatformUsername(c.kick_channel)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            color: "#53FC18",
                            textDecoration: "none",
                            fontWeight: "bold",
                            fontSize: "0.9rem",
                            background: "transparent",
                          }}
                          title={`Kick: ${extractPlatformUsername(c.kick_channel)}`}
                        >
                          <KickIcon size={16} color="#53FC18" />
                          <span>{extractPlatformUsername(c.kick_channel)}</span>
                        </a>
                      )}

                      {c.youtube_channel && (
                        <a
                          href={formatYoutubeUrl(c.youtube_channel)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            color: "#FF0000",
                            textDecoration: "none",
                            fontWeight: "bold",
                            fontSize: "0.9rem",
                            background: "transparent",
                          }}
                          title={`YouTube: ${extractPlatformUsername(c.youtube_channel)}`}
                        >
                          <YoutubeIcon size={16} color="#FF0000" />
                          <span>{extractPlatformUsername(c.youtube_channel)}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Organizer Review Section for Tournament Applications */}
            {canManage && (
              <div
                className="card"
                style={{
                  marginTop: "1.5rem",
                  padding: "1.5rem",
                  border: "1px solid var(--border-light)",
                  background: "rgba(0, 0, 0, 0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <ShieldCheck size={22} color="var(--primary)" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>
                      Gestión de Solicitudes de Casters del Torneo ({tournamentApplications.length})
                    </h3>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      Revisa y aprueba comentaristas específicos para este torneo.
                    </p>
                  </div>
                </div>

                {tournamentApplications.length === 0 ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px dashed var(--border-light)" }}>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      Aún no hay solicitudes de casters registradas para este torneo.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {tournamentApplications.map((app) => (
                      <div
                        key={app.id}
                        style={{
                          padding: "1rem",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--border-light)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "1rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "250px" }}>
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              background: "rgba(145, 70, 255, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#C499FF",
                              fontWeight: "bold",
                            }}
                          >
                            {app.alias?.slice(0, 2).toUpperCase() || "CA"}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontWeight: "bold", fontSize: "0.95rem" }}>{app.alias}</span>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.1rem 0.4rem",
                                  borderRadius: "4px",
                                  background:
                                    app.status === "approved"
                                      ? "rgba(34, 197, 94, 0.2)"
                                      : app.status === "rejected"
                                        ? "rgba(239, 68, 68, 0.2)"
                                        : "rgba(234, 179, 8, 0.2)",
                                  color:
                                    app.status === "approved"
                                      ? "var(--success)"
                                      : app.status === "rejected"
                                        ? "var(--danger)"
                                        : "var(--warning)",
                                }}
                              >
                                {app.status === "approved"
                                  ? "Aprobado"
                                  : app.status === "rejected"
                                    ? "Rechazado"
                                    : "Pendiente"}
                              </span>
                            </div>
                            <p className="text-muted text-xs" style={{ margin: "0.2rem 0 0" }}>
                              Usuario: {app.users?.name || app.users?.email}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", alignItems: "center" }}>
                          {app.twitch_channel && (
                            <a
                              href={`https://twitch.tv/${extractPlatformUsername(app.twitch_channel)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                color: "#9146FF",
                                textDecoration: "none",
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                                background: "transparent",
                              }}
                              title={`Twitch: ${extractPlatformUsername(app.twitch_channel)}`}
                            >
                              <TwitchIcon size={14} color="#9146FF" />
                              <span>{extractPlatformUsername(app.twitch_channel)}</span>
                            </a>
                          )}
                          {app.kick_channel && (
                            <a
                              href={`https://kick.com/${extractPlatformUsername(app.kick_channel)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                color: "#53FC18",
                                textDecoration: "none",
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                                background: "transparent",
                              }}
                              title={`Kick: ${extractPlatformUsername(app.kick_channel)}`}
                            >
                              <KickIcon size={14} color="#53FC18" />
                              <span>{extractPlatformUsername(app.kick_channel)}</span>
                            </a>
                          )}
                          {app.youtube_channel && (
                            <a
                              href={formatYoutubeUrl(app.youtube_channel)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                color: "#FF0000",
                                textDecoration: "none",
                                fontWeight: "bold",
                                fontSize: "0.85rem",
                                background: "transparent",
                              }}
                              title={`YouTube: ${extractPlatformUsername(app.youtube_channel)}`}
                            >
                              <YoutubeIcon size={14} color="#FF0000" />
                              <span>{extractPlatformUsername(app.youtube_channel)}</span>
                            </a>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                          {app.status !== "approved" && (
                            <button
                              className="btn text-xs"
                              style={{ background: "rgba(34, 197, 94, 0.2)", color: "var(--success)", border: "1px solid rgba(34, 197, 94, 0.4)", padding: "0.35rem 0.75rem" }}
                              onClick={() => handleReviewCaster(app.id, "approve")}
                            >
                              Aprobar
                            </button>
                          )}
                          {app.status !== "rejected" && (
                            <button
                              className="btn text-xs"
                              style={{ background: "rgba(239, 68, 68, 0.2)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.4)", padding: "0.35rem 0.75rem" }}
                              onClick={() => handleReviewCaster(app.id, "reject")}
                            >
                              Rechazar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={!!teamToDelete}
        title="Eliminar Equipo"
        message="¿Seguro que deseas eliminar este equipo? Esta acción no se puede deshacer y liberará un cupo."
        confirmText="Sí, Eliminar"
        isDanger={true}
        onConfirm={executeDeleteTeam}
        onCancel={() => setTeamToDelete(null)}
      />

      <ConfirmModal
        isOpen={statusConfirmModal.isOpen}
        title="Cambiar Estado de Competencia"
        message={`¿Seguro que deseas marcar al equipo "${statusConfirmModal.teamName}" como "${statusConfirmModal.statusLabel}"? Seguirá apareciendo en la lista y brackets pero como fuera de competencia.`}
        confirmText="Sí, Cambiar Estado"
        isDanger={statusConfirmModal.newStatus !== "accepted"}
        onConfirm={() => handleUpdateTeamStatus(statusConfirmModal.teamId, statusConfirmModal.newStatus, statusConfirmModal.statusLabel)}
        onCancel={() => setStatusConfirmModal({ isOpen: false, teamId: "", teamName: "", newStatus: "", statusLabel: "" })}
      />

      <ConfirmModal
        isOpen={replaceModal.isOpen}
        title="Sustituir Equipo en el Bracket"
        message={
          <div>
            <p className="mb-3">
              Selecciona el equipo retirado o descalificado al cual <strong>{replaceModal.newTeamName}</strong> reemplazará en el bracket y partidas:
            </p>
            {substitutableTeams.length === 0 ? (
              <p className="text-warning text-sm">
                No hay equipos marcados como retirados o descalificados en este momento.
              </p>
            ) : (
              <select
                className="input-base w-full mt-2"
                value={targetReplaceTeamId}
                onChange={(e) => setTargetReplaceTeamId(e.target.value)}
              >
                <option value="">-- Selecciona equipo a sustituir --</option>
                {substitutableTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.status === "disqualified" ? "Descalificado" : "Retirado"})
                  </option>
                ))}
              </select>
            )}
          </div>
        }
        confirmText="Sí, Sustituir en Bracket"
        isDanger={false}
        onConfirm={executeSubstituteTeam}
        onCancel={() => {
          setReplaceModal({ isOpen: false, newTeamId: "", newTeamName: "" });
          setTargetReplaceTeamId("");
        }}
      />

      {/* Caster Postulation Modal */}
      {isCasterModalOpen && (
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
          onClick={() => setIsCasterModalOpen(false)}
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
              background: "var(--bg-surface)",
              border: "1px solid var(--border-light)",
              borderRadius: "14px",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Radio size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>
                  {canManage
                    ? "Transmitir mi Torneo (Caster Oficial)"
                    : isGlobalCaster
                      ? "Postulación de Caster al Torneo"
                      : "Rol de Caster Requerido"}
                </h3>
              </div>
              <button className="btn-icon" onClick={() => setIsCasterModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {!isGlobalCaster && !canManage ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div
                  style={{
                    background: "rgba(145, 70, 255, 0.1)",
                    border: "1px solid rgba(145, 70, 255, 0.25)",
                    borderRadius: "10px",
                    padding: "1.25rem",
                  }}
                >
                  <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", lineHeight: 1.5, color: "var(--text-main)" }}>
                    Para poder postularte a transmitir las partidas de este torneo, primero necesitas tener el rol general de <strong>Caster Oficial</strong>.
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                    Al tener tu rol de Caster en tu cuenta, tu perfil (alias, canal de Twitch, biografía e idiomas) queda guardado para que puedas <strong>postularte a cualquier torneo con 1 solo clic</strong> sin tener que volver a rellenar información cada vez.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsCasterModalOpen(false)}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setIsCasterModalOpen(false);
                      router.push("/settings#caster");
                    }}
                    style={{
                      background: "#9146FF",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.6rem 1.2rem",
                      borderRadius: "8px",
                    }}
                  >
                    <TwitchIcon size={16} /> Postularme para Rol de Caster
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApplyCaster} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div
                  style={{
                    background: "rgba(111, 175, 58, 0.1)",
                    border: "1px solid rgba(111, 175, 58, 0.25)",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    fontSize: "0.85rem",
                    color: "var(--text-main)",
                  }}
                >
                  {canManage ? (
                    <>
                      Eres <strong>administrador/organizador</strong> de este torneo. Puedes vincular tu canal y castear tu torneo directamente sin necesidad de postulación global previa.
                    </>
                  ) : (
                    <>
                      Tienes el rol de <strong>Caster Oficial ({globalCasterProfile?.alias || session?.user?.name})</strong>. Tus datos han sido cargados automáticamente.
                    </>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                    Alias de Caster *
                  </label>
                  <input
                    type="text"
                    className="input-base"
                    required
                    placeholder="ej. CastMaster"
                    value={casterForm.alias}
                    onChange={(e) => setCasterForm({ ...casterForm, alias: e.target.value })}
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Twitch Channel */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <TwitchIcon size={15} color="#9146FF" /> Canal de Twitch
                    </span>
                    {Boolean(casterForm.twitch_channel) ? (
                      <span style={{ color: "#9146FF", fontSize: "0.75rem", fontWeight: "bold" }}>Vinculado</span>
                    ) : (
                      <span style={{ color: "var(--warning)", fontSize: "0.75rem" }}>Opcional</span>
                    )}
                  </label>
                  {Boolean(casterForm.twitch_channel) ? (
                    <div
                      style={{
                        background: "rgba(145, 70, 255, 0.08)",
                        border: "1px solid rgba(145, 70, 255, 0.3)",
                        borderRadius: "8px",
                        padding: "0.6rem 0.85rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        color: "#9146FF",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                      }}
                    >
                      <span>{extractPlatformUsername(casterForm.twitch_channel)}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: "normal" }}>Bloqueado por cuenta vinculada</span>
                    </div>
                  ) : (
                    <Link
                      href="/caster"
                      className="btn"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        padding: "0.6rem 0.85rem",
                        borderRadius: "8px",
                        background: "rgba(145, 70, 255, 0.08)",
                        border: "1px dashed rgba(145, 70, 255, 0.4)",
                        color: "#bf94ff",
                        fontSize: "0.85rem",
                        textDecoration: "none",
                      }}
                    >
                      <TwitchIcon size={15} color="#9146FF" /> Vincular Twitch en CasterHub
                    </Link>
                  )}
                </div>

                {/* Kick Channel */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <KickIcon size={15} color="#53FC18" /> Canal de Kick
                    </span>
                    {Boolean(casterForm.kick_channel) ? (
                      <span style={{ color: "#53FC18", fontSize: "0.75rem", fontWeight: "bold" }}>Vinculado</span>
                    ) : (
                      <span style={{ color: "var(--warning)", fontSize: "0.75rem" }}>Opcional</span>
                    )}
                  </label>
                  {Boolean(casterForm.kick_channel) ? (
                    <div
                      style={{
                        background: "rgba(83, 252, 24, 0.08)",
                        border: "1px solid rgba(83, 252, 24, 0.3)",
                        borderRadius: "8px",
                        padding: "0.6rem 0.85rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        color: "#53FC18",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                      }}
                    >
                      <span>{extractPlatformUsername(casterForm.kick_channel)}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: "normal" }}>Bloqueado por cuenta vinculada</span>
                    </div>
                  ) : (
                    <Link
                      href="/caster"
                      className="btn"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        padding: "0.6rem 0.85rem",
                        borderRadius: "8px",
                        background: "rgba(83, 252, 24, 0.08)",
                        border: "1px dashed rgba(83, 252, 24, 0.4)",
                        color: "#53FC18",
                        fontSize: "0.85rem",
                        textDecoration: "none",
                      }}
                    >
                      <KickIcon size={15} color="#53FC18" /> Vincular Kick en CasterHub
                    </Link>
                  )}
                </div>

                {/* YouTube Channel (Editable via URL / handle) */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <YoutubeIcon size={15} color="#FF0000" /> Canal de YouTube (Opcional)
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Por URL o @handle</span>
                  </label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="ej. @miCanal o https://youtube.com/@miCanal"
                    value={casterForm.youtube_channel}
                    onChange={(e) => setCasterForm({ ...casterForm, youtube_channel: e.target.value })}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                    Idiomas de Transmisión
                  </label>
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", paddingTop: "0.4rem" }}>
                    {MAIN_CASTER_LANGUAGES.map((lang) => {
                      const currentLangs = normalizeLanguages(casterForm.languages);
                      const isChecked = currentLangs.includes(lang);
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
                            fontWeight: isChecked ? "bold" : "500",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            background: isChecked
                              ? "rgba(111, 175, 58, 0.15)"
                              : "rgba(255, 255, 255, 0.03)",
                            border: isChecked
                              ? "1px solid var(--primary)"
                              : "1px solid rgba(255, 255, 255, 0.08)",
                            boxShadow: isChecked
                              ? "0 0 14px rgba(111, 175, 58, 0.35), inset 0 0 8px rgba(111, 175, 58, 0.1)"
                              : "none",
                            color: isChecked ? "#ffffff" : "var(--muted)",
                            transform: isChecked ? "translateY(-1px)" : "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCasterForm({ ...casterForm, languages: normalizeLanguages([...currentLangs, lang]) });
                              } else {
                                setCasterForm({ ...casterForm, languages: currentLangs.filter((l: string) => l !== lang) });
                              }
                            }}
                            style={{ display: "none" }}
                          />
                          <div
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "4px",
                              border: isChecked
                                ? "1px solid var(--primary)"
                                : "1px solid rgba(255, 255, 255, 0.3)",
                              background: isChecked ? "var(--primary)" : "rgba(0, 0, 0, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {isChecked && (
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

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                    Mensaje para el organizador del torneo (Opcional)
                  </label>
                  <textarea
                    className="input-base"
                    rows={3}
                    placeholder="Indica tu disponibilidad o experiencia para este torneo en particular..."
                    value={casterForm.bio}
                    onChange={(e) => setCasterForm({ ...casterForm, bio: e.target.value })}
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsCasterModalOpen(false)}
                    disabled={isSubmittingCaster}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmittingCaster}
                  >
                    {isSubmittingCaster
                      ? "Enviando..."
                      : canManage
                        ? "Confirmar como Caster Oficial"
                        : "Enviar Postulación"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={bracketConfirmModal.isOpen}
        title={bracketConfirmModal.isRegen ? "Regenerar Llaves" : "Generar Llaves"}
        message={
          <div>
            <p>
              {bracketConfirmModal.isRegen
                ? "¿Estás seguro de REGENERAR las llaves? Esto ELIMINARÁ el progreso actual de todas las partidas y mezclará los equipos de nuevo."
                : "¿Estás seguro de generar las llaves? Esto no se puede deshacer y asignará los equipos aleatoriamente."}
            </p>
            {templateJson.tournamentFormat === "swiss" && (
              <div style={{ marginTop: "1rem" }}>
                <label className="text-sm font-medium mb-1 block">Número de Rondas (Swiss Stage):</label>
                <input
                  type="number"
                  className="input-base"
                  value={swissRounds}
                  onChange={(e) => setSwissRounds(parseInt(e.target.value) || 1)}
                  min="1"
                  style={{ width: "100px" }}
                />
                <p className="text-xs text-muted mt-1">Recomendado para {acceptedTeamsAll.length} equipos: {Math.ceil(Math.log2(acceptedTeamsAll.length))}</p>
              </div>
            )}
          </div>
        }
        confirmText={bracketConfirmModal.isRegen ? "Sí, Regenerar" : "Sí, Generar"}
        isDanger={bracketConfirmModal.isRegen}
        onConfirm={executeGenerateBracket}
        onCancel={() => setBracketConfirmModal({ isOpen: false, isRegen: false })}
      />

      {/* Rules Modal */}
      {showRulesModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              width: "90%",
              maxWidth: "1200px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "1rem",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <FileText size={24} color="var(--primary)" /> Reglas del Torneo
              </h2>
              <button
                className="btn-icon"
                onClick={() => setShowRulesModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            <div
              id="rules-scroll-container"
              style={{
                overflowY: "auto",
                flex: 1,
                padding: "1rem",
                paddingBottom: "4rem",
                whiteSpace: "normal",
                lineHeight: "1.6",
                color: "var(--muted)",
                fontSize: "1.05rem",
              }}
            >
              {templateJson.rules ? (
                <div className="markdown-container">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 id={generateId(props.children)} {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 id={generateId(props.children)} {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 id={generateId(props.children)} {...props} />
                      ),
                      a: ({ node, href, ...props }) => {
                        if (href && href.startsWith("#")) {
                          return (
                            <a
                              href={href}
                              onClick={(e) => {
                                e.preventDefault();
                                const targetId = href.replace("#", "");
                                const element =
                                  document.getElementById(targetId);
                                if (element) {
                                  element.scrollIntoView({
                                    behavior: "smooth",
                                  });
                                }
                              }}
                              {...props}
                            />
                          );
                        }
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            {...props}
                          />
                        );
                      },
                    }}
                  >
                    {templateJson.rules}
                  </ReactMarkdown>
                </div>
              ) : (
                "No hay reglas definidas para este torneo."
              )}
            </div>

            {/* Scroll to Top Button */}
            <button
              className="btn btn-secondary"
              style={{
                position: "absolute",
                bottom: "1.5rem",
                right: "1.5rem",
                borderRadius: "2rem",
                padding: "0.5rem 1rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                zIndex: 10,
                opacity: 0.9,
              }}
              onClick={() => {
                const scrollContainer = document.getElementById(
                  "rules-scroll-container"
                );
                if (scrollContainer) {
                  scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              title="Volver arriba"
            >
              ↑ Volver Arriba
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

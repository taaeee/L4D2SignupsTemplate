"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users,
  Trophy,
  Download,
  Settings,
  Edit,
  Video,
  MessageCircle,
  PlayCircle,
  MessageSquare,
  FileText,
  X,
  Link as LinkIcon,
  Copy,
  Tv,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";
import ReactMarkdown from "react-markdown";
import { fetchBansInBatches } from "@/lib/ban-checker";
import BracketViewer from "@/components/BracketViewer";
import SwissViewer from "@/components/SwissViewer";
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

export default function TournamentDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [teamsSearch, setTeamsSearch] = useState("");
  const [activeTab, setActiveTab] = useState("teams");
  const [matches, setMatches] = useState<Match[]>([]);
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

  // Tournament Casters State
  const [tournamentCasters, setTournamentCasters] = useState<any[]>([]);
  const [tournamentApplications, setTournamentApplications] = useState<any[]>([]);
  const [userTournamentApp, setUserTournamentApp] = useState<any>(null);
  const [isCasterModalOpen, setIsCasterModalOpen] = useState(false);
  const [casterForm, setCasterForm] = useState({
    alias: "",
    bio: "",
    twitch_channel: "",
    youtube_channel: "",
    languages: ["Español"],
  });
  const [isSubmittingCaster, setIsSubmittingCaster] = useState(false);

  const templateJson = (tournament?.template_json as any) || {};

  useEffect(() => {
    if (id) {
      fetchData();
      fetchTournamentCasters();
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
        if (data.userApplication) {
          setCasterForm({
            alias: data.userApplication.alias || "",
            bio: data.userApplication.bio || "",
            twitch_channel: data.userApplication.twitch_channel || "",
            youtube_channel: data.userApplication.youtube_channel || "",
            languages: data.userApplication.languages || ["Español"],
          });
        }
      }
    } catch (e) {
      console.error("Error fetching tournament casters:", e);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
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

  if (isLoading) {
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
        toast.success("Solicitud enviada correctamente para este torneo.");
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

  const renderSocialLink = (linkType: string, url: string, Icon: any, label: string) => {
    if (!url) return null;
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="btn-icon social-icon"
        style={{ background: "transparent", color: "var(--primary)" }}
        title={label}
      >
        <Icon size={24} />
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
          overflow: "hidden",
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
                <span className="badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.3)", fontWeight: "bold", fontSize: "0.75rem", padding: "3px 8px" }}>
                  ELIMINADO
                </span>
              )}
              {team.status === "disqualified" && (
                <span className="badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.3)", fontWeight: "bold", fontSize: "0.75rem", padding: "3px 8px" }}>
                  DESCALIFICADO
                </span>
              )}
              {team.status === "withdrawn" && (
                <span className="badge" style={{ background: "rgba(234, 179, 8, 0.15)", color: "#eab308", border: "1px solid rgba(234, 179, 8, 0.3)", fontWeight: "bold", fontSize: "0.75rem", padding: "3px 8px" }}>
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
          <div
            style={{
              padding: "1rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: "var(--primary)",
                fontSize: "0.9rem",
                fontWeight: "bold",
              }}
            >
              {isExpanded ? "Ocultar ▲" : "Ver Detalles ▼"}
            </span>
          </div>
        </div>

        {/* Collapsible Area (Table + Actions) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            maxHeight: isExpanded ? "2000px" : "0px",
            opacity: isExpanded ? 1 : 0,
            overflowX: "auto",
            overflowY: "hidden",
            transition:
              "max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease, border 0.4s ease",
            borderTop: isExpanded ? "1px solid var(--border-light)" : "none",
          }}
        >
          {/* Table Column */}
          <div
            style={{
              flex: 1,
              minWidth: "600px",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid var(--border-light)",
            }}
            onClick={(e) => isAccepted && e.stopPropagation()}
          >
            <table
              style={{
                width: "100%",
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
                    ¿Perfil Público?
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
                        {p.is_profile_private ? (
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
            }}
            onClick={(e) => isAccepted && e.stopPropagation()}
          >
            {team.status === "pending" && canManage && (
              <>
                <button
                  className="btn text-success"
                  style={{
                    flex: 1,
                    borderRadius: 0,
                    borderBottom: "1px solid var(--border-light)",
                    background: "rgba(0,255,0,0.05)",
                  }}
                  onClick={() => handleAcceptTeam(team.id)}
                >
                  ACEPTAR
                </button>
                {(tournament.bracket_status === "generated" || tournament.bracket_status === "completed") && (
                  <button
                    className="btn text-warning text-xs"
                    style={{
                      flex: 1,
                      borderRadius: 0,
                      borderBottom: "1px solid var(--border-light)",
                      background: "rgba(234,179,8,0.08)",
                      padding: "0.5rem 0.25rem",
                    }}
                    onClick={() => {
                      setTargetReplaceTeamId("");
                      setReplaceModal({ isOpen: true, newTeamId: team.id, newTeamName: team.name });
                    }}
                    title="Sustituir a un equipo retirado/descalificado en las llaves"
                  >
                    ACEPTAR COMO REEMPLAZO
                  </button>
                )}
                <button
                  className="btn text-danger"
                  style={{
                    flex: 1,
                    borderRadius: 0,
                    background: "rgba(255,0,0,0.05)",
                  }}
                  onClick={() => handleRejectOrDelete(team.id)}
                >
                  RECHAZAR
                </button>
              </>
            )}
            {["accepted", "eliminated", "disqualified", "withdrawn"].includes(team.status) && (
              <>
                {(canManage ||
                  (session?.user?.id === team.creator_id && !isLocked)) && (
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, borderRadius: 0, borderBottom: "1px solid var(--border-light)" }}
                      onClick={() =>
                        router.push(`/tournament/${id}/team/${team.id}`)
                      }
                    >
                      VER / EDITAR
                    </button>
                  )}
                {canManage && (
                  <div style={{ display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.2)" }}>
                    {team.status !== "accepted" && (
                      <button
                        className="btn text-success text-sm"
                        style={{ borderRadius: 0, borderBottom: "1px solid var(--border-light)", background: "rgba(34,197,94,0.05)" }}
                        onClick={() => handleUpdateTeamStatus(team.id, "accepted", "En Competencia")}
                      >
                        Reactivar
                      </button>
                    )}
                    {team.status !== "eliminated" && (
                      <button
                        className="btn text-danger text-sm"
                        style={{ borderRadius: 0, borderBottom: "1px solid var(--border-light)" }}
                        onClick={() => setStatusConfirmModal({ isOpen: true, teamId: team.id, teamName: team.name, newStatus: "eliminated", statusLabel: "Eliminado" })}
                      >
                        Eliminado
                      </button>
                    )}
                    {team.status !== "disqualified" && (
                      <button
                        className="btn text-danger text-sm"
                        style={{ borderRadius: 0, borderBottom: "1px solid var(--border-light)" }}
                        onClick={() => setStatusConfirmModal({ isOpen: true, teamId: team.id, teamName: team.name, newStatus: "disqualified", statusLabel: "Descalificado" })}
                      >
                        Descalificado
                      </button>
                    )}
                    {team.status !== "withdrawn" && (
                      <button
                        className="btn text-warning text-sm"
                        style={{ borderRadius: 0, borderBottom: "1px solid var(--border-light)" }}
                        onClick={() => setStatusConfirmModal({ isOpen: true, teamId: team.id, teamName: team.name, newStatus: "withdrawn", statusLabel: "Retirado (Salida propia)" })}
                      >
                        Retirado
                      </button>
                    )}
                    <button
                      className="btn text-danger text-xs text-muted"
                      style={{ borderRadius: 0, background: "rgba(255,0,0,0.08)", padding: "0.4rem" }}
                      onClick={() => handleRejectOrDelete(team.id)}
                      title="Eliminar registro completamente del torneo"
                    >
                      Borrar Registro
                    </button>
                  </div>
                )}
              </>
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
            {renderSocialLink("youtube", templateJson.social_links?.youtube, Video, "YouTube")}
            {renderSocialLink("discord", templateJson.social_links?.discord, MessageCircle, "Discord")}
            {renderSocialLink("twitch", templateJson.social_links?.twitch, PlayCircle, "Twitch")}
            {renderSocialLink("twitter", templateJson.social_links?.twitter, MessageSquare, "X (Twitter)")}
            {renderSocialLink("website", templateJson.social_links?.website, LinkIcon, "Website")}
          </div>
          {templateJson.rules && (
            <button
              className="btn btn-secondary text-sm"
              onClick={() => setShowRulesModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <FileText size={18} /> Ver Reglas
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
              <LinkIcon size={20} /> Enlace del Torneo
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
                <LinkIcon size={20} /> Enlace de Inscripción
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
          <h3>Estado</h3>
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
              ? "Torneo Cerrado"
              : isRegistrationFull
                ? "Registro Lleno (300)"
                : "Registro Abierto"}
          </p>
        </div>
        <div style={{ flex: "1 1 200px", textAlign: "center" }}>
          <Users
            size={32}
            style={{ color: "var(--primary)", margin: "0 auto 1rem" }}
          />
          <h3>
            {templateJson.is1v1
              ? "Jugadores Aceptados"
              : "Equipos Aceptados"}
          </h3>
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
            <h3>En Cola (Pendientes)</h3>
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
            <h3>Exportar Datos</h3>
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              style={{ marginTop: "0.5rem" }}
            >
              Descargar Excel
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
              ? "Jugadores Inscritos"
              : "Equipos Inscritos"}
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
              Pendientes ({pendingTeams.length})
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
            Llaves (Bracket)
          </button>
          <button
            className={`btn ${activeTab === "casters"
                ? "btn-primary"
                : "btn-secondary text-muted"
              }`}
            style={{ borderRadius: "8px", border: "none", display: "flex", alignItems: "center", gap: "0.4rem" }}
            onClick={() => setActiveTab("casters")}
          >
            <Tv size={16} /> Casters Oficiales ({tournamentCasters.length})
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
                Llaves del Torneo
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
                    ? "Generando..."
                    : tournament.bracket_status === "generated" ||
                      tournament.bracket_status === "completed"
                      ? "Regenerar Llaves"
                      : "Generar Llaves"}
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
                  Las llaves aún no han sido generadas.
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
                      ? "Buscar jugador por nombre..."
                      : "Buscar equipo por nombre..."
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
                      ? "Registrarme"
                      : "Registrar mi Equipo"}
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
                  className={`btn text-sm ${statusFilter === "eliminated" ? "btn-danger" : "btn-secondary text-danger"}`}
                  style={{ padding: "4px 12px" }}
                  onClick={() => setStatusFilter("eliminated")}
                >
                  Eliminados ({participatingTeamsAll.filter(t => t.status === "eliminated").length})
                </button>
                <button
                  type="button"
                  className={`btn text-sm ${statusFilter === "disqualified" ? "btn-danger" : "btn-secondary text-danger"}`}
                  style={{ padding: "4px 12px" }}
                  onClick={() => setStatusFilter("disqualified")}
                >
                  Descalificados ({participatingTeamsAll.filter(t => t.status === "disqualified").length})
                </button>
                <button
                  type="button"
                  className={`btn text-sm ${statusFilter === "withdrawn" ? "btn-warning" : "btn-secondary"}`}
                  style={{ padding: "4px 12px", color: statusFilter === "withdrawn" ? "#fff" : "#eab308" }}
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
                >
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
                <h2 style={{ margin: 0, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Tv size={22} /> Casters Oficiales del Torneo
                </h2>
                <p className="text-muted text-sm" style={{ margin: "0.25rem 0 0" }}>
                  Transmisiones autorizadas y comentaristas oficiales para este torneo.
                </p>
              </div>

              {session?.user && (
                <div>
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
                        border: `1px solid ${
                          userTournamentApp.status === "approved"
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
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => setIsCasterModalOpen(true)}
                      style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <TwitchIcon size={16} /> Postularme como Caster
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
                <Tv size={36} style={{ color: "var(--muted)", margin: "0 auto 1rem" }} />
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>
                  Aún no hay casters oficiales registrados para este torneo
                </h3>
                <p className="text-muted text-sm" style={{ maxWidth: "450px", margin: "0 auto 1.5rem" }}>
                  Si eres creador de contenido o comentarista, puedes postularte para transmitir y comentar los partidos de este torneo.
                </p>
                {session?.user && !userTournamentApp && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsCasterModalOpen(true)}
                  >
                    Enviar Postulación de Caster
                  </button>
                )}
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

                    {/* Stream Link Button */}
                    <div style={{ marginTop: "auto", paddingTop: "0.5rem", borderTop: "1px solid var(--border-light)" }}>
                      {c.twitch_channel && (
                        <a
                          href={`https://twitch.tv/${c.twitch_channel}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn text-sm"
                          style={{
                            width: "100%",
                            background: "#9146FF",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.4rem",
                            padding: "0.5rem",
                          }}
                        >
                          <TwitchIcon size={16} /> Ver Canal en Twitch
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Organizer Review Section for Tournament Applications */}
            {canManage && tournamentApplications.length > 0 && (
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
                      Gestión de Solicitudes de Casters del Torneo
                    </h3>
                    <p className="text-muted text-sm" style={{ margin: 0 }}>
                      Revisa y aprueba comentaristas específicos para este torneo.
                    </p>
                  </div>
                </div>

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
                            Usuario: {app.users?.name || app.users?.email} | Twitch: {app.twitch_channel}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {app.twitch_channel && (
                          <a
                            href={`https://twitch.tv/${app.twitch_channel}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary text-xs"
                            style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.35rem 0.6rem" }}
                          >
                            <ExternalLink size={12} /> Canal
                          </a>
                        )}
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
              maxWidth: "500px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              background: "#14161A",
              border: "1px solid var(--border-light)",
              borderRadius: "12px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Tv size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: "1.25rem" }}>Postulación de Caster</h3>
              </div>
              <button className="btn-icon" onClick={() => setIsCasterModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyCaster} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                  Canal de Twitch *
                </label>
                <input
                  type="text"
                  className="input-base"
                  required
                  placeholder="ej. nombre_de_usuario o https://twitch.tv/..."
                  value={casterForm.twitch_channel}
                  onChange={(e) => setCasterForm({ ...casterForm, twitch_channel: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                  Canal de YouTube (Opcional)
                </label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="ej. @miCanal"
                  value={casterForm.youtube_channel}
                  onChange={(e) => setCasterForm({ ...casterForm, youtube_channel: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.4rem", color: "var(--muted)" }}>
                  Biografía / Experiencia (Opcional)
                </label>
                <textarea
                  className="input-base"
                  rows={3}
                  placeholder="Cuéntanos brevemente sobre tu experiencia casteando torneos..."
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
                  {isSubmittingCaster ? "Enviando..." : "Enviar Solicitud"}
                </button>
              </div>
            </form>
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

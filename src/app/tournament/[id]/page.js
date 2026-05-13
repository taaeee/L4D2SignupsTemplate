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
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";
import ReactMarkdown from "react-markdown";

const generateId = (children) => {
  const extractText = (node) => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node && node.props && node.props.children) return extractText(node.props.children);
    return '';
  };
  return extractText(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
};

export default function TournamentDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [teamsSearch, setTeamsSearch] = useState("");

  const [teamToDelete, setTeamToDelete] = useState(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [communityBans, setCommunityBans] = useState([]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

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

    try {
      if (teamsData && teamsData.length > 0) {
        // Collect all steamIds from all teams
        const allSteamIds = [];
        teamsData.forEach((team) => {
          if (team.team_members) {
            team.team_members.forEach((m) => {
              if (m.steam_id_64) allSteamIds.push(m.steam_id_64);
            });
          }
        });

        if (allSteamIds.length > 0) {
          const bansRes = await fetch("/api/bans/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ steamIds: allSteamIds }),
          });
          if (bansRes.ok) {
            const bansData = await bansRes.json();
            setCommunityBans(bansData);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch community bans", e);
    }

    setIsLoading(false);
  };

  const getPlayerBan = (steamId64) => {
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
    return (
      <div
        className="container"
        style={{ textAlign: "center", marginTop: "10vh" }}
      >
        Cargando Torneo...
      </div>
    );
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
  const isModerator = tournament.moderators?.includes(session?.user?.id);
  const canManage = isCreator || isModerator;
  const isLocked = tournament.status === "locked";

  const acceptedTeamsAll = teams.filter((t) => t.status === "accepted");
  const acceptedTeams = acceptedTeamsAll.filter((t) =>
    t.name.toLowerCase().includes(teamsSearch.toLowerCase())
  );
  const pendingTeams = teams.filter(
    (t) =>
      t.status === "pending" &&
      t.name.toLowerCase().includes(teamsSearch.toLowerCase())
  );

  const isFull = acceptedTeamsAll.length >= tournament.max_teams;
  const isRegistrationFull = teams.length >= 300;

  const handleAcceptTeam = async (teamId) => {
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
      setTeams(
        teams.map((t) => (t.id === teamId ? { ...t, status: "accepted" } : t))
      );
    }
  };

  const executeDeleteTeam = async () => {
    if (!teamToDelete) return;
    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamToDelete);
    if (!error) {
      setTeams(teams.filter((t) => t.id !== teamToDelete));
      toast.success("Equipo eliminado correctamente.");
    } else {
      toast.error("Error al eliminar el equipo.");
    }
    setTeamToDelete(null);
  };

  const handleRejectOrDelete = (teamId) => {
    setTeamToDelete(teamId);
  };

  const toggleTeam = (teamId) => {
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // Helper function to render a team card
  const renderTeamCard = (team) => {
    const isAccepted = team.status === "accepted";
    const isExpanded = !isAccepted || expandedTeams[team.id];

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
          cursor: isAccepted ? "pointer" : "default",
          transition: "background 0.3s ease",
        }}
        onClick={() => {
          if (isAccepted) toggleTeam(team.id);
        }}
        onMouseEnter={(e) => {
          if (isAccepted)
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          if (isAccepted) e.currentTarget.style.background = "rgba(0,0,0,0.3)";
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
                team.logo_url || "https://ui-avatars.com/api/?name=" + team.name
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

          {/* Name */}
          <div style={{ flex: 1, padding: "1rem 1rem 1rem 0" }}>
            <h3
              style={{
                margin: 0,
                fontSize: isExpanded ? "1.6rem" : "1.2rem",
                transition: "font-size 0.4s ease",
                wordBreak: "break-word",
              }}
            >
              {team.name}
            </h3>
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
                  const banInfo = getPlayerBan(p.steam_id_64);
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
                            {p.name}
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
                                banInfo.bans.map((b, i) => (
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
            {team.status === "accepted" && (
              <>
                {canManage && (
                  <button
                    className="btn text-danger"
                    style={{
                      flex: 1,
                      borderRadius: 0,
                      borderBottom: "1px solid var(--border-light)",
                      background: "rgba(255,0,0,0.05)",
                    }}
                    onClick={() => handleRejectOrDelete(team.id)}
                  >
                    ELIMINAR
                  </button>
                )}
                {/* Ver/Editar if Accepted. Can manage OR is captain and tournament not locked */}
                {(canManage ||
                  (session?.user?.id === team.creator_id && !isLocked)) && (
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, borderRadius: 0 }}
                    onClick={() =>
                      router.push(`/tournament/${id}/team/${team.id}`)
                    }
                  >
                    VER / EDITAR
                  </button>
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
        {tournament.template_json?.logo_url && (
          <img
            src={tournament.template_json.logo_url}
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
            {tournament.template_json?.social_links?.twitch && (
              <a
                href={tournament.template_json.social_links.twitch}
                target="_blank"
                rel="noreferrer"
                className="btn-icon social-icon"
                style={{ background: "transparent", color: "#9146FF" }}
                title="Twitch"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z"
                  />
                </svg>
              </a>
            )}
            {tournament.template_json?.social_links?.twitter && (
              <a
                href={tournament.template_json.social_links.twitter}
                target="_blank"
                rel="noreferrer"
                className="btn-icon social-icon"
                style={{ background: "transparent", color: "#1DA1F2" }}
                title="Twitter"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 14 14"
                >
                  <g fill="none">
                    <g clipPath="url(#SVGG1Ot4cAD)">
                      <path
                        fill="currentColor"
                        d="M11.025.656h2.147L8.482 6.03L14 13.344H9.68L6.294 8.909l-3.87 4.435H.275l5.016-5.75L0 .657h4.43L7.486 4.71zm-.755 11.4h1.19L3.78 1.877H2.504z"
                      />
                    </g>
                    <defs>
                      <clipPath id="SVGG1Ot4cAD">
                        <path fill="#fff" d="M0 0h14v14H0z" />
                      </clipPath>
                    </defs>
                  </g>
                </svg>
              </a>
            )}
            {tournament.template_json?.social_links?.youtube && (
              <a
                href={tournament.template_json.social_links.youtube}
                target="_blank"
                rel="noreferrer"
                className="btn-icon social-icon"
                style={{ background: "transparent", color: "#FF0000" }}
                title="YouTube"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="m10 15l5.19-3L10 9zm11.56-7.83c.13.47.22 1.1.28 1.9c.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83c-.25.9-.83 1.48-1.73 1.73c-.47.13-1.33.22-2.65.28c-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44c-.9-.25-1.48-.83-1.73-1.73c-.13-.47-.22-1.1-.28-1.9c-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83c.25-.9.83-1.48 1.73-1.73c.47-.13 1.33-.22 2.65-.28c1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44c.9.25 1.48.83 1.73 1.73"
                  />
                </svg>
              </a>
            )}
            {tournament.template_json?.social_links?.discord && (
              <a
                href={tournament.template_json.social_links.discord}
                target="_blank"
                rel="noreferrer"
                className="btn-icon social-icon"
                style={{ background: "transparent", color: "#5865F2" }}
                title="Discord"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.1.1 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02M8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12m6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12"
                  />
                </svg>
              </a>
            )}
          </div>
          {tournament.template_json?.rules && (
            <button
              className="btn btn-secondary text-sm"
              onClick={() => setShowRulesModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <FileText size={18} /> Ver Reglas
            </button>
          )}
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
          <h3>Equipos Aceptados</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            {acceptedTeamsAll.length} / {tournament.max_teams}
          </p>
        </div>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <input
            type="text"
            className="input-base"
            placeholder="Buscar equipo por nombre..."
            value={teamsSearch}
            onChange={(e) => setTeamsSearch(e.target.value)}
            style={{ width: "100%", maxWidth: "400px" }}
          />
          {!isRegistrationFull && !isLocked && (
            <button
              className="btn btn-primary"
              onClick={() => router.push(`/tournament/${id}/register`)}
            >
              Registrar mi Equipo
            </button>
          )}
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
            Equipos Aceptados
          </h2>
        </div>

        {acceptedTeams.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "3rem",
              marginBottom: "3rem",
            }}
          >
            <p className="text-muted">
              Aún no hay equipos aceptados en este torneo.
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
            {acceptedTeams.map((team) => renderTeamCard(team))}
          </div>
        )}

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
            <p className="text-muted">No hay equipos en cola de revisión.</p>
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
              {tournament.template_json?.rules ? (
                <div className="markdown-container">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => <h1 id={generateId(props.children)} {...props} />,
                      h2: ({ node, ...props }) => <h2 id={generateId(props.children)} {...props} />,
                      h3: ({ node, ...props }) => <h3 id={generateId(props.children)} {...props} />,
                      a: ({ node, href, ...props }) => {
                        if (href && href.startsWith('#')) {
                          return (
                            <a
                              href={href}
                              onClick={(e) => {
                                e.preventDefault();
                                const targetId = href.replace('#', '');
                                const element = document.getElementById(targetId);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                              {...props}
                            />
                          );
                        }
                        return <a href={href} target="_blank" rel="noreferrer" {...props} />;
                      }
                    }}
                  >
                    {tournament.template_json.rules}
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
                const scrollContainer = document.getElementById("rules-scroll-container");
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

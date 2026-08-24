"use client";

import React from "react";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Map as MapIcon,
  Shuffle,
  Play,
  Unlink,
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Radio,
  CheckCircle2,
  Crown,
  Edit3,
  AlertTriangle,
  Layers,
} from "lucide-react";

// Platform SVGs
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

import {
  detectPlatform,
  extractPlatformUsername,
  parseTeamData,
  parsePlayerRoleTitle,
} from "@/lib/match-utils";
import { useTranslation } from "@/lib/i18n";

export { detectPlatform, extractPlatformUsername, parseTeamData, parsePlayerRoleTitle };

interface CasterMatchCardProps {
  match: any;
  currentUserId?: string | null;
  currentCasterId?: string | null;
  isExpanded?: boolean;
  onToggleRoster?: (matchId: string) => void;
  onCopyLineup: (match: any) => void;
  isCopied: boolean;
  onOpenStreamManager: (match: any) => void;
  onUnassign: (matchId: string) => void;
  onPauseStream?: (matchId: string) => void;
  onStartStream?: (matchId: string) => void;
  onFinalizeMatch?: (match: any) => void;
  onChooseMaps?: (match: any) => void;
  onGenerateVeto?: (match: any) => void;
  communityBans?: Record<string, any>;
}

export default function CasterMatchCard({
  match,
  currentUserId,
  currentCasterId,
  isExpanded,
  onToggleRoster,
  onCopyLineup,
  isCopied,
  onOpenStreamManager,
  onUnassign,
  onPauseStream,
  onStartStream,
  onFinalizeMatch,
  onChooseMaps,
  onGenerateVeto,
  communityBans = {},
}: CasterMatchCardProps) {
  const { t } = useTranslation();
  const [expandedTeam1, setExpandedTeam1] = React.useState(false);
  const [expandedTeam2, setExpandedTeam2] = React.useState(false);

  const t1Data = parseTeamData(match.team1);
  const t2Data = parseTeamData(match.team2);

  const t1Players: any[] = match.team1?.team_members || [];
  const t2Players: any[] = match.team2?.team_members || [];

  const assignedCasterObj = (match.assigned_casters || []).find(
    (c: any) =>
      c.caster_id === currentCasterId ||
      c.casters?.user_id === currentUserId ||
      c.casters?.id === currentCasterId
  );

  const streamPlatform = detectPlatform(assignedCasterObj?.stream_url);

  // Winner logic
  const isCompleted = !!match.is_completed;
  const isLive = !!match.is_live;

  const isT1Winner =
    isCompleted &&
    (match.winner_id === match.team1_id ||
      match.winner_id === match.team1?.id ||
      (match.score1 !== null && match.score2 !== null && match.score1 > match.score2));

  const isT2Winner =
    isCompleted &&
    (match.winner_id === match.team2_id ||
      match.winner_id === match.team2?.id ||
      (match.score1 !== null && match.score2 !== null && match.score2 > match.score1));

  // Date format (Client-safe to prevent SSR locale/timezone hydration mismatch)
  const [formattedDate, setFormattedDate] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (match.scheduled_at) {
      try {
        setFormattedDate(
          new Date(match.scheduled_at).toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch {
        setFormattedDate(null);
      }
    } else {
      setFormattedDate(null);
    }
  }, [match.scheduled_at]);

  const renderRosterList = (players: any[], teamData: any) => {
    if (players.length === 0) {
      return (
        <p className="text-muted text-xs" style={{ textAlign: "center", margin: "0.5rem 0" }}>
          {t("caster.no_players_registered")}
        </p>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {players.map((player: any, idx: number) => {
          const roleTitle = parsePlayerRoleTitle(player.role);
          const banInfo = communityBans[player.steam_id_64];
          const isCaptain =
            roleTitle.toLowerCase().includes("captain") ||
            roleTitle.toLowerCase().includes("capit");

          return (
            <div key={player.id || idx} className="caster-player-row">
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    width: "16px",
                  }}
                >
                  {idx + 1}.
                </span>
                {teamData.countries[0]?.flag && (
                  <img
                    src={teamData.countries[0].flag}
                    alt="País"
                    style={{ width: "12px", height: "9px", borderRadius: "2px" }}
                  />
                )}
                {player.steam_id_64 ? (
                  <a
                    href={`https://steamcommunity.com/profiles/${player.steam_id_64}`}
                    target="_blank"
                    rel="noreferrer"
                    className="player-link"
                    title="Steam Profile"
                    style={{
                      fontWeight: "600",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "160px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {player.name}
                  </a>
                ) : (
                  <span
                    style={{
                      fontWeight: "600",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "160px",
                      color: "var(--text-main)",
                    }}
                  >
                    {player.name}
                  </span>
                )}

                {isCaptain && (
                  <span
                    className="badge"
                    style={{
                      background: "rgba(250, 204, 21, 0.15)",
                      color: "#facc15",
                      border: "1px solid rgba(250, 204, 21, 0.3)",
                      fontSize: "0.65rem",
                      padding: "0.1rem 0.35rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <Crown size={11} /> {roleTitle}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                {player.l4d2_playtime_hours ? (
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <Clock size={11} /> {player.l4d2_playtime_hours}h
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {t("caster.private_hours")}
                  </span>
                )}

                {banInfo?.CommunityBanned ? (
                  <span
                    className="badge"
                    style={{
                      background: "rgba(239, 68, 68, 0.2)",
                      color: "#f87171",
                      fontSize: "0.65rem",
                      padding: "0.1rem 0.3rem",
                    }}
                  >
                    BAN
                  </span>
                ) : (
                  <span
                    title={t("caster.steam_clean_account")}
                    style={{ color: "var(--primary)", display: "inline-flex", alignItems: "center" }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`caster-match-card ${isLive ? "is-live" : isCompleted ? "is-completed" : ""}`}
      id={`caster-match-card-${match.id}`}
    >
      {/* ─── Match Top Broadcast Header ─── */}
      <div
        style={{
          background: isLive
            ? "linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%)"
            : "rgba(0, 0, 0, 0.35)",
          padding: "0.85rem 1.25rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          fontSize: "0.82rem",
        }}
      >
        {/* Left: Tournament & Stage Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "0.25rem 0.6rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            {match.tournaments?.logo_url ? (
              <img
                src={match.tournaments.logo_url}
                alt="Logo Torneo"
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "4px",
                  objectFit: "cover",
                  outline: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              />
            ) : (
              <Trophy size={14} color="var(--primary)" />
            )}
            <span style={{ fontWeight: "700", color: "var(--text-main)", letterSpacing: "-0.01em" }}>
              {match.tournaments?.name || "Torneo L4D2"}
            </span>
          </div>

          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              background: "rgba(0, 0, 0, 0.3)",
              padding: "0.25rem 0.55rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(255, 255, 255, 0.04)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            {match.is_grand_final ? (
              <span style={{ color: "#facc15", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <Crown size={12} /> {t("brackets.grand_final")}
              </span>
            ) : match.round ? (
              `${t("matches.round")} ${match.round}`
            ) : (
              t("tournament_detail.match_label")
            )}
          </span>
        </div>

        {/* Right: Schedule & Live Status Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {formattedDate && (
            <span
              suppressHydrationWarning
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                color: "var(--text-muted)",
                fontSize: "0.78rem",
              }}
            >
              <Calendar size={13} /> {formattedDate}
            </span>
          )}

          {isLive ? (
            <span
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "var(--radius-full)",
                fontSize: "0.75rem",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.3rem 0.65rem",
                boxShadow: "0 0 12px rgba(239, 68, 68, 0.3)",
              }}
            >
              <Radio size={12} className="animate-pulse" color="#ef4444" /> {t("matches.live_badge")}
            </span>
          ) : isCompleted ? (
            <span
              style={{
                background: "rgba(111, 175, 58, 0.15)",
                color: "var(--primary)",
                border: "1px solid rgba(111, 175, 58, 0.3)",
                borderRadius: "var(--radius-full)",
                fontSize: "0.75rem",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.3rem 0.65rem",
              }}
            >
              <CheckCircle2 size={12} color="var(--primary)" /> {t("matches.tab_completed")}
            </span>
          ) : (
            <span
              className="badge"
              style={{
                borderRadius: "var(--radius-full)",
                fontSize: "0.75rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.3rem 0.65rem",
              }}
            >
              <Clock size={12} /> {t("matches.tab_upcoming")}
            </span>
          )}
        </div>
      </div>

      {/* ─── Esports Matchup Arena ─── */}
      <div style={{ padding: "1.25rem 1.25rem 1rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.85rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* Team 1 Wing (Left) */}
          <div
            className={`caster-team-wing ${isT1Winner ? "winner" : ""} ${expandedTeam1 ? "expanded" : ""}`}
            onClick={() => setExpandedTeam1((prev) => !prev)}
            id={`team1-wing-${match.id}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpandedTeam1((prev) => !prev);
              }
            }}
          >
            {/* Team 1 Top Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", width: "100%" }}>
              {/* Team Logo */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img
                  src={t1Data.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.team1?.name || "T1")}&background=252A30&color=6FAF3A`}
                  alt={match.team1?.name || "Equipo 1"}
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "var(--radius-lg)",
                    objectFit: "cover",
                    outline: "1px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
                    background: "var(--bg-surface-elevated)",
                  }}
                />
                {isT1Winner && (
                  <div
                    title={t("caster.winner_badge")}
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "var(--primary)",
                      color: "#000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 10px rgba(111, 175, 58, 0.6)",
                    }}
                  >
                    <Crown size={12} strokeWidth={2.5} />
                  </div>
                )}
              </div>

              {/* Team Info */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: isT1Winner ? "var(--primary)" : "var(--text-main)",
                      wordBreak: "break-word",
                      lineHeight: 1.25,
                    }}
                  >
                    {match.team1?.name || t("modals.to_be_decided")}
                  </span>
                  {t1Data.tag && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontFamily: "monospace",
                        fontWeight: "700",
                        color: "var(--primary)",
                        background: "rgba(111, 175, 58, 0.12)",
                        border: "1px solid rgba(111, 175, 58, 0.25)",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px",
                      }}
                    >
                      [{t1Data.tag}]
                    </span>
                  )}
                </div>

                {/* Countries */}
                <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                  {t1Data.countries.length > 0 ? (
                    t1Data.countries.map((c: any) => (
                      <span
                        key={c.code}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          background: "rgba(0, 0, 0, 0.3)",
                          padding: "0.1rem 0.35rem",
                          borderRadius: "3px",
                        }}
                      >
                        <img
                          src={c.flag}
                          alt={c.name}
                          title={c.name}
                          style={{ width: "13px", height: "9px", borderRadius: "2px", objectFit: "cover" }}
                        />
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                      {t("caster.country_unregistered")}
                    </span>
                  )}
                </div>

                {/* Meta stats: Player count + Chevron trigger */}
                <div
                  className="text-muted"
                  style={{
                    fontSize: "0.72rem",
                    marginTop: "0.35rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      color: expandedTeam1 ? "var(--primary)" : "var(--text-muted)",
                      fontWeight: expandedTeam1 ? "700" : "500",
                      transition: "color 0.15s ease",
                    }}
                  >
                    <Users size={12} /> {t("caster.players_count", { count: t1Players.length })}
                    {expandedTeam1 ? <ChevronUp size={13} color="var(--primary)" /> : <ChevronDown size={13} />}
                  </span>
                </div>
              </div>

              {/* Score */}
              {(match.score1 !== null || isCompleted) && (
                <div className={`caster-score-badge ${isT1Winner ? "winner" : ""}`}>
                  {match.score1 ?? 0}
                </div>
              )}
            </div>

            {/* Integrated Team 1 Roster Accordion */}
            {expandedTeam1 && (
              <div
                className="animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  paddingTop: "0.65rem",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  marginTop: "0.25rem",
                }}
              >
                {renderRosterList(t1Players, t1Data)}
              </div>
            )}
          </div>

          {/* Center VS Hub */}
          <div className="caster-vs-hub" style={{ alignSelf: "center" }}>
            <div className="caster-vs-circle">VS</div>
            {Array.isArray(match.selected_maps) && match.selected_maps.length > 0 ? (
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  color: "var(--primary)",
                  background: "rgba(111, 175, 58, 0.1)",
                  border: "1px solid rgba(111, 175, 58, 0.25)",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "var(--radius-full)",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  cursor: onChooseMaps ? "pointer" : "default",
                }}
                onClick={onChooseMaps ? () => onChooseMaps(match) : undefined}
                title={match.selected_maps.join(" -> ")}
              >
                <Layers size={11} />
                {match.selected_maps.length} {match.selected_maps.length === 1 ? t("tournament_create.maps_title") : t("matches.manage_maps")}
              </div>
            ) : match.map_veto_id ? (
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "#60a5fa",
                  background: "rgba(96, 165, 250, 0.1)",
                  border: "1px solid rgba(96, 165, 250, 0.25)",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "var(--radius-full)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <MapPin size={10} /> Map Veto
              </div>
            ) : null}
          </div>

          {/* Team 2 Wing (Right) */}
          <div
            className={`caster-team-wing ${isT2Winner ? "winner" : ""} ${expandedTeam2 ? "expanded" : ""}`}
            onClick={() => setExpandedTeam2((prev) => !prev)}
            id={`team2-wing-${match.id}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpandedTeam2((prev) => !prev);
              }
            }}
          >
            {/* Team 2 Top Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", width: "100%" }}>
              {/* Score */}
              {(match.score2 !== null || isCompleted) && (
                <div className={`caster-score-badge ${isT2Winner ? "winner" : ""}`}>
                  {match.score2 ?? 0}
                </div>
              )}

              {/* Team Info */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: isT2Winner ? "var(--primary)" : "var(--text-main)",
                      wordBreak: "break-word",
                      lineHeight: 1.25,
                    }}
                  >
                    {match.team2?.name || t("modals.to_be_decided")}
                  </span>
                  {t2Data.tag && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontFamily: "monospace",
                        fontWeight: "700",
                        color: "var(--primary)",
                        background: "rgba(111, 175, 58, 0.12)",
                        border: "1px solid rgba(111, 175, 58, 0.25)",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px",
                      }}
                    >
                      [{t2Data.tag}]
                    </span>
                  )}
                </div>

                {/* Countries */}
                <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                  {t2Data.countries.length > 0 ? (
                    t2Data.countries.map((c: any) => (
                      <span
                        key={c.code}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          background: "rgba(0, 0, 0, 0.3)",
                          padding: "0.1rem 0.35rem",
                          borderRadius: "3px",
                        }}
                      >
                        <img
                          src={c.flag}
                          alt={c.name}
                          title={c.name}
                          style={{ width: "13px", height: "9px", borderRadius: "2px", objectFit: "cover" }}
                        />
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                      {t("caster.country_unregistered")}
                    </span>
                  )}
                </div>

                {/* Meta stats: Player count + Chevron trigger */}
                <div
                  className="text-muted"
                  style={{
                    fontSize: "0.72rem",
                    marginTop: "0.35rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      color: expandedTeam2 ? "var(--primary)" : "var(--text-muted)",
                      fontWeight: expandedTeam2 ? "700" : "500",
                      transition: "color 0.15s ease",
                    }}
                  >
                    <Users size={12} /> {t("caster.players_count", { count: t2Players.length })}
                    {expandedTeam2 ? <ChevronUp size={13} color="var(--primary)" /> : <ChevronDown size={13} />}
                  </span>
                </div>
              </div>

              {/* Team Logo */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img
                  src={t2Data.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.team2?.name || "T2")}&background=252A30&color=6FAF3A`}
                  alt={match.team2?.name || "Equipo 2"}
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "var(--radius-lg)",
                    objectFit: "cover",
                    outline: "1px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
                    background: "var(--bg-surface-elevated)",
                  }}
                />
                {isT2Winner && (
                  <div
                    title={t("caster.winner_badge")}
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "var(--primary)",
                      color: "#000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 10px rgba(111, 175, 58, 0.6)",
                    }}
                  >
                    <Crown size={12} strokeWidth={2.5} />
                  </div>
                )}
              </div>
            </div>

            {/* Integrated Team 2 Roster Accordion */}
            {expandedTeam2 && (
              <div
                className="animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  paddingTop: "0.65rem",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  marginTop: "0.25rem",
                }}
              >
                {renderRosterList(t2Players, t2Data)}
              </div>
            )}
          </div>
        </div>

        {/* ─── Stream Connection Status Bar ─── */}
        <div style={{ marginTop: "1rem" }}>
          {assignedCasterObj?.stream_url ? (
            (() => {
              const rawUser = extractPlatformUsername(assignedCasterObj.stream_url).replace(/^@/, "");
              const platformColor =
                streamPlatform === "twitch"
                  ? "#bf94ff"
                  : streamPlatform === "kick"
                  ? "#53fc18"
                  : streamPlatform === "youtube"
                  ? "#f87171"
                  : "var(--primary)";

              return (
                <div className={`caster-stream-strip ${streamPlatform}`}>
                  <a
                    href={assignedCasterObj.stream_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontWeight: "700",
                      fontSize: "0.85rem",
                      color: platformColor,
                      textDecoration: "none",
                      minWidth: 0,
                    }}
                    title={t("caster.open_channel_tooltip", { platform: streamPlatform })}
                  >
                    {streamPlatform === "twitch" ? (
                      <TwitchIcon size={18} color={platformColor} />
                    ) : streamPlatform === "kick" ? (
                      <KickIcon size={18} color={platformColor} />
                    ) : streamPlatform === "youtube" ? (
                      <YoutubeIcon size={18} color={platformColor} />
                    ) : (
                      <Radio size={18} color={platformColor} />
                    )}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {rawUser}
                    </span>
                  </a>

                  <button
                    onClick={() => onOpenStreamManager(match)}
                    id={`edit-stream-link-btn-${match.id}`}
                    className="btn btn-secondary text-sm"
                    style={{
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <Edit3 size={12} /> {t("common.edit")}
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="caster-stream-strip empty">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertTriangle size={15} color="#facc15" />
                <span style={{ fontSize: "0.78rem" }}>
                  {t("caster.no_stream_linked_card")}
                </span>
              </div>
              <button
                onClick={() => onOpenStreamManager(match)}
                id={`link-stream-now-btn-${match.id}`}
                className="btn btn-secondary text-sm"
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.75rem",
                  color: "#facc15",
                  borderColor: "rgba(250, 204, 21, 0.4)",
                  borderRadius: "var(--radius-md)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Play size={12} /> {t("caster.configure_stream_btn")}
              </button>
            </div>
          )}
        </div>

        {/* ─── Caster Actions Toolbar ─── */}
        <div
          style={{
            marginTop: "1.1rem",
            paddingTop: "0.9rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.65rem",
          }}
        >
          {/* Left tools */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => onCopyLineup(match)}
              id={`copy-stream-lineup-${match.id}`}
              className="btn btn-secondary"
              style={{
                fontSize: "0.8rem",
                padding: "0.45rem 0.8rem",
                borderRadius: "var(--radius-md)",
                color: isCopied ? "var(--primary)" : "var(--text-main)",
                borderColor: isCopied ? "rgba(111, 175, 58, 0.4)" : undefined,
              }}
              title="Copiar alineaciones y detalles para OBS"
            >
              {isCopied ? <Check size={14} color="var(--primary)" /> : <Copy size={14} />}
              {isCopied ? t("caster.obs_sheet_copied") : t("caster.obs_sheet_btn")}
            </button>

            {onChooseMaps && (
              <button
                onClick={() => onChooseMaps(match)}
                id={`choose-maps-btn-${match.id}`}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.8rem",
                  padding: "0.45rem 0.8rem",
                  borderRadius: "var(--radius-md)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
                title={t("matches.choose_maps_tooltip")}
              >
                <MapIcon size={14} color="var(--primary)" /> {t("matches.choose_maps_btn")}
              </button>
            )}

            {match.map_veto_id ? (
              <Link
                href={`/map-veto?vetoId=${match.map_veto_id}`}
                id={`open-map-veto-${match.id}`}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.8rem",
                  padding: "0.45rem 0.8rem",
                  borderRadius: "var(--radius-md)",
                  color: "#60a5fa",
                  borderColor: "rgba(96, 165, 250, 0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <MapIcon size={14} /> {t("matches.view_veto_room")}
              </Link>
            ) : onGenerateVeto ? (
              <button
                onClick={() => onGenerateVeto(match)}
                id={`generate-veto-btn-${match.id}`}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.8rem",
                  padding: "0.45rem 0.8rem",
                  borderRadius: "var(--radius-md)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
                title={t("matches.generate_veto_tooltip")}
              >
                <Shuffle size={14} /> {t("matches.generate_veto_btn")}
              </button>
            ) : null}
          </div>

          {/* Right Caster Hub CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {/* If Live: Allow Pause Transmission and Finalize Match. Hide Desvincular button */}
            {isLive && (
              <>
                {onPauseStream && (
                  <button
                    onClick={() => onPauseStream(match.id)}
                    id={`pause-stream-btn-${match.id}`}
                    className="btn btn-secondary text-xs"
                    style={{
                      padding: "0.45rem 0.85rem",
                      borderRadius: "var(--radius-md)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    {t("matches.pause_stream_btn")}
                  </button>
                )}
                {onFinalizeMatch && (
                  <button
                    onClick={() => onFinalizeMatch(match)}
                    id={`finalize-match-btn-${match.id}`}
                    className="btn btn-primary text-xs"
                    style={{
                      padding: "0.45rem 0.85rem",
                      borderRadius: "var(--radius-md)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontWeight: "bold",
                    }}
                  >
                    <CheckCircle2 size={14} /> {t("matches.finish_match_btn")}
                  </button>
                )}
              </>
            )}

            {/* If Completed: Allow modifying result and unlinking */}
            {isCompleted && (
              <>
                {onFinalizeMatch && (
                  <button
                    onClick={() => onFinalizeMatch(match)}
                    id={`modify-result-btn-${match.id}`}
                    className="btn btn-secondary text-xs"
                    style={{
                      padding: "0.45rem 0.85rem",
                      borderRadius: "var(--radius-md)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <Edit3 size={13} /> {t("matches.modify_result_btn")}
                  </button>
                )}
                <button
                  onClick={() => onUnassign(match.id)}
                  id={`unassign-caster-action-${match.id}`}
                  title={t("matches.unlink_cast_tooltip")}
                  className="btn btn-danger"
                  style={{
                    fontSize: "0.8rem",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "var(--radius-md)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <Unlink size={14} /> {t("matches.unlink_cast_btn")}
                </button>
              </>
            )}

            {/* If Pending / Upcoming: Allow Start Live Transmission and unlinking */}
            {!isLive && !isCompleted && (
              <>
                {onStartStream && (
                  <button
                    onClick={() => onStartStream(match.id)}
                    id={`start-live-stream-btn-${match.id}`}
                    className="btn text-xs"
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#f87171",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "var(--radius-md)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontWeight: "bold",
                    }}
                  >
                    <Radio size={13} color="#ef4444" /> {t("matches.start_stream_btn")}
                  </button>
                )}
                <button
                  onClick={() => onUnassign(match.id)}
                  id={`unassign-caster-action-${match.id}`}
                  title={t("matches.unlink_cast_tooltip")}
                  className="btn btn-danger"
                  style={{
                    fontSize: "0.8rem",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "var(--radius-md)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <Unlink size={14} /> {t("matches.unlink_cast_btn")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

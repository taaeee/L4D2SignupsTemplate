import React, { useState } from 'react';
import { Trophy, GripVertical } from 'lucide-react';
import { Database } from '@/lib/database.types';
import { useTranslation } from '@/lib/i18n';

interface Team {
  id: string;
  name: string;
  status?: string;
  logo_url?: string;
}

type Match = Database['public']['Tables']['matches']['Row'];

interface MatchCardProps {
  match: Match;
  teamMap: Record<string, Team>;
  canManage?: boolean;
  onClick?: (match: Match, team1: Team | null, team2: Team | null) => void;
  matchNumber?: number | string;
  feeders?: {
    pending1?: string;
    pending2?: string;
  };
  isDndEnabled?: boolean;
  onSlotDragStart?: (matchId: string, slot: 1 | 2, teamId: string) => void;
  onSlotDrop?: (targetMatchId: string, targetSlot: 1 | 2) => void;
}

export default function MatchCard({
  match,
  teamMap,
  canManage,
  onClick,
  matchNumber,
  feeders,
  isDndEnabled = false,
  onSlotDragStart,
  onSlotDrop,
}: MatchCardProps) {
  const { t } = useTranslation();
  const [dragOverSlot, setDragOverSlot] = useState<1 | 2 | null>(null);

  const team1 = match.team1_id ? teamMap[match.team1_id] || null : null;
  const team2 = match.team2_id ? teamMap[match.team2_id] || null : null;

  const isCompleted = match.status === 'completed';

  const getTeamStyle = (teamId?: string | null) => {
    if (!isCompleted) return { color: 'var(--text-main)', fontWeight: 'normal' };
    if (match.winner_id === teamId) return { color: 'var(--success)', fontWeight: 'bold' };
    return { color: 'var(--muted)', fontWeight: 'normal', opacity: 0.6 };
  };

  const getScoreStyle = (teamId?: string | null) => {
    if (!isCompleted) return { color: 'var(--text-main)' };
    if (match.winner_id === teamId) return { color: 'var(--success)', fontWeight: 'bold' };
    return { color: 'var(--muted)' };
  };

  const renderTeamName = (teamId?: string | null, teamObj?: Team | null, slotIndex?: number) => {
    if (teamObj) {
      let statusBadge = null;
      if (teamObj.status === "eliminated") {
        statusBadge = (
          <span
            title={t("team_detail.status_eliminated_badge")}
            style={{
              marginLeft: "6px",
              fontSize: "0.65rem",
              padding: "1px 5px",
              borderRadius: "4px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "var(--danger)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontWeight: "bold",
              display: "inline-block",
            }}
          >
            {t("team_detail.status_eliminated_badge")}
          </span>
        );
      } else if (teamObj.status === "disqualified") {
        statusBadge = (
          <span
            title={t("team_detail.status_disqualified_badge")}
            style={{
              marginLeft: "6px",
              fontSize: "0.65rem",
              padding: "1px 5px",
              borderRadius: "4px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "var(--danger)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontWeight: "bold",
              display: "inline-block",
            }}
          >
            {t("team_detail.status_disqualified_badge")}
          </span>
        );
      } else if (teamObj.status === "withdrawn") {
        statusBadge = (
          <span
            title={t("team_detail.status_withdrawn_badge")}
            style={{
              marginLeft: "6px",
              fontSize: "0.65rem",
              padding: "1px 5px",
              borderRadius: "4px",
              background: "rgba(234, 179, 8, 0.15)",
              color: "#eab308",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              fontWeight: "bold",
              display: "inline-block",
            }}
          >
            {t("team_detail.status_withdrawn_badge")}
          </span>
        );
      }

      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            flexWrap: "wrap",
            textDecoration:
              teamObj.status === "eliminated" ||
              teamObj.status === "disqualified" ||
              teamObj.status === "withdrawn"
                ? "line-through"
                : "none",
            opacity:
              teamObj.status === "eliminated" ||
              teamObj.status === "disqualified" ||
              teamObj.status === "withdrawn"
                ? 0.75
                : 1,
          }}
        >
          <span>{teamObj.name}</span>
          {statusBadge}
        </span>
      );
    }

    // Pick the specific feeder for this slot
    const feeder = slotIndex === 1 ? feeders?.pending1 : feeders?.pending2;
    if (feeder) {
      return <span style={{ opacity: 0.6, fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--muted)' }}>{feeder}</span>;
    }

    // Show empty space instead of TBD for Challonge-style look
    return <span style={{ opacity: 0.3, fontStyle: 'italic' }}>{t("brackets.waiting")}</span>;
  };

  return (
    <div
      role={canManage && !isDndEnabled ? "button" : undefined}
      tabIndex={canManage && !isDndEnabled ? 0 : undefined}
      onClick={() => {
        if (canManage && onClick && !isDndEnabled) {
          onClick(match, team1, team2);
        }
      }}
      onKeyDown={(e) => {
        if (canManage && onClick && !isDndEnabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(match, team1, team2);
        }
      }}
      style={{
        width: '250px',
        background: 'rgba(0,0,0,0.4)',
        border: `1px solid ${isCompleted ? 'rgba(255,255,255,0.1)' : 'var(--border-light)'}`,
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        cursor: canManage && !isDndEnabled ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
      }}
      className={`match-card ${match.team1_id ? 'match-card-team-' + match.team1_id : ''} ${match.team2_id ? 'match-card-team-' + match.team2_id : ''}`}
    >
      {/* Top Half: Team 1 Slot */}
      <div
        draggable={isDndEnabled && Boolean(team1)}
        onDragStart={(e) => {
          if (isDndEnabled && match.team1_id) {
            e.stopPropagation();
            e.dataTransfer.setData('text/plain', JSON.stringify({ matchId: match.id, slot: 1, teamId: match.team1_id }));
            onSlotDragStart?.(match.id, 1, match.team1_id);
          }
        }}
        onDragOver={(e) => {
          if (isDndEnabled) {
            e.preventDefault();
            e.stopPropagation();
            setDragOverSlot(1);
          }
        }}
        onDragLeave={(e) => {
          if (isDndEnabled && !e.currentTarget.contains(e.relatedTarget as Node)) {
            e.stopPropagation();
            setDragOverSlot(null);
          }
        }}
        onDrop={(e) => {
          if (isDndEnabled) {
            e.preventDefault();
            e.stopPropagation();
            setDragOverSlot(null);
            onSlotDrop?.(match.id, 1);
          }
        }}
        className={`team-slot ${match.team1_id ? 'team-slot-' + match.team1_id : ''}`}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background:
            dragOverSlot === 1
              ? 'rgba(111, 175, 58, 0.25)'
              : match.winner_id === match.team1_id
              ? 'rgba(34, 197, 94, 0.05)'
              : 'transparent',
          minHeight: '36px',
          cursor: isDndEnabled && Boolean(team1) ? 'grab' : undefined,
          transition: 'background 0.2s ease, outline 0.15s ease',
          outline: dragOverSlot === 1 ? '2px dashed var(--primary)' : 'none',
          outlineOffset: '-2px',
        }}
        title={isDndEnabled && Boolean(team1) ? t("brackets.drag_to_reorder") : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, paddingRight: '8px', minWidth: 0 }}>
          {isDndEnabled && Boolean(team1) && (
            <GripVertical size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.7 }} />
          )}
          {match.winner_id === match.team1_id && (
            <Trophy size={14} color="var(--success)" style={{ flexShrink: 0 }} />
          )}
          <span
            style={{
              ...getTeamStyle(match.team1_id),
              fontSize: '0.9rem',
              wordBreak: 'break-word',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {renderTeamName(match.team1_id, team1, 1)}
          </span>
        </div>
        <span style={{ fontSize: '0.9rem', ...getScoreStyle(match.team1_id), flexShrink: 0 }}>
          {isCompleted && match.team1_id ? match.score1 : ''}
        </span>
      </div>

      {/* Bottom Half: Team 2 Slot */}
      <div
        draggable={isDndEnabled && Boolean(team2)}
        onDragStart={(e) => {
          if (isDndEnabled && match.team2_id) {
            e.stopPropagation();
            e.dataTransfer.setData('text/plain', JSON.stringify({ matchId: match.id, slot: 2, teamId: match.team2_id }));
            onSlotDragStart?.(match.id, 2, match.team2_id);
          }
        }}
        onDragOver={(e) => {
          if (isDndEnabled) {
            e.preventDefault();
            e.stopPropagation();
            setDragOverSlot(2);
          }
        }}
        onDragLeave={(e) => {
          if (isDndEnabled && !e.currentTarget.contains(e.relatedTarget as Node)) {
            e.stopPropagation();
            setDragOverSlot(null);
          }
        }}
        onDrop={(e) => {
          if (isDndEnabled) {
            e.preventDefault();
            e.stopPropagation();
            setDragOverSlot(null);
            onSlotDrop?.(match.id, 2);
          }
        }}
        className={`team-slot ${match.team2_id ? 'team-slot-' + match.team2_id : ''}`}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background:
            dragOverSlot === 2
              ? 'rgba(111, 175, 58, 0.25)'
              : match.winner_id === match.team2_id
              ? 'rgba(34, 197, 94, 0.05)'
              : 'transparent',
          minHeight: '36px',
          cursor: isDndEnabled && Boolean(team2) ? 'grab' : undefined,
          transition: 'background 0.2s ease, outline 0.15s ease',
          outline: dragOverSlot === 2 ? '2px dashed var(--primary)' : 'none',
          outlineOffset: '-2px',
        }}
        title={isDndEnabled && Boolean(team2) ? t("brackets.drag_to_reorder") : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, paddingRight: '8px', minWidth: 0 }}>
          {isDndEnabled && Boolean(team2) && (
            <GripVertical size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.7 }} />
          )}
          {match.winner_id === match.team2_id && (
            <Trophy size={14} color="var(--success)" style={{ flexShrink: 0 }} />
          )}
          <span
            style={{
              ...getTeamStyle(match.team2_id),
              fontSize: '0.9rem',
              wordBreak: 'break-word',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {renderTeamName(match.team2_id, team2, 2)}
          </span>
        </div>
        <span style={{ fontSize: '0.9rem', ...getScoreStyle(match.team2_id), flexShrink: 0 }}>
          {isCompleted && match.team2_id ? match.score2 : ''}
        </span>
      </div>

      {/* Match number overlay */}
      {matchNumber && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '0',
            transform: 'translateY(-50%)',
            background: '#14161A',
            color: 'var(--primary)',
            border: '1px solid rgba(111, 175, 58, 0.4)',
            borderRight: 'none',
            borderTopLeftRadius: '4px',
            borderBottomLeftRadius: '4px',
            fontWeight: 'bold',
            fontSize: '0.65rem',
            padding: '1px 5px',
            zIndex: 2,
            boxShadow: '-1px 0 6px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            letterSpacing: '0.5px',
          }}
        >
          M{matchNumber}
        </div>
      )}
    </div>
  );
}

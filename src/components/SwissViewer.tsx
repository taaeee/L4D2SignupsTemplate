import React, { useState, useMemo } from "react";
import MatchCard from "./MatchCard";
import { Trophy, RefreshCw, Shuffle } from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";
import ScoreModal from "./ScoreModal";
import { useTranslation } from "@/lib/i18n";

interface Team {
  id: string;
  name: string;
  status?: string;
  logo_url?: string;
}

import { Database } from '@/lib/database.types';

type Match = Database['public']['Tables']['matches']['Row'];

interface Tournament {
  id: string | number;
  status?: string;
  template_json?: {
    currentSwissRound?: number;
    swissRounds?: number;
  };
}

interface SwissViewerProps {
  matches: Match[];
  teams: Team[];
  canManage?: boolean;
  onMatchUpdated: () => void;
  tournament: Tournament;
}

export default function SwissViewer({ matches, teams, canManage, onMatchUpdated, tournament }: SwissViewerProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("matches"); // matches | standings
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmNextRound, setShowConfirmNextRound] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTeam1, setSelectedTeam1] = useState<Team | null>(null);
  const [selectedTeam2, setSelectedTeam2] = useState<Team | null>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Drag and drop matchup adjustment state (active only before tournament lock)
  const isDndActive = Boolean(canManage && tournament?.status !== 'locked');
  const [draggedSlot, setDraggedSlot] = useState<{ matchId: string; slot: 1 | 2; teamId: string } | null>(null);

  const handleSlotDragStart = (matchId: string, slot: 1 | 2, teamId: string) => {
    setDraggedSlot({ matchId, slot, teamId });
  };

  const handleSlotDrop = async (targetMatchId: string, targetSlot: 1 | 2) => {
    if (!draggedSlot) return;
    if (draggedSlot.matchId === targetMatchId && draggedSlot.slot === targetSlot) {
      setDraggedSlot(null);
      return;
    }

    const { matchId: sourceMatchId, slot: sourceSlot } = draggedSlot;
    setDraggedSlot(null);

    const toastId = toast.loading(t("common.loading"));

    try {
      const res = await fetch(`/api/tournament/${tournament.id}/bracket/swap-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceMatchId,
          sourceSlot,
          targetMatchId,
          targetSlot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar enfrentamientos");
      }

      toast.success(data.message || "Emparejamientos actualizados", { id: toastId });
      onMatchUpdated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al reordenar enfrentamientos", { id: toastId });
      onMatchUpdated();
    }
  };

  const currentRound = tournament?.template_json?.currentSwissRound || 1;
  const maxRounds = tournament?.template_json?.swissRounds || 1;

  // Calculate Standings
  const standings = useMemo(() => {
    interface Stat {
      team: Team;
      wins: number;
      losses: number;
      opponents: Set<string>;
      active: boolean;
      buchholz?: number;
    }
    const stats: Record<string, Stat> = {};
    
    // Initialize stats for all teams (including those who might have dropped, if they played)
    teams.forEach(t => {
      stats[t.id] = { team: t, wins: 0, losses: 0, opponents: new Set(), active: t.status === 'accepted' };
    });

    matches.forEach(m => {
      if (m.status !== 'completed') return;
      const t1 = m.team1_id;
      const t2 = m.team2_id;
      const winner = m.winner_id;

      if (t1 && !stats[t1]) stats[t1] = { team: { id: t1, name: "Unknown" }, wins: 0, losses: 0, opponents: new Set(), active: false };
      if (t2 && !stats[t2]) stats[t2] = { team: { id: t2, name: "Unknown" }, wins: 0, losses: 0, opponents: new Set(), active: false };

      if (t1 && t2) {
        stats[t1].opponents.add(t2);
        stats[t2].opponents.add(t1);
      }

      if (t1 && winner === t1) {
        stats[t1].wins += 1;
        if (t2) stats[t2].losses += 1;
      } else if (t2 && winner === t2) {
        stats[t2].wins += 1;
        if (t1) stats[t1].losses += 1;
      }
    });

    // Calculate Buchholz
    Object.values(stats).forEach(stat => {
      let buchholz = 0;
      stat.opponents.forEach(oppId => {
        if (stats[oppId]) buchholz += stats[oppId].wins;
      });
      stat.buchholz = buchholz;
    });

    // Only show active teams, or all teams? Usually we show all but mark inactive ones
    const sorted = Object.values(stats).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.buchholz !== a.buchholz) return (b.buchholz || 0) - (a.buchholz || 0);
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.team.name?.localeCompare(b.team.name);
    });

    return sorted;
  }, [matches, teams]);

  const matchesByRound = useMemo(() => {
    const rounds: Record<number | string, Match[]> = {};
    matches.forEach(m => {
      if (!rounds[m.round]) rounds[m.round] = [];
      rounds[m.round].push(m);
    });
    // Sort matches in each round by match_order
    Object.keys(rounds).forEach(r => {
      rounds[r].sort((a, b) => a.match_order - b.match_order);
    });
    return rounds;
  }, [matches]);

  const currentRoundMatches = matchesByRound[currentRound] || [];
  const allCurrentMatchesCompleted = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.status === 'completed');
  const canGenerateNextRound = canManage && allCurrentMatchesCompleted && currentRound < maxRounds;

  const teamMap = useMemo(() => {
    const map: Record<string, Team> = {};
    teams.forEach(t => map[t.id] = t);
    return map;
  }, [teams]);

  const handleMatchClick = (match: Match, t1: Team | null, t2: Team | null) => {
    if (!match.team1_id || !match.team2_id) {
      if (canManage) toast.info(t("modals.to_be_decided"));
      return;
    }
    if (match.status === 'completed' && !canManage) return;

    setSelectedMatch(match);
    setSelectedTeam1(t1);
    setSelectedTeam2(t2);
  };

  const handleSaveScore = async (data: any) => {
    setIsSavingScore(true);
    try {
      if (!selectedMatch) return;
      const res = await fetch(`/api/matches/${selectedMatch.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'Error al guardar');
      
      toast.success(t("modals.score_saved_success"));
      setSelectedMatch(null);
      if (onMatchUpdated) onMatchUpdated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleGenerateNextRound = async () => {
    setShowConfirmNextRound(false);
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/tournament/${tournament.id}/bracket/next-round`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(t("brackets.round_name", { num: currentRound + 1 }));
      onMatchUpdated(); // reload matches & tournament
    } catch (e: any) {
      toast.error(e.message || "Error al generar la siguiente ronda");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div className="tab-container" style={{ margin: 0 }}>
          <button
            onClick={() => setActiveTab("matches")}
            className={`tab-btn ${activeTab === "matches" ? "active" : ""}`}
            style={{ padding: "0.5rem 1.5rem" }}
          >
            {t("brackets.swiss_stage")}
          </button>
          <button
            onClick={() => setActiveTab("standings")}
            className={`tab-btn ${activeTab === "standings" ? "active" : ""}`}
            style={{ padding: "0.5rem 1.5rem" }}
          >
            {t("brackets.swiss_standings")}
          </button>
        </div>

        {canGenerateNextRound && activeTab === "matches" && (
          <button 
            className="btn btn-primary" 
            onClick={() => setShowConfirmNextRound(true)}
            disabled={isGenerating}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <RefreshCw size={18} />
            {isGenerating ? t("tournament_detail.generating") : t("brackets.generate_round_btn", { num: currentRound + 1 })}
          </button>
        )}
      </div>

      {isDndActive && (
        <div
          style={{
            background: 'rgba(111, 175, 58, 0.08)',
            border: '1px solid rgba(111, 175, 58, 0.25)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--text-main)',
            fontSize: '0.85rem',
          }}
        >
          <Shuffle size={18} color="var(--primary)" />
          <div>
            <strong style={{ color: 'var(--primary)' }}>{t("brackets.dnd_active_title")}:</strong>{' '}
            <span className="text-muted">
              {t("brackets.dnd_active_desc")}
            </span>
          </div>
        </div>
      )}

      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px solid var(--border)", padding: "1.5rem" }}>
        {activeTab === "matches" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
            {Object.keys(matchesByRound).sort((a,b) => parseInt(b) - parseInt(a)).map(roundKey => (
              <div key={roundKey}>
                <h3 style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem", marginBottom: "1rem", color: "var(--primary)" }}>
                  {t("brackets.round_name", { num: roundKey })} {parseInt(roundKey) === currentRound ? `(${t("brackets.current_round_badge")})` : ""}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                  {matchesByRound[roundKey].map(m => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      teamMap={teamMap}
                      canManage={canManage}
                      onClick={handleMatchClick}
                      isDndEnabled={isDndActive && m.round === 1}
                      onSlotDragStart={handleSlotDragStart}
                      onSlotDrop={handleSlotDrop}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "standings" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
                  <th style={{ padding: "1rem" }}>{t("brackets.col_rank")}</th>
                  <th style={{ padding: "1rem" }}>{t("brackets.col_team")}</th>
                  <th style={{ padding: "1rem", textAlign: "center" }}>{t("brackets.col_wins")}</th>
                  <th style={{ padding: "1rem", textAlign: "center" }}>{t("brackets.col_losses")}</th>
                  <th style={{ padding: "1rem", textAlign: "center" }} title="Suma de las victorias de los oponentes">{t("brackets.col_buchholz")}</th>
                  <th style={{ padding: "1rem", textAlign: "center" }}>{t("brackets.col_status")}</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, idx) => (
                  <tr key={s.team.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "1rem", fontWeight: "bold" }}>{idx + 1}</td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {s.team.logo_url && <img src={s.team.logo_url.startsWith("{") ? JSON.parse(s.team.logo_url).url : s.team.logo_url} alt="Logo" style={{ width: 24, height: 24, borderRadius: "4px" }} />}
                        <span style={{ fontWeight: s.active ? "bold" : "normal", color: s.active ? "var(--text-main)" : "var(--muted)" }}>
                          {s.team.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "1rem", textAlign: "center", color: "var(--success)", fontWeight: "bold" }}>{s.wins}</td>
                    <td style={{ padding: "1rem", textAlign: "center", color: "var(--danger)" }}>{s.losses}</td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>{s.buchholz}</td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      {s.active ? (
                        <span style={{ color: "var(--success)", fontSize: "0.85rem", background: "rgba(34, 197, 94, 0.1)", padding: "0.2rem 0.5rem", borderRadius: "100px" }}>{t("brackets.status_active")}</span>
                      ) : (
                        <span style={{ color: "var(--danger)", fontSize: "0.85rem", background: "rgba(239, 68, 68, 0.1)", padding: "0.2rem 0.5rem", borderRadius: "100px" }}>{t("brackets.status_expelled")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmNextRound}
        title={t("brackets.generate_round_btn", { num: currentRound + 1 })}
        message="¿Estás seguro de generar los partidos para la siguiente ronda? El sistema emparejará automáticamente a los equipos según sus puntuaciones actuales (Sistema Suizo)."
        confirmText="Sí, Generar"
        cancelText={t("common.cancel")}
        isDanger={false}
        onConfirm={handleGenerateNextRound}
        onCancel={() => setShowConfirmNextRound(false)}
      />

      {selectedMatch && (
        <ScoreModal 
          match={selectedMatch}
          team1={selectedTeam1}
          team2={selectedTeam2}
          onClose={() => setSelectedMatch(null)}
          onSave={handleSaveScore}
          isSaving={isSavingScore}
        />
      )}
    </div>
  );
}

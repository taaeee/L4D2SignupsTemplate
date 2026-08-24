"use client";

import React, { useState, useRef, useEffect } from 'react';
import MatchCard from './MatchCard';
import ScoreModal from './ScoreModal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Layers, X, Check, Search, Shuffle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface Team {
  id: string;
  name: string;
  logo_url?: string;
  status?: string;
}

import { Database } from '@/lib/database.types';

type Match = Database['public']['Tables']['matches']['Row'];
type Tournament = Database['public']['Tables']['tournaments']['Row'];

interface BracketViewerProps {
  matches: Match[];
  teams: Team[];
  canManage?: boolean;
  onMatchUpdated: () => void;
  tournament: Tournament;
}

export interface RoundMetaObj {
  format: string; // 'bo1' | 'to2' | 'bo3' | 'bo5'
  formatLabel: string;
  maps: string[];
}

let cachedAppMaps: any[] | null = null;

export default function BracketViewer({ matches, teams, canManage, onMatchUpdated, tournament }: BracketViewerProps) {
  const { t } = useTranslation();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTeam1, setSelectedTeam1] = useState<Team | null>(null);
  const [selectedTeam2, setSelectedTeam2] = useState<Team | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [roundMetas, setRoundMetas] = useState<Record<string, any>>(
    (tournament?.template_json as any)?.round_metadata || {}
  );

  // Dynamic maps from /api/maps (official + custom)
  const [availableMaps, setAvailableMaps] = useState<any[]>(cachedAppMaps || []);
  const [mapFilter, setMapFilter] = useState<'all' | 'official' | 'custom'>('all');
  const [searchMap, setSearchMap] = useState('');

  // Map Pool Modal State
  const [mapPoolModal, setMapPoolModal] = useState<{
    isOpen: boolean;
    roundKey: string;
    roundTitle: string;
    selectedMaps: string[];
    customMapInput: string;
  }>({
    isOpen: false,
    roundKey: '',
    roundTitle: '',
    selectedMaps: [],
    customMapInput: ''
  });

  // Drag to scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

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

    const toastId = toast.loading("Actualizando emparejamiento...");

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

      toast.success("Emparejamientos actualizados", { id: toastId });
      onMatchUpdated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al reordenar enfrentamientos", { id: toastId });
      onMatchUpdated();
    }
  };

  useEffect(() => {
    if ((tournament?.template_json as any)?.round_metadata) {
      setRoundMetas((tournament.template_json as any).round_metadata);
    }
  }, [tournament]);

  useEffect(() => {
    if (!cachedAppMaps) {
      fetch('/api/maps')
        .then((res) => res.json())
        .then((data) => {
          if (data?.all) {
            const sorted = data.all.sort((a: any, b: any) =>
              a.name.localeCompare(b.name)
            );
            cachedAppMaps = sorted;
            setAvailableMaps(sorted);
          }
        })
        .catch((err) =>
          console.error("Error fetching maps for bracket viewer:", err)
        );
    }
  }, []);

  // Helper to parse round metadata
  const getRoundMeta = (roundKey: string): RoundMetaObj => {
    const raw = roundMetas[roundKey];
    if (!raw) {
      return { format: 'bo1', formatLabel: '1 Map', maps: [] };
    }
    if (typeof raw === 'string') {
      const lower = raw.toLowerCase();
      if (lower.includes('bo3') || lower.includes('3')) {
        return { format: 'bo3', formatLabel: 'BO3', maps: [] };
      }
      if (lower.includes('bo5') || lower.includes('5')) {
        return { format: 'bo5', formatLabel: 'BO5', maps: [] };
      }
      if (lower.includes('bo2') || lower.includes('to2') || lower.includes('2')) {
        return { format: 'to2', formatLabel: 'BO2', maps: [] };
      }
      return { format: 'bo1', formatLabel: raw || '1 Map', maps: [] };
    }
    return {
      format: raw.format || 'bo1',
      formatLabel:
        raw.formatLabel ||
        (raw.format === 'bo3'
          ? 'BO3'
          : raw.format === 'bo5'
          ? 'BO5'
          : raw.format === 'to2'
          ? 'BO2'
          : '1 Map'),
      maps: Array.isArray(raw.maps) ? raw.maps : []
    };
  };

  // Save updated round metadata to Supabase
  const saveRoundMeta = async (updatedMetas: Record<string, any>) => {
    if (!canManage || !tournament) return;
    setRoundMetas(updatedMetas);

    const newJson = {
      ...((tournament.template_json as any) || {}),
      round_metadata: updatedMetas
    };

    const { error } = await supabase
      .from('tournaments')
      .update({ template_json: newJson })
      .eq('id', tournament.id);

    if (error) {
      toast.error("Error al guardar formato de ronda");
    } else {
      toast.success("Formato y pool de mapas guardados");
    }
  };

  // Change format dropdown
  const handleFormatChange = (roundKey: string, newFormat: string) => {
    const current = getRoundMeta(roundKey);
    const formatLabels: Record<string, string> = {
      bo1: '1 Map',
      to2: 'BO2',
      bo3: 'BO3',
      bo5: 'BO5'
    };

    const updated = {
      ...roundMetas,
      [roundKey]: {
        ...current,
        format: newFormat,
        formatLabel: formatLabels[newFormat] || '1 Map'
      }
    };

    saveRoundMeta(updated);
  };

  // Open Map Pool Modal
  const handleOpenMapPool = (roundKey: string, roundTitle: string) => {
    const current = getRoundMeta(roundKey);
    setMapPoolModal({
      isOpen: true,
      roundKey,
      roundTitle,
      selectedMaps: [...current.maps],
      customMapInput: ''
    });
    setSearchMap('');
    setMapFilter('all');
  };

  // Save Map Pool from Modal
  const handleSaveMapPool = () => {
    const current = getRoundMeta(mapPoolModal.roundKey);
    const updated = {
      ...roundMetas,
      [mapPoolModal.roundKey]: {
        ...current,
        maps: mapPoolModal.selectedMaps
      }
    };

    saveRoundMeta(updated);
    setMapPoolModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Separate matches by bracket
  const ubRounds: Record<number, Match[]> = {};
  const lbRounds: Record<number, Match[]> = {};

  matches.forEach((m) => {
    if (m.is_bye) return;

    if (m.is_upper) {
      if (!ubRounds[m.round]) ubRounds[m.round] = [];
      ubRounds[m.round].push(m);
    } else {
      if (!lbRounds[m.round]) lbRounds[m.round] = [];
      lbRounds[m.round].push(m);
    }
  });

  Object.keys(ubRounds).forEach((r) =>
    ubRounds[r as unknown as number].sort((a, b) => a.match_order - b.match_order)
  );
  Object.keys(lbRounds).forEach((r) =>
    lbRounds[r as unknown as number].sort((a, b) => a.match_order - b.match_order)
  );

  const ubRoundKeys = Object.keys(ubRounds).map(Number).sort((a, b) => a - b);
  const lbRoundKeys = Object.keys(lbRounds).map(Number).sort((a, b) => a - b);

  // Compute match sequence numbers and dependencies (feeders)
  const matchNumbers: Record<string, number> = {};
  let matchCounter = 1;

  const sortedMatches = [...matches].sort((a, b) => {
    if (a.is_upper !== b.is_upper) return a.is_upper ? -1 : 1;
    if (a.round !== b.round) return a.round - b.round;
    return a.match_order - b.match_order;
  });
  sortedMatches.forEach((m) => {
    if (!m.is_bye) {
      matchNumbers[m.id] = matchCounter++;
    }
  });

  const feeders: Record<string, any[]> = {};
  sortedMatches.forEach((m) => {
    const num = matchNumbers[m.id];
    if (m.next_match_id) {
      if (!feeders[m.next_match_id]) feeders[m.next_match_id] = [];
      feeders[m.next_match_id].push({
        id: m.id,
        type: 'winner',
        label: null,
        isBye: m.is_bye,
      });
    }
    if (m.loser_match_id) {
      if (!feeders[m.loser_match_id]) feeders[m.loser_match_id] = [];
      feeders[m.loser_match_id].push({
        id: m.id,
        type: 'loser',
        label: num ? `Perdedor de M${num}` : `Perdedor anterior`,
        isBye: m.is_bye,
      });
    }
  });

  // Resolve byes
  sortedMatches.forEach((m) => {
    if (m.is_bye) {
      const myFeeders = feeders[m.id] || [];
      const realFeeder = myFeeders.find((f) => !f.isBye);
      if (m.next_match_id && realFeeder) {
        const targetFeeders = feeders[m.next_match_id];
        if (targetFeeders) {
          const idx = targetFeeders.findIndex((f) => f.id === m.id);
          if (idx !== -1) {
            targetFeeders[idx].label = realFeeder.label;
            targetFeeders[idx].isBye = false;
            targetFeeders[idx].id = realFeeder.id;
            targetFeeders[idx].type = realFeeder.type;
          }
        }
      }
    }
  });

  const finalFeeders: Record<string, any> = {};
  sortedMatches.forEach((m) => {
    const myFeeders = feeders[m.id] || [];
    let pending1 = null;
    let pending2 = null;

    const isConsumedBy = (feeder: any, teamId?: string) => {
      if (!teamId || !feeder) return false;
      const sourceMatch = sortedMatches.find((sm) => sm.id === feeder.id);
      if (!sourceMatch) return false;
      if (feeder.type === 'winner' && sourceMatch.winner_id === teamId) return true;
      if (feeder.type === 'loser' && sourceMatch.loser_id === teamId) return true;
      return false;
    };

    let f1 = myFeeders[0];
    let f2 = myFeeders[1];

    let t1Feeder = null;
    let t2Feeder = null;

    if (m.team1_id) {
      if (f1 && isConsumedBy(f1, m.team1_id)) t1Feeder = f1;
      else if (f2 && isConsumedBy(f2, m.team1_id)) t1Feeder = f2;
      else t1Feeder = f1;
    }
    if (m.team2_id) {
      if (f1 && f1 !== t1Feeder && isConsumedBy(f1, m.team2_id)) t2Feeder = f1;
      else if (f2 && f2 !== t1Feeder && isConsumedBy(f2, m.team2_id)) t2Feeder = f2;
      else t2Feeder = f1 !== t1Feeder ? f1 : f2;
    }

    if (!m.team1_id) {
      pending1 = f1 !== t2Feeder ? f1 : f2;
    }
    if (!m.team2_id) {
      pending2 = (f1 !== t1Feeder && f1 !== pending1) ? f1 : f2;
    }

    finalFeeders[m.id] = {
      pending1: pending1?.label || null,
      pending2: pending2?.label || null,
    };
  });

  const ubM1 = ubRounds[ubRoundKeys[0]]?.length || 1;
  const lbM1 = lbRounds[lbRoundKeys[0]]?.length || 1;

  const teamMap: Record<string, Team> = {};
  teams.forEach((t) => (teamMap[t.id] = t));

  const handleMatchClick = (match: Match, t1: Team | null, t2: Team | null) => {
    if (!match.team1_id || !match.team2_id) {
      if (canManage) toast.info("Este partido no tiene a los dos equipos asignados aún.");
      return;
    }
    if (match.status === 'completed' && !canManage) return;

    setSelectedMatch(match);
    setSelectedTeam1(t1);
    setSelectedTeam2(t2);
  };

  const handleSaveScore = async ({
    score1,
    score2,
    winner_id,
  }: {
    score1: number;
    score2: number;
    winner_id: string;
  }) => {
    if (!selectedMatch) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/matches/${selectedMatch.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score1, score2, winner_id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar marcador");
      }

      toast.success("Marcador guardado exitosamente");
      setSelectedMatch(null);
      onMatchUpdated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderBracketSection = (
    roundKeys: number[],
    roundsMap: Record<number, Match[]>,
    m1Count: number,
    title?: string | null
  ) => {
    if (roundKeys.length === 0) return null;

    return (
      <div style={{ marginBottom: '3rem' }}>
        {title && (
          <h2
            style={{
              fontSize: '1.25rem',
              color: 'var(--primary)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '1.5rem',
              borderBottom: '1px solid var(--border-light)',
              paddingBottom: '0.5rem',
            }}
          >
            {title}
          </h2>
        )}

        <div
          style={{
            display: 'flex',
            gap: '4rem',
            alignItems: 'stretch',
            position: 'relative',
          }}
        >
          {roundKeys.map((roundIndex, i) => {
            const verticalLineHeight =
              i > 0 ? (100 * Math.pow(2, i - 1)) / m1Count : 0;
            const roundKey = `${title || 'null'}-${roundIndex}`;
            const roundTitle = roundsMap[roundIndex][0]?.is_grand_final
              ? t('brackets.grand_final')
              : t('brackets.round_name', { num: roundIndex });
            const meta = getRoundMeta(roundKey);

            return (
              <div
                key={`round-${roundIndex}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '260px',
                  position: 'relative',
                }}
              >
                {/* Round Header */}
                <div
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    paddingBottom: '0.5rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    alignItems: 'center',
                  }}
                >
                  <h3
                    style={{
                      textAlign: 'center',
                      margin: 0,
                      color: 'var(--muted)',
                      fontSize: '0.95rem',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {roundTitle}
                  </h3>

                  {/* Format & Map Pool Controls */}
                  {canManage ? (
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.4rem',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* Format Dropdown */}
                      <select
                        className="input-base text-xs"
                        value={meta.format}
                        onChange={(e) => handleFormatChange(roundKey, e.target.value)}
                        style={{
                          padding: '0.2rem 0.4rem',
                          background: 'rgba(0,0,0,0.4)',
                          color: 'var(--primary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                        title="Selecciona el formato de mapas para esta ronda"
                      >
                        <option value="bo1">1 Map</option>
                        <option value="to2">BO2</option>
                        <option value="bo3">BO3</option>
                        <option value="bo5">BO5</option>
                      </select>

                      {/* Map Pool Button */}
                      <button
                        type="button"
                        className="btn btn-secondary text-xs"
                        style={{
                          padding: '0.2rem 0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background:
                            meta.maps.length > 0
                              ? 'rgba(111, 175, 58, 0.15)'
                              : 'rgba(255,255,255,0.05)',
                          borderColor:
                            meta.maps.length > 0
                              ? 'var(--primary)'
                              : 'var(--border-light)',
                          color:
                            meta.maps.length > 0 ? 'var(--primary)' : 'var(--muted)',
                        }}
                        onClick={() => handleOpenMapPool(roundKey, roundTitle)}
                        title={t('brackets.manage_round_pool')}
                      >
                        <Layers size={12} />
                        {meta.maps.length > 0 ? `${meta.maps.length} ${t('tournament_create.maps_title')}` : 'Pool'}
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.4rem',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: 'var(--primary)',
                          padding: '0.1rem 0.4rem',
                          background: 'rgba(111, 175, 58, 0.1)',
                          borderRadius: '4px',
                          border: '1px solid rgba(111, 175, 58, 0.2)',
                        }}
                      >
                        {meta.formatLabel}
                      </span>
                      {meta.maps.length > 0 && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--muted)',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          {meta.maps.length} {t('tournament_create.maps_title')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Matches Column with SVG Orthogonal Connectors */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    flex: 1,
                    gap: '2rem',
                    position: 'relative',
                  }}
                >
                  {roundsMap[roundIndex].map((match, matchIdx) => (
                    <div
                      key={match.id}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {/* Incoming Connector */}
                      {i > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: '-2rem',
                            width: '2rem',
                            height: '2px',
                            background: 'var(--border-light)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 0,
                          }}
                        />
                      )}

                      {i > 0 && title !== 'Lower Bracket' && (
                        <div
                          style={{
                            position: 'absolute',
                            left: '-2rem',
                            width: '2px',
                            height: `${verticalLineHeight}%`,
                            background: 'var(--border-light)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 0,
                          }}
                        />
                      )}

                      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                        <MatchCard
                          match={match}
                          teamMap={teamMap}
                          canManage={canManage}
                          onClick={handleMatchClick}
                          matchNumber={matchNumbers[match.id]}
                          feeders={finalFeeders[match.id]}
                          isDndEnabled={Boolean(isDndActive && match.round === 1 && match.is_upper)}
                          onSlotDragStart={handleSlotDragStart}
                          onSlotDrop={handleSlotDrop}
                        />
                      </div>

                      {i < roundKeys.length - 1 && (
                        <div
                          style={{
                            position: 'absolute',
                            right: '-2rem',
                            width: '2rem',
                            height: '2px',
                            background: 'var(--border-light)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 0,
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setStartY(e.pageY - scrollRef.current.offsetTop);
    setScrollLeft(scrollRef.current.scrollLeft);
    setScrollTop(scrollRef.current.scrollTop);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const y = e.pageY - scrollRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walkX;
    scrollRef.current.scrollTop = scrollTop - walkY;
  };

  // Filtered maps for the map pool modal
  const filteredModalMaps = availableMaps.filter((map: any) => {
    if (mapFilter !== 'all' && map.type !== mapFilter) return false;
    if (searchMap.trim() && !map.name.toLowerCase().includes(searchMap.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div>
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
            <strong style={{ color: 'var(--primary)' }}>Ajuste de emparejamientos activo:</strong>{' '}
            <span className="text-muted">
              Arrastra y suelta los equipos de la Ronda 1 para reorganizar los cruces iniciales antes de cerrar el torneo.
            </span>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        style={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'auto',
          padding: '2rem',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '12px',
          minHeight: '500px',
          border: '1px solid var(--border-light)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
      {renderBracketSection(
        ubRoundKeys,
        ubRounds,
        ubM1,
        tournament?.tournament_format === 'double_elimination' ||
          (tournament?.template_json as any)?.tournamentFormat === 'double_elimination'
          ? t('brackets.winners_bracket')
          : null
      )}
      {renderBracketSection(lbRoundKeys, lbRounds, lbM1, t('brackets.losers_bracket'))}

      {/* Score Modal */}
      {selectedMatch && (
        <ScoreModal
          match={selectedMatch}
          team1={selectedTeam1}
          team2={selectedTeam2}
          onClose={() => setSelectedMatch(null)}
          onSave={handleSaveScore}
          isSaving={isSaving}
        />
      )}

      {/* Dynamic Map Pool Modal */}
      {mapPoolModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setMapPoolModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="card animate-modalFadeIn"
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-light)',
                paddingBottom: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>
                  {t('brackets.manage_round_pool')}: {mapPoolModal.roundTitle}
                </h3>
                <p className="text-muted text-xs" style={{ margin: '0.2rem 0 0' }}>
                  Selecciona los mapas disponibles o agrega mapas personalizados para esta ronda.
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setMapPoolModal((prev) => ({ ...prev, isOpen: false }))}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted)',
                  }}
                />
                <input
                  type="text"
                  className="input-base text-sm"
                  placeholder="Buscar mapa..."
                  value={searchMap}
                  onChange={(e) => setSearchMap(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {(['all', 'official', 'custom'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`btn text-xs ${mapFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.4rem 0.75rem', textTransform: 'capitalize' }}
                    onClick={() => setMapFilter(filter)}
                  >
                    {filter === 'all' ? t('common.all') : filter === 'official' ? 'Oficiales' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Count Indicator */}
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                <strong>{mapPoolModal.selectedMaps.length}</strong> mapas seleccionados en el pool
              </span>
              {mapPoolModal.selectedMaps.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-danger"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setMapPoolModal((prev) => ({ ...prev, selectedMaps: [] }))}
                >
                  Limpiar selección
                </button>
              )}
            </div>

            {/* Maps Grid Selector */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.5rem',
                maxHeight: '320px',
                overflowY: 'auto',
                padding: '0.5rem',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
              }}
            >
              {filteredModalMaps.map((map: any) => {
                const mapName = map.name.toUpperCase();
                const isSelected = mapPoolModal.selectedMaps.includes(mapName);
                const isOfficial = map.type === 'official';

                return (
                  <button
                    key={mapName}
                    type="button"
                    className="btn text-xs"
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: '6px',
                      background: isSelected
                        ? 'rgba(111, 175, 58, 0.25)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected
                        ? '1px solid var(--primary)'
                        : '1px solid rgba(255,255,255,0.1)',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                    onClick={() => {
                      if (isSelected) {
                        setMapPoolModal((prev) => ({
                          ...prev,
                          selectedMaps: prev.selectedMaps.filter((m) => m !== mapName),
                        }));
                      } else {
                        setMapPoolModal((prev) => ({
                          ...prev,
                          selectedMaps: [...prev.selectedMaps, mapName],
                        }));
                      }
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span
                        style={{
                          fontWeight: isSelected ? 'bold' : 'normal',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {mapName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color: isOfficial ? 'var(--muted)' : '#C499FF',
                        }}
                      >
                        {isOfficial ? 'Oficial' : 'Custom'}
                      </span>
                    </div>
                    {isSelected && <Check size={14} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}

              {filteredModalMaps.length === 0 && (
                <p
                  className="text-muted text-xs"
                  style={{ gridColumn: '1 / -1', textAlign: 'center', margin: '1.5rem 0' }}
                >
                  No se encontraron mapas con los filtros aplicados.
                </p>
              )}
            </div>

            {/* Add Custom Map input */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="input-base text-sm"
                placeholder="Agregar mapa adicional por nombre..."
                value={mapPoolModal.customMapInput}
                onChange={(e) =>
                  setMapPoolModal((prev) => ({ ...prev, customMapInput: e.target.value }))
                }
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={() => {
                  if (mapPoolModal.customMapInput.trim()) {
                    setMapPoolModal((prev) => ({
                      ...prev,
                      selectedMaps: [
                        ...prev.selectedMaps,
                        mapPoolModal.customMapInput.trim().toUpperCase(),
                      ],
                      customMapInput: '',
                    }));
                  }
                }}
              >
                {t('tournament_create.add_custom_field')}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMapPoolModal((prev) => ({ ...prev, isOpen: false }))}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveMapPool}
              >
                {t('brackets.save_round_format')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

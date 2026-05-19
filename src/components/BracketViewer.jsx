import React, { useState, useEffect, useRef } from 'react';
import MatchCard from './MatchCard';
import ScoreModal from './ScoreModal';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function BracketViewer({ matches, teams, canManage, onMatchUpdated, tournament }) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [roundMetas, setRoundMetas] = useState(tournament?.template_json?.round_metadata || {});

  // Drag to scroll state
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    if (tournament?.template_json?.round_metadata) {
      setRoundMetas(tournament.template_json.round_metadata);
    }
  }, [tournament]);

  const handleMetaBlur = async (roundKey) => {
    if (!canManage || !tournament) return;
    const currentMeta = tournament.template_json?.round_metadata || {};
    if (currentMeta[roundKey] === roundMetas[roundKey]) return;

    const newJson = {
      ...tournament.template_json,
      round_metadata: roundMetas
    };

    const { error } = await supabase.from('tournaments').update({ template_json: newJson }).eq('id', tournament.id);
    if (error) {
      toast.error("Error al guardar formato de ronda");
    }
  };

  // Separate matches by bracket
  const ubRounds = {};
  const lbRounds = {};

  matches.forEach(m => {
    // Hide pure byes visually
    if (m.is_bye) return; 

    if (m.is_upper) {
      if (!ubRounds[m.round]) ubRounds[m.round] = [];
      ubRounds[m.round].push(m);
    } else {
      if (!lbRounds[m.round]) lbRounds[m.round] = [];
      lbRounds[m.round].push(m);
    }
  });

  Object.keys(ubRounds).forEach(r => ubRounds[r].sort((a, b) => a.match_order - b.match_order));
  Object.keys(lbRounds).forEach(r => lbRounds[r].sort((a, b) => a.match_order - b.match_order));

  const ubRoundKeys = Object.keys(ubRounds).map(Number).sort((a, b) => a - b);
  const lbRoundKeys = Object.keys(lbRounds).map(Number).sort((a, b) => a - b);
  
  // Assign match numbers
  let matchCounter = 1;
  const matchNumbers = {};
  // Sort all matches globally to assign numbers sequentially like Challonge
  const sortedMatches = [...matches].sort((a, b) => {
    if (a.is_upper !== b.is_upper) return a.is_upper ? -1 : 1;
    if (a.round !== b.round) return a.round - b.round;
    return a.match_order - b.match_order;
  });
  sortedMatches.forEach(m => {
    if (!m.is_bye) {
      matchNumbers[m.id] = matchCounter++;
    }
  });

  const feeders = {}; // targetMatchId -> array of objects
  sortedMatches.forEach(m => {
    const num = matchNumbers[m.id];
    if (m.next_match_id) {
      if (!feeders[m.next_match_id]) feeders[m.next_match_id] = [];
      feeders[m.next_match_id].push({ id: m.id, type: 'winner', label: null, isBye: m.is_bye });
    }
    if (m.loser_match_id) {
      if (!feeders[m.loser_match_id]) feeders[m.loser_match_id] = [];
      feeders[m.loser_match_id].push({ id: m.id, type: 'loser', label: num ? `Perdedor de M${num}` : `Perdedor anterior`, isBye: m.is_bye });
    }
  });

  // Resolve byes: if a match is a bye, pass its real feeder's label forward
  sortedMatches.forEach(m => {
    if (m.is_bye) {
      const myFeeders = feeders[m.id] || [];
      const realFeeder = myFeeders.find(f => !f.isBye);
      if (m.next_match_id && realFeeder) {
        const targetFeeders = feeders[m.next_match_id];
        if (targetFeeders) {
          const idx = targetFeeders.findIndex(f => f.id === m.id);
          if (idx !== -1) {
            targetFeeders[idx].label = realFeeder.label;
            targetFeeders[idx].isBye = false; // Resolved
            targetFeeders[idx].id = realFeeder.id;
            targetFeeders[idx].type = realFeeder.type;
          }
        }
      }
    }
  });

  const finalFeeders = {};
  sortedMatches.forEach(m => {
    const myFeeders = feeders[m.id] || [];
    let pending1 = null;
    let pending2 = null;

    const isConsumedBy = (feeder, teamId) => {
      if (!teamId || !feeder) return false;
      const sourceMatch = sortedMatches.find(sm => sm.id === feeder.id);
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
      else t1Feeder = f1; // fallback
    }
    if (m.team2_id) {
      if (f1 && f1 !== t1Feeder && isConsumedBy(f1, m.team2_id)) t2Feeder = f1;
      else if (f2 && f2 !== t1Feeder && isConsumedBy(f2, m.team2_id)) t2Feeder = f2;
      else t2Feeder = f1 !== t1Feeder ? f1 : f2; // fallback
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

  const teamMap = {};
  teams.forEach(t => teamMap[t.id] = t);

  const handleMatchClick = (match, t1, t2) => {
    if (!match.team1_id || !match.team2_id) {
      if (canManage) toast.info("Este partido no tiene a los dos equipos asignados aún.");
      return;
    }
    if (match.status === 'completed' && !canManage) return;

    setSelectedMatch(match);
    setSelectedTeam1(t1);
    setSelectedTeam2(t2);
  };

  const handleSaveScore = async (data) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/matches/${selectedMatch.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'Error al guardar');
      
      toast.success("Resultado guardado correctamente.");
      setSelectedMatch(null);
      if (onMatchUpdated) onMatchUpdated();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderBracketSection = (roundKeys, roundsMap, m1Count, title) => {
    if (roundKeys.length === 0) return null;
    return (
      <div style={{ marginBottom: '4rem' }}>
        {title && <h2 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>{title}</h2>}
        <div style={{
          display: 'flex',
          gap: '4rem',
          minWidth: 'max-content',
          alignItems: 'stretch'
        }}>
          {roundKeys.map((roundIndex, i) => {
            const verticalLineHeight = i > 0 ? (100 * Math.pow(2, i - 1)) / m1Count : 0;
            
            return (
              <div key={`round-${roundIndex}`} style={{
                display: 'flex',
                flexDirection: 'column',
                width: '250px',
                position: 'relative'
              }}>
                <h3 style={{ 
                  textAlign: 'center', margin: 0, paddingBottom: '0.5rem', 
                  color: 'var(--muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  height: '30px',
                  flexShrink: 0
                }}>
                  {roundsMap[roundIndex][0]?.is_grand_final ? 'Gran Final' : `Ronda ${roundIndex}`}
                </h3>
                
                {canManage ? (
                  <input 
                    type="text" 
                    value={roundMetas[`${title}-${roundIndex}`] || ''}
                    onChange={e => setRoundMetas({...roundMetas, [`${title}-${roundIndex}`]: e.target.value})}
                    onBlur={() => handleMetaBlur(`${title}-${roundIndex}`)}
                    placeholder="Formato (Ej. BO3)"
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', textAlign: 'center', width: '100%', fontSize: '0.8rem', marginBottom: '1rem', outline: 'none' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '0.8rem', marginBottom: '1rem', minHeight: '1.2rem' }}>
                    {roundMetas[`${title}-${roundIndex}`] || ''}
                  </div>
                )}
                
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  position: 'relative'
                }}>
                  {roundsMap[roundIndex].map((match, j) => (
                    <div key={match.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      {i > 0 && (
                        <div style={{
                          position: 'absolute', left: '-2rem', width: '2rem', height: '2px',
                          background: 'var(--border-light)', top: '50%', transform: 'translateY(-50%)', zIndex: 0
                        }} />
                      )}
                      
                      {/* Vertical line drawing is complex with asymmetric LB trees, we'll keep it simple for now or disable if LB */}
                      {i > 0 && title !== "Lower Bracket" && (
                        <div style={{
                          position: 'absolute', left: '-2rem', width: '2px', height: `${verticalLineHeight}%`,
                          background: 'var(--border-light)', top: '50%', transform: 'translateY(-50%)', zIndex: 0
                        }} />
                      )}

                      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                        <MatchCard 
                          match={match} 
                          teamMap={teamMap} 
                          canManage={canManage} 
                          onClick={handleMatchClick}
                          matchNumber={matchNumbers[match.id]}
                          feeders={finalFeeders[match.id]}
                        />
                      </div>
                      
                      {i < roundKeys.length - 1 && (
                        <div style={{
                          position: 'absolute', right: '-2rem', width: '2rem', height: '2px',
                          background: 'var(--border-light)', top: '50%', transform: 'translateY(-50%)', zIndex: 0
                        }} />
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

  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setStartY(e.pageY - scrollRef.current.offsetTop);
    setScrollLeft(scrollRef.current.scrollLeft);
    setScrollTop(scrollRef.current.scrollTop);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  
  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const y = e.pageY - scrollRef.current.offsetTop;
    const walkX = (x - startX) * 1.5; // Scroll speed multiplier
    const walkY = (y - startY) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walkX;
    scrollRef.current.scrollTop = scrollTop - walkY;
  };

  return (
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
      userSelect: 'none'
    }}>
      {renderBracketSection(ubRoundKeys, ubRounds, ubM1, (tournament?.tournament_format === 'double_elimination' || tournament?.template_json?.tournamentFormat === 'double_elimination') ? "Upper Bracket" : null)}
      {renderBracketSection(lbRoundKeys, lbRounds, lbM1, "Lower Bracket")}

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
    </div>
  );
}

import React, { useState } from 'react';
import MatchCard from './MatchCard';
import ScoreModal from './ScoreModal';
import { toast } from 'sonner';

export default function BracketViewer({ matches, teams, canManage, onMatchUpdated }) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Group matches by round
  const rounds = {};
  matches.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });

  // Sort matches within rounds by match_order
  Object.keys(rounds).forEach(r => {
    rounds[r].sort((a, b) => a.match_order - b.match_order);
  });

  const roundKeys = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  // Create a team map for quick lookup
  const teamMap = {};
  teams.forEach(t => teamMap[t.id] = t);

  const handleMatchClick = (match, t1, t2) => {
    // Only allow editing if the match has both teams
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

  return (
    <div style={{
      width: '100%',
      overflowX: 'auto',
      overflowY: 'auto',
      padding: '2rem',
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '12px',
      minHeight: '500px',
      border: '1px solid var(--border-light)',
      cursor: 'grab'
    }}>
      <div style={{
        display: 'flex',
        gap: '4rem', // Space between columns
        minWidth: 'max-content'
      }}>
        {roundKeys.map((roundIndex, i) => (
          <div key={`round-${roundIndex}`} style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            gap: '2rem',
            position: 'relative'
          }}>
            <h3 style={{ 
              textAlign: 'center', margin: 0, paddingBottom: '1rem', 
              color: 'var(--muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px',
              borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem'
            }}>
              {roundIndex === roundKeys[roundKeys.length - 1] ? 'Gran Final' : `Ronda ${roundIndex}`}
            </h3>
            
            {rounds[roundIndex].map((match, j) => (
              <div key={match.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <MatchCard 
                  match={match} 
                  teamMap={teamMap} 
                  canManage={canManage} 
                  onClick={handleMatchClick}
                />
                
                {/* Connector lines to next round */}
                {i < roundKeys.length - 1 && (
                  <>
                    <div style={{
                      position: 'absolute',
                      right: '-2rem', // Half of the 4rem gap
                      width: '2rem',
                      height: '2px',
                      background: 'var(--border-light)',
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }} />
                    {/* Vertical connector would be complex without knowing exact heights.
                        Using space-around is usually enough for a visual tree, 
                        though proper SVG curves are better, we stick to simple horizontal lines connecting to next column.
                     */}
                  </>
                )}
                {/* Connector line FROM previous round */}
                {i > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: '-2rem',
                    width: '2rem',
                    height: '2px',
                    background: 'var(--border-light)',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

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

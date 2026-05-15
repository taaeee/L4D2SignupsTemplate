import React from 'react';
import { Trophy } from 'lucide-react';

export default function MatchCard({ match, teamMap, canManage, onClick }) {
  const team1 = match.team1_id ? teamMap[match.team1_id] : null;
  const team2 = match.team2_id ? teamMap[match.team2_id] : null;

  const isCompleted = match.status === 'completed';
  const isPending = match.status === 'pending';
  
  const getTeamStyle = (teamId) => {
    if (!isCompleted) return { color: 'var(--text-main)', fontWeight: 'normal' };
    if (match.winner_id === teamId) return { color: 'var(--success)', fontWeight: 'bold' };
    return { color: 'var(--muted)', fontWeight: 'normal', opacity: 0.6 };
  };

  const getScoreStyle = (teamId) => {
    if (!isCompleted) return { color: 'var(--text-main)' };
    if (match.winner_id === teamId) return { color: 'var(--success)', fontWeight: 'bold' };
    return { color: 'var(--muted)' };
  };

  return (
    <div 
      onClick={() => canManage && onClick && onClick(match, team1, team2)}
      style={{
        width: '220px',
        background: 'rgba(0,0,0,0.4)',
        border: `1px solid ${isCompleted ? 'rgba(255,255,255,0.1)' : 'var(--border-light)'}`,
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        cursor: canManage ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
        position: 'relative',
        ...(canManage ? { ':hover': { borderColor: 'var(--primary)', transform: 'scale(1.02)' } } : {})
      }}
      className="match-card"
    >
      {/* Top Half: Team 1 */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: match.winner_id === match.team1_id ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {match.winner_id === match.team1_id && <Trophy size={14} color="var(--success)" />}
          <span style={{ 
            ...getTeamStyle(match.team1_id),
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' 
          }}>
            {team1 ? team1.name : 'TBD'}
          </span>
        </div>
        <span style={{ fontSize: '0.9rem', ...getScoreStyle(match.team1_id) }}>
          {isCompleted ? match.score1 : '-'}
        </span>
      </div>

      {/* Bottom Half: Team 2 */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '8px 12px',
        background: match.winner_id === match.team2_id ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {match.winner_id === match.team2_id && <Trophy size={14} color="var(--success)" />}
          <span style={{ 
            ...getTeamStyle(match.team2_id),
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' 
          }}>
            {team2 ? team2.name : 'TBD'}
          </span>
        </div>
        <span style={{ fontSize: '0.9rem', ...getScoreStyle(match.team2_id) }}>
          {isCompleted ? match.score2 : '-'}
        </span>
      </div>

      {/* Match number overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '-10px',
        transform: 'translateY(-50%)',
        background: 'var(--primary)',
        color: 'white',
        fontSize: '0.65rem',
        padding: '2px 4px',
        borderRadius: '4px',
        opacity: 0.8
      }}>
        M{(match.round * 100) + match.match_order + 1}
      </div>
    </div>
  );
}

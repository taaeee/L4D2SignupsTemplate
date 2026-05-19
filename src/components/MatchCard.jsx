import React from 'react';
import { Trophy } from 'lucide-react';

export default function MatchCard({ match, teamMap, canManage, onClick, matchNumber, feeders }) {
  const team1 = match.team1_id ? teamMap[match.team1_id] : null;
  const team2 = match.team2_id ? teamMap[match.team2_id] : null;

  const isCompleted = match.status === 'completed';
  
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

  const renderTeamName = (teamId, teamObj, slotIndex) => {
    if (teamObj) return teamObj.name;
    
    // Pick the specific feeder for this slot
    const feeder = slotIndex === 1 ? feeders?.pending1 : feeders?.pending2;
    if (feeder) {
      return <span style={{ opacity: 0.6, fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--muted)' }}>{feeder}</span>;
    }

    // Show empty space instead of TBD for Challonge-style look
    return <span style={{ opacity: 0.3, fontStyle: 'italic' }}>Esperando...</span>;
  };

  const handleMouseEnter = (teamId) => {
    if (!teamId) return;
    document.querySelectorAll(`.team-slot-${teamId}`).forEach(el => el.classList.add('hover-highlight'));
    document.querySelectorAll(`.match-card-team-${teamId}`).forEach(el => el.classList.add('hover-card-highlight'));
  };

  const handleMouseLeave = (teamId) => {
    if (!teamId) return;
    document.querySelectorAll(`.team-slot-${teamId}`).forEach(el => el.classList.remove('hover-highlight'));
    document.querySelectorAll(`.match-card-team-${teamId}`).forEach(el => el.classList.remove('hover-card-highlight'));
  };

  return (
    <div 
      onClick={() => canManage && onClick && onClick(match, team1, team2)}
      style={{
        width: '250px',
        background: 'rgba(0,0,0,0.4)',
        border: `1px solid ${isCompleted ? 'rgba(255,255,255,0.1)' : 'var(--border-light)'}`,
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        cursor: canManage ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        ...(canManage ? { ':hover': { transform: 'scale(1.02)' } } : {})
      }}
      className={`match-card ${match.team1_id ? 'match-card-team-' + match.team1_id : ''} ${match.team2_id ? 'match-card-team-' + match.team2_id : ''}`}
    >
      {/* Top Half: Team 1 */}
      <div 
        onMouseEnter={() => handleMouseEnter(match.team1_id)}
        onMouseLeave={() => handleMouseLeave(match.team1_id)}
        className={`team-slot ${match.team1_id ? 'team-slot-' + match.team1_id : ''}`}
        style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: match.winner_id === match.team1_id ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
        minHeight: '36px',
        transition: 'background 0.2s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, paddingRight: '8px' }}>
          {match.winner_id === match.team1_id && <Trophy size={14} color="var(--success)" />}
          <span style={{ 
            ...getTeamStyle(match.team1_id),
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' 
          }}>
            {renderTeamName(match.team1_id, team1, 1)}
          </span>
        </div>
        <span style={{ fontSize: '0.9rem', ...getScoreStyle(match.team1_id) }}>
          {isCompleted && match.team1_id ? match.score1 : ''}
        </span>
      </div>

      {/* Bottom Half: Team 2 */}
      <div 
        onMouseEnter={() => handleMouseEnter(match.team2_id)}
        onMouseLeave={() => handleMouseLeave(match.team2_id)}
        className={`team-slot ${match.team2_id ? 'team-slot-' + match.team2_id : ''}`}
        style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '8px 12px',
        background: match.winner_id === match.team2_id ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
        minHeight: '36px',
        transition: 'background 0.2s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, paddingRight: '8px' }}>
          {match.winner_id === match.team2_id && <Trophy size={14} color="var(--success)" />}
          <span style={{ 
            ...getTeamStyle(match.team2_id),
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' 
          }}>
            {renderTeamName(match.team2_id, team2, 2)}
          </span>
        </div>
        <span style={{ fontSize: '0.9rem', ...getScoreStyle(match.team2_id) }}>
          {isCompleted && match.team2_id ? match.score2 : ''}
        </span>
      </div>

      {/* Match number overlay */}
      {matchNumber && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: 'var(--primary)',
          color: '#000',
          fontWeight: 'bold',
          fontSize: '0.65rem',
          padding: '2px 6px',
          borderBottomLeftRadius: '6px',
          zIndex: 2,
          boxShadow: '-1px 1px 4px rgba(0,0,0,0.4)'
        }}>
          M{matchNumber}
        </div>
      )}
    </div>
  );
}

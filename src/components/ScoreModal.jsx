import React, { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function ScoreModal({ match, team1, team2, onClose, onSave, isSaving }) {
  const [score1, setScore1] = useState(match.score1 || 0);
  const [score2, setScore2] = useState(match.score2 || 0);
  const [winnerId, setWinnerId] = useState(match.winner_id || null);

  useEffect(() => {
    // Auto-select winner if scores differ
    if (score1 > score2 && team1) {
      setWinnerId(team1.id);
    } else if (score2 > score1 && team2) {
      setWinnerId(team2.id);
    } else {
      setWinnerId(null);
    }
  }, [score1, score2, team1, team2]);

  const handleSave = () => {
    if (!winnerId) {
      toast.error("Por favor selecciona un ganador. Si hay empate, debes decidir quién avanza.");
      return;
    }
    onSave({ score1, score2, winner_id: winnerId });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: '#1a1a2e', padding: '2rem', borderRadius: '12px',
        width: '90%', maxWidth: '500px', border: '1px solid var(--border-light)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Reportar Resultado</h2>
          <button className="btn-icon" onClick={onClose}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Team 1 */}
          <div 
            onClick={() => team1 && setWinnerId(team1.id)}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '1rem', background: winnerId === team1?.id ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${winnerId === team1?.id ? 'var(--success)' : 'var(--border-light)'}`,
              borderRadius: '8px', cursor: team1 ? 'pointer' : 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {winnerId === team1?.id && <Trophy size={20} color="var(--success)" />}
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{team1 ? team1.name : 'TBD'}</span>
            </div>
            {team1 && (
              <input 
                type="number" 
                value={score1} 
                onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  width: '60px', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', 
                  border: '1px solid var(--border-light)', color: 'white', textAlign: 'center', borderRadius: '4px'
                }}
              />
            )}
          </div>

          <div style={{ textAlign: 'center', color: 'var(--muted)', fontWeight: 'bold' }}>VS</div>

          {/* Team 2 */}
          <div 
            onClick={() => team2 && setWinnerId(team2.id)}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '1rem', background: winnerId === team2?.id ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${winnerId === team2?.id ? 'var(--success)' : 'var(--border-light)'}`,
              borderRadius: '8px', cursor: team2 ? 'pointer' : 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {winnerId === team2?.id && <Trophy size={20} color="var(--success)" />}
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{team2 ? team2.name : 'TBD'}</span>
            </div>
            {team2 && (
              <input 
                type="number" 
                value={score2} 
                onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  width: '60px', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', 
                  border: '1px solid var(--border-light)', color: 'white', textAlign: 'center', borderRadius: '4px'
                }}
              />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Cancelar</button>
            <button className="btn text-success" style={{ background: 'rgba(34, 197, 94, 0.1)' }} onClick={handleSave} disabled={isSaving || !winnerId}>
              {isSaving ? 'Guardando...' : 'Guardar Resultado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Trophy, Swords, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { Database } from '@/lib/database.types';
import { useTranslation } from '@/lib/i18n';

type Match = Database['public']['Tables']['matches']['Row'];

interface Team {
  id: string;
  name: string;
}

interface ScoreModalProps {
  match: Match;
  team1: Team | null;
  team2: Team | null;
  onClose: () => void;
  onSave: (data: { score1: number, score2: number, winner_id: string }) => void;
  isSaving: boolean;
}

export default function ScoreModal({ match, team1, team2, onClose, onSave, isSaving }: ScoreModalProps) {
  const { t } = useTranslation();
  // Use string state to allow completely deleting/clearing values without auto-resetting to 0
  const [score1, setScore1] = useState<string>(
    match.score1 !== null && match.score1 !== undefined ? String(match.score1) : "0"
  );
  const [score2, setScore2] = useState<string>(
    match.score2 !== null && match.score2 !== undefined ? String(match.score2) : "0"
  );
  const [winnerId, setWinnerId] = useState<string | null>(match.winner_id || null);

  useEffect(() => {
    const num1 = score1 === "" ? 0 : parseInt(score1, 10);
    const num2 = score2 === "" ? 0 : parseInt(score2, 10);

    // Auto-select winner if scores differ
    if (num1 > num2 && team1) {
      setWinnerId(team1.id);
    } else if (num2 > num1 && team2) {
      setWinnerId(team2.id);
    } else if (num1 === num2 && !match.winner_id) {
      setWinnerId(null);
    }
  }, [score1, score2, team1, team2, match.winner_id]);

  const handleSave = () => {
    if (!winnerId) {
      toast.error(t("modals.select_winner_error"));
      return;
    }
    const num1 = score1 === "" ? 0 : parseInt(score1, 10);
    const num2 = score2 === "" ? 0 : parseInt(score2, 10);
    onSave({ score1: num1, score2: num2, winner_id: winnerId });
  };

  const handleScoreChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string or digits only
    if (val === "" || /^\d+$/.test(val)) {
      setter(val);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(8px)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel modal-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '2rem',
          position: 'relative',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-light)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          animation: 'modalFadeIn 0.2s ease-out forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Swords size={20} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-main)', fontWeight: 700 }}>
                {t("modals.report_result_title")}
              </h2>
            </div>
            <p className="text-muted text-xs" style={{ margin: 0 }}>
              {t("modals.report_result_desc")}
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{
              padding: '0.4rem',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Teams and Scores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Team 1 */}
          <div
            onClick={() => team1 && setWinnerId(team1.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1.1rem',
              background: winnerId === team1?.id ? 'rgba(111, 175, 58, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${winnerId === team1?.id ? 'var(--primary)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: team1 ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              boxShadow: winnerId === team1?.id ? '0 0 16px var(--primary-glow)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1, paddingRight: '0.75rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: winnerId === team1?.id ? 'rgba(111, 175, 58, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trophy size={16} color={winnerId === team1?.id ? 'var(--primary)' : 'var(--text-muted)'} />
              </div>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: winnerId === team1?.id ? 'var(--primary)' : 'var(--text-main)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={team1 ? team1.name : t("modals.to_be_decided")}
                >
                  {team1 ? team1.name : t("modals.to_be_decided")}
                </span>
                {winnerId === team1?.id && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t("matches.winner")}
                  </span>
                )}
              </div>
            </div>

            {team1 && (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={score1}
                onChange={handleScoreChange(setScore1)}
                onClick={(e) => e.stopPropagation()}
                placeholder="0"
                className="input-base"
                style={{
                  width: '68px',
                  height: '42px',
                  padding: '0.4rem',
                  textAlign: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                }}
              />
            )}
          </div>

          {/* VS Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              VS
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
          </div>

          {/* Team 2 */}
          <div
            onClick={() => team2 && setWinnerId(team2.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1.1rem',
              background: winnerId === team2?.id ? 'rgba(111, 175, 58, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${winnerId === team2?.id ? 'var(--primary)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: team2 ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              boxShadow: winnerId === team2?.id ? '0 0 16px var(--primary-glow)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1, paddingRight: '0.75rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: winnerId === team2?.id ? 'rgba(111, 175, 58, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trophy size={16} color={winnerId === team2?.id ? 'var(--primary)' : 'var(--text-muted)'} />
              </div>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: winnerId === team2?.id ? 'var(--primary)' : 'var(--text-main)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={team2 ? team2.name : t("modals.to_be_decided")}
                >
                  {team2 ? team2.name : t("modals.to_be_decided")}
                </span>
                {winnerId === team2?.id && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t("matches.winner")}
                  </span>
                )}
              </div>
            </div>

            {team2 && (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={score2}
                onChange={handleScoreChange(setScore2)}
                onClick={(e) => e.stopPropagation()}
                placeholder="0"
                className="input-base"
                style={{
                  width: '68px',
                  height: '42px',
                  padding: '0.4rem',
                  textAlign: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                }}
              />
            )}
          </div>

          <p className="text-muted text-xs" style={{ margin: '0.25rem 0 0.5rem 0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            <Lightbulb size={13} color="var(--primary)" /> {t("modals.manual_winner_tip")}
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSaving}
              style={{ flex: 1 }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving || !winnerId}
              style={{ flex: 1 }}
            >
              {isSaving ? t("common.saving") : t("modals.save_result_btn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

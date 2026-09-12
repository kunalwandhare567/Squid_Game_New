import React from 'react';
import ConfettiCanvas from '../Shared/ConfettiCanvas';
import { Trophy, Skull, Award, RotateCcw, Sparkles } from 'lucide-react';

export default function PlayerEnd({ me }) {
  const isSurvivor = me?.alive !== false;

  return (
    <div className="player-finale-screen">
      {isSurvivor && <ConfettiCanvas active={true} />}

      <div className="player-finale-badge">
        <Sparkles size={16} color="#ffd257" />
        <span>{isSurvivor ? 'VICTORY SURVIVOR' : 'GAME COMPLETED'}</span>
        <Sparkles size={16} color="#ffd257" />
      </div>

      <div className="player-avatar-ring">
        <span className="player-em-large">{me?.emoji || '👤'}</span>
      </div>

      <h1 className="player-end-name">{me?.name || 'Player'}</h1>

      <div className="player-score-card">
        <span className="sc-label">FINAL SCORE</span>
        <div className="sc-number">{(me?.score || 0).toLocaleString()}</div>
        <span className="sc-pts">POINTS</span>
      </div>

      <div className={`player-status-banner ${isSurvivor ? 'banner-survived' : 'banner-elim'}`}>
        {isSurvivor ? (
          <>
            <Trophy size={20} color="#57ffb0" />
            <div>
              <strong>YOU SURVIVED!</strong>
              <p>You conquered all rounds of the IAE Squid Game.</p>
            </div>
          </>
        ) : (
          <>
            <Skull size={20} color="#ff2d78" />
            <div>
              <strong>ELIMINATED</strong>
              <p>Valiant effort in the survival arena. Better luck next time!</p>
            </div>
          </>
        )}
      </div>

      <button className="btn-play-again player-play-again" onClick={() => window.location.reload()}>
        <RotateCcw size={18} />
        <span>↻ PLAY AGAIN</span>
      </button>
    </div>
  );
}

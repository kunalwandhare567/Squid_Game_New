import React from 'react';
import DollSvg from '../Shared/DollSvg';
import { ShieldCheck, Skull, Clock } from 'lucide-react';

export default function PlayerWait({ me, title, message, type = 'lobby' }) {
  const isSafe = type === 'safe';
  const isEliminated = type === 'eliminated';

  return (
    <div className="player-wait-screen center">
      {isSafe ? (
        <div className="wait-icon-shield" style={{ background: 'rgba(87, 255, 176, 0.15)', border: '2px solid #57ffb0', borderRadius: '50%', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(87, 255, 176, 0.3)', margin: '0 auto 12px' }}>
          <ShieldCheck size={38} color="#57ffb0" />
        </div>
      ) : isEliminated ? (
        <div className="wait-icon-skull" style={{ background: 'rgba(255, 45, 120, 0.15)', border: '2px solid #ff2d78', borderRadius: '50%', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(255, 45, 120, 0.3)', margin: '0 auto 12px' }}>
          <Skull size={38} color="#ff2d78" />
        </div>
      ) : (
        <DollSvg phase="lobby" />
      )}

      <div className="you-badge" style={{ margin: '8px auto', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(18, 54, 46, 0.85)', border: '1px solid rgba(87, 255, 176, 0.3)', borderRadius: '999px', padding: '4px 16px', fontWeight: 800 }}>
        <span>{me?.emoji || '👤'}</span>
        <span>{me?.name || 'You'}</span>
        <span style={{ color: '#ffd257', marginLeft: '6px' }}>⭐ {me?.score || 0} pts</span>
      </div>

      {title && (
        <h2 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: isSafe ? '#57ffb0' : isEliminated ? '#ff2d78' : '#ffffff', margin: '8px 0 4px', textAlign: 'center' }}>
          {title}
        </h2>
      )}

      <div className="wait-msg-card" style={{ maxWidth: '420px', background: 'rgba(12, 36, 28, 0.7)', border: `1px solid ${isSafe ? 'rgba(87, 255, 176, 0.25)' : isEliminated ? 'rgba(255, 45, 120, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: '16px', padding: '16px 20px', margin: '8px auto' }}>
        <p className="sub" style={{ margin: 0, textAlign: 'center', color: '#e2e8f0', fontSize: '14px', lineHeight: 1.4 }}>
          {message || "You're in! Waiting for the host…"}
        </p>
      </div>

      {!isEliminated && <div className="pulse-dots"><span/><span/><span/></div>}
    </div>
  );
}


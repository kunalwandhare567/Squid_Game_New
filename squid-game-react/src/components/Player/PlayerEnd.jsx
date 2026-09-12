import React from 'react';
import DollSvg from '../Shared/DollSvg';

export default function PlayerEnd({ me }) {
  return (
    <div className="center">
      <DollSvg phase="lobby" />
      <div className="banner">Game Over</div>
      <div className="you-badge">{me?.emoji} {me?.name}</div>
      <div className="big-score" style={{ fontSize: '56px', color: '#ffd257' }}>
        {(me?.score || 0).toLocaleString()}
      </div>
      <p className="sub" style={{ margin: '0 auto' }}>
        points — thanks for playing! 🎉<br />
        {me?.alive ? '🏆 You survived to the end!' : '💀 You were eliminated.'}
      </p>
      <button className="cta" onClick={() => window.location.reload()}>
        Play Again
      </button>
    </div>
  );
}

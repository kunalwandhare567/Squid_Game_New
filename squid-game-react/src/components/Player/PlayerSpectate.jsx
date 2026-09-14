import React from 'react';
import DollSvg from '../Shared/DollSvg';
import LightBanner from '../Shared/LightBanner';

export default function PlayerSpectate({ phase, question }) {
  const lightState = (phase === 'question') ? 'green'
                   : (phase === 'locked')   ? 'red'
                   : 'idle';
  return (
    <div className="center">
      <DollSvg phase={lightState === 'red' ? 'red' : 'lobby'} />
      <div className="banner">👁 Spectator Mode</div>
      <h2 style={{ textAlign: 'center' }}>
        {question?.text || 'Waiting for next question…'}
      </h2>
      <LightBanner state={lightState} />
      <p className="sub" style={{ margin: '0 auto', textAlign: 'center' }}>
        Game is full. You're watching! Join the next game when it starts.
      </p>
    </div>
  );
}

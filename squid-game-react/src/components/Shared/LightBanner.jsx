import React from 'react';

// state: 'green' | 'alert' | 'red' | 'idle' | 'fake-red'
export default function LightBanner({ state }) {
  const isGreen = state === 'green';
  const isAlert = state === 'alert';
  const isRed   = state === 'red' || state === 'fake-red';

  return (
    <div className={`light-banner ${isGreen ? 'light-green' : isAlert ? 'light-alert' : isRed ? 'light-red' : 'light-idle'}`}>
      <span className="light-dot" />
      <span className="light-label">
        {isGreen ? '▶ GREEN — Choose fast!' : isAlert ? '⚠️ ALERT — RED IMMINENT!' : isRed ? '■ RED — Locked!' : '⏸ Waiting…'}
      </span>
    </div>
  );
}

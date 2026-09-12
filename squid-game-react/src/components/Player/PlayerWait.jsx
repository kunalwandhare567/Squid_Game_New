import React from 'react';
import DollSvg from '../Shared/DollSvg';

export default function PlayerWait({ me, message }) {
  return (
    <div className="center">
      <DollSvg phase="lobby" />
      <div className="you-badge">{me?.emoji} {me?.name || 'you'}</div>
      <p className="sub" style={{ margin: '0 auto', textAlign: 'center' }}>
        {message || "You're in! Waiting for the host…"}
      </p>
      <div className="pulse-dots"><span/><span/><span/></div>
    </div>
  );
}

import React from 'react';

export default function DollSvg({ phase = 'lobby' }) {
  // phase: 'lobby' | 'green' | 'red'
  const isRed = phase === 'red';
  return (
    <div className={`doll ${isRed ? 'doll-red' : ''}`}>
      <svg className="doll-svg" viewBox="0 0 140 172" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M45 94 Q70 78 95 94 L114 170 L26 170 Z" fill="#f2a900"/>
        <rect x="63" y="86" width="14" height="12" fill="#f6d9b0"/>
        <circle cx="70" cy="56" r="34" fill="#f6d9b0"/>
        {/* Back of head (shown during green) */}
        <g className="doll-back" style={{ opacity: isRed ? 0 : 1, transition: 'opacity 0.25s' }}>
          <path d="M34 50 Q70 8 106 50 L106 42 Q70 4 34 42 Z" fill="#3b2a1a"/>
          <circle cx="70" cy="34" r="10" fill="#2e2013"/>
          <circle cx="28" cy="56" r="12" fill="#3b2a1a"/>
          <circle cx="112" cy="56" r="12" fill="#3b2a1a"/>
        </g>
        {/* Front with glowing eyes (shown during red) */}
        <g className="doll-front" style={{ opacity: isRed ? 1 : 0, transition: 'opacity 0.25s' }}>
          <path d="M34 46 Q70 6 106 46 L106 36 Q70 2 34 36 Z" fill="#3b2a1a"/>
          <circle cx="28" cy="54" r="12" fill="#3b2a1a"/>
          <circle cx="112" cy="54" r="12" fill="#3b2a1a"/>
          <circle className="doll-eye" cx="56" cy="56" r="5.5"
            style={{ fill: isRed ? '#ff2d3a' : '#2a2a2a', filter: isRed ? 'drop-shadow(0 0 7px #ff2d3a)' : 'none', transition: 'fill 0.2s, filter 0.2s' }}/>
          <circle className="doll-eye" cx="84" cy="56" r="5.5"
            style={{ fill: isRed ? '#ff2d3a' : '#2a2a2a', filter: isRed ? 'drop-shadow(0 0 7px #ff2d3a)' : 'none', transition: 'fill 0.2s, filter 0.2s' }}/>
          <path d="M60 74 Q70 80 80 74" stroke="#cc8f66" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </g>
      </svg>
    </div>
  );
}

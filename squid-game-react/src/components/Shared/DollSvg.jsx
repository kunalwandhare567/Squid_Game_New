import React from 'react';

export default function DollSvg({ phase = 'lobby' }) {
  const isRed = phase === 'red';

  return (
    <div className={`doll-3d-stage ${isRed ? 'doll-is-red' : 'doll-is-green'}`}>
      {/* 3D Ground Shadow */}
      <div className="doll-3d-shadow" />

      {/* 3D Doll Body & Rotating Head */}
      <div className="doll-3d-figure">
        <svg
          className="doll-3d-svg"
          viewBox="0 0 160 200"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* 3D Dress Gradient */}
            <linearGradient id="dollDressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffb300" />
              <stop offset="45%" stopColor="#f29100" />
              <stop offset="85%" stopColor="#c86d00" />
              <stop offset="100%" stopColor="#964800" />
            </linearGradient>

            {/* 3D Shirt Gradient */}
            <linearGradient id="dollShirtGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff9900" />
              <stop offset="50%" stopColor="#ffd180" />
              <stop offset="100%" stopColor="#ff8f00" />
            </linearGradient>

            {/* 3D Skin Gradient */}
            <radialGradient id="dollSkinGrad" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fff0db" />
              <stop offset="60%" stopColor="#f5d3ab" />
              <stop offset="100%" stopColor="#dca97c" />
            </radialGradient>

            {/* 3D Hair Gradient */}
            <radialGradient id="dollHairGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#4a3728" />
              <stop offset="50%" stopColor="#2c1f15" />
              <stop offset="100%" stopColor="#150e09" />
            </radialGradient>

            {/* Eye Laser Glow Filter */}
            <filter id="eyeLaserGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── 1. Doll Body & Dress (Static Base) ── */}
          <g className="doll-body-group">
            {/* Dress Main Triangle */}
            <path
              d="M50 110 Q80 92 110 110 L134 194 L26 194 Z"
              fill="url(#dollDressGrad)"
              filter="drop-shadow(0 4px 8px rgba(0,0,0,0.35))"
            />
            {/* Dress Center Seam / Fold */}
            <path d="M80 102 L80 194" stroke="#a75b00" strokeWidth="2.5" opacity="0.45" />

            {/* Arms / Shoulders */}
            <path d="M50 110 Q32 135 30 160 Q40 162 48 145 Z" fill="#f29100" />
            <path d="M110 110 Q128 135 130 160 Q120 162 112 145 Z" fill="#d97d00" />

            {/* Inner Collar / Neck */}
            <rect x="71" y="98" width="18" height="15" rx="3" fill="url(#dollSkinGrad)" />
            <path d="M68 112 Q80 120 92 112" fill="none" stroke="#e65100" strokeWidth="2" />
          </g>

          {/* ── 2. Doll Head Group (Rotates 3D in CSS) ── */}
          <g className="doll-head-group">
            {/* Base Head Circle */}
            <circle cx="80" cy="62" r="38" fill="url(#dollSkinGrad)" />

            {/* Hair Buns (Left & Right) */}
            <circle cx="34" cy="62" r="14" fill="url(#dollHairGrad)" />
            <circle cx="126" cy="62" r="14" fill="url(#dollHairGrad)" />
            <circle cx="34" cy="62" r="15" fill="none" stroke="#21150c" strokeWidth="2" opacity="0.3" />
            <circle cx="126" cy="62" r="15" fill="none" stroke="#21150c" strokeWidth="2" opacity="0.3" />

            {/* Hair Accessories (Red Ribbons) */}
            <rect x="42" y="60" width="4" height="8" rx="2" fill="#ff2d55" />
            <rect x="114" y="60" width="4" height="8" rx="2" fill="#ff2d55" />

            {/* ── BACK OF HEAD (Shown during Green Light) ── */}
            <g className="doll-face-back">
              <path
                d="M40 54 Q80 10 120 54 L120 44 Q80 4 40 44 Z"
                fill="url(#dollHairGrad)"
              />
              <path
                d="M42 50 Q80 20 118 50 L118 78 Q80 96 42 78 Z"
                fill="url(#dollHairGrad)"
              />
              {/* Back Hairline parting detail */}
              <path d="M80 22 L80 68" stroke="#150e09" strokeWidth="2" opacity="0.6" />
              <circle cx="80" cy="38" r="11" fill="#1e140d" opacity="0.4" />
            </g>

            {/* ── FRONT OF HEAD (Shown during Red Light) ── */}
            <g className="doll-face-front">
              {/* Front Bangs */}
              <path
                d="M42 50 Q80 18 118 50 L118 40 Q80 12 42 40 Z"
                fill="url(#dollHairGrad)"
              />
              <path
                d="M42 50 Q80 34 118 50 L114 36 Q80 20 46 36 Z"
                fill="url(#dollHairGrad)"
              />

              {/* Eyebrows */}
              <path d="M56 49 Q65 47 72 50" stroke="#3b2615" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M88 50 Q95 47 104 49" stroke="#3b2615" strokeWidth="2" fill="none" strokeLinecap="round" />

              {/* Glowing Ocular Eyes */}
              <circle className="doll-eye-l" cx="64" cy="62" r="6" fill="#ff1744" filter="url(#eyeLaserGlow)" />
              <circle className="doll-eye-r" cx="96" cy="62" r="6" fill="#ff1744" filter="url(#eyeLaserGlow)" />
              <circle cx="64" cy="62" r="2.5" fill="#ffffff" />
              <circle cx="96" cy="62" r="2.5" fill="#ffffff" />

              {/* Rosy Cheeks */}
              <circle cx="54" cy="72" r="7" fill="#ff5252" opacity="0.35" />
              <circle cx="106" cy="72" r="7" fill="#ff5252" opacity="0.35" />

              {/* Subtle Smile */}
              <path d="M72 80 Q80 87 88 80" stroke="#b75a36" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}


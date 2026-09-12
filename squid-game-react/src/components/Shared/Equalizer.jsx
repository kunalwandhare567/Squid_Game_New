import React from 'react';

export default function Equalizer({ frozen = false }) {
  return (
    <div className={`eq ${frozen ? 'eq-frozen' : ''}`} aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.07}s` }} />
      ))}
    </div>
  );
}

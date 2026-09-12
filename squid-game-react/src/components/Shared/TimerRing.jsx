import React, { useEffect, useRef, useState } from 'react';

const CIRCUMFERENCE = 2 * Math.PI * 44; // r=44

export default function TimerRing({ totalSeconds = 10 }) {
  const [secsLeft, setSecsLeft] = useState(totalSeconds);
  const startRef = useRef(Date.now());
  const rafRef   = useRef(null);

  useEffect(() => {
    startRef.current = Date.now();
    const tick = () => {
      const elapsed   = (Date.now() - startRef.current) / 1000;
      const remaining = Math.max(0, totalSeconds - elapsed);
      setSecsLeft(remaining);
      if (remaining > 0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [totalSeconds]);

  const fraction = secsLeft / totalSeconds;
  const offset   = CIRCUMFERENCE * (1 - fraction);
  const isBlinking = secsLeft <= 5 && secsLeft > 0;
  const color    = secsLeft > 5 ? '#57ffb0' : secsLeft > 2.5 ? '#f7b733' : '#ff2d78';

  return (
    <div className={`timer-wrap ${isBlinking ? 'timer-blinking' : ''}`}>
      <svg viewBox="0 0 100 100" width="86" height="86" aria-label={`${Math.ceil(secsLeft)} seconds remaining`}>
        <circle cx="50" cy="50" r="44" fill="none" stroke="#1a4a3a" strokeWidth="8"/>
        <circle
          cx="50" cy="50" r="44" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke 0.3s' }}
        />
      </svg>
      <div className="timer-num" style={{ color }}>{Math.ceil(secsLeft)}</div>
    </div>
  );
}

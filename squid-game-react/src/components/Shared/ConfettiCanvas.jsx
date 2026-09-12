import React, { useEffect, useRef } from 'react';

const COLORS = ['#ff2d78','#3aa0ff','#f7b733','#57d38c'];

export default function ConfettiCanvas({ active }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    if (!active) return;
    const c   = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    c.width   = window.innerWidth;
    c.height  = window.innerHeight;

    const ps = Array.from({ length: 160 }, () => ({
      x:   Math.random() * c.width,
      y:   -20 - Math.random() * c.height * 0.4,
      vx:  (Math.random() - 0.5) * 3.5,
      vy:  2 + Math.random() * 4.5,
      s:   5 + Math.random() * 8,
      col: COLORS[Math.floor(Math.random() * 4)],
      r:   Math.random() * 6,
      vr:  (Math.random() - 0.5) * 0.3,
    }));

    const t0 = Date.now();
    const frame = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach(p => {
        p.x  += p.vx; p.y += p.vy; p.vy += 0.04; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
        ctx.restore();
      });
      if (Date.now() - t0 < 4000) rafRef.current = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, c.width, c.height);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true" />;
}

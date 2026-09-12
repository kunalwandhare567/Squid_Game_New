import React, { useEffect, useRef } from 'react';
import { determineWinner, rankPlayers } from '../../utils/ruleEngine';
import ConfettiCanvas from '../Shared/ConfettiCanvas';
import { useAudio } from '../../context/AudioContext';

export default function HostPodium({ players, onRestart }) {
  const audio = useAudio();

  const allPlayers = rankPlayers(players);
  const winner = determineWinner(allPlayers) || allPlayers[0] || { name: 'Player', emoji: '👑', score: 0 };
  const top3   = allPlayers.slice(0, 3);
  const rest   = allPlayers.slice(3);

  useEffect(() => {
    if (winner && winner.name) {
      setTimeout(() => audio.say(`${winner.name} wins the game with ${winner.score || 0} points!`), 800);
    }
  }, []);

  return (
    <div className="podium-screen">
      <ConfettiCanvas active={true} />
      <div className="brand">IAE SQUID GAME</div>
      <h1 className="winner-title">{winner.emoji} {winner.name} wins!</h1>
      <ScoreCountUp target={winner.score || 0} />
      <p className="pts-label">points</p>

      <div className="podium-row">
        {top3[1] && <PodCard p={top3[1]} place="2nd" delay={0.15} />}
        {top3[0] && <PodCard p={top3[0]} place="1st 🏆" delay={0}   first />}
        {top3[2] && <PodCard p={top3[2]} place="3rd" delay={0.3}  />}
      </div>

      {rest.length > 0 && (
        <div className="lb-mini">
          {rest.map((p, i) => (
            <div key={p.id} className="lb-row">
              <span>#{i + 4}</span>
              <span>{p.emoji} {p.name}</span>
              <span>{p.score} pts</span>
            </div>
          ))}
        </div>
      )}

      <button className="cta" style={{ marginTop: '24px' }} onClick={onRestart}>
        🔄 Play Again
      </button>
    </div>
  );
}

function PodCard({ p, place, delay, first }) {
  return (
    <div className={`pod-card ${first ? 'pod-first' : ''}`} style={{ animationDelay: `${delay}s` }}>
      <span className="pod-em">{p.emoji}</span>
      <span className="pod-name">{p.name}</span>
      <span className="pod-score">{p.score} pts</span>
      <span className="pod-place">{place}</span>
    </div>
  );
}

function ScoreCountUp({ target }) {
  const ref  = useRef(null);
  useEffect(() => {
    if (!ref.current || !target) return;
    const dur = 1500, t0 = Date.now();
    const tick = () => {
      const k = Math.min(1, (Date.now() - t0) / dur);
      ref.current.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString();
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <div ref={ref} className="big-score">0</div>;
}

import React, { useEffect, useRef, useState } from 'react';
import { determineWinner, rankPlayers, ROUNDS } from '../../utils/ruleEngine';
import ConfettiCanvas from '../Shared/ConfettiCanvas';
import { useAudio } from '../../context/AudioContext';
import { Trophy, Crown, Award, RotateCcw, Home, Shield, Skull, Sparkles, Share2, Users, Flame, CheckCircle, Zap } from 'lucide-react';

export default function HostPodium({ players, onRestart }) {
  const audio = useAudio();
  const [copied, setCopied] = useState(false);

  // Dynamic ranking from authoritative rule engine (No hardcoding)
  const allPlayers = rankPlayers(players);
  const winner = determineWinner(allPlayers) || allPlayers[0] || { name: 'Champion', emoji: '👑', score: 0, alive: true };
  
  const survivors = allPlayers.filter(p => p.alive && !p.spectator);
  const eliminated = allPlayers.filter(p => !p.alive && !p.spectator);

  // Top 3 for 3D podium blocks
  const first  = allPlayers[0] || null;
  const second = allPlayers[1] || null;
  const third  = allPlayers[2] || null;

  useEffect(() => {
    if (winner && winner.name) {
      setTimeout(() => {
        audio.sfxWin();
        audio.say(`${winner.name} wins the Squid Game with ${winner.score || 0} points!`);
      }, 600);
    }
  }, [winner]);

  const handleShare = () => {
    try {
      const shareText = `🏆 I survived the IAE Squid Game Arena! Winner: ${winner.name} with ${winner.score} pts!`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {}
  };

  return (
    <div className="finale-arena-screen">
      <ConfettiCanvas active={true} />

      {/* Floating Geometric Ambient Symbols ○ △ □ */}
      <div className="geo-bg-shapes" aria-hidden="true">
        <span className="geo-shape geo-circle">○</span>
        <span className="geo-shape geo-triangle">△</span>
        <span className="geo-shape geo-square">□</span>
        <span className="geo-shape geo-circle-2">○</span>
        <span className="geo-shape geo-triangle-2">△</span>
        <span className="geo-shape geo-square-2">□</span>
      </div>

      {/* 1. TOP HEADER */}
      <header className="finale-header">
        <div className="finale-brand-wrap">
          <div className="finale-geo-badge">
            <span className="geo-icon pink">○</span>
            <span className="geo-icon blue">△</span>
            <span className="geo-icon green">□</span>
          </div>
          <div className="finale-brand-text">
            <span className="brand-title">IAE SQUID GAME</span>
            <span className="brand-sub">TCS TECHNOLOGY EXPO · SURVIVOR FINALE</span>
          </div>
        </div>
      </header>

      {/* 2. VICTORY HERO SECTION */}
      <section className="victory-hero-section">
        <div className="hero-status-pill animate-fade-in-down">
          <Sparkles size={16} className="hero-sparkle" />
          <span>PLAYER WINS</span>
          <Sparkles size={16} className="hero-sparkle" />
        </div>

        <h1 className="hero-survived-title animate-zoom-in">
          {winner.alive ? 'YOU SURVIVED' : 'GAME FINISHED'}
        </h1>

        <div className="hero-winner-avatar-wrap animate-pop-in">
          <div className="crown-badge">
            <Crown size={32} color="#ffd257" />
          </div>
          <div className="winner-avatar-disc">
            <span className="winner-em">{winner.emoji || '👑'}</span>
          </div>
          <div className="avatar-gold-halo" />
        </div>

        <h2 className="hero-winner-name animate-fade-in">
          {winner.name || 'CHAMPION'}
        </h2>

        <div className="hero-score-block animate-fade-in-up">
          <ScoreCountUp target={winner.score || 0} />
          <span className="hero-pts-label">POINTS</span>
        </div>
      </section>

      {/* 3. 3D WINNER PODIUM (TOP 3 PLAYERS) */}
      <section className="podium-section">
        <div className="podium-stage-container">
          {/* 2ND PLACE PODIUM BLOCK (LEFT) */}
          {second && (
            <div className="podium-column col-second">
              <div className="pod-player-card">
                <span className="pod-medal-pill medal-silver">🥈 #2 SILVER</span>
                <div className="pod-avatar-ring silver-ring">
                  <span className="pod-avatar">{second.emoji}</span>
                </div>
                <div className="pod-p-name">{second.name}</div>
                <div className="pod-p-score">{second.score} PTS</div>
                <span className={`pod-p-status ${second.alive ? 'status-safe' : 'status-elim'}`}>
                  {second.alive ? '✓ SURVIVED' : '✕ ELIMINATED'}
                </span>
              </div>
              <div className="podium-block block-silver">
                <div className="podium-number">2</div>
                <div className="podium-plinth-top" />
              </div>
            </div>
          )}

          {/* 1ST PLACE PODIUM BLOCK (CENTER - TALLEST) */}
          {first && (
            <div className="podium-column col-first">
              <div className="pod-player-card card-champion">
                <div className="trophy-crest">
                  <Trophy size={26} color="#ffd257" />
                </div>
                <span className="pod-medal-pill medal-gold">🥇 #1 CHAMPION</span>
                <div className="pod-avatar-ring gold-ring">
                  <span className="pod-avatar gold-avatar">{first.emoji}</span>
                </div>
                <div className="pod-p-name champion-name">{first.name}</div>
                <div className="pod-p-score champion-score">{first.score} PTS</div>
                <span className="pod-p-status status-champion">
                  {first.alive ? '👑 YOU SURVIVED' : '🏆 TOP SCORER'}
                </span>
              </div>
              <div className="podium-block block-gold">
                <div className="podium-number num-gold">1</div>
                <div className="podium-plinth-top" />
              </div>
            </div>
          )}

          {/* 3RD PLACE PODIUM BLOCK (RIGHT) */}
          {third && (
            <div className="podium-column col-third">
              <div className="pod-player-card">
                <span className="pod-medal-pill medal-bronze">🥉 #3 BRONZE</span>
                <div className="pod-avatar-ring bronze-ring">
                  <span className="pod-avatar">{third.emoji}</span>
                </div>
                <div className="pod-p-name">{third.name}</div>
                <div className="pod-p-score">{third.score} PTS</div>
                <span className={`pod-p-status ${third.alive ? 'status-safe' : 'status-elim'}`}>
                  {third.alive ? '✓ SURVIVED' : '✕ ELIMINATED'}
                </span>
              </div>
              <div className="podium-block block-bronze">
                <div className="podium-number">3</div>
                <div className="podium-plinth-top" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. PERFORMANCE SUMMARY STATS BAR */}
      <section className="stats-summary-bar">
        <div className="summary-stat-card">
          <Users size={18} color="#3aa0ff" />
          <div className="stat-info">
            <span className="stat-label">TOTAL PLAYERS</span>
            <strong className="stat-value">{allPlayers.length}</strong>
          </div>
        </div>

        <div className="summary-stat-card">
          <CheckCircle size={18} color="#57ffb0" />
          <div className="stat-info">
            <span className="stat-label">SURVIVORS</span>
            <strong className="stat-value stat-green">{survivors.length}</strong>
          </div>
        </div>

        <div className="summary-stat-card">
          <Skull size={18} color="#ff2d78" />
          <div className="stat-info">
            <span className="stat-label">ELIMINATED</span>
            <strong className="stat-value stat-red">{eliminated.length}</strong>
          </div>
        </div>

        <div className="summary-stat-card">
          <Zap size={18} color="#ffd257" />
          <div className="stat-info">
            <span className="stat-label">ROUNDS COMPLETED</span>
            <strong className="stat-value">{ROUNDS} / {ROUNDS}</strong>
          </div>
        </div>
      </section>

      {/* 5. FINAL SURVIVORS LEADERBOARD PANEL */}
      <section className="leaderboard-panel-wrap">
        <div className="glass-leaderboard-card">
          <div className="lb-header-row">
            <div className="lb-title-group">
              <Award size={22} color="#ffd257" />
              <h3 className="lb-heading">FINAL SURVIVORS</h3>
            </div>
            <span className="lb-count-pill">{allPlayers.length} Players Ranked</span>
          </div>

          <div className="lb-table-wrapper">
            <table className="lb-custom-table">
              <thead>
                <tr>
                  <th className="th-rank">RANK</th>
                  <th className="th-player">PLAYER</th>
                  <th className="th-points">POINTS</th>
                  <th className="th-status">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {allPlayers.map((p, idx) => {
                  const rankNum = idx + 1;
                  const isTop1  = rankNum === 1;
                  const isTop2  = rankNum === 2;
                  const isTop3  = rankNum === 3;
                  const strikes = p.consecutiveWrong ?? p.consecutive_wrong ?? 0;

                  return (
                    <tr
                      key={p.id || idx}
                      className={`lb-tr ${isTop1 ? 'tr-winner' : ''} ${!p.alive ? 'tr-dead' : ''}`}
                    >
                      <td className="td-rank">
                        {isTop1 ? (
                          <span className="rank-badge r-gold">🥇 1</span>
                        ) : isTop2 ? (
                          <span className="rank-badge r-silver">🥈 2</span>
                        ) : isTop3 ? (
                          <span className="rank-badge r-bronze">🥉 3</span>
                        ) : (
                          <span className="rank-badge r-norm">{rankNum}</span>
                        )}
                      </td>

                      <td className="td-player">
                        <div className="p-cell-wrap">
                          <span className="p-cell-em">{p.emoji}</span>
                          <span className="p-cell-name">{p.name}</span>
                          {p.bot && <span className="bot-tag">BOT</span>}
                          {isTop1 && <span className="you-tag">WINNER</span>}
                        </div>
                      </td>

                      <td className="td-points">
                        <span className="p-pts-badge">{p.score || 0} pts</span>
                      </td>

                      <td className="td-status">
                        {p.alive ? (
                          <span className="status-badge-safe">
                            <span className="dot-green" />
                            SURVIVED
                          </span>
                        ) : strikes === 1 ? (
                          <span className="status-badge-warn">
                            <span className="dot-warn" />
                            1 STRIKE
                          </span>
                        ) : (
                          <span className="status-badge-elim">
                            <span className="dot-red" />
                            ELIMINATED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. SHARE / EXPO SHOWCASE CARD */}
      <section className="expo-share-container">
        <div className="expo-share-card">
          <div className="share-icon-wrap">
            <Share2 size={20} color="#57ffb0" />
          </div>
          <div className="share-text-wrap">
            <div className="share-title">SHARE YOUR SURVIVAL SCORE</div>
            <p className="share-quote">"I SURVIVED THE IAE SQUID GAME"</p>
          </div>
          <button className="share-btn" onClick={handleShare}>
            {copied ? '✓ COPIED RESULT!' : 'COPY RESULT'}
          </button>
        </div>
      </section>

      {/* 7. ACTION BUTTONS (BOTTOM CENTER) */}
      <footer className="finale-actions-footer">
        <button className="btn-play-again" onClick={onRestart}>
          <RotateCcw size={20} className="btn-icon" />
          <span>↻ PLAY AGAIN</span>
        </button>

        <button className="btn-back-lobby" onClick={onRestart}>
          <Home size={18} className="btn-icon" />
          <span>⌂ BACK TO LOBBY</span>
        </button>
      </footer>
    </div>
  );
}

// ── Smooth Score Count-Up with Easing ──────────────────────────────────
function ScoreCountUp({ target }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (target == null) return;
    const dur = 1600;
    const t0  = Date.now();
    let frameId;

    const tick = () => {
      const elapsed = Date.now() - t0;
      const progress = Math.min(1, elapsed / dur);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(target * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setVal(target);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target]);

  return <div className="hero-animated-score">{val.toLocaleString()}</div>;
}

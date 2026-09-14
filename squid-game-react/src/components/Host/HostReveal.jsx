import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Award, Shield, Zap, Skull, CheckCircle2,
  ArrowRight, Flame, AlertTriangle, Sparkles, Brain, Radio,
  Clock, ShieldCheck, Check, Info, Users, Crown, X, ChevronRight,
  Volume2, VolumeX, Power
} from 'lucide-react';
import { rankPlayers, MAX_PLAYERS } from '../../utils/ruleEngine';

const LETTERS = ['A', 'B', 'C', 'D'];
const OPTION_KEYS = ['opt_A', 'opt_B', 'opt_C', 'opt_D'];
const LANE_COLORS = ['#ffd257', '#38bdf8', '#fb923c', '#f43f5e', '#34d399'];

// Minimal SVG Animated Runner Silhouette
function RunnerIcon({ color = '#ffd257', size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="runner-svg-anim">
      {/* Head */}
      <circle cx="15" cy="5" r="2.5" fill={color} />
      {/* Torso */}
      <path d="M13.5 7.5L11 12.5L14 14" />
      {/* Arms */}
      <path d="M9.5 9.5L13.5 7.5L17 9" />
      {/* Legs running */}
      <path d="M11 12.5L8 16L5.5 15.5" />
      <path d="M14 14L16 18.5L19 19.5" />
    </svg>
  );
}

export default function HostReveal({
  results = {},
  eliminations = [],
  survivors = [],
  players = {},
  question = {},
  answers = {},
  roundNum = 1,
  totalRounds = 10,
  roomCode,
  onNext,
  onToggleMute,
  isMuted,
  onExit
}) {
  const [showAllModal, setShowAllModal] = useState(false);
  const [animated, setAnimated] = useState(false);

  // Trigger smooth step-by-step runner run animation from previous round position
  useEffect(() => {
    setAnimated(false);
    const timer = setTimeout(() => {
      setAnimated(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [roundNum]);

  // Canonical ranked list of all active/eliminated players (strictly sorted by latest score)
  const rankedList = useMemo(() => {
    const merged = { ...(players || {}) };
    (survivors || []).forEach(p => {
      merged[p.id] = { ...merged[p.id], ...p };
    });
    (eliminations || []).forEach(p => {
      merged[p.id] = { ...merged[p.id], ...p };
    });
    return rankPlayers(merged);
  }, [players, survivors, eliminations]);

  // Derived Survivors and Eliminated lists sorted by rank/score
  const safeSurvivors = useMemo(() => {
    return rankedList.filter(p => p.alive && (p.consecutiveWrong ?? p.consecutive_wrong ?? 0) < 3);
  }, [rankedList]);

  const safeEliminations = useMemo(() => {
    return rankedList.filter(p => !p.alive || (p.consecutiveWrong ?? p.consecutive_wrong ?? 0) >= 3);
  }, [rankedList]);

  // Dynamic Top 5: Always takes the current top 5 players based on updated score
  const top5Players = useMemo(() => {
    if (safeSurvivors.length >= 5) return safeSurvivors.slice(0, 5);
    return rankedList.slice(0, 5);
  }, [safeSurvivors, rankedList]);

  const totalInGame = safeSurvivors.length + safeEliminations.length;
  const maxCapacity = MAX_PLAYERS || 15;

  const warningCount = safeSurvivors.filter(p => {
    const w = p.consecutiveWrong ?? p.consecutive_wrong ?? 0;
    return w > 0 && w < 3;
  }).length;

  const isLast = roundNum >= totalRounds || safeSurvivors.length <= 1;

  // Correct Option details
  const correctId = question?.correctId || 'opt_A';
  const correctIndex = OPTION_KEYS.indexOf(correctId);
  const correctLetter = correctIndex >= 0 ? LETTERS[correctIndex] : 'A';
  const correctText = question?.correctAnswer || (question?.options && question.options[correctId]) || 'Correct Answer';

  // 10 sections max track score: 10 rounds * 2 pts = 20 pts max
  const maxTrackScore = useMemo(() => Math.max(20, totalRounds * 2), [totalRounds]);

  // Map 0 to 20 pts cleanly into 10 visual sections (4% start -> 90% finish line)
  const calcProgress = useCallback((score) => {
    const s = Math.max(0, Number(score) || 0);
    const ratio = Math.min(1, s / maxTrackScore);
    return 4 + ratio * 86;
  }, [maxTrackScore]);

  return (
    <div className="host-reveal-arena">
      {/* Ambient background low-opacity glow */}
      <div className="host-reveal-bg-glow" aria-hidden="true">
        <span className="ambient-geo geo-circle">○</span>
        <span className="ambient-geo geo-triangle">△</span>
        <span className="ambient-geo geo-square">□</span>
      </div>

      <div className="host-reveal-dashboard">
        {/* ── 1. COMPACT TOP HEADER ── */}
        <header className="reveal-top-header">
          <div className="header-left-brand">
            <div className="traffic-light-pill">
              <span className="traffic-dot green-dot" />
              <span className="traffic-title">GREEN LIGHT</span>
              <span className="traffic-divider">—</span>
              <span className="traffic-title red-text">RED LIGHT</span>
            </div>
            <span className="header-tagline">THINK FAST • STAY IN • SURVIVE</span>
          </div>

          <div className="header-center-symbols">
            <div className="symbols-trio">
              <span className="sym pink">○</span>
              <span className="sym blue">△</span>
              <span className="sym green">□</span>
            </div>
            <span className="header-sub-quote">“ THE ARENA IS WATCHING ”</span>
          </div>

          <div className="header-right-meta">
            <span className="host-mode-badge">👑 HOST MODE</span>
            <div className="live-pulse-badge">
              <span className="live-dot" />
              <span>LIVE</span>
            </div>
            {onToggleMute && (
              <button className="icon-btn-host" onClick={onToggleMute} title="Sound">
                {isMuted ? <VolumeX size={15} color="#ff8a8a" /> : <Volume2 size={15} color="#57ffb0" />}
              </button>
            )}
            {onExit && (
              <button className="icon-btn-host" onClick={onExit} title="Exit">
                <Power size={15} color="#ff2d78" />
              </button>
            )}
          </div>
        </header>

        {/* ── 2. TOP INFORMATION ROW (3-ZONE HUD) ── */}
        <section className="reveal-top-hud">
          {/* ZONE 1: SURVIVAL STATUS */}
          <div className="hud-card survival-hud-card">
            <div className="hud-header">
              <div className="hud-title-wrap">
                <Users size={14} color="#57ffb0" />
                <span className="hud-title">SURVIVAL STATUS</span>
              </div>
            </div>

            <div className="survival-hero-metric">
              <div className="survival-counts">
                <span className="alive-big">{safeSurvivors.length}</span>
                <span className="alive-slash">/</span>
                <span className="alive-total">{totalInGame || maxCapacity}</span>
              </div>
              <span className="alive-label">PLAYERS REMAIN</span>
            </div>

            <div className="survival-bar-track">
              <div
                className="survival-bar-fill"
                style={{ width: `${Math.max(8, (safeSurvivors.length / (totalInGame || maxCapacity || 1)) * 100)}%` }}
              />
            </div>

            <div className="survival-stat-pills">
              <div className="stat-pill pill-survived">
                <span className="stat-dot dot-green" />
                <span className="stat-name">SURVIVED</span>
                <strong className="stat-val">{safeSurvivors.length}</strong>
              </div>
              <div className="stat-pill pill-warning">
                <span className="stat-dot dot-amber" />
                <span className="stat-name">STRIKE WARNING</span>
                <strong className="stat-val">{warningCount}</strong>
              </div>
              <div className="stat-pill pill-elim">
                <span className="stat-dot dot-red" />
                <span className="stat-name">ELIMINATED</span>
                <strong className="stat-val">{safeEliminations.length}</strong>
              </div>
            </div>
          </div>

          {/* ZONE 2: QUESTION REVEAL (CORRECT & PROOF ONLY) */}
          <div className="hud-card question-hud-card">
            <div className="hud-header">
              <div className="hud-title-wrap">
                <Brain size={14} color="#ffd257" />
                <span className="hud-title">QUESTION 0{roundNum} REVEAL</span>
              </div>
            </div>

            <h2 className="question-text-heading">{question?.text || 'Question text'}</h2>

            {/* Correct Answer & Explanation / Proof Banner */}
            <div className="explanation-proof-banner">
              <CheckCircle2 size={18} color="#57ffb0" className="proof-icon" />
              <div className="proof-details">
                <div className="proof-heading-row">
                  <span className="proof-lbl">CORRECT ANSWER:</span>
                  <div className="correct-option-highlight-pill">
                    <span className="opt-letter-tag">{correctLetter}</span>
                    <span className="opt-text-val">{correctText}</span>
                  </div>
                </div>
                {question?.why ? (
                  <p className="proof-text">
                    <strong className="proof-tag">EXPLANATION & PROOF:</strong> {question.why}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* ZONE 3: ROUND TRACKER */}
          <div className="hud-card round-hud-card">
            <div className="hud-header">
              <div className="hud-title-wrap">
                <Award size={14} color="#38bdf8" />
                <span className="hud-title">ROUND TRACKER</span>
              </div>
              <span className="round-count-badge">ROUND {roundNum} / {totalRounds}</span>
            </div>

            <div className="round-step-circles">
              {Array.from({ length: totalRounds }, (_, i) => {
                const step = i + 1;
                const isPast = step < roundNum;
                const isCurr = step === roundNum;
                return (
                  <div key={step} className="step-col">
                    <div className={`step-circle ${isPast ? 'circle-past' : isCurr ? 'circle-curr' : 'circle-future'}`}>
                      {isPast ? <Check size={12} strokeWidth={3} /> : step}
                    </div>
                    <span className="step-sub-num">{step}</span>
                  </div>
                );
              })}
            </div>

            <div className="tracker-bottom-quote">
              <p>“ Every answer moves you closer to the finish line. ”</p>
            </div>
          </div>
        </section>

        {/* ── 3. MAIN GAME AREA (LEFT: SURVIVORS & ELIMINATED STACK | RIGHT: EXPANDED RACE TRACK) ── */}
        <section className="reveal-main-arena">
          {/* LEFT COLUMN: SURVIVOR PLAYERS (TOP) & ELIMINATED PLAYERS (BOTTOM) */}
          <div className="reveal-left-players-column">
            {/* 1. SURVIVOR PLAYERS CARD */}
            <div className="arena-panel survivors-arena-panel">
              <div className="panel-top-bar">
                <div className="panel-title-group">
                  <Shield size={15} color="#57ffb0" />
                  <h3>SURVIVOR PLAYERS</h3>
                </div>
                <span className="panel-tag-green">Active ({safeSurvivors.length})</span>
              </div>

              <div className="survivor-table-header">
                <span className="surv-th-rank">#</span>
                <span className="surv-th-player">PLAYER</span>
                <span className="surv-th-score">SCORE</span>
                <span className="surv-th-status">STATUS</span>
              </div>

              <div className="survivor-rows-container">
                {safeSurvivors.length === 0 ? (
                  <div className="surv-empty-msg">No active survivors remain.</div>
                ) : (
                  safeSurvivors.map((p, idx) => {
                    const rankNum = idx + 1;
                    const res = results?.[p.id];
                    const ptsDelta = res?.points ?? (res?.correct ? 2 : 0);
                    const strikes = p.consecutiveWrong ?? p.consecutive_wrong ?? 0;
                    const isTop1 = rankNum === 1;
                    const isTop2 = rankNum === 2;
                    const isTop3 = rankNum === 3;
                    const speedMs = res?.speedMs ?? p.lastSpeedMs;
                    const speedTxt = (speedMs != null && !isNaN(speedMs)) ? `${(speedMs / 1000).toFixed(1)}s` : '--';
                    const avgSpeedMs = res?.avgSpeedMs ?? p.avgSpeedMs;
                    const avgSpeedTxt = (avgSpeedMs != null && !isNaN(avgSpeedMs)) ? `${(avgSpeedMs / 1000).toFixed(1)}s` : '--';

                    return (
                      <div
                        key={p.id}
                        className={`survivor-player-card ${isTop1 ? 'card-gold' : isTop2 ? 'card-silver' : isTop3 ? 'card-bronze' : ''}`}
                      >
                        <div className="surv-rank-num">
                          {isTop1 ? <Crown size={13} color="#ffd257" /> : rankNum}
                        </div>
                        <span className="surv-player-avatar">{p.emoji || '👤'}</span>
                        <div className="surv-player-name-wrap">
                          <span className="surv-player-name" title={p.name}>{p.name}</span>
                          {p.bot && <span className="lb-bot-badge">BOT</span>}
                        </div>
                        <div className="surv-player-score-col">
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span className="surv-score-val">{p.score || 0} pts</span>
                            <span className={`surv-delta-txt ${ptsDelta > 0 ? 'txt-plus' : 'txt-zero'}`}>
                              {ptsDelta > 0 ? `+${ptsDelta}` : '+0'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#38bdf8', fontWeight: 600, marginTop: '2px' }}>
                            <span>⚡ {speedTxt}</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                            <span style={{ color: '#94a3b8', fontSize: '10px' }}>avg {avgSpeedTxt}</span>
                          </div>
                        </div>
                        <div className="surv-status-col">
                          {strikes >= 2 ? (
                            <span className="status-pill-warn">⚠ 2 STRIKES</span>
                          ) : strikes === 1 ? (
                            <span className="status-pill-warn">⚠ 1 STRIKE</span>
                          ) : (
                            <span className="status-pill-safe">SAFE</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. ELIMINATED PLAYERS CARD */}
            <div className="arena-panel elim-arena-panel">
              <div className="panel-top-bar">
                <div className="panel-title-group">
                  <Skull size={15} color="#ff2d78" />
                  <h3>ELIMINATED PLAYERS</h3>
                </div>
                <span className="panel-tag-red">Fallen ({safeEliminations.length})</span>
              </div>

              {safeEliminations.length === 0 ? (
                <div className="elim-peace-arena-card">
                  <div className="peace-glow-icon">
                    <ShieldCheck size={28} color="#57ffb0" />
                  </div>
                  <h4 className="peace-card-title">🎉 ALL PLAYERS SURVIVED</h4>
                  <p className="peace-card-desc">
                    No eliminations this round. Entire squad lives to fight in Round {roundNum + 1}!
                  </p>
                  <span className="peace-mercy-pill">100% SURVIVAL</span>
                </div>
              ) : (
                <>
                  <div className="elim-table-header">
                    <span className="elim-th-rank">#</span>
                    <span className="elim-th-player">FALLEN PLAYER</span>
                    <span className="elim-th-ans">ANS</span>
                    <span className="elim-th-score">SCORE</span>
                    <span className="elim-th-status">STATUS</span>
                  </div>

                  <div className="elim-rows-scroll">
                    {safeEliminations.map((p, idx) => {
                      const ans = answers?.[p.id];
                      const ansLetter = ans?.choiceId ? LETTERS[OPTION_KEYS.indexOf(ans.choiceId)] || '—' : '—';

                      return (
                        <div key={p.id} className="elim-player-row-card">
                          <span className="elim-col-rank">{idx + 1}</span>
                          <span className="elim-avatar">{p.emoji || '👤'}</span>
                          <div className="elim-name-wrap">
                            <span className="elim-name" title={p.name}>{p.name}</span>
                            {p.bot && <span className="lb-bot-badge">BOT</span>}
                          </div>
                          <span className="elim-col-ans ans-mismatch">{ansLetter}</span>
                          <span className="elim-col-score">{p.score || 0} pts</span>
                          <div className="elim-col-status">
                            <span className="status-pill-elim">💀 OUT</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: SURVIVAL SPRINT (EXPANDED HERO ARENA) */}
          <div className="arena-panel track-arena-panel">
            <div className="panel-top-bar">
              <div className="panel-title-group">
                <Zap size={15} color="#ffd257" />
                <div className="track-title-texts">
                  <h3>SURVIVAL SPRINT</h3>
                  <span className="track-sub-text">Top 5 Players</span>
                </div>
              </div>
              <span className="track-score-hint">POINTS DRIVE ADVANCE &gt;&gt;</span>
            </div>

            <div className="track-stage-surface">
              {/* 5 Race Lanes */}
              <div className="track-lanes-box">
                {top5Players.map((p, idx) => {
                  const rankNum = idx + 1;
                  const rankSuffix = rankNum === 1 ? 'st' : rankNum === 2 ? 'nd' : rankNum === 3 ? 'rd' : 'th';
                  const color = LANE_COLORS[idx % LANE_COLORS.length];

                  // Calculate current score vs previous round score
                  const res = results?.[p.id];
                  const ptsDelta = res?.points ?? (res?.correct ? 2 : 0);
                  const currentScore = Number(p.score || 0);
                  const prevScore = Math.max(0, currentScore - ptsDelta);

                  const prevProgress = calcProgress(prevScore);
                  const currentProgress = calcProgress(currentScore);
                  const activeProgress = animated ? currentProgress : prevProgress;
                  const displayScore = animated ? currentScore : prevScore;

                  return (
                    <div key={p.id} className="race-lane-item" style={{ '--lane-theme': color }}>
                      {/* Left Lane Ordinal Rank Indicator (1st, 2nd, 3rd, 4th, 5th) */}
                      <div className="lane-rank-indicator" style={{ borderColor: color, color }}>
                        <span className="lane-rank-num">{rankNum}</span>
                        <span className="lane-rank-suffix">{rankSuffix}</span>
                      </div>

                      {/* Race Track Line & Moving Runner with Floating Name and Score */}
                      <div className="lane-track-strip">
                        <div className="track-base-line" />

                        {/* 10 Step Distance Markers (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20 pts) */}
                        <div className="track-step-markers" aria-hidden="true">
                          {Array.from({ length: 10 }, (_, s) => {
                            const stepScore = (s + 1) * 2;
                            const stepPct = calcProgress(stepScore);
                            return (
                              <div key={s} className="track-step-notch" style={{ left: `${stepPct}%` }}>
                                <span className="notch-tick" />
                              </div>
                            );
                          })}
                        </div>

                        {/* Fill line advancing smoothly */}
                        <div className="track-fill-line" style={{ width: `${activeProgress}%`, backgroundColor: color }} />

                        {/* Animated Runner running from previous score to updated score position */}
                        <div className="runner-vehicle" style={{ left: `${activeProgress}%` }}>
                          {/* 1. Movable Player Name Tag on TOP */}
                          <div className="runner-floating-name-tag" style={{ borderColor: color, boxShadow: `0 0 10px ${color}35` }}>
                            <span className="runner-tag-avatar">{p.emoji || '👤'}</span>
                            <span className="runner-tag-name" title={p.name}>{p.name}</span>
                          </div>

                          {/* 2. Runner Silhouette Icon */}
                          <RunnerIcon color={color} size={28} />

                          {/* 3. Movable Score Tag on BOTTOM */}
                          <div className="runner-score-badge" style={{ borderColor: color, color }}>
                            {displayScore} pts
                          </div>

                          {/* 4. Animated Delta Chip (+2 green / -2 red) */}
                          {animated && ptsDelta !== 0 && (
                            <span className={`runner-delta-badge ${ptsDelta > 0 ? 'delta-gain' : 'delta-loss'}`}>
                              {ptsDelta > 0 ? `+${ptsDelta}` : ptsDelta}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Glowing Finish Gate */}
              <div className="track-finish-gate">
                <div className="finish-neon-sign">FINISH</div>
                <div className="finish-checkered-strip" />
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. BOTTOM STATUS STRIP (SUMMARY & ACTION BUTTON) ── */}
        <footer className="reveal-bottom-strip">
          {/* Left: Quick Survivor & Elim Summary */}
          <div className="eliminated-status-zone">
            <span className="strip-summary-pill surv-pill">
              <Shield size={13} color="#57ffb0" />
              <span>{safeSurvivors.length} SURVIVED</span>
            </span>
            <span className="strip-summary-pill elim-pill">
              <Skull size={13} color="#ff2d78" />
              <span>{safeEliminations.length} ELIMINATED</span>
            </span>
          </div>

          {/* Center: Quote */}
          <div className="strip-center-quote">
            <span>“ One wrong move, and you're out. ”</span>
          </div>

          {/* Right: Next Round Action */}
          <div className="strip-cta-zone">
            <button className="btn-continue-round" onClick={onNext}>
              {isLast ? (
                <>
                  <Award size={16} />
                  <span>🏆 CROWN CHAMPION PODIUM →</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>GAME CONTINUES (ROUND {roundNum + 1} / {totalRounds}) →</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

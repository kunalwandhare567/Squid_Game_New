import React, { useMemo } from 'react';
import {
  Award, Shield, Zap, Skull, CheckCircle2, HelpCircle,
  ArrowRight, Flame, AlertTriangle, Sparkles, Brain, Radio,
  Clock, ShieldCheck, Check, Info, Users
} from 'lucide-react';
import { REVIVE_AFTER_ROUND, MAX_PLAYERS } from '../../utils/ruleEngine';

const COLORS  = ['#ff2d78','#3aa0ff','#f7b733','#57d38c'];
const LETTERS = ['A','B','C','D'];

const ROUND_QUOTES = {
  1: 'ONE ROUND DOWN. SIX TO SURVIVE.',
  2: 'THE ARENA HAS SPOKEN. WHO IS IN DANGER?',
  3: 'SURVIVAL IS EARNED, NOT GIVEN.',
  4: 'PRESSURE RISES. EVERY SECOND COUNTS.',
  5: 'CHAMPIONS ARE FORGED IN THE CRUCIBLE.',
  6: 'PENULTIMATE ROUND. NO ROOM FOR ERROR.',
  7: 'THE FINAL MOMENT. CROWN THE CHAMPION.',
};

export default function HostReveal({ results, eliminations, survivors, question, answers, roundNum, totalRounds, onNext }) {
  const isLast = roundNum >= totalRounds || survivors.length <= 1;
  const isRevivalComing = roundNum === REVIVE_AFTER_ROUND && eliminations.length > 0;

  const correctId = question?.correctId || 'opt_A';
  const correctIndex = ['opt_A', 'opt_B', 'opt_C', 'opt_D'].indexOf(correctId);
  const correctLetter = correctIndex >= 0 ? LETTERS[correctIndex] : 'A';
  const correctColor  = correctIndex >= 0 ? COLORS[correctIndex] : '#57ffb0';
  const warningCount = survivors.filter(p => {
    const w = p.consecutiveWrong ?? p.consecutive_wrong ?? 0;
    return w > 0 && w < 3;
  }).length;
  const totalInGame  = survivors.length + eliminations.length;
  const maxCapacity  = MAX_PLAYERS || 15;

  // Calculate round statistics
  const shieldsUsed = Object.values(results || {}).filter(r => r?.shieldSaved || r?.shieldActive).length;
  const ddUsedCount = Object.values(results || {}).filter(r => r?.ddUsed).length;

  const quoteText = eliminations.length === 0
    ? '“ The arena showed mercy... this time. ”'
    : `“ ${ROUND_QUOTES[roundNum] || 'ONE ANSWER CAN CHANGE YOUR FATE.'} ”`;

  return (
    <div className="host-verdict-dashboard">
      {/* ── Geometric Floating Ambient Shapes ○ △ □ ─────────────────── */}
      <div className="verdict-geo-ambient" aria-hidden="true">
        <span className="geo-v-shape gv-1">○</span>
        <span className="geo-v-shape gv-2">△</span>
        <span className="geo-v-shape gv-3">□</span>
        <span className="geo-v-shape gv-4">○</span>
        <span className="geo-v-shape gv-5">△</span>
      </div>


      {/* ── 2. Main Hero Verdict Banner ─────────────────────────────── */}
      <section className="verdict-hero-banner">
        <div className="hero-round-badge">
          <Radio size={14} className="radar-pulse" />
          <span>ROUND {String(roundNum).padStart(2, '0')} / {String(totalRounds).padStart(2, '0')} COMPLETE</span>
        </div>

        <h1 className="hero-verdict-title">THE ARENA HAS SPOKEN</h1>
        <p className="hero-verdict-quote">{quoteText}</p>
      </section>

      {/* ── 3. Top Deck: 2-Zone HUD (Survival Status & Question Reveal) */}
      <div className="verdict-top-triptych">
        {/* LEFT ZONE: SURVIVAL STATUS HUD */}
        <div className="v-hud-card status-hud-card">
          <div className="hud-header-line">
            <Users size={16} color="#57ffb0" />
            <span className="hud-title">SURVIVAL STATUS</span>
          </div>

          <div className="survival-big-metric">
            <div className="metric-number-row">
              <span className="num-survivors">{survivors.length}</span>
              <span className="num-slash">/</span>
              <span className="num-total">{totalInGame || maxCapacity}</span>
            </div>
            <span className="metric-caption">PLAYERS REMAIN</span>
          </div>

          {/* Survival Progress Meter */}
          <div className="survival-meter-track">
            <div
              className="survival-meter-fill"
              style={{ width: `${Math.max(10, (survivors.length / (totalInGame || maxCapacity)) * 100)}%` }}
            />
          </div>

          {/* Status Breakdown Pills */}
          <div className="status-breakdown-list">
            <div className="status-stat-row stat-safe-row">
              <div className="dot-with-label">
                <span className="stat-indicator-dot dot-green" />
                <span>SURVIVED</span>
              </div>
              <strong className="stat-count-green">{survivors.length}</strong>
            </div>

            <div className="status-stat-row stat-warn-row">
              <div className="dot-with-label">
                <span className="stat-indicator-dot dot-amber" />
                <span>1-STRIKE WARNING</span>
              </div>
              <strong className="stat-count-amber">{warningCount}</strong>
            </div>

            <div className="status-stat-row stat-elim-row">
              <div className="dot-with-label">
                <span className="stat-indicator-dot dot-red" />
                <span>ELIMINATED</span>
              </div>
              <strong className="stat-count-red">{eliminations.length}</strong>
            </div>
          </div>
        </div>

        {/* MAIN ZONE: QUESTION + VERIFIED ANSWER REVEAL */}
        <div className="v-hud-card question-reveal-card">
          <div className="hud-header-line">
            <Brain size={16} color="#ffd257" />
            <span className="hud-title">QUESTION 0{roundNum} REVEAL</span>
            <span className="q-category-tag">{question?.category?.toUpperCase() || 'TRIVIA'}</span>
          </div>

          <h2 className="reveal-q-text">{question?.text}</h2>

          {/* Correct Answer Card */}
          <div className="reveal-correct-answer-card" style={{ borderColor: correctColor }}>
            <div className="correct-badge-disc" style={{ background: correctColor }}>
              {correctLetter}
            </div>
            <div className="correct-info-wrap">
              <span className="correct-label-sub" style={{ color: correctColor }}>
                ✓ VERIFIED CORRECT ANSWER
              </span>
              <strong className="correct-text-val">{correctText}</strong>
            </div>
            <div className="correct-check-icon">
              <Check size={28} color={correctColor} strokeWidth={3} />
            </div>
          </div>

          {/* Explanation & Proof Box */}
          {question?.why && (
            <div className="reveal-proof-card">
              <div className="proof-icon-wrap">
                <Info size={16} color="#3aa0ff" />
              </div>
              <div className="proof-body">
                <strong>EXPLANATION & PROOF:</strong>
                <p>{question.why}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Lower Deck: Survivors vs Eliminated Split Panels ───────── */}
      <div className="verdict-results-split">
        {/* SURVIVORS PANEL */}
        <div className="results-column-card survivors-card">
          <div className="col-header-bar">
            <div className="col-title-group">
              <span className="col-dot green" />
              <h3>SURVIVORS ({survivors.length})</h3>
            </div>
            <span className="col-sub-badge">SAFE FOR NEXT ROUND</span>
          </div>

          {survivors.length === 0 ? (
            <div className="empty-state-notice">
              <Skull size={32} color="#ff2d78" />
              <p>No survivors remaining in the main arena</p>
            </div>
          ) : (
            <div className="player-result-scroll-list">
              {survivors.map((p, i) => {
                const r = results?.[p.id];
                const rp = r?.points ?? 0;
                const strikes = p.consecutiveWrong || p.consecutive_wrong || 0;

                return (
                  <div
                    key={p.id}
                    className={`player-result-row ${r?.correct ? 'row-is-correct' : 'row-is-wrong'} ${strikes === 1 ? 'row-has-warning' : ''}`}
                  >
                    <span className="player-rank-chip">#{i + 1}</span>
                    <span className="player-emoji-chip">{p.emoji || '👤'}</span>

                    <div className="player-name-wrap">
                      <span className="player-name-txt">{p.name}</span>
                      <div className="powerup-tag-row">
                        {p.bot && <span className="tag-bot-pill">BOT</span>}
                        {r?.shieldSaved && <span className="tag-shield-saved">🛡 Saved</span>}
                        {r?.ddUsed && <span className="tag-dd-used">✕2 DD</span>}
                      </div>
                    </div>

                    <div className="player-time-cell">
                      <Clock size={12} color="#7fa295" />
                      <span>{r?.speedMs != null ? `${(r.speedMs / 1000).toFixed(2)}s` : '—'}</span>
                    </div>

                    <div className="player-score-cell">
                      <span className="score-delta">{rp > 0 ? `+${rp}` : rp} PTS</span>
                      <span className="score-total">{p.score} pts</span>
                    </div>

                    <div className="player-verdict-tag-cell">
                      {strikes === 2 ? (
                        <span className="badge-warning-strike" style={{ background: 'rgba(255, 45, 120, 0.2)', borderColor: '#ff2d78', color: '#ff6b9d' }}>
                          <AlertTriangle size={12} color="#ff2d78" />
                          2 STRIKES
                        </span>
                      ) : strikes === 1 ? (
                        <span className="badge-warning-strike">
                          <AlertTriangle size={12} />
                          1 STRIKE
                        </span>
                      ) : (
                        <span className="badge-safe-survived">
                          <CheckCircle2 size={12} />
                          SAFE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ELIMINATED PANEL */}
        <div className={`results-column-card eliminated-card ${eliminations.length > 0 ? 'elim-active' : 'elim-peace'}`}>
          <div className="col-header-bar">
            <div className="col-title-group">
              <span className="col-dot red" />
              <h3>ELIMINATED ({eliminations.length})</h3>
            </div>
            <span className="col-sub-badge">CUT FROM MAIN ARENA</span>
          </div>

          {eliminations.length === 0 ? (
            <div className="empty-elim-celebration">
              <div className="peace-shield-icon">
                <ShieldCheck size={44} color="#57ffb0" />
              </div>
              <h4 className="peace-title">🎉 NOBODY ELIMINATED THIS ROUND!</h4>
              <p className="peace-sub">All players survived the question or were protected by shields.</p>
              <div className="mercy-tag">ARENA PROTOCOL: ALL SAFE</div>
            </div>
          ) : (
            <div className="player-result-scroll-list">
              {eliminations.map((p) => (
                <div key={p.id} className="player-result-row row-is-elim">
                  <span className="player-emoji-chip">{p.emoji || '👤'}</span>

                  <div className="player-name-wrap">
                    <span className="player-name-txt">{p.name}</span>
                    {p.bot && <span className="tag-bot-pill">BOT</span>}
                  </div>

                  <div className="player-score-cell">
                    <span className="score-total-dead">{p.score} pts</span>
                  </div>

                  <div className="player-verdict-tag-cell">
                    <span className="badge-eliminated-strike">
                      <Skull size={12} />
                      💥 2 STRIKES
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Round Progress Timeline Bar ──────────────────────────── */}
      <div className="verdict-progress-timeline">
        <div className="timeline-title">
          <span>ROUND TIMELINE:</span>
        </div>

        <div className="timeline-steps-track">
          {Array.from({ length: totalRounds }, (_, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < roundNum;
            const isCurrent   = stepNum === roundNum;
            const isFuture    = stepNum > roundNum;

            return (
              <div
                key={stepNum}
                className={`timeline-step-pill ${isCompleted ? 'step-completed' : isCurrent ? 'step-current' : 'step-future'}`}
              >
                <span className="step-label">
                  {isCompleted ? `✓ 0${stepNum}` : isCurrent ? `● 0${stepNum} CURRENT` : `0${stepNum}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. Next Round Action Button ─────────────────────────────── */}
      <footer className="verdict-footer-actions">
        <button className="btn-next-round-glow" onClick={onNext}>
          {isLast ? (
            <>
              <Award size={22} className="btn-action-icon" />
              <span>🏆 CROWN CHAMPION PODIUM →</span>
            </>
          ) : isRevivalComing ? (
            <>
              <Sparkles size={22} className="btn-action-icon" />
              <span>⭐ START REVIVAL ROUND (ROUND {REVIVE_AFTER_ROUND}) →</span>
            </>
          ) : (
            <>
              <ArrowRight size={22} className="btn-action-icon" />
              <span>NEXT ROUND (ROUND {roundNum + 1} / {totalRounds}) →</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}


import React from 'react';
import { Award, Shield, Zap, Skull, CheckCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { REVIVE_AFTER_ROUND } from '../../utils/ruleEngine';

const COLORS  = ['#ff2d78','#3aa0ff','#f7b733','#57d38c'];
const LETTERS = ['A','B','C','D'];

export default function HostReveal({ results, eliminations, survivors, question, answers, roundNum, totalRounds, onNext }) {
  const isLast = roundNum >= totalRounds || survivors.length <= 1;
  const isRevivalComing = roundNum === REVIVE_AFTER_ROUND && eliminations.length > 0;

  const correctId = question?.correctId || 'opt_A';
  const correctIndex = ['opt_A', 'opt_B', 'opt_C', 'opt_D'].indexOf(correctId);
  const correctLetter = correctIndex >= 0 ? LETTERS[correctIndex] : 'A';
  const correctColor  = correctIndex >= 0 ? COLORS[correctIndex] : '#57ffb0';
  const correctText   = question?.options?.[correctId] || '';

  const warningCount = survivors.filter(p => (p.consecutiveWrong || p.consecutive_wrong) === 1).length;

  return (
    <div className="host-reveal">
      {/* 1. Question Title & Correct Option Card */}
      <div className="reveal-top-card">
        <div className="reveal-q-tag">ROUND {roundNum} / {totalRounds} — REVEAL</div>
        <h2 className="reveal-question-title">{question.text}</h2>

        <div className="reveal-correct-box" style={{ borderColor: correctColor }}>
          <span className="correct-badge" style={{ background: correctColor }}>
            {correctLetter}
          </span>
          <div className="correct-text-wrap">
            <span className="correct-sub">CORRECT ANSWER</span>
            <strong className="correct-val">{correctText}</strong>
          </div>
          <span className="correct-tick">✓</span>
        </div>

        {/* Description / Proof Box */}
        {question.why && (
          <div className="reveal-proof-box">
            <span className="proof-icon">💡</span>
            <div className="proof-content">
              <strong>Explanation & Proof:</strong>
              <p>{question.why}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Round Statistics Header Bar */}
      <div className="reveal-stats-bar">
        <div className="stat-item stat-safe">
          <span className="stat-dot green" />
          <span><strong>{survivors.length}</strong> Safe / Survivors</span>
        </div>
        {warningCount > 0 && (
          <div className="stat-item stat-warn">
            <span className="stat-dot amber" />
            <span><strong>{warningCount}</strong> on 1-Strike Warning</span>
          </div>
        )}
        <div className="stat-item stat-elim">
          <span className="stat-dot red" />
          <span><strong>{eliminations.length}</strong> Eliminated</span>
        </div>
      </div>

      {/* 3. Side-by-Side Results Listing */}
      <div className="results-grid">
        {/* Survivors Column */}
        <div className="res-col">
          <div className="col-head">
            <span>🟢 Survivors ({survivors.length})</span>
            <span className="col-sub">Safe for Next Round</span>
          </div>

          {survivors.length === 0 ? (
            <div className="empty-msg">No survivors remaining</div>
          ) : (
            <div className="res-list">
              {survivors.map((p, i) => {
                const r  = results?.[p.id];
                const rp = r?.points ?? 0;
                const strikes = p.consecutiveWrong || p.consecutive_wrong || 0;
                return (
                  <div key={p.id} className={`res-row ${r?.correct ? 'row-correct' : 'row-wrong'}`}>
                    <span className="res-rank">#{i + 1}</span>
                    <span className="res-em">{p.emoji}</span>
                    <span className="res-name">
                      {p.name}
                      {r?.shieldSaved && <span className="tag-shield" title="Shield Protected">🛡</span>}
                      {r?.ddUsed      && <span className="tag-dd" title="Double Down Used">✕2</span>}
                    </span>
                    <span className="res-speed">
                      {r?.speedMs != null ? `${(r.speedMs / 1000).toFixed(2)}s` : '—'}
                    </span>
                    <span className="res-pts">
                      {rp > 0 ? `+${rp}` : rp} · <em>{p.score} pts</em>
                    </span>
                    {strikes === 1 && (
                      <span className="strike-tag">⚠️ 1 Strike</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Eliminated Column */}
        <div className="res-col elim-col">
          <div className="col-head">
            <span>💀 Eliminated ({eliminations.length})</span>
            <span className="col-sub">Cut from Main Arena</span>
          </div>

          {eliminations.length === 0 ? (
            <div className="empty-msg">🎉 Nobody eliminated this round!</div>
          ) : (
            <div className="res-list">
              {eliminations.map(p => (
                <div key={p.id} className="res-row row-elim">
                  <span className="res-em">{p.emoji}</span>
                  <span className="res-name">{p.name}</span>
                  <span className="res-pts-dead">{p.score} pts</span>
                  <span className="elim-reason strike">
                    💥 2 Strikes
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Action Button */}
      <div className="reveal-footer-bar">
        <button className="cta cta-next" onClick={onNext}>
          {isLast ? (
            <>🏆 Crown Champion Podium →</>
          ) : isRevivalComing ? (
            <>⭐ Start Revival Round (Round {REVIVE_AFTER_ROUND}) →</>
          ) : (
            <>Next Round (Round {roundNum + 1} / {totalRounds}) →</>
          )}
        </button>
      </div>
    </div>
  );
}

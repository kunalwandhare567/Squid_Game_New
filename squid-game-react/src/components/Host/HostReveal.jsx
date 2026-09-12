import React, { useMemo } from 'react';
import { resolveRound } from '../../utils/ruleEngine';

const COLORS  = ['#ff2d78','#3aa0ff','#f7b733','#57d38c'];
const LETTERS = ['A','B','C','D'];

export default function HostReveal({ results, eliminations, survivors, question, answers, roundNum, totalRounds, onNext }) {
  const isLast = roundNum >= totalRounds || survivors.length <= 1;

  return (
    <div className="host-reveal">
      <div className="reveal-header">
        <div className="correct-ans">
          ✅ Correct: <strong>{question.options[question.correctId]}</strong>
        </div>
        <div className="round-stats">
          <span className="stat-safe">🟢 {survivors.length} safe</span>
          <span className="stat-elim">💀 {eliminations.length} eliminated</span>
        </div>
      </div>

      {question.why && <div className="why-box">💡 {question.why}</div>}

      <div className="results-grid">
        {/* Survivors */}
        <div className="res-col">
          <div className="col-head">🟢 Survivors — Round {roundNum}</div>
          {survivors.length === 0 && <div className="empty-msg">No survivors this round</div>}
          {survivors.map((p, i) => {
            const r  = results[p.id];
            const rp = r?.points ?? 0;
            return (
              <div key={p.id} className={`res-row ${r?.correct ? 'row-correct' : 'row-wrong'}`}>
                <span className="res-rank">#{i + 1}</span>
                <span className="res-em">{p.emoji}</span>
                <span className="res-name">
                  {p.name}
                  {r?.shieldSaved && <span className="tag-shield">🛡</span>}
                  {r?.ddUsed      && <span className="tag-dd">✕2</span>}
                </span>
                <span className="res-speed">
                  {r?.speedMs != null ? `${(r.speedMs / 1000).toFixed(2)}s` : '—'}
                </span>
                <span className="res-pts">
                  {rp > 0 ? `+${rp}` : rp} · <em>{p.score}</em>
                </span>
                {(p.consecutiveWrong > 0) && (
                  <span className="strike-tag">⚠️ {p.consecutiveWrong} strike</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Eliminated */}
        <div className="res-col elim-col">
          <div className="col-head">💀 Eliminated</div>
          {eliminations.length === 0 && <div className="empty-msg">Nobody cut!</div>}
          {eliminations.map(p => (
            <div key={p.id} className="res-row row-elim">
              <span className="res-em">{p.emoji}</span>
              <span className="res-name">{p.name}</span>
              <span className={`elim-reason ${p.reason}`}>
                {p.reason === 'strike' ? '💥 2 Strikes' : '📊 Low score'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button className="cta" onClick={onNext}>
        {isLast ? '🏆 See Winner →' : 'Next Round →'}
      </button>
    </div>
  );
}

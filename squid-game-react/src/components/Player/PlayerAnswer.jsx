import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAudio } from '../../context/AudioContext';
import LightBanner from '../Shared/LightBanner';
import TimerRing from '../Shared/TimerRing';
import Equalizer from '../Shared/Equalizer';
import { GREEN_DURATION_SECS } from '../../utils/ruleEngine';

const COLORS  = ['#ff2d78','#3aa0ff','#f7b733','#57d38c'];
const LETTERS = ['A','B','C','D'];

export default function PlayerAnswer({ roomCode, pid, question, locked, me, roundKey, myChoiceId, setMyChoiceId }) {
  const [shieldOn, setShieldOn] = useState(false);
  const [ddOn,     setDdOn]     = useState(false);
  const audio = useAudio();

  // Reset powerups on new question
  useEffect(() => {
    setShieldOn(false);
    setDdOn(false);
  }, [roundKey]);

  async function submitAnswer(choiceId, shield = shieldOn, dd = ddOn) {
    if (locked || !choiceId) return;
    try {
      await supabase.from('answers').upsert({
        room_code: roomCode,
        round_key: roundKey,
        player_id: pid,
        choice_id: choiceId,
        shield_on: shield,
        dd_on: dd,
        submitted_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error submitting answer to Supabase:', err);
    }
  }

  function handleOptionClick(optId) {
    if (locked) return;
    setMyChoiceId(optId);
    audio.sfxTap();
    submitAnswer(optId);
  }

  function handleShield() {
    if (locked || (me?.shield || 0) < 1) return;
    const next = !shieldOn;
    setShieldOn(next);
    if (myChoiceId) submitAnswer(myChoiceId, next, ddOn);
  }

  function handleDD() {
    if (locked || (me?.dd || 0) < 1) return;
    const next = !ddOn;
    setDdOn(next);
    if (myChoiceId) submitAnswer(myChoiceId, shieldOn, next);
  }

  if (!question) return <div className="center"><p className="sub">Loading question…</p></div>;

  const optionEntries = Object.entries(question.options);
  const strikeCount   = me?.consecutiveWrong || me?.consecutive_wrong || 0;

  return (
    <div className={`player-answer ${locked ? 'locked' : ''}`}>
      {/* Top name badge */}
      <div className="player-topbar">
        <span className="player-badge">{me?.emoji} {me?.name}</span>
        <span className="player-score">⭐ {me?.score || 0} pts</span>
      </div>

      <LightBanner state={locked ? 'red' : 'green'} />

      {/* Strike warning */}
      {strikeCount === 1 && !locked && (
        <div className="strike-warn">⚠️ 1 Strike — one more wrong = eliminated!</div>
      )}

      {/* Timer — only during green */}
      {!locked && <TimerRing totalSeconds={GREEN_DURATION_SECS} />}

      <h2 className="question-text">{question.text}</h2>

      {/* Options */}
      <div className="options-grid player-grid">
        {optionEntries.map(([optId, text], i) => (
          <button
            key={optId}
            className={`option ${myChoiceId === optId ? 'option-chosen' : ''} ${locked ? 'option-locked' : ''}`}
            style={{ borderColor: COLORS[i] }}
            onClick={() => handleOptionClick(optId)}
            disabled={locked}
            aria-label={`${LETTERS[i]}: ${text}`}
          >
            <span className="badge" style={{ background: COLORS[i] }}>{LETTERS[i]}</span>
            <span className="opt-text">{text}</span>
            {myChoiceId === optId && !locked && <span className="tick">✓</span>}
          </button>
        ))}
      </div>

      {/* Powerups — only during green */}
      {!locked && (
        <div className="pu-row">
          <button
            className={`pu-btn ${shieldOn ? 'pu-active' : ''}`}
            onClick={handleShield}
            disabled={(me?.shield || 0) < 1}
          >
            🛡 Shield ({me?.shield || 0})
          </button>
          <button
            className={`pu-btn ${ddOn ? 'pu-active' : ''}`}
            onClick={handleDD}
            disabled={(me?.dd || 0) < 1}
          >
            ✕2 Double ({me?.dd || 0})
          </button>
        </div>
      )}

      <Equalizer frozen={locked} />

      <div className="hint">
        {locked
          ? '🔒 Locked — calculating results…'
          : myChoiceId
          ? '✓ Locked in — tap to change!'
          : '👆 Tap fast for speed bonus points!'}
      </div>
    </div>
  );
}

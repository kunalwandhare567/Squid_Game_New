import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import { ANSWER_FRAC, GREEN_DURATION_SECS } from '../../utils/ruleEngine';
import DollSvg from '../Shared/DollSvg';
import TimerRing from '../Shared/TimerRing';
import LightBanner from '../Shared/LightBanner';
import Equalizer from '../Shared/Equalizer';

const COLORS  = ['#ff2d78','#3aa0ff','#f7b733','#57d38c'];
const LETTERS = ['A','B','C','D'];

export default function HostQuestion({ question, roundNum, totalRounds, isRevival, aliveCount, onLock, onLightChange }) {
  const { state }  = useGame();
  const audio      = useAudio();
  const [light, setLight]       = useState('green'); // 'green'|'alert'|'fake-red'|'red'
  const [armed, setArmed]       = useState(false);
  const [ansCount, setAnsCount] = useState(0);
  const [locked, setLocked]     = useState(false);

  const armedRef  = useRef(false);
  const lockedRef = useRef(false);
  const timers    = useRef([]);

  const addTimer = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  // Notify parent of light state for full-screen background animations
  useEffect(() => {
    onLightChange?.(light);
  }, [light, onLightChange]);

  // Watch live answer count (if 60% answer, arm early)
  useEffect(() => {
    const answers = state.answers || {};
    const count   = Object.keys(answers).length;
    setAnsCount(count);
    const threshold = Math.ceil(aliveCount * ANSWER_FRAC);
    if (count >= threshold && !armedRef.current) arm();
  }, [state.answers, aliveCount]);

  // Main 10-Second Timeline: 0-5s Solid Green, 5-10s Fast Alert & Red Blink, 10s Hard Stop
  useEffect(() => {
    // Start tempo beat accelerating across 10 seconds
    audio.startBeat(10000);

    // 1. At 5 Seconds: Trigger Fast Alert & Blinking window
    const alertTimer = setTimeout(() => {
      if (!armedRef.current && !lockedRef.current) {
        arm();
      }
    }, 5000);

    // 2. At Exactly 10 Seconds: Hard Stop!
    const hardStopTimer = setTimeout(() => {
      if (!lockedRef.current) {
        dropReal();
      }
    }, 10000);

    return () => {
      clearTimeout(alertTimer);
      clearTimeout(hardStopTimer);
      clearAll();
      audio.stopBeat();
    };
  }, []);

  function arm() {
    if (armedRef.current || lockedRef.current) return;
    armedRef.current = true;
    setArmed(true);
    setLight('alert');
    runAlertFlickers();
  }

  function runAlertFlickers() {
    // Escalating flickers during the 5s-10s window
    // Flicker 1 at +1.0s (6.0s mark), duration 200ms
    addTimer(() => {
      if (lockedRef.current) return;
      setLight('fake-red');
      audio.sfxFakeFlicker();
      addTimer(() => {
        if (!lockedRef.current) setLight('alert');
      }, 200);
    }, 1000);

    // Flicker 2 at +2.4s (7.4s mark), duration 300ms
    addTimer(() => {
      if (lockedRef.current) return;
      setLight('fake-red');
      audio.sfxFakeFlicker();
      addTimer(() => {
        if (!lockedRef.current) setLight('alert');
      }, 300);
    }, 2400);

    // Flicker 3 at +3.7s (8.7s mark), duration 400ms
    addTimer(() => {
      if (lockedRef.current) return;
      setLight('fake-red');
      audio.sfxFakeFlicker();
      addTimer(() => {
        if (!lockedRef.current) setLight('alert');
      }, 400);
    }, 3700);
  }

  function dropReal() {
    if (lockedRef.current) return;
    lockedRef.current = true;
    clearAll();
    setLight('red');
    setLocked(true);
    audio.stopBeat();
    audio.sfxRedLight();
    onLock(); // triggers HostApp.handleLock()
  }

  const handleManualLock = useCallback(() => dropReal(), []);

  const pct = aliveCount > 0 ? Math.round(ansCount / aliveCount * 100) : 0;

  return (
    <div className="host-question">
      <div className="hq-top">
        <DollSvg phase={light === 'red' || light === 'fake-red' ? 'red' : 'green'} />
        <LightBanner state={light === 'fake-red' ? 'red' : light} />
        <div className="round-badge">{isRevival ? '⭐ REVIVAL' : `Round ${roundNum} / ${totalRounds}`}</div>
      </div>

      <div className="hq-timer-row">
        <TimerRing totalSeconds={GREEN_DURATION_SECS} />
        {armed && <span className="armed-pill">⚡ ARMED</span>}
      </div>

      <h2 className="question-text">{question.text}</h2>

      <div className="options-grid host-grid">
        {Object.entries(question.options).map(([optId, text], i) => (
          <div key={optId} className="host-option" style={{ borderColor: COLORS[i] }}>
            <span className="badge" style={{ background: COLORS[i] }}>{LETTERS[i]}</span>
            <span className="opt-text">{text}</span>
          </div>
        ))}
      </div>

      <Equalizer frozen={light === 'red' || locked} />

      <div className="hq-footer">
        <div className="answer-prog">
          <span className="ans-count">{ansCount} / {aliveCount} answered ({pct}%)</span>
          <div className="prog-track">
            <div className="prog-fill" style={{ width: `${pct}%`, background: pct >= 60 ? '#57ffb0' : '#3aa0ff' }} />
          </div>
        </div>
        <button className="cta cta-red" onClick={handleManualLock} disabled={locked}>
          🔴 Red Light — Stop Music
        </button>
      </div>
    </div>
  );
}

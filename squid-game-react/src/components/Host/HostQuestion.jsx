import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Brain, Shield, Zap, AlertTriangle, Lock, Users,
  Flame, Radio, Sparkles, CheckCircle2, Clock
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import { ANSWER_FRAC, GREEN_DURATION_SECS } from '../../utils/ruleEngine';
import DollSvg from '../Shared/DollSvg';
import TimerRing from '../Shared/TimerRing';

const COLORS  = ['#ff2d78', '#3aa0ff', '#f7b733', '#57d38c'];
const LETTERS = ['A', 'B', 'C', 'D'];

const QUESTION_QUOTES = [
  'THINK FAST. ANSWER SMART. SURVIVE.',
  'EVERY SECOND COUNTS IN THE ARENA.',
  'KNOWLEDGE IS YOUR ULTIMATE WEAPON.',
  'FAST MINDS SURVIVE LONGER.',
  'ONE QUESTION CAN CHANGE YOUR FATE.',
  'THE ARENA REWARDS THE SWIFT.',
  'PRESSURE REVEALS TRUE MASTERY.'
];

export default function HostQuestion({
  question,
  roundNum,
  totalRounds,
  isRevival,
  aliveCount,
  onLock,
  onLightChange
}) {
  const { state }  = useGame();
  const audio      = useAudio();
  const [light, setLight]       = useState('green'); // 'green'|'alert'|'fake-red'|'red'
  const [armed, setArmed]       = useState(false);
  const [ansCount, setAnsCount] = useState(0);
  const [locked, setLocked]     = useState(false);

  const armedRef  = useRef(false);
  const lockedRef = useRef(false);
  const timers    = useRef([]);

  const addTimer = (fn, ms) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  };
  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

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

  const pct = aliveCount > 0 ? Math.min(100, Math.round((ansCount / aliveCount) * 100)) : 0;
  const quote = useMemo(() => {
    const idx = (roundNum - 1) % QUESTION_QUOTES.length;
    return QUESTION_QUOTES[idx >= 0 ? idx : 0];
  }, [roundNum]);

  const isRed = light === 'red' || light === 'fake-red';
  const isAlert = light === 'alert';
  const isGreen = light === 'green';

  const lightStateClass = isRed ? 'state-red-light' : isAlert ? 'state-alert-light' : 'state-green-light';

  return (
    <div className={`host-arena-question-screen ${lightStateClass}`}>
      {/* ── Background Geometric Ambient Shapes ──────────────────────── */}
      <div className="arena-geo-ambient" aria-hidden="true">
        <span className="geo-q-shape gq-1">○</span>
        <span className="geo-q-shape gq-2">△</span>
        <span className="geo-q-shape gq-3">□</span>
        <span className="geo-q-shape gq-4">○</span>
      </div>

      {/* ── Top HUD Stage Header (Left: Circular Round, Center: 3D Doll, Right: Timer) ── */}
      <div className="hq-stage-header">
        {/* Left: Circular Round Element */}
        <div className="hq-round-circle-badge">
          <span className="hq-round-sub-label">ROUND</span>
          <div className="hq-round-fraction">
            <span className="hq-round-current">{roundNum}</span>
            <span className="hq-round-slash">/</span>
            <span className="hq-round-total">{totalRounds}</span>
          </div>
        </div>

        {/* Center: 3D Animated Doll in Direct Center */}
        <div className="hq-center-doll-stage">
          <DollSvg phase={isRed ? 'red' : 'green'} />
        </div>

        {/* Right: Circular Timer Ring */}
        <div className="hq-timer-stage-right">
          <div className="hq-timer-core">
            <TimerRing
              key={question?.id || roundNum}
              totalSeconds={GREEN_DURATION_SECS}
              resetKey={question?.id || roundNum}
            />
            {armed && (
              <span className="hq-armed-badge">
                <Zap size={12} />
                <span>ARMED</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Dynamic Light Status Banner (Centered Above Question) ────── */}
      <div className="hq-banner-row">
        <div className={`hq-light-indicator-banner ${isRed ? 'banner-red' : isAlert ? 'banner-alert' : 'banner-green'}`}>
          <div className="banner-signal-dot" />
          <div className="banner-content">
            <span className="banner-main-title">
              {isRed ? '🔴 RED LIGHT — STOP!' : isAlert ? '⚠️ ALERT — RED IMMINENT!' : '🟢 GREEN LIGHT — CHOOSE FAST!'}
            </span>
            <span className="banner-sub-text">
              {isRed ? 'ANSWERS LOCKED — STAND BY FOR VERDICT' : isAlert ? 'COUNTDOWN ENDING — LOCK IN NOW' : 'PLAYERS ARE ANSWERING ON THEIR PHONES'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Question Showcase Arena ─────────────────────────────── */}
      <div className="hq-arena-body">
        {/* Question Panel */}
        <div className="hq-question-card">
          <div className="q-card-corner-tl" />
          <div className="q-card-corner-tr" />
          <div className="q-card-corner-bl" />
          <div className="q-card-corner-br" />

          <div className="q-card-header">
            <span className="q-badge-label">QUESTION 0{roundNum}</span>
            {locked && (
              <span className="q-locked-badge">
                <Lock size={12} />
                <span>LOCKED</span>
              </span>
            )}
          </div>

          <h1 className="hq-main-question-text">{question?.text}</h1>
        </div>

        {/* 2x2 Answer Grid */}
        <div className={`hq-options-grid ${locked ? 'options-locked' : 'options-active'}`}>
          {question?.options && Object.entries(question.options).map(([optId, text], i) => (
            <div
              key={optId}
              className={`hq-option-card opt-card-${LETTERS[i]}`}
              style={{ '--opt-color': COLORS[i] }}
            >
              <div className="opt-letter-disc" style={{ background: COLORS[i] }}>
                {LETTERS[i]}
              </div>
              <div className="opt-text-wrap">
                <span className="opt-label-letter" style={{ color: COLORS[i] }}>OPTION {LETTERS[i]}</span>
                <span className="opt-body-text">{text}</span>
              </div>
              {locked && (
                <div className="opt-lock-overlay">
                  <Lock size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Arena Control & Progress Bar ──────────────────────── */}
      <footer className="hq-arena-footer">
        {/* Live Answer Progress */}
        <div className="hq-progress-box">
          <div className="progress-info-row">
            <div className="progress-label-group">
              <Users size={16} color="#57ffb0" />
              <span className="progress-label-txt">RESPONSES:</span>
              <strong className="progress-count-val">{ansCount} / {aliveCount} ANSWERED</strong>
            </div>
            <span className="progress-pct-val">{pct}%</span>
          </div>

          <div className="hq-progress-track">
            <div
              className="hq-progress-fill"
              style={{
                width: `${pct}%`,
                background: isRed
                  ? '#ff5a5a'
                  : pct >= 60
                  ? 'linear-gradient(90deg, #2ebf9f, #57ffb0)'
                  : 'linear-gradient(90deg, #3aa0ff, #57ffb0)'
              }}
            />
          </div>
        </div>

        {/* Motivational Survival Quote */}
        <div className="hq-quote-box">
          <span>“ {quote} ”</span>
        </div>

        {/* Host Control / Status */}
        <div className="hq-controls-box">
          <button
            className={`btn-host-lock-light ${locked ? 'is-locked' : 'can-lock'}`}
            onClick={handleManualLock}
            disabled={locked}
          >
            {locked ? (
              <>
                <Lock size={16} />
                <span>RED LIGHT ACTIVE</span>
              </>
            ) : (
              <>
                <Flame size={16} />
                <span>RED LIGHT — STOP NOW</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}


import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useAudio } from '../../context/AudioContext';
import TimerRing from '../Shared/TimerRing';
import Equalizer from '../Shared/Equalizer';
import { GREEN_DURATION_SECS, ROUNDS } from '../../utils/ruleEngine';
import { AlertTriangle, Lock, Check, Volume2, VolumeX, Radio } from 'lucide-react';

const COLORS  = ['#ff2d78', '#3aa0ff', '#f7b733', '#57d38c'];
const LETTERS = ['A', 'B', 'C', 'D'];

export default function PlayerAnswer({
  roomCode,
  pid,
  question,
  locked,
  me,
  roundKey,
  roundNum = 1,
  totalRounds = ROUNDS,
  aliveCount = 0,
  totalCount = 0,
  startTimeMs = null,
  myChoiceId,
  setMyChoiceId
}) {
  const [liveAnswersCount, setLiveAnswersCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audio = useAudio();

  // Auto-restore player's previous choice if they refreshed during this question
  useEffect(() => {
    if (!myChoiceId && roomCode && roundKey) {
      try {
        const saved = sessionStorage.getItem(`sq_ans_${roomCode}_${roundKey}`) || sessionStorage.getItem('sq_last_choice');
        if (saved) {
          setMyChoiceId(saved);
        }
      } catch (e) {}
    }
  }, [roomCode, roundKey, myChoiceId, setMyChoiceId]);

  // Audio mute sync
  useEffect(() => {
    if (audio?.getMuted) {
      setIsMuted(audio.getMuted());
    }
  }, [audio]);

  const toggleSound = () => {
    if (!audio) return;
    const next = !isMuted;
    setIsMuted(next);
    audio.setMuted(next);
    if (!next) audio.sfxTap();
  };

  // Direct question sync fallback if state.question is delayed
  useEffect(() => {
    if (!question && roomCode) {
      supabase
        .from('rooms')
        .select('question')
        .eq('room_code', roomCode)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.question) {
            window.dispatchEvent(new CustomEvent('sq_question_sync', { detail: data.question }));
          }
        })
        .catch(() => {});
    }
  }, [question, roomCode]);

  // Reset live answers count on new round
  useEffect(() => {
    setLiveAnswersCount(0);
  }, [roundKey]);

  // Sync live answers count for the progress bar
  useEffect(() => {
    if (!roomCode || !roundKey) return;
    let isMounted = true;

    async function syncAnswers() {
      try {
        const { data } = await supabase
          .from('answers')
          .select('player_id')
          .eq('room_code', roomCode)
          .eq('round_key', roundKey);
        if (data && isMounted) {
          setLiveAnswersCount(data.length);
        }
      } catch (err) {
        // Silently ignore sync errors
      }
    }

    syncAnswers();
    const interval = setInterval(syncAnswers, 400);

    const channel = supabase
      .channel(`player-answers-${roomCode}-${roundKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers', filter: `room_code=eq.${roomCode}` },
        () => syncAnswers()
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [roomCode, roundKey]);

  // Per-player option shuffling on mobile
  const shuffledOptions = useMemo(() => {
    if (!question?.options) return [];
    const entries = Object.entries(question.options);
    const list = [...entries];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [question?.id, pid]);

  async function submitAnswer(choiceId) {
    if (locked || !choiceId) return;
    try {
      await supabase.from('answers').upsert({
        room_code: roomCode,
        round_key: roundKey,
        player_id: pid,
        choice_id: choiceId,
        shield_on: false,
        dd_on: false,
        submitted_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error submitting answer to Supabase:', err);
    }
  }

  function handleOptionClick(optId, optText) {
    if (locked) return;
    setMyChoiceId(optId);
    try {
      sessionStorage.setItem(`sq_ans_${roomCode}_${roundKey}`, optId);
      sessionStorage.setItem('sq_last_choice', optId);
      if (optText) {
        sessionStorage.setItem(`sq_ans_text_${roomCode}_${roundKey}`, optText);
        sessionStorage.setItem('sq_last_choice_text', optText);
      }
    } catch (e) {}
    audio?.sfxTap();
    submitAnswer(optId);
  }

  if (!question) {
    return (
      <div className="player-arena is-green center" style={{ justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
        <div className="player-ambient-bg" aria-hidden="true">
          <span className="ambient-sym sym-circle">○</span>
          <span className="ambient-sym sym-triangle">△</span>
          <span className="ambient-sym sym-square">□</span>
        </div>
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(87, 255, 176, 0.2)',
            borderTopColor: '#57ffb0',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <h2 style={{ color: '#57ffb0', fontSize: '20px', fontWeight: 800, margin: 0 }}>
          GET READY FOR ROUND {roundNum}!
        </h2>
        <p style={{ color: '#a9cabf', fontSize: '14px', margin: 0 }}>
          Syncing question from Host…
        </p>
      </div>
    );
  }

  const strikeCount = me?.consecutiveWrong ?? me?.consecutive_wrong ?? 0;
  const effectiveTotal = aliveCount || totalCount || 1;
  const answerPercent = Math.min(100, Math.round((liveAnswersCount / effectiveTotal) * 100));

  return (
    <div className={`player-arena ${locked ? 'is-locked' : 'is-green'}`}>
      {/* Background ambient geometric symbols */}
      <div className="player-ambient-bg" aria-hidden="true">
        <span className="ambient-sym sym-circle">○</span>
        <span className="ambient-sym sym-triangle">△</span>
        <span className="ambient-sym sym-square">□</span>
      </div>

      <div className="player-content-container">
        {/* ── 1. HEADER & PLAYER IDENTITY ── */}
        <header className="player-hud-header">
          <div className="player-brand">
            <span className="brand-dot" />
            <span className="brand-title">IAE SQUID SURVIVAL</span>
          </div>

          <div className="player-header-actions">
            <button
              className="sound-toggle-btn"
              onClick={toggleSound}
              aria-label={isMuted ? 'Unmute game audio' : 'Mute game audio'}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <div className="player-hud-card">
              <div className="player-identity">
                <span className="player-avatar-emoji">{me?.emoji || '👤'}</span>
                <span className="player-name-text">{me?.name || 'Player'}</span>
              </div>
              <div className="player-score-chip">
                <span className="score-star">⭐</span>
                <span className="score-num">{me?.score || 0}</span>
                <span className="score-unit">PTS</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── 2. ROUND & LIGHT STATUS BAR ── */}
        <div className="player-status-row">
          <div className={`player-light-pill ${locked ? 'pill-red' : 'pill-green'}`}>
            <span className="light-glow-indicator" />
            <span className="light-pill-text">
              {locked ? '🔴 RED LIGHT · LOCKED' : '🟢 GREEN LIGHT · CHOOSE FAST!'}
            </span>
          </div>

          <div className="player-round-pill">
            <span className="round-pill-label">ROUND</span>
            <span className="round-pill-count">
              {`${String(roundNum).padStart(2, '0')} / ${String(totalRounds).padStart(2, '0')}`}
            </span>
          </div>
        </div>

        {/* ── 3. STRIKE WARNING BANNER ── */}
        {strikeCount === 1 && !locked && (
          <div className="player-strike-banner" role="alert">
            <AlertTriangle className="strike-icon" size={16} />
            <span className="strike-banner-text">
              <strong>1 STRIKE:</strong> 2 STRIKES LEFT BEFORE ELIMINATION
            </span>
          </div>
        )}

        {strikeCount >= 2 && !locked && (
          <div className="player-strike-banner banner-danger" role="alert" style={{ background: 'rgba(255, 45, 120, 0.18)', borderColor: '#ff2d78', color: '#ff6b9d' }}>
            <AlertTriangle className="strike-icon" size={16} color="#ff2d78" />
            <span className="strike-banner-text">
              <strong>⚠️ 2 STRIKES WARNING:</strong> ONE MORE WRONG = PERMANENT ELIMINATION!
            </span>
          </div>
        )}

        {/* ── 4. COUNTDOWN TIMER / LOCKED BADGE ── */}
        <div className="player-timer-container">
          {!locked ? (
            <div className="player-timer-ring-wrapper">
              <TimerRing
                key={question?.id || roundKey}
                totalSeconds={GREEN_DURATION_SECS}
                resetKey={question?.id || roundKey}
                startTimeMs={startTimeMs}
              />
            </div>
          ) : (
            <div className="player-locked-badge">
              <Lock size={20} className="lock-icon" />
              <span className="locked-badge-text">ANSWERS LOCKED</span>
            </div>
          )}
        </div>

        {/* ── 5. QUESTION CARD ── */}
        <main className="player-question-section">
          <div className="player-question-card">
            <div className="question-card-tag">
              {question?.category ? question.category.toUpperCase() : 'SURVIVAL QUESTION'}
            </div>
            <h1 className="player-question-title">
              {question.text}
            </h1>
          </div>

          {/* ── 6. 2×2 ANSWER GRID ── */}
          <div className={`player-answer-grid ${locked ? 'grid-locked' : ''}`} role="group" aria-label="Answer options">
            {shuffledOptions.map(([optId, text], i) => {
              const isSelected = myChoiceId === optId;
              const color = COLORS[i % COLORS.length];
              const letter = LETTERS[i % LETTERS.length];

              return (
                <button
                  key={optId}
                  className={`player-answer-card ${isSelected ? 'is-selected' : ''} ${locked ? 'is-disabled' : ''}`}
                  style={{
                    '--card-color': color,
                    borderColor: isSelected ? color : undefined,
                  }}
                  onClick={() => handleOptionClick(optId, text)}
                  disabled={locked}
                  aria-pressed={isSelected}
                  aria-label={`Option ${letter}: ${text}`}
                >
                  <div className="option-badge-disc" style={{ backgroundColor: color }}>
                    {letter}
                  </div>
                  <div className="option-text-wrap">
                    <span className="option-text">{text}</span>
                  </div>
                  {isSelected && (
                    <div className="option-selected-marker" style={{ backgroundColor: color }}>
                      <Check size={14} color="#06120f" strokeWidth={3.5} />
                    </div>
                  )}
                  {locked && !isSelected && (
                    <div className="option-lock-indicator">
                      <Lock size={12} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </main>



        {/* ── 8. LIVE PROGRESS & FOOTER ── */}
        <footer className="player-footer-section">
          {/* Live response progress bar */}
          <div className="player-progress-bar-wrap">
            <div className="player-progress-meta">
              <span className="progress-label">
                <Radio size={13} className="radio-pulse" /> LIVE RESPONSES
              </span>
              <span className="progress-count">
                <strong>{liveAnswersCount}</strong> / {effectiveTotal} ANSWERED
              </span>
            </div>
            <div className="player-progress-track">
              <div
                className="player-progress-fill"
                style={{ width: `${answerPercent}%` }}
              />
            </div>
          </div>

          <Equalizer frozen={locked} />

          {/* Gameplay tip banner */}
          <div className={`player-tip-card ${locked ? 'tip-locked' : 'tip-active'}`}>
            {locked ? (
              <span>🔒 ANSWERS LOCKED · STAND BY FOR ROUND VERDICT…</span>
            ) : myChoiceId ? (
              <span>✓ CHOICE LOCKED IN · TAP ANY OPTION TO CHANGE BEFORE TIME RUNS OUT</span>
            ) : (
              <span>🎯 CORRECT ANSWER = +2 PTS · 3 CONSECUTIVE WRONG = ELIMINATED!</span>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}


import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { MIN_PLAYERS, MAX_PLAYERS } from '../../utils/ruleEngine';
import QRDisplay from '../Shared/QRDisplay';
import {
  Zap, Flame, ShieldCheck, Sparkles, Bot, Play, Users,
  CheckCircle2, Radio, QrCode, Smartphone, Brain, Award,
  Skull, ArrowRight, Shield, Swords
} from 'lucide-react';

const QUOTES = [
  'Same questions. Bigger minds.',
  'Think fast. Answer smart. Survive the round.',
  'Knowledge is your weapon in the arena.',
  'One question can change your ranking.',
  'Don\'t just play. Outsmart the AI arena.',
  'Your next answer decides your survival.',
];

const RULES = [
  { num: '01', icon: Zap,         title: 'ANSWER FAST',    desc: 'Faster correct answers earn up to +3 speed bonus points', color: '#57ffb0' },
  { num: '02', icon: Flame,       title: 'RED LIGHT',      desc: 'Choices lock immediately when the red light drops',       color: '#ff2d78' },
  { num: '03', icon: Brain,       title: 'THINK SMART',    desc: 'Questions test AI, engineering, and logic intuition',     color: '#3aa0ff' },
  { num: '04', icon: Award,       title: 'EARN POINTS',    desc: 'Every correct answer builds your score toward champion',  color: '#ffd257' },
  { num: '05', icon: ShieldCheck, title: 'USE POWERS',     desc: 'Activate 🛡 Shield protection & ✕2 Double Down score',    color: '#a78bfa' },
  { num: '06', icon: Skull,       title: '3 STRIKES CUT',  desc: '3 consecutive wrong answers = permanent elimination from arena', color: '#f43f5e' },
];

export default function HostLobby({ roomCode, joinURL, onStart, onAddBot, onRemoveBot, botCount }) {
  const { state } = useGame();
  const videoRef = useRef(null);
  const pauseTimerRef = useRef(null);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const playerList   = useMemo(() => Object.entries(state.players || {}), [state.players]);
  const realPlayers  = playerList.filter(([, p]) => !p.bot && !p.spectator);
  const spectators   = playerList.filter(([, p]) => p.spectator);
  const bots         = playerList.filter(([, p]) => p.bot);
  const participants = playerList.filter(([, p]) => !p.spectator);
  const realCount    = realPlayers.length;
  const totalCount   = participants.length;
  const canStart     = totalCount >= MIN_PLAYERS;
  const isFull       = totalCount >= MAX_PLAYERS;

  // Build fixed 15-slot array (01 to 15) for simultaneous desktop/TV view
  const slots = useMemo(() => {
    return Array.from({ length: MAX_PLAYERS }, (_, i) => {
      const pEntry = participants[i] || null;
      return {
        slotNum: String(i + 1).padStart(2, '0'),
        occupied: !!pEntry,
        player: pEntry ? { id: pEntry[0], ...pEntry[1] } : null,
      };
    });
  }, [participants]);

  // Video looping cycle
  const handleVideoEnded = () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }, 3000);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  // Subtle quote rotation every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx(prev => (prev + 1) % QUOTES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="lobby-cinema-screen">
      {/* ── Ambient Geometric Symbols ○ △ □ ─────────────────────────── */}
      <div className="lobby-geo-ambient" aria-hidden="true">
        <span className="geo-float-shape geo-1">○</span>
        <span className="geo-float-shape geo-2">△</span>
        <span className="geo-float-shape geo-3">□</span>
        <span className="geo-float-shape geo-4">○</span>
        <span className="geo-float-shape geo-5">△</span>
      </div>

      {/* ── TOP SECTION: 3-ZONE COMPOSITION ─────────────────────────── */}
      <div className="lobby-top-triptych">
        {/* ZONE 1 (LEFT): LIVE SURVEILLANCE FEED */}
        <div className="arena-feed-card">
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          <div className="feed-header-bar">
            <div className="live-indicator">
              <span className="live-dot" />
              <span className="live-text">● LIVE ARENA FEED</span>
            </div>
            <span className="feed-round-tag">STANDBY · ROUND 01</span>
          </div>

          <div className="video-viewport">
            <video
              ref={videoRef}
              src="/vid1.mp4"
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              className="surveillance-video"
            />
            <div className="video-scanlines" />
            <div className="video-vignette" />
          </div>

          <div className="feed-footer-meta">
            <span>IAE SYSTEM MONITOR</span>
            <span className="feed-status-val">SURVEILLANCE ACTIVE</span>
          </div>
        </div>

        {/* ZONE 2 (CENTER): HERO HEADLINE & LIVE ARENA STATUS */}
        <div className="hero-center-column">
          <div className="hero-badge-pill">
            <span className="badge-geo">○ △ □</span>
            <span className="badge-txt">AI SURVIVAL ARENA</span>
          </div>

          <h1 className="hero-main-title">
            <span className="title-row-1">CAN YOU</span>
            <span className="title-row-survive">SURVIVE</span>
            <span className="title-row-3">THE AI?</span>
          </h1>

          <div className="hero-quote-box">
            <span className="quote-icon">“</span>
            <p className="quote-text">{QUOTES[quoteIdx]}</p>
            <span className="quote-icon">”</span>
          </div>

          <div className="arena-live-status-card">
            <div className="status-top-row">
              <span className="status-label">LOBBY STATUS:</span>
              <strong className={`status-val ${canStart ? 'ready' : 'waiting'}`}>
                {isFull ? '🔥 ARENA FULL (15/15)' : canStart ? '⚡ ARENA READY' : '● WAITING FOR PLAYERS'}
              </strong>
            </div>

            <div className="progress-bar-track">
              <div
                className={`progress-bar-fill ${canStart ? 'fill-ready' : 'fill-waiting'}`}
                style={{ width: `${Math.min(100, (totalCount / MAX_PLAYERS) * 100)}%` }}
              />
            </div>

            <div className="status-sub-note">
              {canStart
                ? `Ready to launch with ${totalCount} player${totalCount > 1 ? 's' : ''}! Host can start at any time.`
                : `Need minimum ${MIN_PLAYERS} players to start (currently ${totalCount}/${MAX_PLAYERS}).`}
            </div>
          </div>
        </div>

        {/* ZONE 3 (RIGHT): QR JOIN PANEL */}
        <div className="qr-join-hero-card">
          <div className="hud-corner-tl pink-corner" />
          <div className="hud-corner-tr pink-corner" />
          <div className="hud-corner-bl pink-corner" />
          <div className="hud-corner-br pink-corner" />

          <div className="qr-card-header">
            <QrCode size={18} color="#ff2d78" />
            <span>JOIN THE GAME</span>
          </div>

          <p className="qr-card-sub">SCAN BARCODE WITH YOUR PHONE</p>

          <div className="qr-canvas-wrapper">
            <QRDisplay url={joinURL} roomCode={roomCode} />
          </div>

          <div className="qr-workflow-steps">
            <div className="wf-step">
              <Smartphone size={14} color="#57ffb0" />
              <span>SCAN</span>
            </div>
            <ArrowRight size={12} color="rgba(255,255,255,0.3)" />
            <div className="wf-step">
              <Users size={14} color="#3aa0ff" />
              <span>JOIN</span>
            </div>
            <ArrowRight size={12} color="rgba(255,255,255,0.3)" />
            <div className="wf-step">
              <Zap size={14} color="#ffd257" />
              <span>ANSWER</span>
            </div>
            <ArrowRight size={12} color="rgba(255,255,255,0.3)" />
            <div className="wf-step">
              <Award size={14} color="#ff2d78" />
              <span>SURVIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE SECTION: DEDICATED 15-PLAYER LIVE GRID ─────────── */}
      <div className="lobby-15-player-panel">
        <div className="player-panel-header">
          <div className="panel-title-group">
            <Users size={20} color="#57ffb0" />
            <h2 className="panel-title">PLAYERS JOINED</h2>
          </div>

          <div className="player-counter-badge">
            <span className="count-number">{String(totalCount).padStart(2, '0')}</span>
            <span className="count-slash">/</span>
            <span className="count-max">{MAX_PLAYERS} PLAYERS</span>
          </div>
        </div>

        {/* 15 Player Pods (3 rows of 5) */}
        <div className="player-15-grid">
          {slots.map((slot) => {
            const isOccupied = slot.occupied;
            const p = slot.player;

            return (
              <div
                key={slot.slotNum}
                className={`player-pod ${isOccupied ? 'pod-occupied' : 'pod-empty'} ${p?.bot ? 'pod-bot' : ''}`}
              >
                <div className="pod-slot-badge">{slot.slotNum}</div>

                <div className="pod-avatar-area">
                  {isOccupied ? (
                    <span className="pod-emoji">{p.emoji || '👤'}</span>
                  ) : (
                    <span className="pod-empty-circle">◯</span>
                  )}
                </div>

                <div className="pod-name-area">
                  {isOccupied ? (
                    <span className="pod-player-name">{p.name}</span>
                  ) : (
                    <span className="pod-waiting-txt">WAITING</span>
                  )}
                </div>

                <div className="pod-status-footer">
                  {isOccupied ? (
                    p.bot ? (
                      <span className="pod-tag-bot">🤖 BOT</span>
                    ) : (
                      <span className="pod-tag-ready">READY ✓</span>
                    )
                  ) : (
                    <span className="pod-tag-empty">SLOT OPEN</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM SECTION: RULES & CONTROLS ─────────────────────────── */}
      <div className="lobby-bottom-deck">
        {/* GAME RULES: 6 COMPACT CARDS */}
        <div className="lobby-rules-section">
          <div className="rules-section-title">
            <Brain size={18} color="#ffd257" />
            <span>GAME RULES & ARENA PROTOCOLS</span>
          </div>

          <div className="rules-cards-grid">
            {RULES.map((r) => {
              const IconComponent = r.icon;
              return (
                <div key={r.num} className="rule-box-card" style={{ borderLeftColor: r.color }}>
                  <div className="rule-top-line">
                    <span className="rule-num" style={{ color: r.color }}>{r.num}</span>
                    <IconComponent size={16} color={r.color} />
                    <span className="rule-heading">{r.title}</span>
                  </div>
                  <p className="rule-description">{r.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM CONTROLS & START BUTTON */}
        <div className="lobby-actions-sidebar">
          {/* Practice Bots Widget */}
          <div className="practice-mode-card">
            <div className="practice-head">
              <Bot size={16} color="#7fa295" />
              <span>PRACTICE BOTS</span>
            </div>
            <p className="practice-sub">Add test AI bots to test the arena</p>
            <div className="bot-stepper-row">
              <button
                className="step-btn"
                onClick={onRemoveBot}
                disabled={botCount === 0}
                title="Remove bot"
              >
                −
              </button>
              <span className="bot-count-display">{botCount}</span>
              <button
                className="step-btn"
                onClick={onAddBot}
                title="Add bot"
              >
                +
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            className={`btn-lobby-start ${canStart ? 'btn-ready' : 'btn-waiting'}`}
            disabled={!canStart}
            onClick={onStart}
          >
            {canStart ? (
              <>
                <Play size={20} className="start-icon" />
                <span>⚡ START GAME · {totalCount} PLAYING</span>
              </>
            ) : (
              <span>WAITING FOR PLAYERS ({totalCount}/{MIN_PLAYERS})…</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


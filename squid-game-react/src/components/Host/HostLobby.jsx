import React, { useMemo, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { MIN_PLAYERS, MAX_PLAYERS } from '../../utils/ruleEngine';
import QRDisplay from '../Shared/QRDisplay';
import { Zap, Flame, ShieldCheck, Sparkles, Bot, Play, Users } from 'lucide-react';

export default function HostLobby({ roomCode, joinURL, onStart, onAddBot, onRemoveBot, botCount }) {
  const { state } = useGame();
  const videoRef = useRef(null);
  const pauseTimerRef = useRef(null);

  const playerList  = useMemo(() => Object.entries(state.players || {}), [state.players]);
  const realPlayers = playerList.filter(([, p]) => !p.bot && !p.spectator);
  const spectators  = playerList.filter(([, p]) => p.spectator);
  const bots        = playerList.filter(([, p]) => p.bot);
  const realCount   = realPlayers.length;
  const totalCount  = realCount + botCount;
  const canStart    = totalCount >= MIN_PLAYERS;
  const isFull      = realCount >= MAX_PLAYERS;

  // Handle playing video with 3-second pause between replay cycles
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

  return (
    <div className="lobby-container">
      <div className="lobby-content">
        {/* Left Column: Larger Video + Styled Scan Section + Rules + Controls */}
        <div className="lobby-left">
          {/* 1. Large Dimension Video Card with bottom spacing */}
          <div className="lobby-video-hero">
            <div className="lobby-video-card">
              <video
                ref={videoRef}
                src="/vid1.mp4"
                autoPlay
                muted
                playsInline
                onEnded={handleVideoEnded}
                className="lobby-video"
              />
              <div className="video-glow-overlay" />
            </div>
          </div>

          {/* 2. Styled "Scan To Enter" Title Section Below Video */}
          <div className="lobby-title-section">
            <div className="arena-badge">
              <span className="badge-squid-shape">● ▲ ■</span>
              <span>SURVIVAL QUIZ ARENA</span>
            </div>
            <h1 className="lobby-title">
              <span className="title-prefix">SCAN TO ENTER</span>
              <span className="title-gradient">THE BATTLE</span>
            </h1>
            <p className="lobby-tagline">Scan barcode with your phone • Compete live in real-time</p>
          </div>

          {/* 3. Creative Feature Rule Cards with Lucide Icons */}
          <div className="rules-grid">
            <div className="rule-card rule-green">
              <div className="rule-icon-wrap">
                <Zap size={18} color="#57ffb0" />
              </div>
              <div className="rule-info">
                <span className="rule-name">Green Light</span>
                <span className="rule-sub">Answer fast for max points</span>
              </div>
            </div>

            <div className="rule-card rule-red">
              <div className="rule-icon-wrap">
                <Flame size={18} color="#ff2d78" />
              </div>
              <div className="rule-info">
                <span className="rule-name">Red Light</span>
                <span className="rule-sub">Bottom 1-in-4 cut each round</span>
              </div>
            </div>

            <div className="rule-card rule-shield">
              <div className="rule-icon-wrap">
                <ShieldCheck size={18} color="#3aa0ff" />
              </div>
              <div className="rule-info">
                <span className="rule-name">Shield & ✕2</span>
                <span className="rule-sub">1-time armor & double score</span>
              </div>
            </div>

            <div className="rule-card rule-revive">
              <div className="rule-icon-wrap">
                <Sparkles size={18} color="#ffd257" />
              </div>
              <div className="rule-info">
                <span className="rule-name">Mid Revival</span>
                <span className="rule-sub">Eliminated players get 1 shot</span>
              </div>
            </div>
          </div>

          {/* 4. Bottom Control Bar with Lucide Icons */}
          <div className="lobby-bottom-bar">
            <div className="bot-control-panel">
              <Bot size={16} color="#7fa295" />
              <span className="bot-label">Practice Bots:</span>
              <div className="stepper-controls">
                <button className="step-btn" onClick={onRemoveBot} disabled={botCount === 0} title="Remove bot">−</button>
                <span className="bot-counter">{botCount}</span>
                <button className="step-btn" onClick={onAddBot} title="Add bot">+</button>
              </div>
            </div>

            <button
              className={`cta ${canStart ? 'cta-ready' : 'cta-waiting'}`}
              disabled={!canStart}
              onClick={onStart}
            >
              {canStart ? (
                <>
                  <Play size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
                  Start Game · {totalCount} Playing
                </>
              ) : (
                `Waiting for min ${MIN_PLAYERS} players (currently ${totalCount}/${MAX_PLAYERS})…`
              )}
            </button>
          </div>
        </div>

        {/* Right Column: QR Code & Admitted Players List */}
        <div className="lobby-right">
          <div className="qr-section-wrapper">
            <QRDisplay url={joinURL} roomCode={roomCode} />
            
            {/* Show stats pill ONLY when players/bots are admitted */}
            {totalCount > 0 && (
              <div className="lobby-stats-pill">
                <span>{realCount} real</span>
                <span className="stat-dot">•</span>
                <span>{bots.length} 🤖</span>
                {spectators.length > 0 && (
                  <>
                    <span className="stat-dot">•</span>
                    <span>{spectators.length} 👁</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Show player list ONLY when players are admitted/joined */}
          {playerList.length > 0 && (
            <div className="player-chips-tray">
              <div className="tray-label">Admitted Players ({playerList.length})</div>
              <div className="player-chips">
                {playerList.map(([id, p]) => (
                  <div key={id} className={`chip ${p.bot ? 'chip-bot' : p.spectator ? 'chip-spec' : ''}`}>
                    <span className="chip-em">{p.emoji}</span>
                    <span className="chip-name">{p.name}</span>
                    {p.bot && <span className="chip-tag">🤖</span>}
                    {p.spectator && <span className="chip-tag">👁</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

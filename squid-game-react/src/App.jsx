import React, { useEffect, useState } from 'react';
import { AudioProvider } from './context/AudioContext';
import HostApp from './components/Host/HostApp';
import PlayerApp from './components/Player/PlayerApp';
import { isDeviceRestricted } from './utils/replayRestrictions';

/**
 * URL routing:
 *   ?host=true   → Host screen (open on laptop/projector)
 *   ?room=ABCD   → Player screen (QR code destination)
 *   (none)       → Landing page
 */
export default function App() {
  const [mode, setMode] = useState(null);
  const [roomCode, setRoomCode] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    const host = params.get('host');
    if (room) { setRoomCode(room.toUpperCase()); setMode('player'); }
    else if (host) { setMode('host'); }
    else { setMode('landing'); }
  }, []);

  if (!mode) return <div className="loading">Loading…</div>;

  return (
    <AudioProvider>
      <GlobalAmbientGeoShapes />
      {mode === 'host' && <HostApp />}
      {mode === 'player' && <PlayerApp roomCode={roomCode} />}
      {mode === 'landing' && <LandingPage />}
    </AudioProvider>
  );
}

function GlobalAmbientGeoShapes() {
  return (
    <div className="global-ambient-geo-layer" aria-hidden="true">
      {/* Circle Shapes (Pink Glow) */}
      <span className="ambient-geo-item geo-circle geo-size-lg geo-color-pink geo-pos-1">○</span>
      <span className="ambient-geo-item geo-circle geo-size-md geo-color-pink geo-pos-2">○</span>
      <span className="ambient-geo-item geo-circle geo-size-sm geo-color-pink geo-pos-3">○</span>
      <span className="ambient-geo-item geo-circle geo-size-xl geo-color-pink geo-pos-4">○</span>

      {/* Triangle Shapes (Cyan/Blue Glow) */}
      <span className="ambient-geo-item geo-triangle geo-size-lg geo-color-cyan geo-pos-5">△</span>
      <span className="ambient-geo-item geo-triangle geo-size-md geo-color-cyan geo-pos-6">△</span>
      <span className="ambient-geo-item geo-triangle geo-size-sm geo-color-cyan geo-pos-7">△</span>
      <span className="ambient-geo-item geo-triangle geo-size-xl geo-color-cyan geo-pos-8">△</span>

      {/* Square Shapes (Mint Green Glow) */}
      <span className="ambient-geo-item geo-square geo-size-lg geo-color-green geo-pos-9">□</span>
      <span className="ambient-geo-item geo-square geo-size-md geo-color-green geo-pos-10">□</span>
      <span className="ambient-geo-item geo-square geo-size-sm geo-color-green geo-pos-11">□</span>
      <span className="ambient-geo-item geo-square geo-size-xl geo-color-green geo-pos-12">□</span>

      {/* Micro Floating Badges */}
      <span className="ambient-geo-item geo-circle geo-size-xs geo-color-cyan geo-pos-13">○</span>
      <span className="ambient-geo-item geo-triangle geo-size-xs geo-color-green geo-pos-14">△</span>
      <span className="ambient-geo-item geo-square geo-size-xs geo-color-pink geo-pos-15">□</span>
    </div>
  );
}

function LandingPage() {
  const [code, setCode] = useState('');
  const isRestricted = isDeviceRestricted();

  const handleJoin = (e) => {
    e?.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length === 4) {
      window.location.search = `?room=${clean}`;
    }
  };

  return (
    <div className="landing-screen-container">
      {/* Background Video Backdrop */}
      <div className="landing-video-backdrop">
        <video
          className="landing-bg-video"
          src="/lobby_animation.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="landing-video-overlay" />
        <div className="landing-scanline-fx" />
      </div>

      {/* Ambient Geometric Floating Shapes */}
      <div className="landing-geo-ambient" aria-hidden="true">
        <span className="geo-float-shape geo-1">○</span>
        <span className="geo-float-shape geo-2">△</span>
        <span className="geo-float-shape geo-3">□</span>
        <span className="geo-float-shape geo-4">○</span>
        <span className="geo-float-shape geo-5">△</span>
      </div>

      {/* Foreground Interactive Card */}
      <div className="landing-content-card">
        <div className="landing-brand-badge">
          <span className="brand-dot" />
          <span className="brand-text">IAE SQUID SURVIVAL</span>
        </div>

        <div className="landing-emblem-wrap">
          <img
            src="/squid_survival_logo.png"
            alt="IAE Squid Survival Emblem"
            className="landing-emblem-img"
          />
        </div>

        <h1 className="landing-title">
          Red Light, Green Light
        </h1>

        <p className="landing-subtitle">
          AI Quiz · Live Multiplayer · TCS Engineer Expo
        </p>

        {isRestricted && (
          <div style={{
            background: 'rgba(255, 45, 120, 0.16)',
            border: '1px solid rgba(255, 45, 120, 0.45)',
            color: '#ff94b8',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '16px',
            lineHeight: '1.45',
            textAlign: 'center',
          }}>
            🚫 <strong>Match Completed:</strong> You have already played today on this device. You will be able to watch live matches as a Spectator.
          </div>
        )}

        {/* Direct Player Join Box */}
        <div className="landing-join-box">
          <div className="landing-join-header">
            <span className="join-phone-icon"></span>
            <span>PLAYER JOIN</span>
          </div>

          <form onSubmit={handleJoin} className="landing-join-form">
            <input
              className="landing-room-input"
              placeholder="ENTER 4-LETTER CODE"
              maxLength={4}
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              autoFocus
            />
            <button
              type="submit"
              className="landing-btn-join"
              disabled={code.trim().length !== 4}
            >
              ⚡ Join Game
            </button>
          </form>
        </div>

        <div className="landing-divider">
          <span>— OR —</span>
        </div>

        <a href="?host=true" className="landing-btn-host">
          Host Login
        </a>

        <div className="landing-ghost-note">
          Tip: Players can scan the QR code displayed on the Host Screen to join instantly.
        </div>
      </div>
    </div>
  );
}

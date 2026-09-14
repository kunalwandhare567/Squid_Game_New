import React, { useEffect, useState } from 'react';
import { AudioProvider } from './context/AudioContext';
import HostApp from './components/Host/HostApp';
import PlayerApp from './components/Player/PlayerApp';
import { isDeviceRestricted, clearDeviceRestriction, REPLAY_PASSKEY } from './utils/replayRestrictions';
import { Lock } from 'lucide-react';

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
  const [repeatOverride, setRepeatOverride] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [passkeyError, setPasskeyError] = useState('');

  const isRestricted = !repeatOverride && isDeviceRestricted();

  function handleUnlockPasskey(e) {
    e?.preventDefault();
    if (passkey.trim() === REPLAY_PASSKEY) {
      clearDeviceRestriction();
      setRepeatOverride(true);
      setShowPasskey(false);
      setPasskeyError('');
    } else {
      setPasskeyError('Invalid passkey. Please check with host.');
    }
  }

  const handleJoin = (e) => {
    e?.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length === 4) {
      if (isRestricted) {
        window.location.search = `?room=${clean}&spec=true`;
      } else {
        window.location.search = `?room=${clean}`;
      }
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

        {/* Direct Player Join Box */}
        <div className="landing-join-box" style={isRestricted ? { borderColor: 'rgba(255, 45, 120, 0.45)' } : {}}>
          <div className="landing-join-header" style={isRestricted ? { color: '#ff8a8a' } : {}}>
            <span className="join-phone-icon"></span>
            <span>{isRestricted ? '🚫 REPLAY RESTRICTED (1 MATCH LIMIT)' : 'PLAYER JOIN'}</span>
          </div>

          {isRestricted && (
            <p style={{
              fontSize: '12.5px',
              color: '#cbd5e1',
              margin: '0 0 14px',
              textAlign: 'center',
              lineHeight: '1.45'
            }}>
              You have already played today on this device. Enter room code to <strong>watch as Spectator</strong>:
            </p>
          )}

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
              style={isRestricted ? {
                background: 'rgba(87, 255, 176, 0.15)',
                border: '1.5px solid #57ffb0',
                color: '#57ffb0'
              } : {}}
              disabled={code.trim().length !== 4}
            >
              {isRestricted ? '👁️ Watch Live Match as Spectator →' : '⚡ Join Game'}
            </button>
          </form>

          {isRestricted && (
            <div className="repeat-passkey-wrapper" style={{ marginTop: '12px' }}>
              {!showPasskey ? (
                <button
                  type="button"
                  className="repeat-passkey-trigger-btn"
                  onClick={() => {
                    setShowPasskey(true);
                    setPasskeyError('');
                  }}
                >
                  <Lock size={12} />
                  <span>Enter Host Passkey to Replay</span>
                </button>
              ) : (
                <form onSubmit={handleUnlockPasskey} className="repeat-passkey-form animate-fade-in" style={{ marginTop: '8px' }}>
                  <div className="passkey-input-row">
                    <input
                      type="password"
                      className="passkey-mini-input"
                      placeholder="Passkey"
                      maxLength={10}
                      value={passkey}
                      onChange={e => {
                        setPasskey(e.target.value);
                        setPasskeyError('');
                      }}
                      autoFocus
                    />
                    <button type="submit" className="passkey-unlock-btn" disabled={!passkey.trim()}>
                      Unlock ⚡
                    </button>
                  </div>
                  {passkeyError && <div className="passkey-error-text">⚠️ {passkeyError}</div>}
                  <button
                    type="button"
                    className="passkey-cancel-btn"
                    onClick={() => {
                      setShowPasskey(false);
                      setPasskey('');
                      setPasskeyError('');
                    }}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}
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

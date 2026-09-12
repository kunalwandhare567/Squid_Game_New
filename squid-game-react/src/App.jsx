import React, { useEffect, useState } from 'react';
import { AudioProvider } from './context/AudioContext';
import HostApp from './components/Host/HostApp';
import PlayerApp from './components/Player/PlayerApp';

/**
 * URL routing:
 *   ?host=true   → Host screen (open on laptop/projector)
 *   ?room=ABCD   → Player screen (QR code destination)
 *   (none)       → Landing page
 */
export default function App() {
  const [mode,     setMode]     = useState(null);
  const [roomCode, setRoomCode] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room   = params.get('room');
    const host   = params.get('host');
    if (room)       { setRoomCode(room.toUpperCase()); setMode('player'); }
    else if (host)  { setMode('host'); }
    else            { setMode('landing'); }
  }, []);

  if (!mode) return <div className="loading">Loading…</div>;

  return (
    <AudioProvider>
      {mode === 'host'    && <HostApp />}
      {mode === 'player'  && <PlayerApp roomCode={roomCode} />}
      {mode === 'landing' && <LandingPage />}
    </AudioProvider>
  );
}

function LandingPage() {
  const [code, setCode] = useState('');

  const handleJoin = (e) => {
    e?.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length === 4) {
      window.location.search = `?room=${clean}`;
    }
  };

  return (
    <div className="landing center">
      <div className="brand" style={{ fontSize: '14px', letterSpacing: '4px', marginBottom: '12px' }}>IAE SQUID GAME</div>
      <div style={{ fontSize: '72px', marginBottom: '12px' }}>🦑</div>
      <h1>Red Light, Green Light</h1>
      <p className="sub" style={{ margin: '0 auto 24px' }}>
        AI Quiz · Live multiplayer · TCS Engineer Expo
      </p>

      {/* Direct Player Join Form */}
      <div style={{ background: 'rgba(255,255,255,0.06)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(87,255,176,0.2)', width: '100%', maxWidth: '340px', marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#57ffb0', marginBottom: '12px', letterSpacing: '1px' }}>📱 PLAYER JOIN</div>
        <form onSubmit={handleJoin} style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          <input
            className="name-input"
            placeholder="Enter 4-Letter Room Code"
            maxLength={4}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            style={{ textTransform: 'uppercase', textAlign: 'center', letterSpacing: '4px', fontSize: '20px', fontWeight: '800' }}
          />
          <button
            type="submit"
            className="cta"
            disabled={code.trim().length !== 4}
            style={{ width: '100%', marginTop: '8px' }}
          >
            ⚡ Join Game
          </button>
        </form>
      </div>

      <div style={{ opacity: 0.7, fontSize: '13px', marginBottom: '16px' }}>— OR —</div>

      <a href="?host=true" className="cta-secondary" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '16px', padding: '12px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: '700' }}>
        📺 Open Host Screen (For Projector / Big Screen)
      </a>

      <div className="ghost-note">
        Tip: Players can also directly scan the QR code displayed on the host screen.
      </div>
    </div>
  );
}

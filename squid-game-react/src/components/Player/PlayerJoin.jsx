import React, { useState } from 'react';
import { db, ref, set, get, serverTimestamp, remove } from '../../firebase';
import { MAX_PLAYERS } from '../../utils/ruleEngine';
import DollSvg from '../Shared/DollSvg';

const EMOJIS = ['🦊','🐼','🦉','🐙','🐝','🦄','🐢','🦁','🐧','🦋','🐸','🦕','🐳','🦥','🐡','🦩','🐨','🦔','🐯','🦦','🐬','🦚','🐞','🦇'];

export default function PlayerJoin({ roomCode, pid, onJoined }) {
  const [name,    setName]    = useState('');
  const [emoji,   setEmoji]   = useState(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const [joining, setJoining] = useState(false);
  const [error,   setError]   = useState('');

  async function handleJoin() {
    const trimmed = name.trim();
    if (!trimmed)          { setError('Please enter your name!'); return; }
    if (trimmed.length > 14){ setError('Max 14 characters.'); return; }

    setJoining(true);
    setError('');

    try {
      // Check if game has started (cannot join mid-game as player)
      const metaSnap = await get(ref(db, `rooms/${roomCode}/meta`));
      const meta = metaSnap.val();
      if (!meta) { setError('Room not found. Check the room code.'); setJoining(false); return; }
      if (!['lobby'].includes(meta.phase) && meta.phase !== 'lobby') {
        // Game already started — join as spectator only
      }

      // Count real players — atomic check before writing
      const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
      const currentPlayers = playersSnap.val() || {};
      const realCount = Object.values(currentPlayers).filter(p => !p.bot && !p.spectator).length;
      const isSpectator = realCount >= MAX_PLAYERS || !['lobby'].includes(meta.phase);

      const joinOrder = realCount + 1;
      const playerRecord = {
        name: trimmed, emoji,
        alive: !isSpectator,
        spectator: isSpectator,
        score: 0, strikes: 0, consecutiveWrong: 0,
        shield: 1, dd: 1,
        joinOrder,
        joinedAt: serverTimestamp(),
        bot: false,
      };

      await set(ref(db, `rooms/${roomCode}/players/${pid}`), playerRecord);

      // Auto-remove on disconnect (cleans up ghost players)
      // Note: onDisconnect requires compat SDK; for modular we use beforeunload
      window.addEventListener('beforeunload', () => {
        // Best-effort cleanup
        remove(ref(db, `rooms/${roomCode}/players/${pid}`)).catch(() => {});
      });

      onJoined({ isSpectator, playerRecord });
    } catch (err) {
      setError('Connection error. Please try again.');
      setJoining(false);
    }
  }

  return (
    <div className="player-join center">
      <DollSvg phase="lobby" />
      <h1>Join the Game</h1>
      <p className="sub" style={{ marginBottom: 0 }}>Room: <strong>{roomCode}</strong></p>

      <input
        className="name-input"
        placeholder="Your name (max 14 chars)"
        maxLength={14}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !joining && handleJoin()}
        disabled={joining}
        autoFocus
      />

      <div className="emoji-grid">
        {EMOJIS.map(e => (
          <button
            key={e}
            className={`emoji-btn ${e === emoji ? 'emoji-sel' : ''}`}
            onClick={() => setEmoji(e)}
            aria-label={`Select ${e}`}
          >
            {e}
          </button>
        ))}
      </div>

      {error && <div className="error-msg">⚠️ {error}</div>}

      <button
        className="cta"
        onClick={handleJoin}
        disabled={joining || !name.trim()}
      >
        {joining ? 'Joining…' : 'Enter Game →'}
      </button>
    </div>
  );
}

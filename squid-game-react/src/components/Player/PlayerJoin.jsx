import React, { useState } from 'react';
import { supabase } from '../../supabase';
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
      // 1. Check room exists in Supabase
      const { data: roomData, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .maybeSingle();

      if (roomErr || !roomData) {
        setError('Room not found. Check the room code on the host screen.');
        setJoining(false);
        return;
      }

      // 2. Count existing real players
      const { data: playersList } = await supabase
        .from('players')
        .select('player_id, bot, spectator')
        .eq('room_code', roomCode);

      const realCount = (playersList || []).filter(p => !p.bot && !p.spectator).length;
      const isSpectator = realCount >= MAX_PLAYERS || !['lobby'].includes(roomData.phase);
      const joinOrder = realCount + 1;

      const playerRecord = {
        room_code: roomCode,
        player_id: pid,
        name: trimmed,
        emoji,
        alive: !isSpectator,
        spectator: isSpectator,
        score: 0,
        strikes: 0,
        consecutive_wrong: 0,
        shield: 0,
        dd: 0,
        join_order: joinOrder,
        bot: false,
        joined_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase.from('players').upsert(playerRecord);
      if (insertErr) {
        console.error('Join insert error:', insertErr);
        setError('Failed to join room. Please try again.');
        setJoining(false);
        return;
      }

      // Auto cleanup on disconnect / tab close
      window.addEventListener('beforeunload', () => {
        supabase.from('players').delete().eq('room_code', roomCode).eq('player_id', pid);
      });

      onJoined({
        isSpectator,
        playerRecord: {
          id: pid,
          ...playerRecord,
          consecutiveWrong: 0,
        },
      });
    } catch (err) {
      console.error(err);
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

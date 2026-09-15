import React, { useState, useMemo } from 'react';
import { supabase } from '../../supabase';
import { MAX_PLAYERS } from '../../utils/ruleEngine';
import DollSvg from '../Shared/DollSvg';
import { ShieldAlert, Lock, Eye, Calendar, Award } from 'lucide-react';
import { isDeviceRestricted, clearDeviceRestriction, REPLAY_PASSKEY } from '../../utils/replayRestrictions';

const EMOJIS = ['🦊','🐼','🦉','🐙','🐝','🦄','🐢','🦁','🐧','🦋','🐸','🦕','🐳','🦥','🐡','🦩','🐨','🦔','🐯','🦦','🐬','🦚','🐞','🦇'];

export default function PlayerJoin({ roomCode, pid, onJoined }) {
  const [name,    setName]    = useState('');
  const [emoji,   setEmoji]   = useState(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const [joining, setJoining] = useState(false);
  const [error,   setError]   = useState('');

  // ── Replay Passkey State ('0507' unlock) ─────────────────────────────
  const [repeatOverride,   setRepeatOverride]   = useState(false);
  const [showPasskeyInput, setShowPasskeyInput] = useState(false);
  const [passkey,          setPasskey]          = useState('');
  const [passkeyError,     setPasskeyError]     = useState('');

  function handleUnlockPasskey(e) {
    e?.preventDefault();
    if (passkey.trim() === REPLAY_PASSKEY) {
      clearDeviceRestriction();
      setRepeatOverride(true);
      setShowPasskeyInput(false);
      setPasskeyError('');
    } else {
      setPasskeyError('Invalid passkey. Please check with the host.');
    }
  }

  // ── 1. Startup Check: Read completion state reliably ─────
  const isRepeatPlayer = useMemo(() => {
    return isDeviceRestricted();
  }, []);

  async function handleSpectateOnly() {
    setJoining(true);
    setError('');
    try {
      const storedName = localStorage.getItem('sq_player_name') || sessionStorage.getItem('sq_player_name') || 'Spectator';
      const storedEmoji = localStorage.getItem('sq_player_emoji') || sessionStorage.getItem('sq_player_emoji') || '👁️';

      const playerRecord = {
        room_code: roomCode,
        player_id: pid,
        name: storedName,
        emoji: storedEmoji,
        alive: false,
        spectator: true,
        score: 0,
        strikes: 0,
        consecutive_wrong: 0,
        shield: 0,
        dd: 0,
        join_order: 999,
        bot: false,
        joined_at: new Date().toISOString(),
      };

      await supabase.from('players').upsert(playerRecord);

      onJoined({
        isSpectator: true,
        playerRecord: {
          id: pid,
          ...playerRecord,
        },
      });
    } catch (e) {
      onJoined({ isSpectator: true });
    }
  }

  async function handleJoin() {
    const trimmed = name.trim();
    if (!trimmed)          { setError('Please enter your name!'); return; }
    if (trimmed.length > 14){ setError('Max 14 characters.'); return; }

    if (joining) return;
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

      // 2. Check if this player already joined this room
      const { data: playersList } = await supabase
        .from('players')
        .select('*')
        .eq('room_code', roomCode);

      const existingPlayer = (playersList || []).find(p => p.player_id === pid);
      if (existingPlayer) {
        try {
          sessionStorage.setItem(`sq_joined_${roomCode}`, 'true');
          localStorage.setItem(`sq_joined_${roomCode}`, 'true');
          sessionStorage.setItem('sq_player_name', existingPlayer.name || trimmed);
          localStorage.setItem('sq_player_name', existingPlayer.name || trimmed);
          sessionStorage.setItem('sq_player_emoji', existingPlayer.emoji || emoji);
          localStorage.setItem('sq_player_emoji', existingPlayer.emoji || emoji);
        } catch (e) {}

        onJoined({
          isSpectator: Boolean(existingPlayer.spectator),
          playerRecord: {
            id: pid,
            ...existingPlayer,
            consecutiveWrong: existingPlayer.consecutive_wrong || 0,
          },
        });
        return;
      }

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

      try {
        sessionStorage.setItem(`sq_joined_${roomCode}`, 'true');
        localStorage.setItem(`sq_joined_${roomCode}`, 'true');
        sessionStorage.setItem('sq_player_name', trimmed);
        localStorage.setItem('sq_player_name', trimmed);
        sessionStorage.setItem('sq_player_emoji', emoji);
        localStorage.setItem('sq_player_emoji', emoji);
      } catch (e) {}

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

  // ── 2. Intercept Screen: Already Played Today Warning Card ───────────
  if (isRepeatPlayer && !repeatOverride) {
    return (
      <div className="player-join center repeat-player-screen">
        <DollSvg phase="lobby" />
        <div className="repeat-warning-card animate-pop-in">
          <div className="repeat-icon-wrap">
            <ShieldAlert size={36} color="#ff2d78" />
          </div>

          <span className="repeat-pill-badge">🚫 1 MATCH PER DAY LIMIT</span>
          <h1 className="repeat-title">ALREADY PLAYED TODAY</h1>

          <p className="repeat-desc">
            You have already participated in today’s IAE Squid Survival match. To ensure fair competition for all contestants, players can only play <strong>1 match per day</strong>.
          </p>

          <div className="repeat-info-box">
            <div className="repeat-info-row">
              <span className="info-lbl">📅 NEXT ATTEMPT:</span>
              <strong className="info-val">Tomorrow</strong>
            </div>
            <div className="repeat-info-row">
              <span className="info-lbl">🎮 ROOM CODE:</span>
              <strong className="info-val">{roomCode}</strong>
            </div>
          </div>

          <button
            className="cta-secondary repeat-spectate-btn"
            onClick={handleSpectateOnly}
            disabled={joining}
          >
            {joining ? 'Connecting…' : '👁️ Watch Live Match as Spectator →'}
          </button>

          {/* ── Passkey Replay Unlock Section ── */}
          <div className="repeat-passkey-wrapper">
            {!showPasskeyInput ? (
              <button
                className="repeat-passkey-trigger-btn"
                onClick={() => {
                  setShowPasskeyInput(true);
                  setPasskeyError('');
                }}
              >
                <Lock size={12} />
                <span>Enter Passkey to Replay</span>
              </button>
            ) : (
              <form onSubmit={handleUnlockPasskey} className="repeat-passkey-form animate-fade-in">
                <div className="passkey-input-row">
                  <input
                    type="password"
                    className="passkey-mini-input"
                    placeholder="Enter Passkey"
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
                    setShowPasskeyInput(false);
                    setPasskey('');
                    setPasskeyError('');
                  }}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-join center">
      <DollSvg phase="lobby" />
      <h1>Join the Game</h1>
      <p className="sub" style={{ marginBottom: 0 }}>Room: <strong>{roomCode}</strong></p>

      <input
        className="name-input"
        placeholder="Enter your name…"
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

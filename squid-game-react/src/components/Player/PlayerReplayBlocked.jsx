import React, { useState } from 'react';
import { ShieldAlert, Lock, Eye } from 'lucide-react';
import DollSvg from '../Shared/DollSvg';
import { supabase } from '../../supabase';
import { REPLAY_PASSKEY, clearDeviceRestriction } from '../../utils/replayRestrictions';

export default function PlayerReplayBlocked({ roomCode, pid, onJoined, onUnlocked }) {
  const [showPasskeyInput, setShowPasskeyInput] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [joining, setJoining] = useState(false);

  function handleUnlockPasskey(e) {
    e?.preventDefault();
    if (passkey.trim() === REPLAY_PASSKEY) {
      clearDeviceRestriction();
      if (onUnlocked) {
        onUnlocked();
      }
    } else {
      setPasskeyError('Invalid passkey. Please check with the host.');
    }
  }

  async function handleSpectateOnly() {
    setJoining(true);
    setPasskeyError('');
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

      if (onJoined) {
        onJoined({
          isSpectator: true,
          playerRecord,
        });
      }
    } catch (err) {
      console.error('Spectator join error:', err);
      // Fallback local join if Supabase is offline
      if (onJoined) {
        onJoined({
          isSpectator: true,
          playerRecord: { id: pid, spectator: true, alive: false, name: 'Spectator' },
        });
      }
    } finally {
      setJoining(false);
    }
  }

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
          You have already participated in today’s IAE Squid Survival match on this device.
          To ensure fair competition, contestants are limited to <strong>1 match per day</strong>.
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

        {/* Passkey Replay Unlock Section */}
        <div className="repeat-passkey-wrapper">
          {!showPasskeyInput ? (
            <button
              type="button"
              className="repeat-passkey-trigger-btn"
              onClick={() => {
                setShowPasskeyInput(true);
                setPasskeyError('');
              }}
            >
              <Lock size={12} />
              <span>Enter Host Passkey to Replay</span>
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

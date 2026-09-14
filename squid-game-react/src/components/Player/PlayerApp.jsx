import React, { useState, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import { GameProvider, useGame } from '../../context/GameContext';
import { usePlayerSession } from '../../hooks/usePlayerSession';
import { GREEN_DURATION_SECS } from '../../utils/ruleEngine';
import { isDeviceRestricted, markDeviceCompleted } from '../../utils/replayRestrictions';
import PlayerJoin    from './PlayerJoin';
import PlayerWait    from './PlayerWait';
import PlayerAnswer  from './PlayerAnswer';
import PlayerVerdict from './PlayerVerdict';
import PlayerSpectate from './PlayerSpectate';
import PlayerEnd     from './PlayerEnd';
import PlayerReplayBlocked from './PlayerReplayBlocked';

export default function PlayerApp({ roomCode }) {
  return (
    <GameProvider roomCode={roomCode}>
      <PlayerController roomCode={roomCode} />
    </GameProvider>
  );
}

function PlayerController({ roomCode }) {
  const { state } = useGame();
  const { pid } = usePlayerSession();
  const audio   = useAudio();

  const [repeatOverride, setRepeatOverride] = useState(false);
  const isRestricted = !repeatOverride && isDeviceRestricted();

  // Auto-detect if player was already joined in this room session (unless restricted)
  const [joined, setJoined] = useState(() => {
    try {
      if (isDeviceRestricted()) return false;
      return sessionStorage.getItem(`sq_joined_${roomCode}`) === 'true';
    } catch (e) {
      return false;
    }
  });
  const [isSpec, setIsSpec] = useState(false);
  const [myChoiceId, setMyChoiceId] = useState(null);

  const meta     = state?.meta || {};
  const phase    = state?.phase || state?.meta?.phase || meta?.phase || 'lobby';
  const question = state?.question || null;
  const me       = state?.players?.[pid] || null;

  // Auto-sync joined state when player record arrives from Supabase (unless replay-restricted)
  useEffect(() => {
    if (isRestricted && !isSpec && phase !== 'gameover') {
      try {
        sessionStorage.removeItem(`sq_joined_${roomCode}`);
      } catch (e) {}
      setJoined(false);
      return;
    }

    if (me && !joined) {
      setJoined(true);
      setIsSpec(Boolean(me.spectator));
      try {
        sessionStorage.setItem(`sq_joined_${roomCode}`, 'true');
      } catch (e) {}
    }
  }, [me, joined, roomCode, isRestricted, isSpec, phase]);

  const isEliminated = me ? (!me.alive && !me.spectator) : false;

  const [verdictStatus, setVerdictStatus] = useState('safe');

  // Mark game as completed for today when game finishes
  useEffect(() => {
    if (phase === 'gameover') {
      markDeviceCompleted();
    }
  }, [phase]);

  // Reset answer selection ONLY when a new question round starts
  useEffect(() => {
    if (phase === 'question') {
      setMyChoiceId(null);
      setVerdictStatus('safe');
      try {
        sessionStorage.removeItem('sq_last_choice');
      } catch (e) {}
    }
  }, [phase, question?.id]);

  // Manage round audio cues and ensure beats stop when phase transitions
  useEffect(() => {
    if (!joined) return;

    if (phase === 'question') {
      audio.stopBeat();
      audio.startBeat(GREEN_DURATION_SECS * 1000);
    } else {
      audio.stopBeat();
    }

    return () => {
      audio.stopBeat();
    };
  }, [phase, question?.id, joined]);

  function handleJoined({ isSpectator }) {
    audio.ensureAC();
    setJoined(true);
    setIsSpec(isSpectator);
  }

  const currentRoundKey = meta.rkey || (meta.qIndex != null ? `r${meta.qIndex}` : 'r0');
  const roundNum = meta.qIndex != null ? meta.qIndex + 1 : 1;
  const totalRounds = meta.totalRounds || 10;
  const aliveCount = Object.values(state?.players || {}).filter(p => p.alive && !p.spectator).length;
  const totalCount = Object.values(state?.players || {}).filter(p => !p.spectator).length;

  let content = null;

  if (phase === 'gameover') {
    content = (
      <PlayerEnd
        me={me}
        players={state?.players || {}}
        totalRounds={totalRounds}
        pid={pid}
      />
    );
  } else if (isSpec) {
    content = <PlayerSpectate phase={phase} question={question} />;
  } else if (isRestricted) {
    content = (
      <PlayerReplayBlocked
        roomCode={roomCode}
        pid={pid}
        onJoined={handleJoined}
        onUnlocked={() => setRepeatOverride(true)}
      />
    );
  } else if (!joined) {
    content = <PlayerJoin roomCode={roomCode} pid={pid} onJoined={handleJoined} />;
  } else if (phase === 'lobby') {
    content = <PlayerWait me={me} title="🎮 IN LOBBY" message="You're connected! Waiting for the host to start the game…" type="lobby" />;
  } else if ((phase === 'question' || phase === 'locked') && isEliminated) {
    content = (
      <PlayerWait
        me={me}
        type="eliminated"
        title="💀 ELIMINATED (3 STRIKES)"
        message="You were eliminated after 3 consecutive wrong answers and cannot continue. Watch the remaining finalists compete on the big screen!"
      />
    );
  } else if (phase === 'question' || phase === 'locked') {
    content = (
      <PlayerAnswer
        key={question?.id || currentRoundKey}
        roomCode={roomCode} pid={pid}
        question={question} locked={phase === 'locked'}
        me={me} roundKey={currentRoundKey}
        roundNum={roundNum} totalRounds={totalRounds}
        aliveCount={aliveCount} totalCount={totalCount}
        startTimeMs={meta?.startedAt}
        myChoiceId={myChoiceId} setMyChoiceId={setMyChoiceId}
      />
    );
  } else if (phase === 'reveal') {
    content = (
      <PlayerVerdict
        me={me}
        question={question}
        myChoiceId={myChoiceId}
        roundKey={currentRoundKey}
        roomCode={roomCode}
        roundNum={roundNum}
        totalRounds={totalRounds}
        onVerdictResult={setVerdictStatus}
      />
    );
  } else {
    content = <PlayerWait me={me} />;
  }

  const isWrongVerdict = phase === 'reveal' && (verdictStatus === 'wrong' || verdictStatus === 'eliminated');
  const appBgClass = phase === 'question'
    ? 'bg-green'
    : phase === 'locked'
    ? 'bg-red'
    : isWrongVerdict
    ? 'bg-wrong-blink'
    : phase === 'reveal'
    ? 'bg-green'
    : '';

  return (
    <div className={`app ${appBgClass}`}>
      <div className="bg-layer" />
      <div className="tint-layer" />
      <div className="flash-layer" id="flash-layer" />
      <div className="player-root">
        {content}
      </div>
    </div>
  );
}

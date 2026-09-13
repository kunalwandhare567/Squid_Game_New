// =====================================================================
// PlayerApp.jsx — Player root. Listens to Supabase via GameContext,
// routes phase screens. Uses sessionStorage pid so phone refresh = same player.
// =====================================================================
import React, { useState, useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import { GameProvider, useGame } from '../../context/GameContext';
import { usePlayerSession } from '../../hooks/usePlayerSession';
import PlayerJoin    from './PlayerJoin';
import PlayerWait    from './PlayerWait';
import PlayerAnswer  from './PlayerAnswer';
import PlayerVerdict from './PlayerVerdict';
import PlayerRevival from './PlayerRevival';
import PlayerSpectate from './PlayerSpectate';
import PlayerEnd     from './PlayerEnd';

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

  const [joined,    setJoined]    = useState(false);
  const [isSpec,    setIsSpec]    = useState(false);
  const [myChoiceId,setMyChoiceId]= useState(null);

  const meta     = state?.meta || {};
  const phase    = state?.phase || 'lobby';
  const question = state?.question || null;
  const me       = state?.players?.[pid] || null;

  const isEliminated = me ? (!me.alive && !me.spectator) : false;

  const [verdictStatus, setVerdictStatus] = useState('safe');

  // Reset answer selection ONLY when a new question round starts
  useEffect(() => {
    if (phase === 'question' || phase === 'revival') {
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

    if (phase === 'question' || phase === 'revival') {
      audio.stopBeat();
      audio.startBeat(10000);
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
  const totalRounds = meta.totalRounds || 7;
  const aliveCount = Object.values(state?.players || {}).filter(p => p.alive && !p.spectator).length;
  const totalCount = Object.values(state?.players || {}).filter(p => !p.spectator).length;

  let content = null;

  if (!joined) {
    content = <PlayerJoin roomCode={roomCode} pid={pid} onJoined={handleJoined} />;
  } else if (isSpec) {
    content = <PlayerSpectate phase={phase} question={question} />;
  } else if (phase === 'lobby') {
    content = <PlayerWait me={me} title="🎮 IN LOBBY" message="You're connected! Waiting for the host to start the game…" type="lobby" />;
  } else if (phase === 'gameover') {
    content = (
      <PlayerEnd
        me={me}
        players={state?.players || {}}
        totalRounds={totalRounds}
        pid={pid}
      />
    );
  } else if (phase === 'revival') {
    if (!isEliminated) {
      content = (
        <PlayerWait
          me={me}
          type="safe"
          title="🛡️ YOU ARE SAFE & ADVANCING!"
          message="You survived! Eliminated players are currently competing in a 1-question Revival Challenge. Round 3 will begin immediately after."
        />
      );
    } else {
      content = (
        <PlayerAnswer
          key={question?.id || 'rev'}
          roomCode={roomCode} pid={pid}
          question={question} locked={false}
          me={me} roundKey="rev"
          roundNum={roundNum} totalRounds={totalRounds}
          aliveCount={aliveCount} totalCount={totalCount}
          isRevival={true}
          myChoiceId={myChoiceId} setMyChoiceId={setMyChoiceId}
        />
      );
    }
  } else if (phase === 'revreveal') {
    content = <PlayerRevival me={me} />;
  } else if ((phase === 'question' || phase === 'locked') && isEliminated) {
    const hasUpcomingRevival = roundNum <= 2;
    content = (
      <PlayerWait
        me={me}
        type="eliminated"
        title="💀 ELIMINATED (3 STRIKES)"
        message={
          hasUpcomingRevival
            ? "You reached 3 consecutive wrong answers and are out. Watch the big screen — you will get ONE chance in the Revival Round after Round 2 to re-enter!"
            : "You were eliminated after 3 consecutive wrong answers and cannot continue. Watch the remaining finalists compete on the big screen!"
        }
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
        isRevival={false}
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
        onVerdictResult={setVerdictStatus}
      />
    );
  } else {
    content = <PlayerWait me={me} />;
  }

  const isWrongVerdict = phase === 'reveal' && (verdictStatus === 'wrong' || verdictStatus === 'eliminated');
  const appBgClass = phase === 'question' || phase === 'revival'
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

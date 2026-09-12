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

  // React to phase audio cues
  useEffect(() => {
    if (!joined) return;
    if (phase === 'question' || phase === 'revival') {
      setMyChoiceId(null);
      audio.startBeat(10000);
    }
    if (phase === 'locked' || phase === 'reveal' || phase === 'gameover') {
      audio.stopBeat();
    }
  }, [phase, joined]);

  function handleJoined({ isSpectator }) {
    audio.ensureAC();
    setJoined(true);
    setIsSpec(isSpectator);
  }

  let content = null;

  if (!joined) {
    content = <PlayerJoin roomCode={roomCode} pid={pid} onJoined={handleJoined} />;
  } else if (isSpec) {
    content = <PlayerSpectate phase={phase} question={question} />;
  } else if (phase === 'lobby') {
    content = <PlayerWait me={me} />;
  } else if (phase === 'gameover') {
    content = <PlayerEnd me={me} />;
  } else if (phase === 'revival') {
    if (!isEliminated) {
      content = <PlayerWait me={me} message="Revival round — eliminated players are competing. Sit tight…" />;
    } else {
      content = (
        <PlayerAnswer
          roomCode={roomCode} pid={pid}
          question={question} locked={false}
          me={me} roundKey="rev"
          myChoiceId={myChoiceId} setMyChoiceId={setMyChoiceId}
        />
      );
    }
  } else if (phase === 'revreveal') {
    content = <PlayerRevival me={me} />;
  } else if (phase === 'question' && isEliminated) {
    content = <PlayerWait me={me} message="You're eliminated. Watch on the big screen — revival round may save you!" />;
  } else if (phase === 'question' || phase === 'locked') {
    content = (
      <PlayerAnswer
        roomCode={roomCode} pid={pid}
        question={question} locked={phase === 'locked'}
        me={me} roundKey={`r${meta.qIndex ?? 0}`}
        myChoiceId={myChoiceId} setMyChoiceId={setMyChoiceId}
      />
    );
  } else if (phase === 'reveal') {
    content = <PlayerVerdict me={me} question={question} myChoiceId={myChoiceId} />;
  } else {
    content = <PlayerWait me={me} />;
  }

  return (
    <div className={`app ${phase === 'question' || phase === 'revival' ? 'bg-green' : phase === 'locked' ? 'bg-red' : ''}`}>
      <div className="bg-layer" />
      <div className="tint-layer" />
      <div className="flash-layer" id="flash-layer" />
      <div className="player-root">
        {content}
      </div>
    </div>
  );
}

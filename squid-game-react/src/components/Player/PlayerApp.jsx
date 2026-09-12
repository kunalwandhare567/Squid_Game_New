// =====================================================================
// PlayerApp.jsx — Player root. Listens to Firebase, routes phase screens.
// Uses sessionStorage pid so phone refresh = same player, no ghost.
// =====================================================================
import React, { useState, useEffect, useRef } from 'react';
import { db, ref, set, onValue, off, serverTimestamp, remove } from '../../firebase';
import { useAudio } from '../../context/AudioContext';
import { GameProvider } from '../../context/GameContext';
import { usePlayerSession } from '../../hooks/usePlayerSession';
import { MAX_PLAYERS } from '../../utils/ruleEngine';
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
  const { pid } = usePlayerSession();
  const audio   = useAudio();

  const [joined,    setJoined]    = useState(false);
  const [isSpec,    setIsSpec]    = useState(false);
  const [me,        setMe]        = useState(null);
  const [phase,     setPhase]     = useState('lobby');
  const [question,  setQuestion]  = useState(null);
  const [myChoiceId,setMyChoiceId]= useState(null);
  const [meta,      setMeta]      = useState({});
  const unsubRefs = useRef([]);

  const isEliminated = me ? (!me.alive && !me.spectator) : false;

  // Subscribe after joining
  function subscribe() {
    const metaRef      = ref(db, `rooms/${roomCode}/meta`);
    const questionRef  = ref(db, `rooms/${roomCode}/question`);
    const meRef        = ref(db, `rooms/${roomCode}/players/${pid}`);

    const u1 = onValue(metaRef, snap => {
      const m = snap.val() || {};
      setMeta(m);
      setPhase(m.phase || 'lobby');
      // New question starts — reset answer
      if (m.phase === 'question' || m.phase === 'revival') {
        setMyChoiceId(null);
        audio.startBeat(10000);
      }
      if (m.phase === 'locked' || m.phase === 'reveal') audio.stopBeat();
      if (m.phase === 'gameover') audio.stopBeat();
    });

    const u2 = onValue(questionRef, snap => setQuestion(snap.val()));

    const u3 = onValue(meRef, snap => {
      const p = snap.val();
      if (p) setMe(p);
    });

    unsubRefs.current = [
      () => off(metaRef,     'value', u1),
      () => off(questionRef, 'value', u2),
      () => off(meRef,       'value', u3),
    ];
  }

  function handleJoined({ isSpectator }) {
    audio.ensureAC(); // Resume AudioContext after user gesture
    setJoined(true);
    setIsSpec(isSpectator);
    subscribe();
  }

  useEffect(() => () => unsubRefs.current.forEach(u => u()), []);

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

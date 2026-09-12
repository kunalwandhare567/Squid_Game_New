// =====================================================================
// HostApp.jsx — Host root component. Manages all game phases and
// Firebase writes. This is the authoritative game controller.
// =====================================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { db, ref, set, update, get, onValue, off, serverTimestamp, remove } from '../../firebase';
import { useAudio } from '../../context/AudioContext';
import { GameProvider, useGame } from '../../context/GameContext';
import {
  buildGameSet, resolveRound, resolveRevival, determineWinner,
  generateRoomCode, ROUNDS, REVIVE_AFTER_ROUND, REVIVE_MAX,
  MAX_PLAYERS, MIN_PLAYERS, ANSWER_FRAC, GRACE_PERIOD_MS,
  GREEN_DURATION_SECS, CONSECUTIVE_WRONG_LIMIT
} from '../../utils/ruleEngine';
import { QUESTIONS } from '../../data/questions';
import HostLobby    from './HostLobby';
import HostQuestion from './HostQuestion';
import HostReveal   from './HostReveal';
import HostRevival  from './HostRevival';
import HostPodium   from './HostPodium';
import { Volume2, VolumeX, Power } from 'lucide-react';

const EMOJIS = ['🦊','🐼','🦉','🐙','🐝','🦄','🐢','🦁','🐧','🦋','🐸','🦕','🐳','🦥','🐡','🦩','🐨','🦔','🐯','🦦','🐬','🦚','🐞','🦇'];
const BOT_NAMES = ['Ravi','Meera','Aryan','Divya','Shrish','Kabir','Anya','Rohan','Sara','Vik','Nisha','Dev','Tara','Arjun'];

export default function HostApp() {
  const [roomCode]  = useState(generateRoomCode);
  return (
    <GameProvider roomCode={roomCode}>
      <HostController roomCode={roomCode} />
    </GameProvider>
  );
}

function HostController({ roomCode }) {
  const { state } = useGame();
  const audio = useAudio();

  // ── Host-only state (not in Firebase) ─────────────────────────────────
  const [phase,        setPhase]        = useState('lobby');
  const [gameQuestions, setGameQuestions] = useState([]);
  const [roundIndex,   setRoundIndex]   = useState(0);
  const [isRevival,    setIsRevival]    = useState(false);
  const [revivalDone,  setRevivalDone]  = useState(false);
  const [revealData,   setRevealData]   = useState(null); // { results, eliminations, survivors }
  const [revivalResult,setRevivalResult]= useState(null); // { revivedIds }
  const [isMuted,      setIsMuted]      = useState(false);
  const [isVoiceOn,    setIsVoiceOn]    = useState(true);
  const [botCount,     setBotCount]     = useState(0);
  const [greenStartAt, setGreenStartAt] = useState(0);
  const [hostLight,    setHostLight]    = useState('green');

  const rootRef   = useRef(null);
  const lockGuard = useRef(false); // prevents double-lockIn
  const answersRef= useRef({});
  const botSeq    = useRef(0);
  const botIds    = useRef(new Set());

  const joinURL = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  // ── Initialise Firebase room ───────────────────────────────────────────
  useEffect(() => {
    audio.ensureAC();
    const root = ref(db, `rooms/${roomCode}`);
    rootRef.current = root;

    set(ref(db, `rooms/${roomCode}/meta`), {
      phase: 'lobby', qIndex: 0, roomCode,
      hostAlive: true, maxPlayers: MAX_PLAYERS, minPlayers: MIN_PLAYERS,
    });

    // Auto-set hostAlive=false when tab closes
    // (requires firebase compat for onDisconnect — using simple set for now)
    return () => {
      // Cleanup room on component unmount
      // remove(root);
    };
  }, [roomCode]);

  // ── Listen to live answers during question phase ───────────────────────
  useEffect(() => {
    if (phase !== 'question' && phase !== 'revival') return;
    const rkey = isRevival ? 'rev' : `r${roundIndex}`;
    const answersDbRef = ref(db, `rooms/${roomCode}/answers/${rkey}`);
    const unsub = onValue(answersDbRef, snap => {
      answersRef.current = snap.val() || {};
    });
    return () => off(answersDbRef, 'value', unsub);
  }, [phase, roundIndex, isRevival, roomCode]);

  // ── Helper: get players as array ──────────────────────────────────────
  const getPlayers = useCallback((filter = 'alive') => {
    const all = Object.entries(state.players || {}).map(([id, p]) => ({ id, ...p }));
    if (filter === 'alive')    return all.filter(p => p.alive && !p.spectator);
    if (filter === 'dead')     return all.filter(p => !p.alive && !p.spectator);
    if (filter === 'all')      return all;
    return all;
  }, [state.players]);

  // ── Bots ──────────────────────────────────────────────────────────────
  async function addBot() {
    const n  = botSeq.current++;
    const id = `bot_${n}`;
    botIds.current.add(id);
    const rec = {
      name: BOT_NAMES[n % BOT_NAMES.length] + '_Bot',
      emoji: EMOJIS[n % EMOJIS.length],
      alive: true, spectator: false, score: 0, strikes: 0,
      consecutiveWrong: 0, shield: 1, dd: 1,
      joinOrder: 99 + n, bot: true,
    };
    await set(ref(db, `rooms/${roomCode}/players/${id}`), rec);
    setBotCount(c => c + 1);
  }

  async function removeBot() {
    const ids = [...botIds.current];
    if (!ids.length) return;
    const id = ids[ids.length - 1];
    botIds.current.delete(id);
    await remove(ref(db, `rooms/${roomCode}/players/${id}`));
    setBotCount(c => Math.max(0, c - 1));
  }

  // ── Start game ────────────────────────────────────────────────────────
  async function startGame() {
    const qs = buildGameSet(QUESTIONS, ROUNDS);
    setGameQuestions(qs);
    setRoundIndex(0);
    setRevivalDone(false);
    await beginRound(qs, 0, false);
  }

  // ── Begin a round ─────────────────────────────────────────────────────
  async function beginRound(qs, idx, revival) {
    lockGuard.current = false;
    const q    = qs[revival ? ROUNDS : idx];
    const rkey = revival ? 'rev' : `r${idx}`;

    setPhase(revival ? 'revival' : 'question');
    setIsRevival(revival);
    answersRef.current = {};

    // Write question WITHOUT correctId (anti-cheat)
    await set(ref(db, `rooms/${roomCode}/question`), {
      id: q.id, text: q.text, options: q.options,
      correctId: null, // hidden until reveal
      why: q.why, revival: !!revival,
    });

    // Write meta — capture server timestamp
    await set(ref(db, `rooms/${roomCode}/meta`), {
      phase: revival ? 'revival' : 'question',
      qIndex: idx, rkey, roomCode, hostAlive: true,
      maxPlayers: MAX_PLAYERS, minPlayers: MIN_PLAYERS,
      startedAt: serverTimestamp(),
    });

    // Read back the server timestamp for accurate speed scoring
    const metaSnap = await get(ref(db, `rooms/${roomCode}/meta/startedAt`));
    setGreenStartAt(metaSnap.val() || Date.now());

    audio.say(q.text);
    audio.startBeat(GREEN_DURATION_SECS * 1000);

    // Schedule bot answers
    scheduleBots(q, rkey, revival);
  }

  // ── Schedule bot answers ──────────────────────────────────────────────
  function scheduleBots(q, rkey, revival) {
    const bots = [...botIds.current]
      .filter(id => {
        const p = state.players[id];
        return p && (revival ? !p.alive : p.alive);
      });

    bots.forEach(id => {
      const delay    = 800 + Math.random() * 7000;
      const accuracy = 0.82 - roundIndex * 0.04; // bots get slightly worse over time
      setTimeout(async () => {
        const p = state.players?.[id];
        if (!p) return;
        const correct = Math.random() < accuracy;
        const allKeys = Object.keys(q.options);
        const choice  = correct
          ? q.correctId
          : allKeys.filter(k => k !== q.correctId)[Math.floor(Math.random() * 3)];
        await set(ref(db, `rooms/${roomCode}/answers/${rkey}/${id}`), {
          choiceId: choice, submittedAt: serverTimestamp(), ddOn: false, shieldOn: false,
        });
      }, delay);
    });
  }

  // ── Lock (red light drops) ────────────────────────────────────────────
  const handleLock = useCallback(async () => {
    if (lockGuard.current) return; // prevents double-lockIn
    lockGuard.current = true;

    audio.stopBeat();
    audio.sfxRedLight();
    audio.say('Red light!');

    // Write locked phase
    await update(ref(db, `rooms/${roomCode}/meta`), { phase: 'locked' });

    // GRACE PERIOD: wait 1200ms before reading answers
    // This ensures last-second answers submitted before lockedAt are captured
    await new Promise(r => setTimeout(r, GRACE_PERIOD_MS));

    // Read all answers exactly once after grace period
    const rkey       = isRevival ? 'rev' : `r${roundIndex}`;
    const answersSnap = await get(ref(db, `rooms/${roomCode}/answers/${rkey}`));
    const answers     = answersSnap.val() || {};
    const q           = gameQuestions[isRevival ? ROUNDS : roundIndex];

    if (isRevival) {
      await doRevivalResolve(answers, q);
    } else {
      await doResolve(answers, q);
    }
  }, [lockGuard, isRevival, roundIndex, gameQuestions, roomCode, greenStartAt]);

  // ── Resolve normal round ──────────────────────────────────────────────
  async function doResolve(answers, q) {
    const alivePlayers = getPlayers('alive');
    const { results, eliminations, survivors, newPlayerStates } =
      resolveRound(alivePlayers, answers, q.correctId, greenStartAt);

    // Write correctId NOW (reveal phase)
    await update(ref(db, `rooms/${roomCode}/question`), { correctId: q.correctId, why: q.why });

    // Apply updated player states to Firebase
    const updates = {};
    Object.values(newPlayerStates).forEach(ps => {
      updates[`rooms/${roomCode}/players/${ps.id}/score`]            = ps.score;
      updates[`rooms/${roomCode}/players/${ps.id}/alive`]            = ps.alive;
      updates[`rooms/${roomCode}/players/${ps.id}/consecutiveWrong`] = ps.consecutiveWrong;
      updates[`rooms/${roomCode}/players/${ps.id}/shield`]           = ps.shield ?? 1;
    });
    await update(ref(db), updates);

    await update(ref(db, `rooms/${roomCode}/meta`), { phase: 'reveal' });

    setRevealData({ results, eliminations, survivors, question: q, answers });
    setPhase('reveal');

    if (eliminations.length > 0) audio.sfxEliminated();
    else audio.sfxCorrect();
  }

  // ── Resolve revival round ─────────────────────────────────────────────
  async function doRevivalResolve(answers, q) {
    const eliminated = getPlayers('dead');
    const revivedIds = resolveRevival(eliminated, answers, q.correctId, greenStartAt);

    await update(ref(db, `rooms/${roomCode}/question`), { correctId: q.correctId, why: q.why });

    // Revive players in Firebase + reset their strike count
    const updates = {};
    revivedIds.forEach(id => {
      updates[`rooms/${roomCode}/players/${id}/alive`]            = true;
      updates[`rooms/${roomCode}/players/${id}/consecutiveWrong`] = 0;
    });
    if (Object.keys(updates).length) await update(ref(db), updates);

    await update(ref(db, `rooms/${roomCode}/meta`), { phase: 'revreveal' });

    setRevivalResult({ revivedIds, question: q });
    setRevivalDone(true);
    setPhase('revreveal');
    if (revivedIds.length > 0) audio.sfxRevival();
  }

  // ── Proceed to next round ─────────────────────────────────────────────
  async function handleNext() {
    const aliveCount = getPlayers('alive').length;
    const nextIndex  = isRevival ? REVIVE_AFTER_ROUND : roundIndex + 1;

    if (nextIndex >= ROUNDS || aliveCount <= 1) {
      // Game over
      await update(ref(db, `rooms/${roomCode}/meta`), { phase: 'gameover' });
      setPhase('gameover');
      audio.sfxWin();
      audio.say(`${determineWinner(getPlayers('all'))?.name || 'The winner'} wins the game!`);
      return;
    }

    // Check revival
    const deadCount = getPlayers('dead').length;
    if (nextIndex === REVIVE_AFTER_ROUND && !revivalDone && deadCount > 0) {
      setRoundIndex(REVIVE_AFTER_ROUND);
      await beginRound(gameQuestions, REVIVE_AFTER_ROUND, true);
      return;
    }

    setRoundIndex(nextIndex);
    await beginRound(gameQuestions, nextIndex, false);
  }

  // ── Restart ───────────────────────────────────────────────────────────
  async function handleRestart() {
    await remove(ref(db, `rooms/${roomCode}`));
    window.location.reload();
  }

  // ── Mute / Voice toggles ──────────────────────────────────────────────
  function toggleMute() {
    const next = !isMuted;
    setIsMuted(next);
    audio.setMuted(next);
  }
  function toggleVoice() {
    const next = !isVoiceOn;
    setIsVoiceOn(next);
    audio.setVoiceOn(next);
  }

  // ── Render phase ──────────────────────────────────────────────────────
  const topControls = (
    <div className="top-controls">
      <span className="brand">IAE SQUID GAME</span>
      <div className="ctrl-btns">
        <button className="icon-btn" onClick={toggleMute} title="Sound">
          {isMuted ? <VolumeX size={18} color="#ff8a8a" /> : <Volume2 size={18} color="#57ffb0" />}
        </button>
        <button className="icon-btn" onClick={() => confirm('Exit game?') && handleRestart()} title="Exit">
          <Power size={18} color="#ff2d78" />
        </button>
      </div>
    </div>
  );

  const appBgClass = (phase === 'question' || phase === 'revival')
    ? (hostLight === 'red' || hostLight === 'fake-red' ? 'bg-red' : hostLight === 'alert' ? 'bg-alert' : 'bg-green')
    : phase === 'locked'
    ? 'bg-red'
    : '';

  return (
    <div className={`app ${appBgClass}`}>
      {/* Fixed background layers */}
      <div className="bg-layer" />
      <div className="tint-layer" />
      <div className="flash-layer" id="flash-layer" />

      <div className="host-root">
        {topControls}

        {phase === 'lobby' && (
          <HostLobby
            roomCode={roomCode}
            joinURL={joinURL}
            onStart={startGame}
            onAddBot={addBot}
            onRemoveBot={removeBot}
            botCount={botCount}
          />
        )}

        {(phase === 'question' || phase === 'revival') && gameQuestions.length > 0 && (
          <HostQuestion
            question={gameQuestions[isRevival ? ROUNDS : roundIndex]}
            roundNum={roundIndex + 1}
            totalRounds={ROUNDS}
            isRevival={isRevival}
            aliveCount={getPlayers(isRevival ? 'dead' : 'alive').length}
            onLock={handleLock}
            onLightChange={setHostLight}
          />
        )}

        {phase === 'reveal' && revealData && (
          <HostReveal
            {...revealData}
            roundNum={roundIndex + 1}
            totalRounds={ROUNDS}
            onNext={handleNext}
          />
        )}

        {phase === 'revreveal' && revivalResult && (
          <HostRevival
            revivedIds={revivalResult.revivedIds}
            players={state.players}
            onNext={handleNext}
          />
        )}

        {phase === 'gameover' && (
          <HostPodium
            players={state.players}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  );
}

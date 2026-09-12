// =====================================================================
// HostApp.jsx — Host root component. Manages all game phases and
// Supabase writes. This is the authoritative game controller.
// =====================================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
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

  // ── Host-only state ───────────────────────────────────────────────────
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

  const lockGuard = useRef(false); // prevents double-lockIn
  const answersRef= useRef({});
  const botSeq    = useRef(0);
  const botIds    = useRef(new Set());

  const joinURL = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  // ── Initialise Supabase room ──────────────────────────────────────────
  useEffect(() => {
    audio.ensureAC();

    async function initRoom() {
      await supabase.from('rooms').upsert({
        room_code: roomCode,
        phase: 'lobby',
        q_index: 0,
        meta: {
          hostAlive: true,
          maxPlayers: MAX_PLAYERS,
          minPlayers: MIN_PLAYERS,
        },
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    initRoom();
  }, [roomCode]);

  // ── Listen to live answers during question phase ───────────────────────
  useEffect(() => {
    if (phase !== 'question' && phase !== 'revival') return;
    const rkey = isRevival ? 'rev' : `r${roundIndex}`;

    const channel = supabase
      .channel(`answers-${roomCode}-${rkey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers', filter: `room_code=eq.${roomCode}` },
        payload => {
          const row = payload.new;
          if (row && row.round_key === rkey) {
            answersRef.current[row.player_id] = {
              choiceId: row.choice_id,
              submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : Date.now(),
              shieldOn: !!row.shield_on,
              ddOn: !!row.dd_on,
            };
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      room_code: roomCode,
      player_id: id,
      name: BOT_NAMES[n % BOT_NAMES.length] + '_Bot',
      emoji: EMOJIS[n % EMOJIS.length],
      alive: true,
      spectator: false,
      score: 0,
      strikes: 0,
      consecutive_wrong: 0,
      shield: 1,
      dd: 1,
      join_order: 99 + n,
      bot: true,
    };
    await supabase.from('players').upsert(rec);
    setBotCount(c => c + 1);
  }

  async function removeBot() {
    const ids = [...botIds.current];
    if (!ids.length) return;
    const id = ids[ids.length - 1];
    botIds.current.delete(id);
    await supabase.from('players').delete().eq('room_code', roomCode).eq('player_id', id);
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

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    setGreenStartAt(nowMs);

    // Update room in Supabase (WITHOUT correctId for anti-cheat)
    await supabase.from('rooms').upsert({
      room_code: roomCode,
      phase: revival ? 'revival' : 'question',
      q_index: idx,
      question: {
        id: q.id,
        text: q.text,
        options: q.options,
        correctId: null, // hidden until reveal
        why: q.why,
        revival: !!revival,
      },
      meta: {
        qIndex: idx,
        rkey,
        roomCode,
        hostAlive: true,
        maxPlayers: MAX_PLAYERS,
        minPlayers: MIN_PLAYERS,
        phase: revival ? 'revival' : 'question',
      },
      started_at: nowIso,
      updated_at: nowIso,
    });

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
      const accuracy = 0.82 - roundIndex * 0.04;
      setTimeout(async () => {
        const p = state.players?.[id];
        if (!p) return;
        const correct = Math.random() < accuracy;
        const allKeys = Object.keys(q.options);
        const choice  = correct
          ? q.correctId
          : allKeys.filter(k => k !== q.correctId)[Math.floor(Math.random() * 3)];

        await supabase.from('answers').upsert({
          room_code: roomCode,
          round_key: rkey,
          player_id: id,
          choice_id: choice,
          shield_on: false,
          dd_on: false,
          submitted_at: new Date().toISOString(),
        });
      }, delay);
    });
  }

  // ── Lock (red light drops) ────────────────────────────────────────────
  const handleLock = useCallback(async () => {
    if (lockGuard.current) return;
    lockGuard.current = true;

    audio.stopBeat();
    audio.sfxRedLight();
    audio.say('Red light!');

    // Write locked phase
    await supabase.from('rooms').update({
      phase: 'locked',
      updated_at: new Date().toISOString()
    }).eq('room_code', roomCode);

    // GRACE PERIOD: wait before reading answers
    await new Promise(r => setTimeout(r, GRACE_PERIOD_MS));

    const rkey = isRevival ? 'rev' : `r${roundIndex}`;
    const { data: dbAnswers } = await supabase
      .from('answers')
      .select('*')
      .eq('room_code', roomCode)
      .eq('round_key', rkey);

    const answers = { ...answersRef.current };
    if (dbAnswers) {
      dbAnswers.forEach(a => {
        answers[a.player_id] = {
          choiceId: a.choice_id,
          submittedAt: a.submitted_at ? new Date(a.submitted_at).getTime() : Date.now(),
          shieldOn: !!a.shield_on,
          ddOn: !!a.dd_on,
        };
      });
    }

    const q = gameQuestions[isRevival ? ROUNDS : roundIndex];

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

    // Apply updated player states to Supabase
    await Promise.all(
      Object.values(newPlayerStates).map(ps =>
        supabase.from('players').update({
          score: ps.score,
          alive: ps.alive,
          consecutive_wrong: ps.consecutiveWrong,
          shield: ps.shield ?? 1,
        }).eq('room_code', roomCode).eq('player_id', ps.id)
      )
    );

    // Reveal correctId and change phase
    await supabase.from('rooms').update({
      phase: 'reveal',
      question: {
        id: q.id,
        text: q.text,
        options: q.options,
        correctId: q.correctId,
        why: q.why,
        revival: false,
      },
      updated_at: new Date().toISOString(),
    }).eq('room_code', roomCode);

    setRevealData({ results, eliminations, survivors, question: q, answers });
    setPhase('reveal');

    if (eliminations.length > 0) audio.sfxEliminated();
    else audio.sfxCorrect();
  }

  // ── Resolve revival round ─────────────────────────────────────────────
  async function doRevivalResolve(answers, q) {
    const eliminated = getPlayers('dead');
    const revivedIds = resolveRevival(eliminated, answers, q.correctId, greenStartAt);

    // Revive players in Supabase
    await Promise.all(
      revivedIds.map(id =>
        supabase.from('players').update({
          alive: true,
          consecutive_wrong: 0,
        }).eq('room_code', roomCode).eq('player_id', id)
      )
    );

    // Reveal correctId and change phase
    await supabase.from('rooms').update({
      phase: 'revreveal',
      question: {
        id: q.id,
        text: q.text,
        options: q.options,
        correctId: q.correctId,
        why: q.why,
        revival: true,
      },
      updated_at: new Date().toISOString(),
    }).eq('room_code', roomCode);

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
      await supabase.from('rooms').update({
        phase: 'gameover',
        updated_at: new Date().toISOString(),
      }).eq('room_code', roomCode);
      setPhase('gameover');
      audio.sfxWin();
      audio.say(`${determineWinner(getPlayers('all'))?.name || 'The winner'} wins the game!`);
      return;
    }

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
    await supabase.from('rooms').delete().eq('room_code', roomCode);
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

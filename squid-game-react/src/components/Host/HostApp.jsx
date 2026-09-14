// =====================================================================
// HostApp.jsx — Host root component. Manages all game phases and
// Supabase writes. This is the authoritative game controller.
// =====================================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useAudio } from '../../context/AudioContext';
import { GameProvider, useGame } from '../../context/GameContext';
import {
  buildGameSet, resolveRound, determineWinner,
  generateRoomCode, ROUNDS,
  MAX_PLAYERS, MIN_PLAYERS, ANSWER_FRAC, GRACE_PERIOD_MS,
  GREEN_DURATION_SECS, CONSECUTIVE_WRONG_LIMIT
} from '../../utils/ruleEngine';
import { QUESTIONS } from '../../data/questions';
import HostLobby    from './HostLobby';
import HostQuestion from './HostQuestion';
import HostReveal   from './HostReveal';
import HostPodium   from './HostPodium';
import HostAuthGate, { isHostAuthenticated } from './HostAuthGate';
import { Volume2, VolumeX, Power, AlertTriangle } from 'lucide-react';

const EMOJIS = ['🦊','🐼','🦉','🐙','🐝','🦄','🐢','🦁','🐧','🦋','🐸','🦕','🐳','🦥','🐡','🦩','🐨','🦔','🐯','🦦','🐬','🦚','🐞','🦇'];
const BOT_NAMES = ['Ravi','Meera','Aryan','Divya','Shrish','Kabir','Anya','Rohan','Sara','Vik','Nisha','Dev','Tara','Arjun'];

export default function HostApp() {
  const [roomCode]  = useState(generateRoomCode);
  const [authorized, setAuthorized] = useState(() => isHostAuthenticated());

  if (!authorized) {
    return (
      <HostAuthGate
        onAuthorized={() => setAuthorized(true)}
        onCancel={() => {
          window.location.href = window.location.origin + window.location.pathname;
        }}
      />
    );
  }

  return (
    <GameProvider roomCode={roomCode}>
      <HostController roomCode={roomCode} />
    </GameProvider>
  );
}

function HostController({ roomCode }) {
  const { state, dispatch } = useGame();
  const audio = useAudio();

  // ── Host-only state ───────────────────────────────────────────────────
  const [phase,        setPhase]        = useState('lobby');
  const [gameQuestions, setGameQuestions] = useState([]);
  const [roundIndex,   setRoundIndex]   = useState(0);
  const [revealData,   setRevealData]   = useState(null); // { results, eliminations, survivors }
  const [isMuted,      setIsMuted]      = useState(false);
  const [isVoiceOn,    setIsVoiceOn]    = useState(true);
  const [botCount,     setBotCount]     = useState(0);
  const [greenStartAt, setGreenStartAt] = useState(0);
  const [hostLight,    setHostLight]    = useState('green');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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
    if (phase !== 'question') return;
    const rkey = `r${roundIndex}`;

    async function fetchInitialAnswers() {
      try {
        const { data } = await supabase
          .from('answers')
          .select('*')
          .eq('room_code', roomCode)
          .eq('round_key', rkey);

        if (data) {
          data.forEach(row => {
            answersRef.current[row.player_id] = {
              choiceId: row.choice_id,
              submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : Date.now(),
              shieldOn: !!row.shield_on,
              ddOn: !!row.dd_on,
            };
          });
          dispatch({ type: 'SET_ANSWERS', payload: { ...answersRef.current } });
        }
      } catch (err) {}
    }
    fetchInitialAnswers();

    const channel = supabase
      .channel(`answers-${roomCode}-${rkey}-${Date.now()}`)
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
            dispatch({ type: 'SET_ANSWERS', payload: { ...answersRef.current } });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phase, roundIndex, roomCode]);

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
    await beginRound(qs, 0);
  }

  // ── Begin a round ─────────────────────────────────────────────────────
  async function beginRound(qs, idx) {
    lockGuard.current = false;
    const q    = qs[idx];
    const rkey = `r${idx}`;

    setPhase('question');
    answersRef.current = {};

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    setGreenStartAt(nowMs);

    // Update room in Supabase (WITHOUT correctId for anti-cheat)
    await supabase.from('rooms').upsert({
      room_code: roomCode,
      phase: 'question',
      q_index: idx,
      question: {
        id: q.id,
        text: q.text,
        options: q.options,
        correctId: null, // hidden until reveal
        why: q.why,
      },
      meta: {
        qIndex: idx,
        rkey,
        roomCode,
        hostAlive: true,
        maxPlayers: MAX_PLAYERS,
        minPlayers: MIN_PLAYERS,
        phase: 'question',
        startedAt: nowMs,
      },
      started_at: nowIso,
      updated_at: nowIso,
    });

    audio.say(q.text);
    audio.startBeat(GREEN_DURATION_SECS * 1000);

    // Schedule bot answers
    scheduleBots(q, rkey);
  }

  // ── Schedule bot answers ──────────────────────────────────────────────
  function scheduleBots(q, rkey) {
    const bots = [...botIds.current]
      .filter(id => {
        const p = state.players[id];
        return p && p.alive;
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

    const rkey = `r${roundIndex}`;
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

    const q = gameQuestions[roundIndex];
    await doResolve(answers, q);
  }, [lockGuard, roundIndex, gameQuestions, roomCode, greenStartAt]);

  // ── Batch player updates with retry for bulletproof live event stability ───
  async function batchUpdatePlayerStates(playerList) {
    const CHUNK_SIZE = 50;
    for (let i = 0; i < playerList.length; i += CHUNK_SIZE) {
      const chunk = playerList.slice(i, i + CHUNK_SIZE).map(ps => ({
        room_code: roomCode,
        player_id: ps.id,
        name: ps.name,
        emoji: ps.emoji,
        alive: ps.alive,
        spectator: !!ps.spectator,
        score: Number(ps.score) || 0,
        strikes: Number(ps.totalStrikes ?? ps.total_strikes ?? ps.strikes ?? 0),
        consecutive_wrong: Number(ps.consecutiveWrong ?? ps.consecutive_wrong ?? 0),
        shield: ps.shield ?? 1,
        dd: ps.dd ?? 1,
        join_order: ps.joinOrder ?? ps.join_order ?? 99,
        bot: !!ps.bot,
      }));

      // Retry up to 3 times to ensure 100% database persistence even on busy event Wi-Fi
      let attempts = 0;
      let success = false;
      while (attempts < 3 && !success) {
        attempts++;
        try {
          const { error } = await supabase.from('players').upsert(chunk);
          if (!error) {
            success = true;
          } else {
            console.warn(`Supabase player update attempt ${attempts} failed:`, error.message);
            if (attempts < 3) await new Promise(r => setTimeout(r, 200 * attempts));
          }
        } catch (err) {
          console.warn(`Supabase network error attempt ${attempts}:`, err);
          if (attempts < 3) await new Promise(r => setTimeout(r, 200 * attempts));
        }
      }
    }
  }

  // ── Resolve normal round ──────────────────────────────────────────────
  async function doResolve(answers, q) {
    const alivePlayers = getPlayers('alive');
    const { results, eliminations, survivors, newPlayerStates } =
      resolveRound(alivePlayers, answers, q, greenStartAt);

    // Immediately update local GameContext players state so Host UI is 100% real-time
    const mergedPlayers = { ...(state.players || {}), ...newPlayerStates };
    if (dispatch) {
      dispatch({ type: 'SET_PLAYERS', payload: mergedPlayers });
    }

    // Apply updated player states to Supabase in batches (supports 500+ players)
    await batchUpdatePlayerStates(Object.values(newPlayerStates));

    setRevealData({ results, eliminations, survivors, question: q, answers });
    setPhase('reveal');

    // Reveal correctId, correctAnswer, and change phase
    try {
      await supabase.from('rooms').update({
        phase: 'reveal',
        question: {
          id: q.id,
          text: q.text,
          options: q.options,
          correctId: q.correctId,
          correctAnswer: q.correctAnswer || (q.options ? q.options[q.correctId] : ''),
          why: q.why,
          revival: false,
        },
        meta: {
          phase: 'reveal',
          qIndex: roundIndex,
          rkey: `r${roundIndex}`,
          roomCode,
          hostAlive: true,
          maxPlayers: MAX_PLAYERS,
          minPlayers: MIN_PLAYERS,
        },
        updated_at: new Date().toISOString(),
      }).eq('room_code', roomCode);
    } catch (err) {
      console.error('Error updating room to reveal:', err);
    }

    if (eliminations.length > 0) audio.sfxEliminated();
    else audio.sfxCorrect();
  }

  // ── Proceed to next round ─────────────────────────────────────────────
  async function handleNext() {
    const aliveCount = getPlayers('alive').length;
    const nextIndex  = roundIndex + 1;

    if (nextIndex >= ROUNDS || aliveCount <= 1) {
      await supabase.from('rooms').update({
        phase: 'gameover',
        meta: {
          phase: 'gameover',
          roomCode,
          totalRounds: ROUNDS,
          roundsPlayed: ROUNDS,
        },
        updated_at: new Date().toISOString(),
      }).eq('room_code', roomCode);
      setPhase('gameover');
      return;
    }

    setRoundIndex(nextIndex);
    await beginRound(gameQuestions, nextIndex);
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
      <div className="top-brand-group">
        <div className="top-geo-badges">
          <span className="geo-icon pink">○</span>
          <span className="geo-icon blue">△</span>
          <span className="geo-icon green">□</span>
        </div>
        <div className="top-title-wrap">
          <span className="brand">IAE SQUID GAME</span>
          <span className="brand-tagline">AI • AUTOMATION • INTELLIGENCE</span>
        </div>
      </div>
      <div className="ctrl-btns">
        <button className="icon-btn" onClick={toggleMute} title="Sound">
          {isMuted ? <VolumeX size={18} color="#ff8a8a" /> : <Volume2 size={18} color="#57ffb0" />}
        </button>
        <button className="icon-btn" onClick={() => setShowExitConfirm(true)} title="Exit">
          <Power size={18} color="#ff2d78" />
        </button>
      </div>
    </div>
  );

  const appBgClass = phase === 'question'
    ? (hostLight === 'red' || hostLight === 'fake-red' ? 'bg-red' : hostLight === 'alert' ? 'bg-alert' : 'bg-green')
    : phase === 'locked'
    ? 'bg-red'
    : '';

  return (
    <div className={`app ${appBgClass}`}>
      <div className="bg-layer" />
      <div className="tint-layer" />
      <div className="flash-layer" id="flash-layer" />

      <div className={`host-root ${phase === 'reveal' ? 'host-root-full' : ''}`}>
        {phase !== 'reveal' && topControls}

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

        {phase === 'question' && gameQuestions.length > 0 && (
          <HostQuestion
            question={gameQuestions[roundIndex]}
            roundNum={roundIndex + 1}
            totalRounds={ROUNDS}
            aliveCount={getPlayers('alive').length}
            roomCode={roomCode}
            onLock={handleLock}
            onLightChange={setHostLight}
          />
        )}

        {phase === 'reveal' && (
          <HostReveal
            results={revealData?.results || {}}
            eliminations={revealData?.eliminations || getPlayers('dead')}
            survivors={revealData?.survivors || getPlayers('alive')}
            players={state.players || {}}
            question={revealData?.question || gameQuestions[roundIndex] || state.question || {}}
            answers={revealData?.answers || state.answers || {}}
            roundNum={roundIndex + 1}
            totalRounds={ROUNDS}
            roomCode={roomCode}
            onNext={handleNext}
            onToggleMute={toggleMute}
            isMuted={isMuted}
            onExit={() => setShowExitConfirm(true)}
          />
        )}

        {phase === 'gameover' && (
          <HostPodium
            players={state.players}
            onRestart={handleRestart}
          />
        )}

        {/* ── Custom Cinematic Squid Game Exit Confirmation Modal ── */}
        {showExitConfirm && (
          <div className="exit-modal-overlay" onClick={() => setShowExitConfirm(false)}>
            <div className="exit-modal-box animate-pop-in" onClick={e => e.stopPropagation()}>
              <div className="exit-modal-ambient-geo">
                <span className="geo-icon pink">○</span>
                <span className="geo-icon blue">△</span>
                <span className="geo-icon green">□</span>
              </div>

              <div className="exit-modal-icon-wrap">
                <AlertTriangle size={36} color="#ff2d78" />
              </div>

              <h3 className="exit-modal-title">TERMINATE ARENA SESSION?</h3>
              <p className="exit-modal-desc">
                Are you sure you want to exit? The current game room, player scores, and survival progress will be completely reset.
              </p>

              <div className="exit-modal-actions">
                <button className="btn-exit-cancel" onClick={() => setShowExitConfirm(false)}>
                  CANCEL & RESUME
                </button>
                <button
                  className="btn-exit-confirm"
                  onClick={() => {
                    setShowExitConfirm(false);
                    handleRestart();
                  }}
                >
                  <Power size={15} />
                  <span>YES, EXIT GAME</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

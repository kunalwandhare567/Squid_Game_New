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
  const greenStartAtRef = useRef(0);
  const playerStatsRef  = useRef({});
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
          playerStats: {},
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
    answersRef.current = {};
    dispatch({ type: 'SET_ANSWERS', payload: {} });

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
      } catch (err) {
        console.error('Error fetching initial answers:', err);
      }
    }
    fetchInitialAnswers();

    const channel = supabase
      .channel(`live-answers-${roomCode}-${rkey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers', filter: `room_code=eq.${roomCode}` },
        payload => {
          if (payload.new && payload.new.round_key === rkey) {
            answersRef.current[payload.new.player_id] = {
              choiceId: payload.new.choice_id,
              submittedAt: payload.new.submitted_at ? new Date(payload.new.submitted_at).getTime() : Date.now(),
              shieldOn: !!payload.new.shield_on,
              ddOn: !!payload.new.dd_on,
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

  // ── Add Bot ───────────────────────────────────────────────────────────
  async function handleAddBot() {
    const idx = botSeq.current++;
    const bot = {
      room_code: roomCode,
      player_id: `bot_${idx}`,
      name: BOT_NAMES[idx % BOT_NAMES.length],
      emoji: BOT_EMOJIS[idx % BOT_EMOJIS.length],
      alive: true,
      spectator: false,
      score: 0,
      strikes: 0,
      consecutive_wrong: 0,
      shield: 1,
      dd: 1,
      join_order: 99,
      bot: true,
    };
    botIds.current.add(bot.player_id);
    setBotCount(botIds.current.size);
    await supabase.from('players').upsert(bot);
  }

  // ── Kick Bot ──────────────────────────────────────────────────────────
  async function handleKickBot(botId) {
    botIds.current.delete(botId);
    setBotCount(botIds.current.size);
    await supabase.from('players').delete().eq('player_id', botId).eq('room_code', roomCode);
  }

  // ── Kick Player ───────────────────────────────────────────────────────
  async function handleKickPlayer(playerId) {
    if (botIds.current.has(playerId)) {
      botIds.current.delete(playerId);
      setBotCount(botIds.current.size);
    }
    await supabase.from('players').delete().eq('player_id', playerId).eq('room_code', roomCode);
  }

  // ── Helper: players list ──────────────────────────────────────────────
  function getPlayers(filter = 'all') {
    const list = Object.values(state.players || {}).filter(p => !p.spectator);
    if (filter === 'alive')      return list.filter(p => p.alive);
    if (filter === 'eliminated') return list.filter(p => !p.alive);
    if (filter === 'dead')       return list.filter(p => !p.alive);
    return list;
  }

  // ── Start game ────────────────────────────────────────────────────────
  async function startGame() {
    const qs = buildGameSet(QUESTIONS, ROUNDS);
    setGameQuestions(qs);
    setRoundIndex(0);
    await beginRound(qs, 0);
  }

  // ── Begin a round ────────────────────────────────────────────────     async function beginRound(qs, idx) {
  async function beginRound(qs, idx) {
    lockGuard.current = false;
    const q    = qs[idx];
    const rkey = `r${idx}`;

    setPhase('question');
    answersRef.current = {};
    dispatch({ type: 'SET_ANSWERS', payload: {} });

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    greenStartAtRef.current = nowMs;
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
        playerStats: playerStatsRef.current,
      },
      started_at: nowIso,
      updated_at: nowIso,
    });

    audio.say(q.text);
    audio.startBeat(GREEN_DURATION_SECS * 1000);

    // Schedule bot answers with realistic timings
    scheduleBots(q, rkey, nowMs);
  }

  // ── Schedule bot answers ──────────────────────────────────────────────
  function scheduleBots(q, rkey, startMs) {
    const bots = [...botIds.current]
      .filter(id => {
        const p = state.players[id];
        return p && p.alive;
      });

    bots.forEach(id => {
      const delay    = Math.round(1200 + Math.random() * 5500);
      const accuracy = 0.82 - roundIndex * 0.04;
      setTimeout(async () => {
        const p = state.players?.[id];
        if (!p || !p.alive) return;
        const correct = Math.random() < accuracy;
        const allKeys = Object.keys(q.options);
        const choice  = correct
          ? q.correctId
          : allKeys.filter(k => k !== q.correctId)[Math.floor(Math.random() * (allKeys.length - 1))];

        const baseStart = greenStartAtRef.current || startMs || Date.now();
        const submittedMs = baseStart + delay;

        await supabase.from('answers').upsert({
          room_code: roomCode,
          round_key: rkey,
          player_id: id,
          choice_id: choice,
          shield_on: false,
          dd_on: false,
          submitted_at: new Date(submittedMs).toISOString(),
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
  }, [lockGuard, roundIndex, gameQuestions, roomCode]);

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
    const roundStart = greenStartAtRef.current || greenStartAt || Date.now();
    const alivePlayers = getPlayers('alive').map(p => ({
      ...p,
      ...(playerStatsRef.current[p.id] || {}),
    }));

    const { results, eliminations, survivors, newPlayerStates } =
      resolveRound(alivePlayers, answers, q, roundStart);

    // Save exact calculated speed stats into playerStatsRef
    Object.values(newPlayerStates).forEach(ps => {
      playerStatsRef.current[ps.id] = {
        avgSpeedMs: ps.avgSpeedMs,
        totalSpeedMs: ps.totalSpeedMs,
        lastSpeedMs: ps.lastSpeedMs,
        answeredRounds: ps.answeredRounds,
        roundsPlayed: ps.roundsPlayed,
        totalCorrect: ps.totalCorrect,
        score: ps.score,
      };
    });

    // Immediately update local GameContext players state so Host UI is 100% real-time
    const mergedPlayers = { ...(state.players || {}) };
    Object.values(newPlayerStates).forEach(ps => {
      mergedPlayers[ps.id] = { ...(mergedPlayers[ps.id] || {}), ...ps };
    });
    if (dispatch) {
      dispatch({ type: 'SET_PLAYERS', payload: mergedPlayers });
    }

    // Apply updated player states to Supabase in batches (supports 500+ players)
    await batchUpdatePlayerStates(Object.values(newPlayerStates));

    setRevealData({ results, eliminations, survivors, question: q, answers });
    setPhase('reveal');

    // Reveal correctId, correctAnswer, and change phase + persist playerStats in meta
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
          playerStats: playerStatsRef.current,
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
          playerStats: playerStatsRef.current,
        },
        updated_at: new Date().toISOString(),
      }).eq('room_code', roomCode);
      setPhase('gameover');
      return;
    }

    setRoundIndex(nextIndex);
    await beginRound(gameQuestions, nextIndex);
  }

  // ── Exit Game to Landing Page ──────────────────────────────────────────
  async function handleExitGame() {
    try {
      await supabase.from('rooms').update({
        phase: 'terminated',
        meta: { phase: 'terminated', hostExited: true },
        updated_at: new Date().toISOString(),
      }).eq('room_code', roomCode);

      await supabase.from('rooms').delete().eq('room_code', roomCode);
    } catch (e) {
      console.error('Error terminating room on host exit:', e);
    }
    window.location.search = '';
  }

  // ── Restart ───────────────────────────────────────────────────────────
  async function handleRestart() {
    try {
      await supabase.from('rooms').update({
        phase: 'terminated',
        meta: { phase: 'terminated', hostExited: true },
        updated_at: new Date().toISOString(),
      }).eq('room_code', roomCode);

      await supabase.from('rooms').delete().eq('room_code', roomCode);
    } catch (e) {
      console.error('Error restarting room:', e);
    }
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
        <div className="top-brand-badge-pill">
          <img
            src="/squid_survival_logo.png"
            alt="Emblem"
            className="top-brand-mini-emblem"
          />
          <div className="top-title-wrap">
            <div className="brand-chip-row">
              <span className="brand-tag-iae">IAE</span>
              <span className="brand-unique-title">SQUID SURVIVAL</span>
            </div>
          </div>
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
          />
        )}

        {phase === 'question' && gameQuestions.length > 0 && (
          <HostQuestion
            key={`host-q-${roundIndex}-${gameQuestions[roundIndex]?.id || roundIndex}`}
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
                    handleExitGame();
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

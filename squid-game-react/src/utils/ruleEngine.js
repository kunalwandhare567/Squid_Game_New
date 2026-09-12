// =====================================================================
// ruleEngine.js — Pure functions. No Firebase, no React, no side effects.
// Every function can be unit-tested in isolation.
// =====================================================================

export const BASE_POINTS            = 2;
export const SPEED_BONUS_MAX        = 3;
export const BONUS_WINDOW_MS        = 10000; // 10s window (5s green + 5s blink)
export const ELIM_RATIO             = 4;      // bottom 1-in-4 eliminated
export const CONSECUTIVE_WRONG_LIMIT = 2;     // 2 consecutive wrong = eliminate
export const MIN_PLAYERS            = 1;
export const MAX_PLAYERS            = 15;
export const ROUNDS                 = 7;
export const REVIVE_AFTER_ROUND     = 4;      // revival after round 4
export const REVIVE_MAX             = 3;      // up to 3 can rejoin
export const GREEN_DURATION_SECS    = 10;     // 10s question countdown (5s green + 5s blink)
export const GRACE_PERIOD_MS        = 1200;   // wait after lock before reading answers
export const ANSWER_FRAC            = 0.60;   // 60% must answer before red arms

/**
 * computeSpeedBonus
 * Faster answers earn more bonus points (up to SPEED_BONUS_MAX).
 * Answer at 0ms = full 3 bonus. Answer at 10000ms = 0 bonus.
 */
export function computeSpeedBonus(answerMs, windowMs = BONUS_WINDOW_MS) {
  if (answerMs == null || answerMs < 0) return 0;
  const fraction = Math.max(0, 1 - answerMs / windowMs);
  return Math.round(fraction * SPEED_BONUS_MAX);
}

/**
 * computeRoundScore
 * Calculate the score delta and metadata for one player in one round.
 *
 * @param {object|null} answer    - { choiceId, submittedAt, ddOn, shieldOn }
 * @param {string}      correctId - correct option ID (e.g. "opt_A")
 * @param {number}      greenStartAt - server timestamp when green began
 * @param {boolean}     isRevival - revival = no speed bonus
 * @returns {{ points, correct, speedMs }}
 */
export function computeRoundScore(answer, correctId, greenStartAt, isRevival = false) {
  if (!answer || !answer.choiceId) {
    return { points: 0, correct: false, speedMs: null };
  }

  const correct = answer.choiceId === correctId;
  const speedMs = (answer.submittedAt && greenStartAt)
    ? Math.max(0, answer.submittedAt - greenStartAt)
    : null;

  if (!correct) {
    const penalty = answer.ddOn ? -2 : 0;
    return { points: penalty, correct: false, speedMs };
  }

  const base  = BASE_POINTS;
  const speed = isRevival ? 0 : computeSpeedBonus(speedMs, BONUS_WINDOW_MS);
  const raw   = base + speed;
  const points = answer.ddOn ? raw * 2 : raw;

  return { points, correct: true, speedMs };
}

/**
 * resolveRound
 * The core elimination engine. Three layers:
 *   Layer 1 — auto-eliminate players with consecutiveWrong >= 2 (BEFORE score-rank)
 *   Layer 2 — score-rank cut: bottom floor(alive/4) by round score
 *   Layer 3 — shield protection: saves from Layer 2 cut
 *
 * Returns immutable result objects (no mutation of input players array).
 *
 * @param {object[]} players   - array of { id, name, emoji, score, shield,
 *                               consecutiveWrong, alive }
 * @param {object}   answers   - { [playerId]: { choiceId, submittedAt, ddOn, shieldOn } }
 * @param {string}   correctId - correct option string ID
 * @param {number}   greenStartAt - server timestamp
 * @returns {{ results, eliminations, survivors, newPlayerStates }}
 */
export function resolveRound(players, answers, correctId, greenStartAt) {
  const alivePlayers = players.filter(p => p.alive && !p.spectator);
  const results = {};
  const playerStates = {};
  alivePlayers.forEach(p => { playerStates[p.id] = { ...p }; });

  // ── PASS 1: Compute round score and update strikes ────────────────────
  for (const player of alivePlayers) {
    const answer = answers[player.id] || null;
    const { points, correct, speedMs } = computeRoundScore(
      answer, correctId, greenStartAt
    );

    const ddUsed       = !!(answer?.ddOn);
    const shieldActive = !!(answer?.shieldOn);
    const prevConsec   = Number(player.consecutiveWrong ?? player.consecutive_wrong ?? 0);
    const newConsec    = correct ? 0 : prevConsec + 1;
    const newScore     = Math.max(0, (Number(player.score) || 0) + points);

    playerStates[player.id].consecutiveWrong  = newConsec;
    playerStates[player.id].consecutive_wrong = newConsec;
    playerStates[player.id].score             = newScore;

    results[player.id] = {
      correct,
      points,
      speedMs,
      ddUsed,
      shieldActive,
      consecutiveWrong: newConsec,
      newScore,
      autoEliminated:   false,
      scoreEliminated:  false,
      shieldSaved:      false,
    };
  }

  // ── PASS 2: Eliminate players reaching 2 consecutive wrong answers ────
  for (const player of alivePlayers) {
    const r = results[player.id];
    const ps = playerStates[player.id];

    if (r.consecutiveWrong >= CONSECUTIVE_WRONG_LIMIT) {
      // Shield check: shield can absorb the 2nd strike!
      if (r.shieldActive && (player.shield || 0) >= 1) {
        r.shieldSaved       = true;
        ps.shield           = Math.max(0, (player.shield || 0) - 1);
        r.consecutiveWrong  = 1;
        ps.consecutiveWrong = 1;
        ps.consecutive_wrong = 1;
        ps.alive            = true;
      } else {
        r.autoEliminated    = true;
        ps.alive            = false;
      }
    } else {
      ps.alive = true;
    }
  }

  // ── PASS 3: Categorise eliminations & survivors ───────────────────────
  const eliminations = alivePlayers
    .filter(p => results[p.id].autoEliminated)
    .map(p => ({
      ...playerStates[p.id],
      reason: 'strike',
    }));

  const survivors = alivePlayers
    .filter(p => !results[p.id].autoEliminated)
    .map(p => playerStates[p.id]);

  return { results, eliminations, survivors, newPlayerStates: playerStates };
}

/**
 * resolveRevival
 * Fastest correct answers from eliminated players rejoin (up to REVIVE_MAX).
 */
export function resolveRevival(eliminatedPlayers, answers, correctId, greenStartAt) {
  const correct = eliminatedPlayers
    .filter(p => answers[p.id]?.choiceId === correctId)
    .map(p => ({
      id: p.id,
      speedMs: (answers[p.id]?.submittedAt && greenStartAt)
        ? Math.max(0, answers[p.id].submittedAt - greenStartAt)
        : Infinity,
    }))
    .sort((a, b) => a.speedMs - b.speedMs);

  return correct.slice(0, REVIVE_MAX).map(x => x.id);
}

/**
 * rankPlayers
 * Authoritative leaderboard sorting:
 * 1. Alive survivors always rank higher than eliminated players
 * 2. Higher total score
 * 3. Lowest consecutive wrong answers (tiebreaker)
 * 4. Earliest join order (tiebreaker)
 */
export function rankPlayers(players) {
  const list = (Array.isArray(players) ? players : Object.values(players || {}))
    .filter(p => !p.spectator)
    .map(p => ({
      ...p,
      score: Number(p.score) || 0,
      consecutiveWrong: Number(p.consecutiveWrong) || 0,
      joinOrder: Number(p.joinOrder) || 99,
      alive: !!p.alive
    }));

  return list.sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    if (a.consecutiveWrong !== b.consecutiveWrong) return a.consecutiveWrong - b.consecutiveWrong;
    return a.joinOrder - b.joinOrder;
  });
}

/**
 * determineWinner
 * Returns the #1 ranked player. If 0 survivors exist, best eliminated player wins.
 */
export function determineWinner(players) {
  const ranked = rankPlayers(players);
  return ranked[0] || null;
}

/**
 * buildGameSet
 * Draw ROUNDS+1 unique questions randomly from the bank and shuffle option display order.
 * correctId is always a stable string key — never an array index.
 */
export function buildGameSet(bank, rounds = ROUNDS) {
  const shuffled = fisherYates([...bank]);
  return shuffled.slice(0, rounds + 1).map(buildQuestion);
}

/**
 * buildQuestion
 * Shuffles raw options so the correct answer is randomly distributed among A, B, C, D (25% each).
 */
export function buildQuestion(rawQ) {
  const { id, text, options, correctIndex, why, category } = rawQ;
  const stableKeys = ['opt_A', 'opt_B', 'opt_C', 'opt_D'];

  // Pair each option text with its correct status
  const optionItems = options.map((t, idx) => ({
    text: t,
    isCorrect: idx === (correctIndex ?? 0)
  }));

  // Shuffle option items randomly every time
  const shuffledItems = fisherYates([...optionItems]);

  const displayOptions = {};
  let correctId = 'opt_A';

  shuffledItems.forEach((item, i) => {
    const key = stableKeys[i];
    displayOptions[key] = item.text;
    if (item.isCorrect) {
      correctId = key;
    }
  });

  return { id, text, options: displayOptions, correctId, why: why || '', category: category || '' };
}

export function fisherYates(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function generatePlayerId() {
  // Timestamp + random — collision probability negligible even at 200 players/day
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

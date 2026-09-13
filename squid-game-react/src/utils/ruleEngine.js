// =====================================================================
// ruleEngine.js — Pure functions. No Firebase, no React, no side effects.
// Every function can be unit-tested in isolation.
// =====================================================================

export const BASE_POINTS            = 2;
export const SPEED_BONUS_MAX        = 3;
export const BONUS_WINDOW_MS        = 10000; // 10s window (5s green + 5s blink)
export const ELIM_RATIO             = 4;      // bottom 1-in-4 eliminated
export const CONSECUTIVE_WRONG_LIMIT = 3;     // 3 consecutive wrong = eliminate
export const MIN_PLAYERS            = 5;      // min 5 players to start
export const MAX_PLAYERS            = 15;     // max 15 active players
export const ROUNDS                 = 10;
export const REVIVE_AFTER_ROUND     = 3;      // revival round after round 3
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
 * Calculate score delta and metadata for one player in one round.
 * Supports exact text validation and key-based fallback.
 *
 * @param {object|null} answer              - { choiceId, choiceText, submittedAt, ddOn, shieldOn }
 * @param {object|string} questionOrCorrect - Question object or correctId string
 * @param {number}      greenStartAt        - Server timestamp when green began
 * @param {boolean}     isRevival           - Revival = no speed bonus
 * @returns {{ points, correct, speedMs }}
 */
export function computeRoundScore(answer, questionOrCorrect, greenStartAt, isRevival = false) {
  if (!answer || (!answer.choiceId && !answer.choiceText)) {
    return { points: 0, correct: false, speedMs: null };
  }

  let correct = false;
  const qObj = typeof questionOrCorrect === 'object' ? questionOrCorrect : null;
  const targetId = qObj ? qObj.correctId : questionOrCorrect;
  const targetText = qObj?.correctAnswer || (targetId && qObj?.options?.[targetId]) || null;

  // 1. Validate by exact answer text if available
  if (answer.choiceText && targetText) {
    correct = answer.choiceText.trim().toLowerCase() === targetText.trim().toLowerCase();
  }
  // 2. Validate by option ID
  else if (answer.choiceId && targetId) {
    correct = answer.choiceId === targetId;
  }
  // 3. Fallback: resolve choiceId to option text and compare to targetText
  else if (answer.choiceId && qObj?.options && targetText) {
    const textOfChoice = qObj.options[answer.choiceId];
    if (textOfChoice) {
      correct = textOfChoice.trim().toLowerCase() === targetText.trim().toLowerCase();
    }
  }

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
 * The core elimination engine.
 *   Layer 1 — evaluate each player's answer (text-verified & ID-verified)
 *   Layer 2 — 3 consecutive wrong answers = eliminate (unless saved by shield)
 *
 * @param {object[]} players           - Array of { id, name, emoji, score, shield, consecutiveWrong, alive }
 * @param {object}   answers           - { [playerId]: { choiceId, choiceText, submittedAt, ddOn, shieldOn } }
 * @param {object|string} questionOrId - Question object or correctId string
 * @param {number}   greenStartAt      - Server timestamp
 * @returns {{ results, eliminations, survivors, newPlayerStates }}
 */
export function resolveRound(players, answers, questionOrId, greenStartAt) {
  const alivePlayers = players.filter(p => p.alive && !p.spectator);
  const results = {};
  const playerStates = {};
  alivePlayers.forEach(p => { playerStates[p.id] = { ...p }; });

  // ── PASS 1: Compute round score and update strikes ────────────────────
  for (const player of alivePlayers) {
    const answer = answers[player.id] || null;
    const { points, correct, speedMs } = computeRoundScore(
      answer, questionOrId, greenStartAt
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

  // ── PASS 2: Eliminate players reaching 3 consecutive wrong answers ────
  for (const player of alivePlayers) {
    const r = results[player.id];
    const ps = playerStates[player.id];

    if (r.consecutiveWrong >= CONSECUTIVE_WRONG_LIMIT) {
      // Shield check: shield can absorb the 3rd strike!
      if (r.shieldActive && (player.shield || 0) >= 1) {
        r.shieldSaved        = true;
        ps.shield            = Math.max(0, (player.shield || 0) - 1);
        r.consecutiveWrong   = CONSECUTIVE_WRONG_LIMIT - 1;
        ps.consecutiveWrong  = CONSECUTIVE_WRONG_LIMIT - 1;
        ps.consecutive_wrong = CONSECUTIVE_WRONG_LIMIT - 1;
        ps.alive             = true;
      } else {
        r.autoEliminated     = true;
        ps.alive             = false;
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
export function resolveRevival(eliminatedPlayers, answers, questionOrId, greenStartAt) {
  const correct = eliminatedPlayers
    .filter(p => {
      const ans = answers[p.id];
      if (!ans) return false;
      return computeRoundScore(ans, questionOrId, greenStartAt, true).correct;
    })
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
      consecutiveWrong: Number(p.consecutiveWrong ?? p.consecutive_wrong ?? 0),
      joinOrder: Number(p.joinOrder ?? p.join_order ?? 99),
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
 */
export function buildGameSet(bank, rounds = ROUNDS) {
  const shuffled = fisherYates([...bank]);
  return shuffled.slice(0, rounds + 1).map(buildQuestion);
}

/**
 * buildQuestion
 * Shuffles raw options so the correct answer is randomly distributed among A, B, C, D.
 * Preserves canonical correctAnswer text and assigns correctId.
 */
export function buildQuestion(rawQ) {
  const { id, text, options, correctIndex, why, category } = rawQ;
  const canonicalCorrectAnswer = rawQ.correctAnswer || (options ? options[correctIndex ?? 0] : '') || '';
  const stableKeys = ['opt_A', 'opt_B', 'opt_C', 'opt_D'];

  // Pair each option text with its correct status
  const optionItems = (options || []).map((t, idx) => ({
    text: t,
    isCorrect: canonicalCorrectAnswer
      ? t.trim().toLowerCase() === canonicalCorrectAnswer.trim().toLowerCase()
      : idx === (correctIndex ?? 0)
  }));

  // Shuffle option items randomly for host baseline
  const shuffledItems = fisherYates([...optionItems]);

  const displayOptions = {};
  let correctId = 'opt_A';

  shuffledItems.forEach((item, i) => {
    const key = stableKeys[i] || `opt_${i}`;
    displayOptions[key] = item.text;
    if (item.isCorrect) {
      correctId = key;
    }
  });

  return {
    id,
    text,
    options: displayOptions,
    correctId,
    correctAnswer: canonicalCorrectAnswer,
    why: why || '',
    category: category || ''
  };
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
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}


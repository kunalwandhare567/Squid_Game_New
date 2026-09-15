// =====================================================================
// ruleEngine.js — Pure functions. No Firebase, no React, no side effects.
// Every function can be unit-tested in isolation.
// =====================================================================

export const BASE_POINTS            = 2;
export const SPEED_BONUS_MAX        = 3;
export const BONUS_WINDOW_MS        = 12000; // 12s window (7s green + 5s blink)
export const ELIM_RATIO             = 4;      // bottom 1-in-4 eliminated
export const CONSECUTIVE_WRONG_LIMIT = 3;     // 3 consecutive wrong = eliminate
export const MIN_PLAYERS            = 5;      // min 5 players to start
export const MAX_PLAYERS            = 15;     // max 15 active players
export const ROUNDS                 = 10;
export const GREEN_DURATION_SECS    = 12;     // 12s question countdown (7s green + 5s blink)
export const GRACE_PERIOD_MS        = 1200;   // wait after lock before reading answers
export const ANSWER_FRAC            = 0.60;   // 60% must answer before red arms

/**
 * computeSpeedBonus
 * Faster answers earn more bonus points (up to SPEED_BONUS_MAX).
 * Answer at 0ms = full 3 bonus. Answer at 15000ms = 0 bonus.

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
 * @returns {{ points, correct, speedMs }}
 */
export function computeRoundScore(answer, questionOrCorrect, greenStartAt) {
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

  let speedMs = null;
  if (answer.submittedAt && greenStartAt) {
    const submittedTime = typeof answer.submittedAt === 'number'
      ? answer.submittedAt
      : new Date(answer.submittedAt).getTime();
    if (!isNaN(submittedTime) && !isNaN(greenStartAt)) {
      const rawDiff = submittedTime - greenStartAt;
      speedMs = Math.max(50, Math.round(rawDiff));
    }
  }

  return { points: correct ? 2 : 0, correct, speedMs };
}

/**
 * resolveRound
 * The core elimination engine.
 *   - Correct answer: +2 pts
 *   - 1st wrong answer: -2 pts
 *   - 2nd consecutive wrong answer: -3 pts
 *   - 3rd consecutive wrong answer: Permanently Eliminated!
 *
 * @param {object[]} players           - Array of { id, name, emoji, score, consecutiveWrong, alive }
 * @param {object}   answers           - { [playerId]: { choiceId, choiceText, submittedAt } }
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
    const { correct, speedMs } = computeRoundScore(
      answer, questionOrId, greenStartAt
    );

    const prevConsec = Number(player.consecutiveWrong ?? player.consecutive_wrong ?? 0);
    const prevTotalStrikes = Number(player.totalStrikes ?? player.total_strikes ?? player.strikes ?? 0);

    let newConsec = 0;
    let points = 0;
    const newTotalStrikes = correct ? prevTotalStrikes : prevTotalStrikes + 1;

    if (correct) {
      newConsec = 0;
      points = 2; // +2 for every correct answer
    } else {
      newConsec = prevConsec + 1;
      if (newConsec === 1) {
        points = -2; // -2 for 1st wrong answer
      } else if (newConsec === 2) {
        points = -3; // -3 for 2nd consecutive wrong answer
      } else {
        points = 0;  // 3rd consecutive wrong = eliminated
      }
    }

    const currentScore = Number(player.score) || 0;
    const newScore     = Math.max(0, currentScore + points);

    const prevCorrect  = Number(player.totalCorrect ?? player.total_correct ?? player.correctCount ?? player.correct_count ?? 0);
    const newCorrect   = correct ? prevCorrect + 1 : prevCorrect;

    // Track real response times in ms without hardcoded 15s default
    const prevTotalSpeedMs = Number(player.totalSpeedMs ?? player.total_speed_ms ?? 0);
    const prevAnsweredRounds = Number(player.answeredRounds ?? player.answered_rounds ?? (prevTotalSpeedMs > 0 ? (player.roundsPlayed || 1) : 0));
    
    let newTotalSpeedMs = prevTotalSpeedMs;
    let newAnsweredRounds = prevAnsweredRounds;
    let newAvgSpeedMs = player.avgSpeedMs ?? player.avg_speed_ms ?? null;

    if (speedMs != null && !isNaN(speedMs)) {
      newTotalSpeedMs += speedMs;
      newAnsweredRounds += 1;
      newAvgSpeedMs = Math.round(newTotalSpeedMs / newAnsweredRounds);
    }

    const prevRounds   = Number(player.roundsPlayed ?? player.rounds_played ?? 0);
    const newRounds    = prevRounds + 1;

    playerStates[player.id].consecutiveWrong  = newConsec;
    playerStates[player.id].consecutive_wrong = newConsec;
    playerStates[player.id].totalStrikes      = newTotalStrikes;
    playerStates[player.id].total_strikes     = newTotalStrikes;
    playerStates[player.id].strikes           = newTotalStrikes;
    playerStates[player.id].score             = newScore;
    playerStates[player.id].totalCorrect      = newCorrect;
    playerStates[player.id].total_correct     = newCorrect;
    playerStates[player.id].correctCount      = newCorrect;
    playerStates[player.id].correct_count     = newCorrect;
    playerStates[player.id].roundsPlayed      = newRounds;
    playerStates[player.id].rounds_played     = newRounds;
    playerStates[player.id].answeredRounds    = newAnsweredRounds;
    playerStates[player.id].answered_rounds   = newAnsweredRounds;
    playerStates[player.id].lastSpeedMs       = speedMs;
    playerStates[player.id].last_speed_ms     = speedMs;
    playerStates[player.id].totalSpeedMs      = newTotalSpeedMs;
    playerStates[player.id].total_speed_ms    = newTotalSpeedMs;
    playerStates[player.id].avgSpeedMs        = newAvgSpeedMs;
    playerStates[player.id].avg_speed_ms      = newAvgSpeedMs;

    results[player.id] = {
      correct,
      points,
      speedMs,
      lastSpeedMs:      speedMs,
      totalSpeedMs:     newTotalSpeedMs,
      avgSpeedMs:       newAvgSpeedMs,
      answeredRounds:   newAnsweredRounds,
      ddUsed: false,
      shieldActive: false,
      consecutiveWrong: newConsec,
      totalStrikes:     newTotalStrikes,
      newScore,
      totalCorrect:     newCorrect,
      correctCount:     newCorrect,
      roundsPlayed:     newRounds,
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
      r.autoEliminated     = true;
      ps.alive             = false;
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
 * rankPlayers
 * Authoritative leaderboard sorting:
 * 1. Alive survivors always rank higher than eliminated players
 * 2. Higher total score
 * 3. Fastest average response speed in ms (lower ms wins)
 * 4. Lowest consecutive wrong answers (tiebreaker)
 * 5. Earliest join order (tiebreaker)
 */
export function rankPlayers(players) {
  const list = (Array.isArray(players) ? players : Object.values(players || {}))
    .filter(p => !p.spectator)
    .map(p => ({
      ...p,
      score: Number(p.score) || 0,
      totalSpeedMs: p.totalSpeedMs != null ? Number(p.totalSpeedMs) : (p.total_speed_ms != null ? Number(p.total_speed_ms) : null),
      avgSpeedMs: p.avgSpeedMs != null ? Number(p.avgSpeedMs) : (p.avg_speed_ms != null ? Number(p.avg_speed_ms) : null),
      lastSpeedMs: p.lastSpeedMs != null ? Number(p.lastSpeedMs) : (p.last_speed_ms != null ? Number(p.last_speed_ms) : null),
      totalStrikes: Number(p.totalStrikes ?? p.total_strikes ?? p.strikes ?? 0),
      strikes: Number(p.totalStrikes ?? p.total_strikes ?? p.strikes ?? 0),
      totalCorrect: Number(p.totalCorrect ?? p.total_correct ?? p.correctCount ?? p.correct_count ?? 0),
      correctCount: Number(p.totalCorrect ?? p.total_correct ?? p.correctCount ?? p.correct_count ?? 0),
      consecutiveWrong: Number(p.consecutiveWrong ?? p.consecutive_wrong ?? 0),
      joinOrder: Number(p.joinOrder ?? p.join_order ?? 99),
      alive: !!p.alive
    }));

  return list.sort((a, b) => {
    // 1. Alive survivors rank first
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    // 2. Highest Score
    if (b.score !== a.score) return b.score - a.score;
    // 3. Fastest response speed in ms (lower ms is better)
    const aSpeed = a.avgSpeedMs ?? a.totalSpeedMs;
    const bSpeed = b.avgSpeedMs ?? b.totalSpeedMs;
    if (aSpeed != null && bSpeed != null && aSpeed !== bSpeed) {
      return aSpeed - bSpeed;
    }
    if (aSpeed != null && bSpeed == null) return -1;
    if (aSpeed == null && bSpeed != null) return 1;
    // 4. Fewest consecutive wrong answers
    if (a.consecutiveWrong !== b.consecutiveWrong) return a.consecutiveWrong - b.consecutiveWrong;
    // 5. Join order
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

const RECENT_HISTORY_LIMIT = 120; // Tracks history across ~10 consecutive rooms
let inMemoryRecentIds = [];

export function getRecentlyUsedQuestionIds() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('squid_recent_q_ids');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {}
  return inMemoryRecentIds;
}

export function saveRecentlyUsedQuestionIds(ids) {
  const trimmed = ids.slice(-RECENT_HISTORY_LIMIT);
  inMemoryRecentIds = trimmed;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('squid_recent_q_ids', JSON.stringify(trimmed));
    }
  } catch (e) {}
}

/**
 * buildGameSet
 * Draw ROUNDS+1 unique questions randomly from the 400 bank.
 * Excludes questions used in the last 8-10 rooms so audiences never see repeats.
 */
export function buildGameSet(bank, rounds = ROUNDS) {
  const needed = rounds + 1;
  const recentIds = getRecentlyUsedQuestionIds();

  // Filter out questions used in the recent 8-10 rooms
  let available = bank.filter(q => !recentIds.includes(q.id));

  // If pool runs low after cycling many rooms, prune oldest history
  if (available.length < needed) {
    const trimmedRecent = recentIds.slice(Math.floor(recentIds.length / 2));
    available = bank.filter(q => !trimmedRecent.includes(q.id));
    if (available.length < needed) {
      available = [...bank];
    }
  }

  const shuffled = fisherYates([...available]);
  const selected = shuffled.slice(0, needed);

  // Update history to avoid duplicates in upcoming rooms
  const newRecent = [...recentIds, ...selected.map(q => q.id)];
  saveRecentlyUsedQuestionIds(newRecent);

  return selected.map(buildQuestion);
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


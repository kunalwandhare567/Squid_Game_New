// =====================================================================
// replayRestrictions.js — Helpers for managing device replay limits
// =====================================================================

export const REPLAY_PASSKEY = '4455';

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone.
 */
export function getTodayLocalDate() {
  try {
    return new Date().toLocaleDateString('en-CA'); // format: YYYY-MM-DD
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Checks if this device has already completed a match today.
 */
export function isDeviceRestricted() {
  try {
    const todayLocal = getTodayLocalDate();
    const todayUtc   = new Date().toISOString().slice(0, 10);

    const completedDate  = localStorage.getItem('arena_completed_date');
    const completedMatch = localStorage.getItem('arena_completed_match');

    if (completedDate && (completedDate === todayLocal || completedDate === todayUtc)) {
      return true;
    }
    if (completedMatch && (completedMatch === todayLocal || completedMatch === todayUtc)) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Marks this device as having completed a match today.
 */
export function markDeviceCompleted() {
  try {
    const todayLocal = getTodayLocalDate();
    localStorage.setItem('arena_completed_date', todayLocal);
    localStorage.setItem('arena_completed_match', todayLocal);
    localStorage.setItem('arena_completed_at', String(Date.now()));
  } catch (e) {
    console.error('Failed to mark device completed:', e);
  }
}

/**
 * Clears the replay restriction for testing or authorized replays.
 */
export function clearDeviceRestriction() {
  try {
    localStorage.removeItem('arena_completed_date');
    localStorage.removeItem('arena_completed_match');
    localStorage.removeItem('arena_completed_at');
  } catch (e) {
    console.error('Failed to clear device restriction:', e);
  }
}

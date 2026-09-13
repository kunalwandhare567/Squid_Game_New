import React, { useEffect, useMemo } from 'react';
import { useAudio } from '../../context/AudioContext';
import ConfettiCanvas from '../Shared/ConfettiCanvas';
import DollSvg from '../Shared/DollSvg';
import { CheckCircle, XCircle, AlertTriangle, Skull, Award, HelpCircle } from 'lucide-react';
import { REVIVE_AFTER_ROUND } from '../../utils/ruleEngine';

export default function PlayerVerdict({ me, question, myChoiceId, roundKey, roomCode, roundNum: propRoundNum, totalRounds = 10, onVerdictResult }) {
  const audio = useAudio();

  // Retrieve user's submitted choice ID
  const chosenOptId = useMemo(() => {
    if (myChoiceId) return myChoiceId;
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(`sq_ans_${roomCode}_${roundKey}`) ||
             sessionStorage.getItem('sq_last_choice') ||
             null;
    }
    return null;
  }, [myChoiceId, roomCode, roundKey]);

  // Retrieve user's submitted choice text
  const chosenText = useMemo(() => {
    if (typeof window !== 'undefined') {
      const storedText = sessionStorage.getItem(`sq_ans_text_${roomCode}_${roundKey}`) ||
                         sessionStorage.getItem('sq_last_choice_text');
      if (storedText) return storedText;
    }
    if (chosenOptId && question?.options?.[chosenOptId]) {
      return question.options[chosenOptId];
    }
    return chosenOptId ? `Option ${chosenOptId.replace('opt_', '')}` : 'No Answer Submitted (Time Out)';
  }, [chosenOptId, question, roomCode, roundKey]);

  const correctId = question?.correctId;
  const correctText = question?.correctAnswer || (correctId && question?.options?.[correctId]) || 'Correct Answer';

  // Multi-tier correctness check (Text-verified + ID-verified)
  const isCorrect = useMemo(() => {
    if (!chosenOptId && (!chosenText || chosenText.startsWith('No Answer'))) return false;
    // 1. Exact canonical text match
    if (chosenText && correctText && !chosenText.startsWith('Option ') && !chosenText.startsWith('No Answer')) {
      if (chosenText.trim().toLowerCase() === correctText.trim().toLowerCase()) return true;
    }
    // 2. Exact Option ID match
    if (chosenOptId && correctId && chosenOptId === correctId) return true;
    return false;
  }, [chosenOptId, chosenText, correctId, correctText]);

  const isAlive   = Boolean(me?.alive !== false);
  const strikes   = Number(me?.consecutiveWrong ?? me?.consecutive_wrong ?? 0);
  const isEliminated = !isAlive || (!isCorrect && strikes >= 3);

  // Extract round number from roundKey (e.g. 'r1' -> 2)
  const roundNum = useMemo(() => {
    if (propRoundNum) return propRoundNum;
    if (!roundKey) return 1;
    const match = String(roundKey).match(/\d+/);
    return match ? parseInt(match[0], 10) + 1 : 1;
  }, [propRoundNum, roundKey]);

  const isLastRound = roundNum >= totalRounds;

  // Trigger audio feedback and notify parent of verdict result once on reveal
  useEffect(() => {
    const verdictType = isCorrect ? 'correct' : isEliminated ? 'eliminated' : 'wrong';
    onVerdictResult?.(verdictType);

    if (isCorrect) {
      audio.sfxCorrect();
      if (isLastRound) {
        audio.say('Correct answer! You completed the final round!');
      } else {
        audio.say('Correct answer! You survived.');
      }
    } else if (isEliminated) {
      audio.sfxEliminated();
      audio.say('You are eliminated from the game.');
    } else if (isLastRound) {
      audio.sfxWrong();
      audio.say('Incorrect answer. Final round complete! Preparing the final podium results.');
    } else if (strikes >= 2) {
      audio.sfxWrong();
      audio.say('Incorrect. Warning — two strikes received. One more wrong answer and you are out.');
    } else {
      audio.sfxWrong();
      audio.say('Incorrect. Strike one. Two strikes remaining.');
    }
  }, [isCorrect, isEliminated, isLastRound, strikes, onVerdictResult]);

  // ── CASE 1: CORRECT & SAFE ───────────────────────────────────────────
  if (isCorrect) {
    return (
      <div className="verdict-screen center verdict-safe-screen">
        <ConfettiCanvas active />
        <div className="cele-badge">✓</div>
        <div className="verdict verdict-safe">
          {isLastRound ? 'CORRECT! ROUND 7 COMPLETE 🎉' : 'CORRECT & SAFE! 🎉'}
        </div>

        <div className="verdict-card verdict-card-safe">
          <div className="verdict-card-row">
            <span className="v-label">Your Answer:</span>
            <strong className="v-ans-good">✓ {chosenText}</strong>
          </div>
          {question?.why && (
            <div className="why-box" style={{ marginTop: '12px' }}>
              <strong>💡 Proof & Reason:</strong> {question.why}
            </div>
          )}
        </div>

        <div className="score-badge-row">
          <Award size={20} color="#ffd257" />
          <span>Total Score: <strong>{me?.score || 0} pts</strong></span>
        </div>

        <p className="verdict-footer-note">
          {isLastRound
            ? '🏁 Game complete! Watch the big screen for the Champion Podium and your Final Scorecard!'
            : '🟢 You survived this round! The next question will appear on the big screen soon…'}
        </p>
      </div>
    );
  }

  // ── CASE 2: ELIMINATED (3 STRIKES) ──────────────────────────────────
  if (isEliminated) {
    const hasRevivalChance = roundNum <= REVIVE_AFTER_ROUND;

    return (
      <div className="verdict-screen center verdict-wrong-screen verdict-elim-screen">
        <div className="skull">💀</div>
        <div className="verdict verdict-out">ELIMINATED</div>

        <div className="verdict-card verdict-card-elim">
          <div className="elim-alert-pill">
            <Skull size={16} />
            <span>3 Consecutive Strikes</span>
          </div>

          <div className="verdict-card-row">
            <span className="v-label">Your Answer:</span>
            <strong className="v-ans-bad">✕ {chosenText}</strong>
          </div>
          <div className="verdict-card-row" style={{ marginTop: '8px' }}>
            <span className="v-label">Correct Answer:</span>
            <strong className="v-ans-good">✓ {correctText}</strong>
          </div>

          {question?.why && (
            <div className="why-box" style={{ marginTop: '12px' }}>
              <strong>💡 Proof & Reason:</strong> {question.why}
            </div>
          )}
        </div>

        {hasRevivalChance ? (
          <div className="revival-notice-box">
            <span className="rev-icon">⭐</span>
            <div>
              <strong>Revival Round Coming Soon!</strong>
              <p>Eliminated players get ONE chance to re-enter the game after Round {REVIVE_AFTER_ROUND}. Stay tuned!</p>
            </div>
          </div>
        ) : (
          <div className="revival-notice-box" style={{ borderColor: 'rgba(255, 90, 90, 0.4)', background: 'rgba(255, 45, 120, 0.1)' }}>
            <span className="rev-icon">🔒</span>
            <div>
              <strong>Eliminated Permanently</strong>
              <p>You have used all strikes. Watch the remaining finalists on the big screen!</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── CASE 3: INCORRECT (1 OR 2 STRIKES - STILL SAFE) ──────────────────
  const isSecondStrike = strikes >= 2;

  return (
    <div className="verdict-screen center verdict-wrong-screen">
      <DollSvg phase="red" />
      <div className="verdict verdict-out" style={{ color: '#ff2d78' }}>
        {isLastRound ? 'INCORRECT (ROUND 7)' : 'INCORRECT!'}
      </div>

      <div className="verdict-card verdict-card-warn">
        {isLastRound ? (
          <div className="strike-warning-banner" style={{ background: 'rgba(255, 210, 87, 0.15)', borderColor: '#ffd257', color: '#ffd257' }}>
            <AlertTriangle size={18} color="#ffd257" />
            <span>🏁 FINAL ROUND COMPLETED</span>
          </div>
        ) : (
          <div className="strike-warning-banner" style={{ background: isSecondStrike ? 'rgba(255, 45, 120, 0.18)' : undefined, borderColor: isSecondStrike ? '#ff2d78' : undefined, color: isSecondStrike ? '#ff6b9d' : undefined }}>
            <AlertTriangle size={18} color={isSecondStrike ? '#ff2d78' : '#f7b733'} />
            <span>
              {isSecondStrike
                ? '⚠️ 2 STRIKES (FINAL WARNING: 1 MORE WRONG = ELIMINATED)'
                : '1 STRIKE RECEIVED (2 Strikes Remaining)'}
            </span>
          </div>
        )}

        <div className="verdict-card-row">
          <span className="v-label">Your Answer:</span>
          <strong className="v-ans-bad">✕ {chosenText}</strong>
        </div>
        <div className="verdict-card-row" style={{ marginTop: '8px' }}>
          <span className="v-label">Correct Answer:</span>
          <strong className="v-ans-good">✓ {correctText}</strong>
        </div>

        {question?.why && (
          <div className="why-box" style={{ marginTop: '12px' }}>
            <strong>💡 Proof & Reason:</strong> {question.why}
          </div>
        )}
      </div>

      <div className="score-badge-row">
        <span>Current Score: <strong>{me?.score || 0} pts</strong></span>
      </div>

      <p className="verdict-footer-note" style={{ color: isLastRound ? '#ffd257' : isSecondStrike ? '#ff6b9d' : '#ffd257' }}>
        {isLastRound
          ? '🏁 That was the final round! Watch the big screen for the Champion Podium and your Final Scorecard!'
          : isSecondStrike
          ? '🚨 DANGER: You are on 2 Strikes! Answer correctly on the next round to stay in the game!'
          : '⚠️ You survived this round on 1 Strike. Answer correctly on the next round to clear strikes!'}
      </p>
    </div>
  );
}

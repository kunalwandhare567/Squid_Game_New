import React, { useEffect, useMemo } from 'react';
import { useAudio } from '../../context/AudioContext';
import ConfettiCanvas from '../Shared/ConfettiCanvas';
import DollSvg from '../Shared/DollSvg';
import { CheckCircle, XCircle, AlertTriangle, Skull, Award, HelpCircle } from 'lucide-react';

export default function PlayerVerdict({ me, question, myChoiceId, roundKey, roomCode }) {
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
  const isEliminated = !isAlive || (!isCorrect && strikes >= 2);

  // Trigger audio feedback once on verdict reveal
  useEffect(() => {
    if (isCorrect) {
      audio.sfxCorrect();
      audio.say('Correct answer! You survived.');
    } else if (isEliminated) {
      audio.sfxEliminated();
      audio.say('You are eliminated from the game.');
    } else {
      audio.sfxWrong();
      audio.say('Incorrect. Warning — one more wrong answer and you are out.');
    }
  }, [isCorrect, isEliminated]);

  // ── CASE 1: CORRECT & SAFE ───────────────────────────────────────────
  if (isCorrect) {
    return (
      <div className="verdict-screen center">
        <ConfettiCanvas active />
        <div className="cele-badge">✓</div>
        <div className="verdict verdict-safe">CORRECT & SAFE! 🎉</div>

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
          🟢 You survived this round! The next question will appear on the big screen soon…
        </p>
      </div>
    );
  }

  // ── CASE 2: ELIMINATED (2 STRIKES) ──────────────────────────────────
  if (isEliminated) {
    return (
      <div className="verdict-screen center">
        <div className="skull">💀</div>
        <div className="verdict verdict-out">ELIMINATED</div>

        <div className="verdict-card verdict-card-elim">
          <div className="elim-alert-pill">
            <Skull size={16} />
            <span>2 Consecutive Strikes</span>
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

        <div className="revival-notice-box">
          <span className="rev-icon">⭐</span>
          <div>
            <strong>Revival Round Coming Soon!</strong>
            <p>Eliminated players get a chance to re-enter the game after Round 4. Stay tuned!</p>
          </div>
        </div>
      </div>
    );
  }

  // ── CASE 3: INCORRECT ON 1ST STRIKE (WARNING - STILL SAFE) ───────────
  return (
    <div className="verdict-screen center">
      <DollSvg phase="red" />
      <div className="verdict verdict-out" style={{ color: '#f7b733' }}>
        INCORRECT!
      </div>

      <div className="verdict-card verdict-card-warn">
        <div className="strike-warning-banner">
          <AlertTriangle size={18} color="#f7b733" />
          <span>1 STRIKE RECEIVED (1 More = Eliminated)</span>
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

      <div className="score-badge-row">
        <span>Current Score: <strong>{me?.score || 0} pts</strong></span>
      </div>

      <p className="verdict-footer-note" style={{ color: '#ffd257' }}>
        ⚠️ You survived this round on 1 Strike. Answer correctly on the next round to clear strikes!
      </p>
    </div>
  );
}

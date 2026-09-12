import React, { useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import ConfettiCanvas from '../Shared/ConfettiCanvas';
import DollSvg from '../Shared/DollSvg';

export default function PlayerVerdict({ me, question, myChoiceId }) {
  const audio = useAudio();

  const correct    = myChoiceId && question?.correctId && myChoiceId === question.correctId;
  const eliminated = me?.alive === false;
  const noAnswer   = !myChoiceId;
  const strikeCount= me?.consecutiveWrong || 0;

  useEffect(() => {
    if (correct) {
      audio.sfxCorrect();
      audio.say('Congratulations! Your answer is correct.');
    } else if (eliminated) {
      audio.sfxEliminated();
      audio.say('You are eliminated. Better luck next time!');
    } else {
      audio.sfxWrong();
      if (strikeCount === 1) audio.say('Incorrect. Warning — one more wrong answer and you are out!');
      else audio.say('Incorrect answer.');
    }
  }, []);

  const correctText = question?.correctId && question?.options
    ? question.options[question.correctId]
    : '';

  if (correct) {
    return (
      <div className="verdict-screen center">
        <ConfettiCanvas active />
        <div className="cele-badge">✓</div>
        <div className="verdict verdict-safe">Correct! 🎉</div>
        <p className="sub correct-ans-label">
          Answer: <strong style={{ color: '#57ffb0' }}>{correctText}</strong>
        </p>
        {question?.why && <div className="why-box">💡 {question.why}</div>}
        <div className="score-line">Your score: <strong>{me?.score || 0}</strong> pts</div>
      </div>
    );
  }

  if (eliminated) {
    return (
      <div className="verdict-screen center">
        <div className="skull">💀</div>
        <div className="verdict verdict-out">Eliminated</div>
        <p className="sub correct-ans-label">
          Correct was: <strong style={{ color: '#57ffb0' }}>{correctText}</strong>
        </p>
        {question?.why && <div className="why-box">💡 {question.why}</div>}
        <p className="sub">Watch on the big screen — a revival round may save you!</p>
      </div>
    );
  }

  // Wrong but not eliminated
  return (
    <div className="verdict-screen center">
      <DollSvg phase="red" />
      <div className="verdict verdict-out">
        {noAnswer ? 'No Answer' : 'Incorrect'}
      </div>
      <p className="sub correct-ans-label">
        Correct was: <strong style={{ color: '#57ffb0' }}>{correctText}</strong>
      </p>
      {question?.why && <div className="why-box">💡 {question.why}</div>}
      {strikeCount >= 1 && (
        <div className="strike-warn big-warn">
          ⚠️ {strikeCount} Strike{strikeCount > 1 ? 's' : ''} — {strikeCount >= 1 ? 'Answer correctly next round or you\'re out!' : ''}
        </div>
      )}
      <div className="score-line">Your score: <strong>{me?.score || 0}</strong> pts</div>
    </div>
  );
}

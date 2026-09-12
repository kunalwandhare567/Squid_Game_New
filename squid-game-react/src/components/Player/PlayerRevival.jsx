import React, { useEffect } from 'react';
import { useAudio } from '../../context/AudioContext';
import ConfettiCanvas from '../Shared/ConfettiCanvas';
import DollSvg from '../Shared/DollSvg';

export default function PlayerRevival({ me }) {
  const audio = useAudio();
  const back  = me?.alive === true;

  useEffect(() => {
    if (back) { audio.sfxRevival(); audio.say('You are back in the game!'); }
    else       { audio.say('You did not make it back. Keep cheering!'); }
  }, []);

  return (
    <div className="verdict-screen center">
      {back && <ConfettiCanvas active />}
      {back ? <DollSvg phase="lobby" /> : <div className="skull">💀</div>}
      <div className={`verdict ${back ? 'verdict-safe' : 'verdict-out'}`}>
        {back ? "You're back in! 🎉" : 'Still out'}
      </div>
      <p className="sub" style={{ margin: '0 auto', textAlign: 'center' }}>
        {back
          ? 'You answered correctly and fast enough. Get ready for the next round!'
          : 'The revival slots filled up. Keep cheering!'}
      </p>
    </div>
  );
}

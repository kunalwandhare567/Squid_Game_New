// =====================================================================
// AudioContext.jsx — React context that wraps the sound engine.
// Provides all audio functions to any component via useAudio().
// =====================================================================
import React, { createContext, useContext, useCallback } from 'react';
import * as SE from '../audio/soundEngine';

const AudioCtx = createContext(null);
export const useAudio = () => useContext(AudioCtx);

export function AudioProvider({ children }) {
  const value = {
    ensureAC:       SE.ensureAudioContext,
    sfxCorrect:     SE.sfxCorrect,
    sfxWrong:       SE.sfxWrong,
    sfxEliminated:  SE.sfxEliminated,
    sfxRedLight:    SE.sfxRedLight,
    sfxFakeFlicker: SE.sfxFakeFlicker,
    sfxTap:         SE.sfxTap,
    sfxRevival:     SE.sfxRevival,
    sfxWin:         SE.sfxWin,
    startBeat:      SE.startBeat,
    stopBeat:       SE.stopBeat,
    say:            SE.say,
    setMuted:       SE.setMuted,
    setVoiceOn:     SE.setVoiceOn,
    getMuted:       SE.getMuted,
    getVoiceOn:     SE.getVoiceOn,
  };

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

// =====================================================================
// GameContext.jsx — Firebase sync brain. All database listeners live here.
// Debounced lobby updates prevent rapid DOM flicker on mass joins.
// =====================================================================
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { db, ref, onValue, off } from '../firebase';

const GameCtx = createContext(null);
export const useGame = () => useContext(GameCtx);

const init = {
  phase:     'lobby',
  meta:      {},
  players:   {},
  question:  null,
  answers:   {},
  roundAnswers: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_META':      return { ...state, meta: action.payload, phase: action.payload.phase || state.phase };
    case 'SET_PLAYERS':   return { ...state, players: action.payload };
    case 'SET_QUESTION':  return { ...state, question: action.payload };
    case 'SET_ANSWERS':   return { ...state, answers: action.payload };
    default:              return state;
  }
}

export function GameProvider({ roomCode, children }) {
  const [state, dispatch] = useReducer(reducer, init);
  const roomRef  = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    if (!roomCode) return;
    const root = ref(db, `rooms/${roomCode}`);
    roomRef.current = root;

    // ── Players — 200ms debounce prevents flicker on rapid mass joins ──
    const playersRef = ref(db, `rooms/${roomCode}/players`);
    const unsubPlayers = onValue(playersRef, snap => {
      clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        dispatch({ type: 'SET_PLAYERS', payload: snap.val() || {} });
      }, 200);
    });

    // ── Meta — immediate (drives phase transitions) ────────────────────
    const metaRef = ref(db, `rooms/${roomCode}/meta`);
    const unsubMeta = onValue(metaRef, snap => {
      dispatch({ type: 'SET_META', payload: snap.val() || {} });
    });

    // ── Question ──────────────────────────────────────────────────────
    const questionRef = ref(db, `rooms/${roomCode}/question`);
    const unsubQuestion = onValue(questionRef, snap => {
      dispatch({ type: 'SET_QUESTION', payload: snap.val() });
    });

    return () => {
      off(playersRef,  'value', unsubPlayers);
      off(metaRef,     'value', unsubMeta);
      off(questionRef, 'value', unsubQuestion);
      clearTimeout(debounce.current);
    };
  }, [roomCode]);

  // Expose roomRef so host and player can write to Firebase
  return (
    <GameCtx.Provider value={{ state, dispatch, roomRef, roomCode }}>
      {children}
    </GameCtx.Provider>
  );
}

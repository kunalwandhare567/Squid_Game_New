// =====================================================================
// GameContext.jsx — Supabase sync brain. Realtime channel listeners.
// Debounced lobby updates prevent rapid DOM flicker on mass joins.
// =====================================================================
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

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
    case 'SET_META':
      return {
        ...state,
        meta: action.payload || {},
        phase: action.payload?.phase || state.phase
      };
    case 'SET_PLAYERS':
      return { ...state, players: action.payload || {} };
    case 'SET_QUESTION':
      return { ...state, question: action.payload };
    case 'SET_ANSWERS':
      return { ...state, answers: action.payload || {} };
    default:
      return state;
  }
}

export function GameProvider({ roomCode, children }) {
  const [state, dispatch] = useReducer(reducer, init);
  const debounce = useRef(null);
  const playersCache = useRef({});

  useEffect(() => {
    if (!roomCode) return;

    // 1. Initial fetch from Supabase
    async function fetchInitial() {
      try {
        // Fetch room info
        const { data: roomData } = await supabase
          .from('rooms')
          .select('*')
          .eq('room_code', roomCode)
          .maybeSingle();

        if (roomData) {
          const metaObj = {
            phase: roomData.phase,
            qIndex: roomData.q_index,
            roomCode: roomData.room_code,
            startedAt: roomData.started_at ? new Date(roomData.started_at).getTime() : Date.now(),
            ...(roomData.meta || {}),
          };
          dispatch({ type: 'SET_META', payload: metaObj });
          dispatch({ type: 'SET_QUESTION', payload: roomData.question || null });
        }

        // Fetch players
        const { data: playersList } = await supabase
          .from('players')
          .select('*')
          .eq('room_code', roomCode);

        if (playersList) {
          const pMap = {};
          playersList.forEach(p => {
            pMap[p.player_id] = {
              id: p.player_id,
              name: p.name,
              emoji: p.emoji,
              alive: p.alive,
              spectator: p.spectator,
              score: p.score,
              strikes: p.strikes,
              consecutiveWrong: p.consecutive_wrong,
              shield: p.shield,
              dd: p.dd,
              joinOrder: p.join_order,
              bot: p.bot,
            };
          });
          playersCache.current = pMap;
          dispatch({ type: 'SET_PLAYERS', payload: pMap });
        }
      } catch (err) {
        console.error('Error fetching initial game state from Supabase:', err);
      }
    }

    fetchInitial();

    // 2. Realtime Channel Subscription
    const channel = supabase
      .channel(`game-room-${roomCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` },
        payload => {
          const row = payload.new;
          if (!row) return;
          const metaObj = {
            phase: row.phase,
            qIndex: row.q_index,
            roomCode: row.room_code,
            startedAt: row.started_at ? new Date(row.started_at).getTime() : Date.now(),
            ...(row.meta || {}),
          };
          dispatch({ type: 'SET_META', payload: metaObj });
          dispatch({ type: 'SET_QUESTION', payload: row.question || null });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${roomCode}` },
        payload => {
          const { eventType, new: newRow, old: oldRow } = payload;
          clearTimeout(debounce.current);

          debounce.current = setTimeout(() => {
            const current = { ...playersCache.current };
            if (eventType === 'DELETE' && oldRow?.player_id) {
              delete current[oldRow.player_id];
            } else if (newRow?.player_id) {
              current[newRow.player_id] = {
                id: newRow.player_id,
                name: newRow.name,
                emoji: newRow.emoji,
                alive: newRow.alive,
                spectator: newRow.spectator,
                score: newRow.score,
                strikes: newRow.strikes,
                consecutiveWrong: newRow.consecutive_wrong,
                shield: newRow.shield,
                dd: newRow.dd,
                joinOrder: newRow.join_order,
                bot: newRow.bot,
              };
            }
            playersCache.current = current;
            dispatch({ type: 'SET_PLAYERS', payload: current });
          }, 150);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(debounce.current);
    };
  }, [roomCode]);

  return (
    <GameCtx.Provider value={{ state, dispatch, roomCode }}>
      {children}
    </GameCtx.Provider>
  );
}

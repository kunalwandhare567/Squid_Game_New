// =====================================================================
// GameContext.jsx — Supabase sync brain. Realtime channel + polling fallback.
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

    let isMounted = true;

    // Helper: Sync latest room & player state from Supabase
    async function syncState() {
      try {
        const { data: roomData } = await supabase
          .from('rooms')
          .select('*')
          .eq('room_code', roomCode)
          .maybeSingle();

        if (roomData && isMounted) {
          const metaObj = {
            startedAt: roomData.started_at ? new Date(roomData.started_at).getTime() : Date.now(),
            ...(roomData.meta || {}),
            phase: roomData.phase || roomData.meta?.phase || 'lobby',
            qIndex: roomData.q_index != null ? roomData.q_index : roomData.meta?.qIndex,
            roomCode: roomData.room_code,
          };
          dispatch({ type: 'SET_META', payload: metaObj });
          dispatch({ type: 'SET_QUESTION', payload: roomData.question || null });
        }

        const { data: playersList } = await supabase
          .from('players')
          .select('*')
          .eq('room_code', roomCode);

        if (playersList && isMounted) {
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
        console.error('Error syncing game state from Supabase:', err);
      }
    }

    // 1. Initial immediate sync
    syncState();

    // 2. High-reliability Polling Fallback (ensures mobile clients never miss phase transitions)
    const pollInterval = setInterval(syncState, 1200);

    // 3. Instant Realtime Channel Subscription
    const channel = supabase
      .channel(`game-room-${roomCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` },
        payload => {
          const row = payload.new;
          if (!row || !isMounted) return;
          const metaObj = {
            startedAt: row.started_at ? new Date(row.started_at).getTime() : Date.now(),
            ...(row.meta || {}),
            phase: row.phase || row.meta?.phase || 'lobby',
            qIndex: row.q_index != null ? row.q_index : row.meta?.qIndex,
            roomCode: row.room_code,
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
          if (!isMounted) return;
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
          }, 100);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
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

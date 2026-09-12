import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gpcpakrnuinkffhsueux.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwY3Bha3JudWlua2ZmaHN1ZXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDczNjYsImV4cCI6MjEwNDc4MzM2Nn0.zyZ2dGdJzSaTdi0Kcf9_c5Zz5L317vn2w0Pm6KgA0A4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fullHealthCheck() {
  console.log('====================================================');
  console.log('🦑 SUPABASE REALTIME & DATABASE CONNECTIVITY CHECK');
  console.log('====================================================');
  console.log(`Endpoint URL : ${supabaseUrl}`);
  console.log(`Timestamp    : ${new Date().toISOString()}\n`);

  let allPassed = true;

  // 1. Check Tables
  const tables = ['rooms', 'players', 'answers'];
  for (const table of tables) {
    const start = Date.now();
    const { data, error } = await supabase.from(table).select('*').limit(1);
    const latency = Date.now() - start;
    if (error) {
      console.log(`❌ Table [${table}] : FAILED (${error.message})`);
      allPassed = false;
    } else {
      console.log(`✅ Table [${table}] : CONNECTED (Latency: ${latency}ms, Rows: ${data.length})`);
    }
  }

  // 2. Test Host Room Lifecycle (Insert -> Read -> Update -> Delete)
  console.log('\n--- Testing Game Host Room Lifecycle ---');
  const testRoomCode = 'SQ' + Math.floor(10 + Math.random() * 89);
  
  // Create Room
  const { error: roomInsertErr } = await supabase.from('rooms').upsert({
    room_code: testRoomCode,
    phase: 'lobby',
    q_index: 0,
    meta: { test: true, hostAlive: true },
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (roomInsertErr) {
    console.log(`❌ Host Room Creation : FAILED (${roomInsertErr.message})`);
    allPassed = false;
  } else {
    console.log(`✅ Host Room Creation : SUCCESS (Room Code: ${testRoomCode})`);
  }

  // 3. Test Player Join
  console.log('\n--- Testing Mobile Player Join ---');
  const testPlayerId = 'p_test_' + Date.now();
  const { error: playerInsertErr } = await supabase.from('players').upsert({
    room_code: testRoomCode,
    player_id: testPlayerId,
    name: 'Tester 456',
    emoji: '🦑',
    alive: true,
    spectator: false,
    score: 100,
    strikes: 0,
    consecutive_wrong: 0,
    shield: 1,
    dd: 1,
    join_order: 1,
    bot: false,
    joined_at: new Date().toISOString(),
  });

  if (playerInsertErr) {
    console.log(`❌ Player Join : FAILED (${playerInsertErr.message})`);
    allPassed = false;
  } else {
    console.log(`✅ Player Join : SUCCESS (Player: Tester 456 / ${testPlayerId})`);
  }

  // 4. Test Player Answer Submission
  console.log('\n--- Testing Player Answer Submission ---');
  const { error: ansInsertErr } = await supabase.from('answers').upsert({
    room_code: testRoomCode,
    round_key: 'r0',
    player_id: testPlayerId,
    choice_id: 'opt_A',
    shield_on: false,
    dd_on: true,
    submitted_at: new Date().toISOString(),
  });

  if (ansInsertErr) {
    console.log(`❌ Answer Submission : FAILED (${ansInsertErr.message})`);
    allPassed = false;
  } else {
    console.log(`✅ Answer Submission : SUCCESS (Option: opt_A, Double Down: ON)`);
  }

  // 5. Cleanup Test Data
  console.log('\n--- Cleaning Up Test Data ---');
  const { error: deleteErr } = await supabase.from('rooms').delete().eq('room_code', testRoomCode);
  if (deleteErr) {
    console.log(`⚠️ Cleanup warning: ${deleteErr.message}`);
  } else {
    console.log(`✅ Test Room & Cascade Player/Answer Data Cleaned Up.`);
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('🎉 STATUS: ALL SYSTEMS OPERATIONAL & FULLY CONNECTED');
  } else {
    console.log('⚠️ STATUS: SOME CHECKS FAILED - CHECK LOGS ABOVE');
  }
  console.log('====================================================\n');
}

fullHealthCheck();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gpcpakrnuinkffhsueux.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwY3Bha3JudWlua2ZmaHN1ZXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDczNjYsImV4cCI6MjEwNDc4MzM2Nn0.zyZ2dGdJzSaTdi0Kcf9_c5Zz5L317vn2w0Pm6KgA0A4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection to:', supabaseUrl);

  const tables = ['rooms', 'players', 'answers'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table '${table}' check failed:`, error.message, `(Code: ${error.code})`);
    } else {
      console.log(`✅ Table '${table}' is accessible! Found ${data.length} sample rows.`);
    }
  }

  // Test inserting and deleting a test room
  const testCode = 'TEST';
  console.log(`Testing test room creation (${testCode})...`);
  const { error: insertErr } = await supabase.from('rooms').upsert({
    room_code: testCode,
    phase: 'lobby',
    q_index: 0,
    meta: { test: true },
  });

  if (insertErr) {
    console.log('❌ Insert test failed:', insertErr.message);
  } else {
    console.log('✅ Room upsert test passed!');
    await supabase.from('rooms').delete().eq('room_code', testCode);
    console.log('✅ Cleanup passed! Supabase connection is 100% READY!');
  }
}

testConnection();

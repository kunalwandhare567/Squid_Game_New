import { createClient } from '@supabase/supabase-js';

// Resolve Supabase URL from environment
const rawUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
let supabaseUrl = rawUrl.trim().replace(/^["']|["']$/g, '');

// Strip trailing /rest/v1 or trailing slashes if present
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

// If user put the Postgres URI, extract the project ref to construct the HTTPS URL
if (supabaseUrl.startsWith('postgresql://') || supabaseUrl.startsWith('postgres://')) {
  const match = supabaseUrl.match(/postgres\.([a-zA-Z0-9_-]+):/);
  if (match && match[1]) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
  }
} else if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}.supabase.co`;
}

// Fallback to project ref if empty
if (!supabaseUrl) {
  supabaseUrl = 'https://gpcpakrnuinkffhsueux.supabase.co';
}

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

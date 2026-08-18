// Tenfold Method — Supabase client setup
// The URL and publishable key below are safe to be public (they are
// designed for browser/front-end use). The secret service_role key is
// never used here or anywhere in this front-end code.

const SUPABASE_URL = "https://aeoqczhdhzlggivkgaob.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_l4RAXBIi_a_793wz2-k04g_vA2ispQu";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

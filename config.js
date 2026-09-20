const SUPABASE_URL = "https://svacwpflxkwkpbfdftdc.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_B0syIzxBqcbpjYvQCh6Fbw_k_3gxt9D";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

console.log("Supabase conectado!");

const VAPID_PUBLIC_KEY =
  "BCH-C2t7mdP90IqFcFU13aJby8glIEL6W_yqz2PzxOasAB_sYICxwRXTr4jqfTyuj1TaUBhDpvCzT_jzUxgD3zA";

console.log("VAPID conectado!");

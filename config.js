const SUPABASE_URL = "https://ewyeqgjimqgmygpvwcbx.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_DE5xIWaPWZ_K1ulGXCPGFQ_U742hefC";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

console.log("Supabase conectado!");

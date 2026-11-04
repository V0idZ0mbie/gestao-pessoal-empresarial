// ============= Supabase Configuration =============
// A anon key e publica e deve ser preenchida com a chave do projeto no Supabase.
// https://supabase.com/dashboard/project/bnmaatcgqlzcvueszmnw/settings/api

window.SUPABASE_URL = window.SUPABASE_URL || "https://bnmaatcgqlzcvueszmnw.supabase.co";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "sb_publishable__-JFGjdUm7L0c-86nfYpWA_H7uE2lVW";

const isSupabaseKeyConfigured = (key) =>
  typeof key === 'string' &&
  key.length > 20 &&
  !/^(SUA_CHAVE|dummy|\*{3,})/i.test(key);

window.supabaseConfigured =
  typeof window.SUPABASE_URL === 'string' &&
  window.SUPABASE_URL.startsWith('https://') &&
  isSupabaseKeyConfigured(window.SUPABASE_ANON_KEY);

if (window.supabaseConfigured && window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    const supabaseLibrary = window.supabase;
    window.supabaseClient = supabaseLibrary.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    window.supabase = window.supabaseClient;
  } catch (err) {
    window.supabaseConfigured = false;
    console.error("Nao foi possivel inicializar o Supabase:", err);
  }
}

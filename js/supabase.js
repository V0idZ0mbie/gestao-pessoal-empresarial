// ============= Supabase Configuration =============
// Substitua pelos valores do seu projeto no Supabase:
//   - PROJECT URL: https://<project-id>.supabase.co
//   - ANON KEY: <chave pública do seu projeto>
//
// FT: Supabase Auth + Supabase Database (PostgreSQL)

window.SUPABASE_URL = "SUA_URL_AQUI";
window.SUPABASE_ANON_KEY = "SUA_CHAVE_ANON_KEY";

// Cria o cliente Supabase e expõe globalmente
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expõe o cliente para os outros módulos
window.supabaseClient = window.supabase;

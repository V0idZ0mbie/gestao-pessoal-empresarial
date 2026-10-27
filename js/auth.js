// ============= Autenticação via Supabase =============
// Registro, login, logout e gerenciamento de sessão.
// Usa o Supabase Auth (email + password).
// Não há servidor: os dados ficam no Supabase (PostgreSQL).

// --------------------------------------------------------------------------
// Registro de usuário
// --------------------------------------------------------------------------
window.registerUser = async function (username, email, password) {
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password || password.length < 6) {
    return { error: "Credenciais inválidas (mínimo 6 caracteres)." };
  }

  const { data, error } = await window.supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: normalized,
        full_name: username.trim()
      }
    }
  });

  if (error) {
    // Trata erros comuns
    if (error.message && error.message.includes('already registered')) {
      return { error: "Este email já está registrado. Tente fazer login." };
    }
    return { error: error.message || "Falha no cadastro." };
  }

  return {
    user: data.user,
    session: data.session,
    error: null
  };
};

// --------------------------------------------------------------------------
// Login
// --------------------------------------------------------------------------
window.loginUser = async function (email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await window.supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error) {
    // Tenta recuperar o usuário por username se o e-mail não bateu
    // (suporte a login por username em vez de e-mail)
    const { data: userData, error: userError } = await window.supabase.auth.getUser();
    if (userError) return { error: userError.message };

    if (userData.user) {
      return { user: userData.user, error: "Senha incorreta." };
    }

    return { error: error.message };
  }

  return {
    user: data.user,
    session: data.session,
    error: null
  };
};

// --------------------------------------------------------------------------
// Logout
// --------------------------------------------------------------------------
window.logout = async function () {
  await window.supabase.auth.signOut();
};

// --------------------------------------------------------------------------
// Checa se o usuário está autenticado
// --------------------------------------------------------------------------
window.isAuthenticated = function () {
  const { data: { session } } = window.supabase.auth.getSession();
  return !!session;
};

// --------------------------------------------------------------------------
// Usuário atual
// --------------------------------------------------------------------------
window.getCurrentUser = async function () {
  const { data: { user } } = await window.supabase.auth.getUser();
  return user;
};

// --------------------------------------------------------------------------
// Session guard
// --------------------------------------------------------------------------
window.getSession = async function () {
  const { data: { session } } = await window.supabase.auth.getSession();
  return session;
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
window.getToken = function () {
  const { data: { session } } = window.supabase.auth.getSession();
  return session?.access_token || null;
};

window.setToken = function (token) {
  sessionStorage.setItem("gp_token", token);
};

window.clearToken = function () {
  sessionStorage.removeItem("gp_token");
};

// Sincroniza o estado de autenticação quando o usuário for recuperado
window.supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    sessionStorage.setItem("gp_userId", session?.user?.id || null);
  } else if (event === 'SIGNED_OUT') {
    sessionStorage.removeItem("gp_userId");
  }
});

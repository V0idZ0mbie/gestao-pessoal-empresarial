// ============= Autenticação via Supabase com Fallback Local =============

window.registerUser = async function (username, email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = username.trim();

  if (!cleanName || !password || password.length < 6) {
    return { error: "A senha deve conter no mínimo 6 caracteres e o nome é obrigatório." };
  }

  // Tenta cadastro via Supabase se disponível
  if (window.supabase?.auth && !window.SUPABASE_ANON_KEY.includes('dummyKey')) {
    try {
      const { data, error } = await window.supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            username: cleanName.toLowerCase(),
            full_name: cleanName
          }
        }
      });

      if (error) {
        if (error.message && error.message.includes('already registered')) {
          return { error: "Este email já está cadastrado. Tente entrar." };
        }
        return { error: error.message };
      }

      return { user: data.user, session: data.session, error: null };
    } catch (e) {
      console.warn("Falha no signup do Supabase:", e.message);
    }
  }

  // Fallback Local (armazenamento de credenciais locais para desenvolvimento)
  const localUsers = JSON.parse(localStorage.getItem('gp_local_users') || '[]');
  if (localUsers.find(u => u.email === normalizedEmail)) {
    return { error: "Este email já está cadastrado localmente." };
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    email: normalizedEmail,
    name: cleanName,
    password: password, // apenas para demo local offline
    created_at: new Date().toISOString()
  };

  localUsers.push(newUser);
  localStorage.setItem('gp_local_users', JSON.stringify(localUsers));

  return { user: newUser, error: null };
};

window.loginUser = async function (email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  // Se supabase ativo
  if (window.supabase?.auth && !window.SUPABASE_ANON_KEY.includes('dummyKey')) {
    try {
      const { data, error } = await window.supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (!error && data?.session) {
        sessionStorage.setItem("gp_userId", data.user.id);
        sessionStorage.setItem("gp_userEmail", data.user.email);
        sessionStorage.setItem("gp_userName", data.user.user_metadata?.full_name || data.user.email.split('@')[0]);
        return { user: data.user, session: data.session, error: null };
      }

      if (error && !error.message.includes('fetch')) {
        return { error: error.message };
      }
    } catch (e) {
      console.warn("Tentando autenticação local...", e.message);
    }
  }

  // Fallback Local / Modo Demonstração
  const localUsers = JSON.parse(localStorage.getItem('gp_local_users') || '[]');
  const user = localUsers.find(u => u.email === normalizedEmail && u.password === password);

  if (user) {
    sessionStorage.setItem("gp_userId", user.id);
    sessionStorage.setItem("gp_userEmail", user.email);
    sessionStorage.setItem("gp_userName", user.name || user.email.split('@')[0]);
    return { user, error: null };
  }

  // Conta padrão para testes imediatos sem necessidade de cadastro
  if ((normalizedEmail === 'admin@gestao.com' || normalizedEmail === 'demo@gestao.com') && password === '123456') {
    const demoUser = {
      id: 'demo-user-123',
      email: normalizedEmail,
      name: 'Gestor Pro'
    };
    sessionStorage.setItem("gp_userId", demoUser.id);
    sessionStorage.setItem("gp_userEmail", demoUser.email);
    sessionStorage.setItem("gp_userName", demoUser.name);
    return { user: demoUser, error: null };
  }

  // Se nenhum usuário local cadastrado ainda e o usuário digitou credenciais válidas, permite entrar em modo rápido
  if (localUsers.length === 0 && normalizedEmail && password.length >= 6) {
    const quickUser = {
      id: 'usr_' + Date.now(),
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0]
    };
    sessionStorage.setItem("gp_userId", quickUser.id);
    sessionStorage.setItem("gp_userEmail", quickUser.email);
    sessionStorage.setItem("gp_userName", quickUser.name);
    return { user: quickUser, error: null };
  }

  return { error: "E-mail ou senha incorretos." };
};

window.logout = async function () {
  if (window.supabase?.auth) {
    try {
      await window.supabase.auth.signOut();
    } catch (e) {}
  }
  sessionStorage.removeItem("gp_userId");
  sessionStorage.removeItem("gp_userEmail");
  sessionStorage.removeItem("gp_userName");
  sessionStorage.removeItem("gp_token");
};

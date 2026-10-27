// ============ Autenticação (Cliente-side) ============
// Registro, login, logout e gerenciamento de sessão.
// Senhas são hasheadas com SHA-256 + sal (Web Crypto API).
// Não há servidor: os dados ficam no navegador (localStorage).

// --------------------------------------------------------------------------
// Registro de usuário
// --------------------------------------------------------------------------
window.registerUser = async function (username, email, password) {
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password || password.length < 6) {
    return { error: "Credenciais inválidas (mínimo 6 caracteres)." };
  }

  const users = JSON.parse(localStorage.getItem("gp_users") || "[]");
  if (users.some((u) => u.username === normalized)) {
    return { error: "Username já existe." };
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await hashPassword(password, salt);
  const user = {
    id: "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    username: normalized,
    email: email ? email.trim().toLowerCase() : "",
    passwordHashBase64: passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  localStorage.setItem("gp_users", JSON.stringify(users));
  return { user };
};

// --------------------------------------------------------------------------
// Login
// --------------------------------------------------------------------------
window.loginUser = async function (username, password) {
  const normalized = username.trim().toLowerCase();
  const users = JSON.parse(localStorage.getItem("gp_users") || "[]");
  const user = users.find((u) => u.username === normalized);
  if (!user) return { error: "Usuário ou senha inválidos." };

  const salt = atob(user.passwordHashBase64).split("").map((c) => c.charCodeAt(0));
  const passwordHash = await hashPassword(password, salt);
  if (passwordHash !== user.passwordHashBase64) {
    return { error: "Usuário ou senha inválidos." };
  }

  // Gera token de sessão
  const token = "sess_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  sessionStorage.setItem("gp_token", token);
  sessionStorage.setItem("gp_userId", user.id);
  return { user };
};

// --------------------------------------------------------------------------
// Logout
// --------------------------------------------------------------------------
window.logout = function () {
  sessionStorage.removeItem("gp_token");
  sessionStorage.removeItem("gp_userId");
};

// --------------------------------------------------------------------------
// Checa se o usuário está autenticado
// --------------------------------------------------------------------------
window.isAuthenticated = function () {
  return !!getToken();
};

// --------------------------------------------------------------------------
// Usuário atual
// --------------------------------------------------------------------------
window.getCurrentUser = function () {
  const userId = sessionStorage.getItem("gp_userId");
  if (!userId) return null;
  const users = JSON.parse(localStorage.getItem("gp_users") || "[]");
  return users.find((u) => u.id === userId) || null;
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
window.getToken = function () {
  return sessionStorage.getItem("gp_token");
};

window.setToken = function (token) {
  sessionStorage.setItem("gp_token", token);
};

window.clearToken = function () {
  sessionStorage.removeItem("gp_token");
};

// Hash de senha: SHA-256 + sal (base64)
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

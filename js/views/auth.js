// ===== Views de Login e Cadastro (Supabase) =====

const AuthViews = {
  // Renderiza a página de login
  renderLogin(container) {
    container.innerHTML = `
      <div class="header" style="margin-bottom:24px;">
        <div>
          <h1>Bem-vindo</h1>
          <p class="subtitle">Faça login para acessar o sistema</p>
        </div>
        <a href="#/register" class="btn btn-primary">Criar conta grátis</a>
      </div>
      <div class="card" style="max-width:380px;margin:40px auto;">
        <form id="login-form">
          <div class="form-group">
            <label>E-mail</label>
            <input id="f-email" type="email" placeholder="Seu e-mail" autocomplete="email" required />
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input id="f-pass" type="password" placeholder="Sua senha" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Entrar</button>
          <p style="font-size:13px;color:var(--text-muted);margin-top:12px;text-align:center;">
            Primeira vez? <a href="#/register">Crie sua conta</a>
          </p>
        </form>
      </div>
    `;
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('f-email').value.trim();
      const password = document.getElementById('f-pass').value;
      if (!email || !password) { Toast.show('Preencha e-mail e senha.', 'error'); return; }
      try {
        const res = await window.loginUser(email, password);
        if (res.error) throw new Error(res.error);
        Toast.show('Login realizado com sucesso!', 'success');
        window.location.hash = '/dashboard';
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });
  },

  // Renderiza a página de cadastro
  renderRegister(container) {
    container.innerHTML = `
      <div class="header" style="margin-bottom:24px;">
        <div>
          <h1>Cadastre-se</h1>
          <p class="subtitle">Crie sua conta gratuitamente</p>
        </div>
        <a href="#/login" class="btn btn-ghost">Já tem conta? Fazer login</a>
      </div>
      <div class="card" style="max-width:400px;margin:40px auto;">
        <form id="register-form">
          <div class="form-group">
            <label>E-mail</label>
            <input id="f-email" type="email" placeholder="email@exemplo.com" autocomplete="email" required />
          </div>
          <div class="form-group">
            <label>Usuário</label>
            <input id="f-user" type="text" placeholder="Seu usuário" autocomplete="username" required />
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input id="f-pass" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password" required minlength="6" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Criar conta</button>
          <p style="font-size:13px;color:var(--text-muted);margin-top:12px;text-align:center;">
            Já tem conta? <a href="#/login">Fazer login</a>
          </p>
        </form>
      </div>
    `;
    const form = document.getElementById('register-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('f-email').value.trim();
      const username = document.getElementById('f-user').value.trim();
      const password = document.getElementById('f-pass').value;
      if (!email || !username || !password || password.length < 6) {
        Toast.show('Preencha todos os campos com uma senha de pelo menos 6 caracteres.', 'error');
        return;
      }
      try {
        const res = await window.registerUser(username, email, password);
        if (res.error) throw new Error(res.error);
        Toast.show('Conta criada! Faça login.', 'success');
        window.location.hash = '/login';
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });
  }
};

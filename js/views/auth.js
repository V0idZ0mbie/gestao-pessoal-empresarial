// ============= Views de Autenticação (Login e Registro) =============

const AuthViews = {
  renderLogin(container) {
    container.innerHTML = `
      <div class="login-page">
        <div class="login-bg"></div>

        <button class="theme-toggle auth-theme-toggle" id="auth-theme-toggle" title="Alternar tema">
          <i class="fas fa-moon"></i>
        </button>

        <div class="login-card">
          <div class="logo">
            <div class="logo-icon">
              <i class="fas fa-chart-pie"></i>
            </div>
            <div>
              <h1>GestãoPro</h1>
              <p>Acesse sua plataforma integrada</p>
            </div>
          </div>

          <form class="login-form" id="login-form" novalidate>
            <div class="form-group">
              <label for="f-email">E-mail</label>
              <div class="input-with-icon">
                <i class="fas fa-envelope"></i>
                <input
                  id="f-email"
                  type="email"
                  placeholder="exemplo@gestaopro.com"
                  autocomplete="email"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="f-pass">Senha de Acesso</label>
              <div class="input-with-icon">
                <i class="fas fa-lock"></i>
                <input
                  id="f-pass"
                  type="password"
                  placeholder="Sua senha secreta"
                  autocomplete="current-password"
                  required
                />
                <button type="button" class="toggle-password-btn" id="toggle-login-pass" title="Mostrar/ocultar senha">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>

            <button type="submit" class="btn-login" id="login-submit">
              <span class="spinner"></span>
              <span class="btn-text"><i class="fas fa-sign-in-alt"></i> Entrar no Sistema</span>
            </button>

            <div class="demo-credentials-box">
              <span><strong>💡 Acesso Rápido de Demonstração:</strong></span>
              <span>E-mail: <code>admin@gestao.com</code></span>
              <span>Senha: <code>123456</code></span>
            </div>

            <p class="login-alternative">
              Não possui uma conta? <a href="#/register">Cadastre-se gratuitamente</a>
            </p>
          </form>
        </div>
      </div>
    `;

    // Toggle de visibilidade de senha
    const togglePassBtn = document.getElementById('toggle-login-pass');
    const passInput = document.getElementById('f-pass');
    togglePassBtn?.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      togglePassBtn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
    });

    // Toggle de tema na tela de auth
    const themeBtn = document.getElementById('auth-theme-toggle');
    themeBtn?.addEventListener('click', () => {
      window.App.toggleTheme();
    });

    // Form submit
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('f-email');
        const submitBtn = document.getElementById('login-submit');

        const email = emailInput.value.trim();
        const pass = passInput.value;

        if (!email || !pass) {
          Toast.show('Preencha seu e-mail e senha para continuar.', 'error');
          return;
        }

        submitBtn.classList.add('loading');

        try {
          const res = await window.loginUser(email, pass);
          if (res.error) {
            Toast.show(res.error, 'error');
            submitBtn.classList.remove('loading');
            return;
          }

          Toast.show('Login realizado com sucesso! Bem-vindo.', 'success');
          window.location.hash = '/dashboard';
        } catch (err) {
          Toast.show('Falha ao autenticar: ' + err.message, 'error');
          submitBtn.classList.remove('loading');
        }
      });
    }
  },

  renderRegister(container) {
    container.innerHTML = `
      <div class="login-page">
        <div class="login-bg"></div>

        <button class="theme-toggle auth-theme-toggle" id="auth-theme-toggle" title="Alternar tema">
          <i class="fas fa-moon"></i>
        </button>

        <div class="login-card">
          <div class="logo">
            <div class="logo-icon">
              <i class="fas fa-chart-pie"></i>
            </div>
            <div>
              <h1>GestãoPro</h1>
              <p>Crie sua conta em segundos</p>
            </div>
          </div>

          <form class="login-form" id="register-form" novalidate>
            <div class="form-group">
              <label for="f-user">Nome Completo</label>
              <div class="input-with-icon">
                <i class="fas fa-user"></i>
                <input
                  id="f-user"
                  type="text"
                  placeholder="Ex: João da Silva"
                  autocomplete="name"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="f-email">E-mail</label>
              <div class="input-with-icon">
                <i class="fas fa-envelope"></i>
                <input
                  id="f-email"
                  type="email"
                  placeholder="seu@email.com"
                  autocomplete="email"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="f-pass">Senha de Acesso (mínimo 6 caracteres)</label>
              <div class="input-with-icon">
                <i class="fas fa-lock"></i>
                <input
                  id="f-pass"
                  type="password"
                  placeholder="Crie uma senha segura"
                  autocomplete="new-password"
                  minlength="6"
                  required
                />
                <button type="button" class="toggle-password-btn" id="toggle-reg-pass" title="Mostrar/ocultar senha">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
              <!-- Indicador de força de senha -->
              <div class="password-strength-meter" id="pass-strength-meter">
                <div class="strength-bar"><div class="strength-fill" id="strength-fill"></div></div>
                <span class="strength-text" id="strength-text">Digite sua senha</span>
              </div>
            </div>

            <div class="form-group">
              <label for="f-pass-confirm">Confirmar Senha</label>
              <div class="input-with-icon">
                <i class="fas fa-check-double"></i>
                <input
                  id="f-pass-confirm"
                  type="password"
                  placeholder="Repita a senha digitada"
                  autocomplete="new-password"
                  minlength="6"
                  required
                />
              </div>
              <small class="field-error" id="confirm-pass-error" style="display:none;color:var(--danger);font-size:12px;margin-top:4px;">As senhas não coincidem.</small>
            </div>

            <button type="submit" class="btn-login" id="register-submit">
              <span class="spinner"></span>
              <span class="btn-text"><i class="fas fa-user-plus"></i> Finalizar Cadastro</span>
            </button>

            <p class="login-alternative">
              Já possui uma conta? <a href="#/login">Clique aqui para entrar</a>
            </p>
          </form>
        </div>
      </div>
    `;

    // Toggle de visibilidade da senha
    const togglePassBtn = document.getElementById('toggle-reg-pass');
    const passInput = document.getElementById('f-pass');
    const confirmInput = document.getElementById('f-pass-confirm');
    const confirmError = document.getElementById('confirm-pass-error');
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');

    togglePassBtn?.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      togglePassBtn.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
    });

    // Medidor de força de senha
    passInput?.addEventListener('input', () => {
      const val = passInput.value;
      let score = 0;
      if (val.length >= 6) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      strengthFill.className = 'strength-fill';
      if (!val) {
        strengthFill.style.width = '0%';
        strengthText.textContent = 'Digite sua senha';
        strengthText.style.color = 'var(--text-dim)';
      } else if (score <= 1) {
        strengthFill.classList.add('weak');
        strengthFill.style.width = '25%';
        strengthText.textContent = 'Senha fraca';
        strengthText.style.color = 'var(--danger)';
      } else if (score === 2) {
        strengthFill.classList.add('medium');
        strengthFill.style.width = '50%';
        strengthText.textContent = 'Senha média';
        strengthText.style.color = 'var(--warning)';
      } else if (score === 3) {
        strengthFill.classList.add('good');
        strengthFill.style.width = '75%';
        strengthText.textContent = 'Senha boa';
        strengthText.style.color = 'var(--primary)';
      } else {
        strengthFill.classList.add('strong');
        strengthFill.style.width = '100%';
        strengthText.textContent = 'Senha excelente!';
        strengthText.style.color = 'var(--success)';
      }
    });

    // Verificação em tempo real de confirmação de senha
    confirmInput?.addEventListener('input', () => {
      if (confirmInput.value && confirmInput.value !== passInput.value) {
        confirmError.style.display = 'block';
      } else {
        confirmError.style.display = 'none';
      }
    });

    // Toggle de tema na tela de auth
    const themeBtn = document.getElementById('auth-theme-toggle');
    themeBtn?.addEventListener('click', () => {
      window.App.toggleTheme();
    });

    // Form submit
    const form = document.getElementById('register-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = document.getElementById('f-user');
        const emailInput = document.getElementById('f-email');
        const submitBtn = document.getElementById('register-submit');

        const username = userInput.value.trim();
        const email = emailInput.value.trim();
        const pass = passInput.value;
        const confirmPass = confirmInput.value;

        if (!username || !email || !pass) {
          Toast.show('Preencha todos os campos do formulário.', 'error');
          return;
        }

        if (pass.length < 6) {
          Toast.show('A senha deve possuir no mínimo 6 dígitos.', 'error');
          return;
        }

        if (pass !== confirmPass) {
          Toast.show('A confirmação de senha não coincide com a senha digitada.', 'error');
          confirmError.style.display = 'block';
          return;
        }

        submitBtn.classList.add('loading');

        try {
          const res = await window.registerUser(username, email, pass);
          if (res.error) {
            Toast.show(res.error, 'error');
            submitBtn.classList.remove('loading');
            return;
          }

          Toast.show('Conta criada com sucesso! Faça login para começar.', 'success');
          window.location.hash = '/login';
        } catch (err) {
          Toast.show('Falha ao registrar conta: ' + err.message, 'error');
          submitBtn.classList.remove('loading');
        }
      });
    }
  }
};

window.AuthViews = AuthViews;

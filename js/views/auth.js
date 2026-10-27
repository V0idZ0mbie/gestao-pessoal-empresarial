// ===== Views de Login e Cadastro (Supabase + Tema) =====

// --------------------------------------------------------------------------
// Sistema de Tema
// --------------------------------------------------------------------------
const ThemeManager = {
  // Tema padrão: sistema ou 'light'
  getDefaultTheme() {
    const stored = sessionStorage.getItem('gp_theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  // Inicializa o tema
  init() {
    const theme = this.getDefaultTheme();
    document.documentElement.setAttribute('data-theme', theme);
    sessionStorage.setItem('gp_theme', theme);
    return theme;
  },

  // Alterna entre claro e escuro
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    sessionStorage.setItem('gp_theme', next);
    return next;
  },

  // Força um tema
  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    sessionStorage.setItem('gp_theme', theme);
  }
};

// ViewModel para o login
const AuthViewModel = {
  loading: false,

  // Valida o formulário de login
  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // Valida o formulário
  validate() {
    const email = document.getElementById('f-email')?.value.trim() || '';
    const password = document.getElementById('f-pass')?.value || '';
    let valid = true;

    if (!email) {
      document.getElementById('f-email').closest('.form-group').classList.add('error');
      valid = false;
    } else {
      document.getElementById('f-email').closest('.form-group').classList.remove('error');
    }

    if (!password) {
      document.getElementById('f-pass').closest('.form-group').classList.add('error');
      valid = false;
    } else {
      document.getElementById('f-pass').closest('.form-group').classList.remove('error');
    }

    return valid;
  },

  // Enviar login
  async login(email, password) {
    if (this.loading) return;
    this.loading = true;

    const btn = document.getElementById('login-form')?.querySelector('.btn-login');
    if (btn) {
      btn.classList.add('loading');
      btn.querySelector('.btn-text').style.display = 'none';
      btn.querySelector('.spinner').style.display = 'block';
    }

    try {
      const res = await window.loginUser(email, password);
      this.loading = false;
      if (res.error) throw new Error(res.error);
      await ThemeManager.init();
      Toast.show('Login realizado com sucesso!', 'success');
      window.location.hash = '/dashboard';
    } catch (err) {
      this.loading = false;
      Toast.show(err.message || 'Erro no login', 'error');
    }
  }
};

const AuthViews = {
  // Renderiza a página de login
  renderLogin(container) {
    container.innerHTML = `
      <div class="login-page">
        <div class="login-bg">
          <div class="float float-1"></div>
          <div class="float float-2"></div>
          <div class="float float-3"></div>
        </div>

        <!-- Alternador de tema -->
        <button class="theme-toggle" id="theme-toggle" title="Alternar tema">
          <i class="fas fa-moon"></i>
        </button>

        <!-- Card do Login -->
        <div class="login-card">
          <div class="logo">
            <i class="fas fa-warehouse"></i>
            <div>
              <h1>GestãoPro</h1>
              <p>Sistema de Gestão Pessoal & Empresarial</p>
            </div>
          </div>

          <form class="login-form" id="login-form" novalidate>
            <div class="form-group">
              <label for="f-email">E-mail</label>
              <input
                id="f-email"
                type="email"
                placeholder="seu@email.com"
                autocomplete="email"
                required
              />
            </div>

            <div class="form-group">
              <label for="f-pass">Senha</label>
              <input
                id="f-pass"
                type="password"
                placeholder="Sua senha"
                autocomplete="current-password"
                required
              />
            </div>

            <button type="submit" class="btn-login" id="login-submit">
              <span class="spinner"></span>
              <span class="btn-text">Entrar</span>
            </button>

            <p class="login-alternative">
              Não tem conta? <a href="#/register">Crie sua conta grátis</a>
            </p>
          </form>
        </div>
      </div>
    `;

    // Alternador de tema
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        ThemeManager.toggle();
        const icon = themeToggle.querySelector('i');
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
      });
    }

    // Submissão do formulário
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!AuthViewModel.validate()) {
          Toast.show('Preencha todos os campos.', 'error');
          return;
        }
        const email = document.getElementById('f-email').value.trim();
        const password = document.getElementById('f-pass').value;
        await AuthViewModel.login(email, password);
      });
    }

    // Animações de entrada
    requestAnimationFrame(() => {
      const card = document.querySelector('.login-card');
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
          card.style.transition = 'opacity .4s ease, transform .4s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 50);
      }
    });
  },

  // Renderiza a página de cadastro
  renderRegister(container) {
    container.innerHTML = `
      <div class="login-page">
        <div class="login-bg">
          <div class="float float-1"></div>
          <div class="float float-2"></div>
          <div class="float float-3"></div>
        </div>

        <button class="theme-toggle" id="theme-toggle" title="Alternar tema">
          <i class="fas fa-moon"></i>
        </button>

        <div class="login-card">
          <div class="logo">
            <i class="fas fa-warehouse"></i>
            <div>
              <h1>GestãoPro</h1>
              <p>Crie sua conta grátis</p>
            </div>
          </div>

          <form class="login-form" id="register-form" novalidate>
            <div class="form-group">
              <label for="f-email">E-mail</label>
              <input
                id="f-email"
                type="email"
                placeholder="seu@email.com"
                autocomplete="email"
                required
              />
            </div>

            <div class="form-group">
              <label for="f-user">Usuário</label>
              <input
                id="f-user"
                type="text"
                placeholder="Seu nome de usuário"
                autocomplete="username"
                required
              />
            </div>

            <div class="form-group">
              <label for="f-pass">Senha</label>
              <input
                id="f-pass"
                type="password"
                placeholder="Mínimo 6 caracteres"
                autocomplete="new-password"
                minlength="6"
                required
              />
            </div>

            <button type="submit" class="btn-login" id="register-submit">
              <span class="spinner"></span>
              <span class="btn-text">Criar conta</span>
            </button>

            <p class="login-alternative">
              Já tem conta? <a href="#/login">Fazer login</a>
            </p>
          </form>
        </div>
      </div>
    `;

    // Alternador de tema
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        ThemeManager.toggle();
        const icon = themeToggle.querySelector('i');
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
      });
    }

    // Submissão do formulário
    const form = document.getElementById('register-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!AuthViewModel.validate()) {
          Toast.show('Preencha todos os campos.', 'error');
          return;
        }
        const email = document.getElementById('f-email').value.trim();
        const username = document.getElementById('f-user').value.trim();
        const password = document.getElementById('f-pass').value;
        if (!password || password.length < 6) {
          Toast.show('A senha deve ter pelo menos 6 caracteres.', 'error');
          return;
        }
        try {
          const res = await window.registerUser(username, email, password);
          if (res.error) throw new Error(res.error);
          Toast.show('Conta criada! Faça login.', 'success');
          window.location.hash = '/login';
        } catch (err) {
          Toast.show(err.message || 'Erro no cadastro', 'error');
        }
      });
    }

    // Animação
    requestAnimationFrame(() => {
      const card = document.querySelector('.login-card');
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
          card.style.transition = 'opacity .4s ease, transform .4s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 50);
      }
    });
  }
};

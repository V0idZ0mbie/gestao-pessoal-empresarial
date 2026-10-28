// ============ Aplicação Principal & Router ============
// Gerencia a navegação, layout, cabeçalho e sessão

const ROUTES = {
  dashboard: { view: DashboardView, title: 'Painel de Controle', icon: 'fa-chart-line', needsAuth: true },
  accounts: { view: AccountsModule, title: 'Contas Bancárias', icon: 'fa-university', needsAuth: true },
  clients: { view: ClientsModule, title: 'Cadastro de Clientes', icon: 'fa-users', needsAuth: true },
  expenses: { view: ExpensesModule, title: 'Controle de Gastos', icon: 'fa-receipt', needsAuth: true },
  investments: { view: InvestmentsModule, title: 'Gestão de Investimentos', icon: 'fa-piggy-bank', needsAuth: true },
  'service-orders': { view: ServiceOrdersModule, title: 'Ordens de Serviço', icon: 'fa-clipboard-check', needsAuth: true },
  services: { view: ServicesCatalogModule, title: 'Tabela de Serviços & Valores Médios', icon: 'fa-calculator', needsAuth: true },
  cadastros: { view: ClientsModule, title: 'Cadastros Gerais', icon: 'fa-users', needsAuth: true },
  login: { view: AuthViews.renderLogin, title: 'Login no Sistema', icon: 'fa-sign-in-alt', needsAuth: false },
  register: { view: AuthViews.renderRegister, title: 'Criar Nova Conta', icon: 'fa-user-plus', needsAuth: false },
};

const App = {
  async init() {
    this.bindEvents();
    this.initTheme();
    await this.renderCurrentView();
  },

  getRoute() {
    const hash = window.location.hash || '#/dashboard';
    return hash.replace(/^#\/?/, '') || 'dashboard';
  },

  async renderCurrentView() {
    const route = this.getRoute();
    const routeInfo = ROUTES[route] || ROUTES.dashboard;

    // Checagem de autenticação
    const isAuth = await window.isAuthenticated();

    if (routeInfo.needsAuth && !isAuth) {
      window.location.hash = '/login';
      return;
    }

    if (!routeInfo.needsAuth && isAuth) {
      window.location.hash = '/dashboard';
      return;
    }

    // Controle de exibição do Sidebar / Topbar
    const isAuthRoute = (route === 'login' || route === 'register');
    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('topbar');
    
    if (sidebar) sidebar.style.display = isAuthRoute ? 'none' : 'flex';
    if (topbar) topbar.style.display = isAuthRoute ? 'none' : 'flex';

    // Atualiza cabeçalho
    const titleBadge = document.getElementById('page-title-badge');
    if (titleBadge && routeInfo.title) {
      titleBadge.textContent = routeInfo.title;
    }

    // Se autenticado, carrega info do usuário na sidebar
    if (isAuth && !isAuthRoute) {
      this.updateUserInfo();
    }

    // Resolução da view para renderizar
    const container = document.getElementById('main-content');
    let renderFn = null;

    if (typeof routeInfo.view === 'function') {
      renderFn = routeInfo.view;
    } else if (routeInfo.view && typeof routeInfo.view.render === 'function') {
      renderFn = (c) => routeInfo.view.render(c);
    } else if (routeInfo.view && typeof routeInfo.view.renderList === 'function') {
      renderFn = (c) => routeInfo.view.renderList(c);
    }

    if (renderFn) {
      container.innerHTML = '<div class="loading"><i class="fas fa-circle-notch fa-spin"></i> Carregando dados...</div>';
      try {
        await renderFn(container);
      } catch (err) {
        console.error('Erro ao renderizar view:', err);
        container.innerHTML = `
          <div class="card" style="text-align:center;padding:40px;">
            <i class="fas fa-exclamation-triangle" style="font-size:36px;color:var(--danger);margin-bottom:12px;"></i>
            <h3>Erro ao carregar a página</h3>
            <p style="color:var(--text-muted);margin:8px 0 16px;">${escapeHtml(err.message)}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">Recarregar Sistema</button>
          </div>
        `;
      }
    } else {
      container.innerHTML = '<div class="card"><p style="color:var(--text-muted);">Página não encontrada.</p></div>';
    }

    this.updateNav(route);
  },

  async updateUserInfo() {
    const user = await window.getCurrentUser();
    const userBadge = document.getElementById('user-profile-badge');
    const userNameDisplay = document.getElementById('user-name-display');
    const userEmailDisplay = document.getElementById('user-email-display');

    if (user && userBadge) {
      userBadge.style.display = 'flex';
      const name = user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split('@')[0] || 'Usuário';
      if (userNameDisplay) userNameDisplay.textContent = name;
      if (userEmailDisplay) userEmailDisplay.textContent = user.email || 'Online';
    }
  },

  updateNav(activeRoute) {
    document.querySelectorAll('.nav-link').forEach(link => {
      const route = link.getAttribute('href').replace(/^#\/?/, '');
      link.classList.toggle('active', route === activeRoute);
    });
  },

  initTheme() {
    const currentTheme = localStorage.getItem('gp_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', currentTheme);
    this.updateThemeIcons(currentTheme);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('gp_theme', next);
    this.updateThemeIcons(next);
  },

  updateThemeIcons(theme) {
    document.querySelectorAll('.theme-toggle i').forEach(icon => {
      if (theme === 'dark') {
        icon.className = 'fas fa-sun';
      } else {
        icon.className = 'fas fa-moon';
      }
    });
  },

  bindEvents() {
    // Links de navegação
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        window.location.hash = href;
        // Fecha sidebar em mobile ao navegar
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebar-backdrop')?.classList.remove('open');
      });
    });

    // Theme toggle global
    document.getElementById('global-theme-toggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Menu toggle mobile
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    document.getElementById('menu-open-btn')?.addEventListener('click', () => {
      sidebar?.classList.add('open');
      backdrop?.classList.add('open');
    });

    document.getElementById('menu-toggle')?.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      backdrop?.classList.remove('open');
    });

    backdrop?.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      backdrop?.classList.remove('open');
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      if (confirm('Tem certeza que deseja sair do sistema?')) {
        await window.logout();
        Toast.show('Você saiu da sua conta.', 'info');
        window.location.hash = '/login';
      }
    });

    // Modal close bindings
    document.getElementById('modal-close')?.addEventListener('click', () => {
      document.getElementById('modal-overlay')?.classList.remove('open');
    });
    document.getElementById('modal-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-overlay')?.classList.remove('open');
    });
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        document.getElementById('modal-overlay')?.classList.remove('open');
      }
    });
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  window.addEventListener('hashchange', () => { App.renderCurrentView(); });
});

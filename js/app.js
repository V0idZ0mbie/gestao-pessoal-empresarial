// ============ Aplicação principal / Router ============
// Navegação por hash: #/dashboard, #/accounts, #/login, #/register etc.

const ROUTES = {
  dashboard: { view: DashboardView, icon: 'fa-home', needsAuth: true },
  accounts: { view: AccountsModule, icon: 'fa-university', needsAuth: true },
  clients: { view: ClientsModule, icon: 'fa-users', needsAuth: true },
  expenses: { view: ExpensesModule, icon: 'fa-shopping-cart', needsAuth: true },
  investments: { view: InvestmentsModule, icon: 'fa-chart-line', needsAuth: true },
  'service-orders': { view: ServiceOrdersModule, icon: 'fa-tasks', needsAuth: true },
  cadastros: { view: ClientsModule, icon: 'fa-folder', needsAuth: true },
  login: { view: AuthViews.renderLogin, icon: 'fa-sign-in-alt', needsAuth: false },
  register: { view: AuthViews.renderRegister, icon: 'fa-user-plus', needsAuth: false },
};

const App = {
  async init() {
    this.bindNav();
    this.bindModal();
    await this.renderCurrentView();
  },

  getRoute() {
    const hash = window.location.hash || '#/dashboard';
    return hash.replace(/^#\/?/, '');
  },

  async renderCurrentView() {
    const route = this.getRoute();
    const routeInfo = ROUTES[route] || ROUTES.dashboard;

    // Se já estamos na rota login, apenas aguardar autenticação não é necessário
    if (routeInfo.needsAuth) {
      const isAuth = await window.isAuthenticated();
      if (!isAuth) {
        window.location.hash = '/login';
        return;
      }
    }
    // Se estamos na rota login/register e já está autenticado, redirecionar para dashboard
    if (!routeInfo.needsAuth) {
      const isAuth = await window.isAuthenticated();
      if (isAuth) {
        window.location.hash = '/dashboard';
        return;
      }
    }

    const container = document.getElementById('main-content');
    let renderFn;

    // View pode ser: função, string (nome da propriedade), ou objeto {view, render}
    if (typeof routeInfo.view === 'function') {
      renderFn = routeInfo.view;
    } else if (typeof routeInfo.view === 'string') {
      // Ex: 'DashboardView', 'AccountsModule'
      const View = window[routeInfo.view];
      if (View && typeof View.render === 'function') {
        renderFn = View.render;
      }
    } else if (typeof routeInfo.view === 'object' && window[routeInfo.view] && typeof window[routeInfo.view].render === 'function') {
      renderFn = window[routeInfo.view].render;
    }

    if (renderFn) {
      container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
      await new Promise(r => setTimeout(r, 0));
      await renderFn(container);
    } else {
      container.innerHTML = '<div class="card"><p style="color:var(--text-muted);">Página não encontrada.</p></div>';
    }
    this.updateNav(route);
  },

  bindNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = link.getAttribute('href');
      });
    });
  },

  updateNav(activeRoute) {
    document.querySelectorAll('.nav-link').forEach(l => {
      const route = l.getAttribute('href').replace(/^#\/?/, '');
      l.classList.toggle('active', route === activeRoute);
    });
  },

  bindModal() {
    document.getElementById('modal-close').addEventListener('click', () => {
      document.getElementById('modal-overlay').classList.remove('open');
    });
    document.getElementById('modal-cancel').addEventListener('click', () => {
      document.getElementById('modal-overlay').classList.remove('open');
    });
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        document.getElementById('modal-overlay').classList.remove('open');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Inicializa tema (claro/escuro)
  const defaultTheme = () => {
    const stored = sessionStorage.getItem('gp_theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  const theme = defaultTheme();
  document.documentElement.setAttribute('data-theme', theme);
  sessionStorage.setItem('gp_theme', theme);

  App.init();
  window.addEventListener('hashchange', () => { App.renderCurrentView(); });
});

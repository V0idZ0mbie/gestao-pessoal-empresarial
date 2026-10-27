// ============ Aplicação principal / Router ============
// Navegação por hash: #/dashboard, #/accounts, #/login, #/register etc.

const ROUTES = {
  dashboard: { view: 'DashboardView', icon: 'fa-home', needsAuth: true },
  accounts: { view: 'AccountsModule', icon: 'fa-university', needsAuth: true },
  clients: { view: 'ClientsModule', icon: 'fa-users', needsAuth: true },
  expenses: { view: 'ExpensesModule', icon: 'fa-shopping-cart', needsAuth: true },
  investments: { view: 'InvestmentsModule', icon: 'fa-chart-line', needsAuth: true },
  'service-orders': { view: 'ServiceOrdersModule', icon: 'fa-tasks', needsAuth: true },
  cadastros: { view: 'ClientsModule', icon: 'fa-folder', needsAuth: true },
  login: { view: 'LoginView', icon: 'fa-sign-in-alt', needsAuth: false },
  register: { view: 'RegisterView', icon: 'fa-user-plus', needsAuth: false },
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

    // Redireciona para login se a rota requer auth e não está autenticado
    if (routeInfo.needsAuth && !window.isAuthenticated()) {
      window.location.hash = '/login';
      return;
    }
    // Redireciona para dashboard se já estiver autenticado em login/register
    if (!routeInfo.needsAuth && window.isAuthenticated()) {
      window.location.hash = '/dashboard';
      return;
    }

    const container = document.getElementById('main-content');
    const View = window[routeInfo.view];

    if (View && typeof View.render === 'function') {
      container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
      await new Promise(r => setTimeout(r, 0));
      await View.render(container);
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
  App.init();
  window.addEventListener('hashchange', () => { App.renderCurrentView(); });
});

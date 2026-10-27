// ============ Aplicação principal / Router ============
// Navegação por hash: #/dashboard, #/accounts, #/clients, etc.

const ROUTES = {
  dashboard: { view: 'DashboardView', icon: 'fa-home' },
  accounts: { view: 'AccountsModule', icon: 'fa-university' },
  clients: { view: 'ClientsModule', icon: 'fa-users' },
  expenses: { view: 'ExpensesModule', icon: 'fa-shopping-cart' },
  investments: { view: 'InvestmentsModule', icon: 'fa-chart-line' },
  'service-orders': { view: 'ServiceOrdersModule', icon: 'fa-tasks' },
  cadastros: { view: 'ClientsModule', icon: 'fa-folder' },
};

const App = {
  async init() {
    this.bindNav();
    this.bindModal();
    // render inicial
    await this.renderCurrentView();
  },

  getRoute() {
    const hash = window.location.hash || '#/dashboard';
    // normaliza: #/accounts -> accounts
    return hash.replace(/^#\/?/, '');
  },

  async renderCurrentView() {
    const route = this.getRoute();
    const routeInfo = ROUTES[route] || ROUTES.dashboard;
    const container = document.getElementById('main-content');
    const View = window[routeInfo.view];
    if (View && typeof View.render === 'function') {
      container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
      await new Promise(r => setTimeout(r, 0));
      View.render(container);
    } else {
      container.innerHTML = `<div class="card"><p style="color:var(--text-muted);">Página não encontrada.</p></div>`;
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
    // toggle menu em telas móveis
    const toggle = document.getElementById('menu-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        document.querySelector('.sidebar').style.transform = 'translateX(-240px)';
      });
    }
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

// =========== Toast (notificações) ===========
window.Toast = {
  show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas fa-check-circle"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, duration);
  }
};

// =========== Dados de exemplo (Seed) ===========
window.SeedData = {
  async importAll() {
    const now = new Date().toISOString();
    const seed = {
      accounts: [
        { id: 1, banco: 'Itaú',     titular: 'João Silva',      tipo: 'Corrente',    saldo: 12500.75, createdAt: now },
        { id: 2, banco: 'Bradesco', titular: 'João Silva',      tipo: 'Poupança',    saldo: 8420.00,  createdAt: now },
        { id: 3, banco: 'Nubank',   titular: 'João Silva',      tipo: 'Cartão de crédito', saldo: -1250.50, createdAt: now },
        { id: 4, banco: 'Caixa',    titular: 'Empresa S.A.',    tipo: 'Corrente',    saldo: 45600.00, createdAt: now },
      ],
      clients: [
        { id: 1, nome: 'Ana Souza',    empresa: 'Tech Corp',        email: 'ana@techcorp.com',     telefone: '(11) 98888-7777',  endereco: 'Av. Paulista, 1000 — São Paulo/SP',    createdAt: now },
        { id: 2, nome: 'Carlos Lima',  empresa: 'Contabilidade Lima', email: 'carlos@lima.contab', telefone: '(21) 97777-6666',  endereco: 'Rua das Flores, 50 — Rio de Janeiro/RJ', createdAt: now },
        { id: 3, nome: 'Marina Costa', empresa: 'Indústria Costa',  email: 'marina@costa.ind',     telefone: '(31) 96666-5555',  endereco: 'Av. Brig. Tobias, 200 — Porto Alegre/RS', createdAt: now },
        { id: 4, nome: 'Pedro Santos', empresa: 'Freelance',        email: 'pedro@santos.dev',     telefone: '(41) 95555-4444',  endereco: 'Rua do Comércio, 30 — Curitiba/PR',    createdAt: now },
      ],
      expenses: [
        { id: 1, descricao: 'Aluguel do escritório',      valor: 3200.00,  data: new Date(Date.now() - 86400000*15).toISOString().slice(0,10), categoria: 'Moradia',       createdAt: now },
        { id: 2, descricao: 'Comida & lanche',             valor: 185.50,   data: new Date().toISOString().slice(0,10),                         categoria: 'Alimentação',   createdAt: now },
        { id: 3, descricao: 'Combustível',                 valor: 260.00,   data: new Date(Date.now() - 86400000*4).toISOString().slice(0,10),  categoria: 'Transporte',    createdAt: now },
        { id: 4, descricao: 'Internet & telefone',         valor: 150.00,   data: new Date(Date.now() - 86400000*6).toISOString().slice(0,10),  categoria: 'Moradia',       createdAt: now },
        { id: 5, descricao: 'Material de escritório',      valor: 432.75,   data: new Date(Date.now() - 86400000*2).toISOString().slice(0,10),  categoria: 'Outros',        createdAt: now },
      ],
      investments: [
        { id: 1, nome: 'Tesouro Selic',       tipo: 'Tesouro Selic',  valor: 15000.00, data: new Date(Date.now() - 86400000*30).toISOString().slice(0,10), lucro: 45.00,  obs: 'Renda fixa',              createdAt: now },
        { id: 2, nome: 'CDB Tesouro Direto',  tipo: 'CDB',            valor: 20000.00, data: new Date(Date.now() - 86400000*60).toISOString().slice(0,10), lucro: 80.00,  obs: 'Liquidez diária',         createdAt: now },
        { id: 3, nome: 'Ações Varejo',        tipo: 'Ações',          valor: 5000.00,  data: new Date(Date.now() - 86400000*120).toISOString().slice(0,10), lucro: 420.50, obs: 'Diversificação',        createdAt: now },
      ],
      service_orders: [
        { id: 1, clienteId: 1, descricao: 'Instalação de notebooks para equipe',           valor: 1200.00, dataAbertura: new Date(Date.now() - 86400000*3).toISOString().slice(0,10), status: 'concluida', obs: 'Terminada em 2 dias',           createdAt: now },
        { id: 2, clienteId: 2, descricao: 'Consultoria de controle de estoque',          valor: 800.00,  dataAbertura: new Date(Date.now() - 86400000*10).toISOString().slice(0,10), status: 'em_andamento', obs: 'Aguardando relatório',       createdAt: now },
        { id: 3, clienteId: 3, descricao: 'Configuração de servidor em nuvem',           valor: 3200.00, dataAbertura: new Date().toISOString().slice(0,10),                   status: 'aberta',    obs: 'Pendente de orçamento',     createdAt: now },
      ],
    };

    const empty =
      Storage.get('gp_accounts', []).length === 0 &&
      Storage.get('gp_clients', []).length === 0 &&
      Storage.get('gp_expenses', []).length === 0 &&
      Storage.get('gp_investments', []).length === 0 &&
      Storage.get('gp_service-orders', []).length === 0;

    if (!empty) return;
    for (const [key, items] of Object.entries(seed)) {
      Storage.set('gp_' + key, items);
    }
  }
};

// helper de escape
function escapeHtml(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  window.addEventListener('hashchange', () => { App.renderCurrentView(); });
});

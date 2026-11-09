const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
}

function createDocument() {
  const head = { appendChild() {} };
  return {
    head,
    addEventListener() {},
    createElement() {
      return {
        set textContent(value) { this._text = value; },
        get innerHTML() { return this._text || ''; }
      };
    },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

function createContext() {
  const context = {
    console,
    document: createDocument(),
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    crypto: { randomUUID: () => 'test-id-' + Math.random().toString(36).slice(2) },
    setTimeout,
    clearTimeout
  };
  context.window = context;
  return vm.createContext(context);
}

function load(context, relativePath) {
  const filename = path.join(root, relativePath);
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}

test('todos os scripts referenciados pelo HTML carregam sem exceção', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"><\/script>/g)]
    .map(match => match[1])
    .filter(src => src.startsWith('js/'));
  const context = createContext();

  for (const script of scripts) load(context, script);

  assert.ok(context.App);
  assert.ok(context.Storage);
  assert.ok(context.AuthViews);
  assert.ok(context.DashboardView);
  assert.ok(context.AccountsModule);
  assert.ok(context.ClientsModule);
  assert.ok(context.ExpensesModule);
  assert.ok(context.InvestmentsModule);
  assert.ok(context.ServiceOrdersModule);
  assert.ok(context.ServicesCatalogModule);
});

test('Storage executa CRUD local e mantém dados isolados por usuário', async () => {
  const context = createContext();
  load(context, 'js/storage.js');

  context.sessionStorage.setItem('gp_userId', 'user-a');
  const created = await context.Storage.add('clients', { nome: 'Ana' });
  assert.equal(created.nome, 'Ana');
  assert.equal((await context.Storage.get('clients')).length, 1);

  const updated = await context.Storage.update('clients', created.id, { nome: 'Ana Silva' });
  assert.equal(updated.nome, 'Ana Silva');
  assert.equal((await context.Storage.find('clients', item => item.nome === 'Ana Silva')).id, created.id);

  context.sessionStorage.setItem('gp_userId', 'user-b');
  assert.equal(Array.from(await context.Storage.get('clients')).length, 0);
  const other = await context.Storage.add('clients', { nome: 'Bruno' });
  assert.notEqual(other.id, created.id);

  context.sessionStorage.setItem('gp_userId', 'user-a');
  assert.equal(await context.Storage.remove('clients', created.id), true);
  assert.equal(Array.from(await context.Storage.get('clients')).length, 0);
});

test('Storage converte clienteId para cliente_id no Supabase e normaliza a resposta', async () => {
  const context = createContext();
  context.supabaseConfigured = true;
  context.sessionStorage.setItem('gp_userId', 'user-a');
  let inserted;
  context.supabase = {
    from() {
      return {
        insert(value) {
          inserted = value;
          return {
            select: () => ({
              single: async () => ({ data: { ...value, id: 'remote-id' }, error: null })
            })
          };
        }
      };
    },
    auth: { getUser: async () => ({ data: { user: { id: 'user-a' } } }) }
  };
  load(context, 'js/storage.js');

  const item = await context.Storage.add('service_orders', { clienteId: 'client-1', descricao: 'Instalação' });
  assert.equal(inserted.cliente_id, 'client-1');
  assert.equal(inserted.clienteId, undefined);
  assert.equal(item.clienteId, 'client-1');
});

test('Storage reutiliza o cache de sessão para navegação e separa os dados por usuário', async () => {
  const context = createContext();
  context.supabaseConfigured = true;
  context.sessionStorage.setItem('gp_userId', 'user-a');
  const fetches = new Map();
  context.supabase = {
    from(collection) {
      return {
        select() {
          return {
            async eq(column, userId) {
              fetches.set(userId, (fetches.get(userId) || 0) + 1);
              await new Promise(resolve => setTimeout(resolve, 5));
              return { data: [{ id: `${userId}-${collection}`, nome: userId }], error: null };
            }
          };
        }
      };
    }
  };
  load(context, 'js/storage.js');

  const simultaneousReads = await Promise.all([
    context.Storage.get('clients'),
    context.Storage.get('clients')
  ]);
  assert.equal(fetches.get('user-a'), 1);
  assert.equal(simultaneousReads[0][0].nome, 'user-a');
  assert.equal(context.sessionStorage.getItem('gp_cache_user-a_clients') !== null, true);

  const cachedRead = await context.Storage.get('clients');
  assert.equal(fetches.get('user-a'), 1);
  assert.equal(cachedRead[0].nome, 'user-a');

  context.sessionStorage.setItem('gp_userId', 'user-b');
  const otherUserRead = await context.Storage.get('clients');
  assert.equal(fetches.get('user-b'), 1);
  assert.equal(otherUserRead[0].nome, 'user-b');
});

test('lançamentos de ganhos e gastos podem ser vinculados à mesma conta e ordem', async () => {
  const context = createContext();
  context.sessionStorage.setItem('gp_userId', 'user-a');
  load(context, 'js/storage.js');

  const account = await context.Storage.add('accounts', { banco: 'Banco', titular: 'Conta', saldo: 100 });
  const order = await context.Storage.add('service_orders', { clienteId: 'client-1', descricao: 'Serviço' });
  const gain = await context.Storage.add('gains', { descricao: 'Pagamento', valor: 250, conta_id: account.id, ordem_id: order.id });
  const expense = await context.Storage.add('expenses', { descricao: 'Material', valor: 50, conta_id: account.id, ordem_id: order.id });

  assert.equal(gain.conta_id, account.id);
  assert.equal(gain.ordem_id, order.id);
  assert.equal(expense.conta_id, account.id);
  assert.equal(expense.ordem_id, order.id);
  assert.equal((await context.Storage.get('gains')).length, 1);
  assert.equal((await context.Storage.get('expenses')).length, 1);
});

test('conta principal pode ser definida e é sugerida em ganhos e gastos', async () => {
  const context = createContext();
  const accounts = [
    { id: 'account-main', banco: 'Banco A', titular: 'Principal', is_primary: true },
    { id: 'account-other', banco: 'Banco B', titular: 'Alternativa', is_primary: false }
  ];
  const elements = new Map([
    ['modal-title', {}],
    ['modal-body', { innerHTML: '' }],
    ['modal-submit', {}],
    ['modal-overlay', { classList: { add() {}, remove() {} } }]
  ]);
  context.document.getElementById = id => elements.get(id) || null;
  context.escapeHtml = value => String(value || '');
  context.formatBRL = value => String(value);
  context.Storage = {
    async get(collection) {
      if (collection === 'accounts') return accounts;
      return [];
    },
    async update(collection, id, patch) {
      Object.assign(accounts.find(account => account.id === id), patch);
    }
  };
  context.Toast = { show() {} };
  context.HashChangeEvent = function () {};

  load(context, 'js/modules/accounts.js');
  await context.AccountsModule.openForm('account-other');
  assert.match(elements.get('modal-body').innerHTML, /Usar como conta principal/);
  elements.set('f-banco', { value: 'Banco B' });
  elements.set('f-titular', { value: 'Alternativa' });
  elements.set('f-tipo', { value: 'Conta Corrente' });
  elements.set('f-saldo', { value: '0' });
  elements.set('f-conta-principal', { checked: true });
  await elements.get('modal-submit').onclick();
  assert.equal(accounts[0].is_primary, false);
  assert.equal(accounts[1].is_primary, true);

  load(context, 'js/modules/gains.js');
  await context.GainsModule.openForm();
  assert.match(elements.get('modal-body').innerHTML, /value="account-other" selected/);
  assert.match(elements.get('modal-body').innerHTML, /value="account-main"/);

  load(context, 'js/modules/expenses.js');
  await context.ExpensesModule.openForm();
  assert.match(elements.get('modal-body').innerHTML, /value="account-other" selected/);
  assert.match(elements.get('modal-body').innerHTML, /value="account-main"/);
});

test('OS aceita vários gastos vinculados e só lança ganho quando marcada como paga', async () => {
  const context = createContext();
  const elements = new Map();
  for (const id of ['modal-title', 'modal-body', 'modal-submit']) {
    elements.set(id, {});
  }
  elements.set('modal-overlay', { classList: { add() {}, remove() {} } });
  elements.set('modal-body', { innerHTML: '' });
  elements.set('f-cliente', { value: 'client-1' });
  elements.set('f-descricao', { value: 'Reparo de equipamento' });
  elements.set('f-valor', { value: '300' });
  elements.set('f-data', { value: '2026-11-08' });
  elements.set('f-status', { value: 'em_andamento' });
  elements.set('f-obs', { value: '' });
  elements.set('f-pago', { checked: false });
  elements.set('f-forma-pagamento', { value: 'Pix' });
  elements.set('f-conta-pagamento', { value: 'account-1' });
  const createExpenseRow = (id, description, value) => ({
    dataset: { expenseId: id },
    querySelector(selector) {
      if (selector === '[data-expense-description]') return { value: description };
      if (selector === '[data-expense-value]') return { value };
      if (selector === '[data-expense-account]') return { value: 'account-1' };
      return null;
    }
  });
  let expenseRows = [];
  elements.set('f-os-expenses', {
    querySelectorAll() { return expenseRows; },
    insertAdjacentHTML(position, html) { this.insertedHtml = html; }
  });
  context.document.getElementById = id => elements.get(id) || null;
  context.HashChangeEvent = function () {};
  context.Toast = { show() {} };

  const order = {
    id: 'order-1',
    clienteId: 'client-1',
    descricao: 'Reparo de equipamento',
    valor: 300,
    custo_reparo: 0,
    data_abertura: '2026-11-08',
    status: 'aberta',
    obs: '',
    pago: false
  };
  const expenses = [];
  const gains = [];
  context.Storage = {
    async get(collection) {
      if (collection === 'service_orders') return [order];
      if (collection === 'clients') return [{ id: 'client-1', nome: 'Cliente' }];
      if (collection === 'accounts') return [
        { id: 'account-1', banco: 'Banco', titular: 'Conta', is_primary: true },
        { id: 'account-2', banco: 'Outro Banco', titular: 'Alternativa', is_primary: false }
      ];
      if (collection === 'gains') return gains;
      if (collection === 'expenses') return expenses;
      return [];
    },
    async update(collection, id, patch) {
      if (collection === 'service_orders') Object.assign(order, patch);
      const entries = collection === 'expenses' ? expenses : collection === 'gains' ? gains : [];
      const entry = entries.find(item => item.id === id);
      if (entry) Object.assign(entry, patch);
      return null;
    },
    async add(collection, item) {
      const entries = collection === 'expenses' ? expenses : gains;
      const saved = { id: `${collection}-${entries.length + 1}`, ...item };
      if (collection === 'expenses') expenses.push(saved);
      if (collection === 'gains') gains.push(saved);
      return saved;
    }
  };
  load(context, 'js/modules/service-orders.js');

  await context.ServiceOrdersModule.openForm('order-1');
  assert.match(elements.get('modal-body').innerHTML, /Adicionar gasto/);
  assert.match(elements.get('modal-body').innerHTML, /value="account-1" selected/);
  assert.match(elements.get('modal-body').innerHTML, /value="account-2"/);
  assert.doesNotMatch(elements.get('modal-body').innerHTML, /data-os-expense-row/);
  await elements.get('modal-submit').onclick();
  assert.equal(expenses.length, 0);

  expenseRows = [createExpenseRow('', 'Peças', '75')];
  await context.ServiceOrdersModule.openForm('order-1');
  context.ServiceOrdersModule.addExpenseRow();
  expenseRows.push(createExpenseRow('', 'Transporte', '25'));
  assert.match(elements.get('f-os-expenses').insertedHtml, /data-expense-description/);
  assert.match(elements.get('f-os-expenses').insertedHtml, /value="account-1" selected/);
  assert.match(elements.get('f-os-expenses').insertedHtml, /value="account-2"/);
  await elements.get('modal-submit').onclick();

  assert.equal(expenses.length, 2);
  assert.deepEqual(expenses.map(expense => expense.valor), [75, 25]);
  assert.ok(expenses.every(expense => expense.ordem_id === 'order-1'));
  assert.ok(expenses.every(expense => expense.origem === 'service_order_expense'));
  assert.equal(gains.length, 0);

  expenseRows = expenses.map(expense => createExpenseRow(expense.id, expense.descricao, String(expense.valor)));
  elements.get('f-pago').checked = true;
  await context.ServiceOrdersModule.openForm('order-1');
  await elements.get('modal-submit').onclick();
  assert.equal(expenses.length, 2);
  assert.equal(gains.length, 1);
  assert.equal(gains[0].ordem_id, 'order-1');
  assert.equal(gains[0].origem, 'service_order_payment');
  assert.equal(gains[0].conta_id, 'account-1');

  await context.ServiceOrdersModule.openForm('order-1');
  await elements.get('modal-submit').onclick();
  assert.equal(expenses.length, 2);
  assert.equal(gains.length, 1);
});

test('dashboard exibe os gastos e ganhos vinculados a cada OS', async () => {
  const context = createContext();
  const data = {
    accounts: [],
    expenses: [{ id: 'expense-1', ordem_id: 'order-1', valor: 75 }],
    gains: [{ id: 'gain-1', ordem_id: 'order-1', valor: 300 }],
    investments: [],
    service_orders: [{
      id: 'order-1',
      clienteId: 'client-1',
      descricao: 'Reparo de equipamento',
      valor: 300,
      status: 'concluida',
      pago: true
    }],
    clients: [{ id: 'client-1', nome: 'Cliente' }]
  };
  context.Storage = { async get(collection) { return data[collection] || []; } };
  load(context, 'js/views/dashboard.js');

  const container = { innerHTML: '' };
  context.document.getElementById = id => id === 'main-content' ? container : null;
  await context.DashboardView.render(container);

  assert.match(container.innerHTML, /Gastos vinculados/);
  assert.match(container.innerHTML, /Recebido/);
  assert.match(container.innerHTML, /Reparo de equipamento/);
  assert.match(container.innerHTML, /75,00/);
  assert.match(container.innerHTML, /300,00/);
  assert.match(container.innerHTML, /Ocultar valores/);

  await context.DashboardView.togglePrivacy();
  assert.doesNotMatch(container.innerHTML, /75,00|300,00/);
  assert.match(container.innerHTML, /Mostrar valores/);

  await context.DashboardView.togglePrivacy();
  assert.match(container.innerHTML, /75,00/);
  assert.match(container.innerHTML, /300,00/);
});

test('autenticação offline registra, autentica e encerra sessão', async () => {
  const context = createContext();
  load(context, 'js/auth.js');

  const registered = await context.registerUser('Maria Silva', ' MARIA@EXAMPLE.COM ', '123456');
  assert.equal(registered.user.email, 'maria@example.com');
  assert.equal((await context.registerUser('Outra', 'maria@example.com', '123456')).error, 'Este email já está cadastrado localmente.');

  const loggedIn = await context.loginUser('MARIA@example.com', '123456');
  assert.equal(loggedIn.user.id, registered.user.id);
  assert.equal(context.sessionStorage.getItem('gp_userId'), registered.user.id);

  await context.logout();
  assert.equal(context.sessionStorage.getItem('gp_userId'), null);
});

test('SortHelper alterna direção e ordena texto, números e datas', () => {
  const context = createContext();
  load(context, 'js/utils/sort-helper.js');

  const helper = context.SortHelper;
  assert.deepEqual(Array.from(helper.sort([{ nome: 'B' }, { nome: 'a' }], 'nome').map(x => x.nome)), ['a', 'B']);
  helper.toggle('nome');
  assert.deepEqual(Array.from(helper.sort([{ nome: 'B' }, { nome: 'a' }], 'nome').map(x => x.nome)), ['B', 'a']);
  assert.deepEqual(Array.from(helper.sort([{ valor: 10 }, { valor: 2 }], 'valor').map(x => x.valor)), [2, 10]);
  assert.deepEqual(Array.from(helper.sort([{ data: '2026-02-01' }, { data: '2026-01-01' }], 'data').map(x => x.data)), ['2026-01-01', '2026-02-01']);
  assert.match(helper.getHeader('nome', 'Nome'), /onclick="SortHelper\.renderSorted\('nome'\)"/);
});

test('rotas protegidas e telas públicas permanecem registradas', () => {
  const context = createContext();
  for (const file of [
    'js/supabase.js',
    'js/storage.js',
    'js/views/dashboard.js',
    'js/views/auth.js',
    'js/modules/accounts.js',
    'js/modules/clients.js',
    'js/modules/expenses.js',
    'js/modules/gains.js',
    'js/modules/investments.js',
    'js/modules/service-orders.js',
    'js/modules/services-catalog.js',
    'js/app.js'
  ]) load(context, file);

  const routes = vm.runInContext('ROUTES', context);
  assert.deepEqual(Object.keys(routes).sort(), [
    'accounts', 'cadastros', 'clients', 'dashboard', 'expenses', 'gains',
    'investments', 'login', 'register', 'service-orders', 'services'
  ].sort());
  assert.equal(routes.login.needsAuth, false);
  assert.equal(routes.dashboard.needsAuth, true);
});

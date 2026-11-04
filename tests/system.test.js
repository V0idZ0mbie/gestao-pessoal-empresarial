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

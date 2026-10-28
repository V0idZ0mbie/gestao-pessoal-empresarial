# 📘 Manual de Desenvolvimento & Manutenção para Agentes de IA

Este manual fornece instruções diretas, claras e estruturadas para que qualquer agente de IA ou desenvolvedor possa compreender a arquitetura do **GestãoPro**, adicionar novos recursos, criar módulos ou manipular dados (clientes, despesas, ordens de serviço, contas, etc.).

---

## 1. 🏗️ Arquitetura do Sistema

* **Frontend:** HTML5, CSS3 moderno (Custom Properties, Flexbox, CSS Grid) e JavaScript nativo (Vanilla ES6+).
* **Dependências Externas (via CDN em `index.html`):**
  * `@supabase/supabase-js@2` (cliente Supabase).
  * `Font Awesome 6.5.0` (ícones).
  * `Google Fonts Plus Jakarta Sans` (tipografia).
* **Roteamento:** Hash Router (`#/dashboard`, `#/accounts`, `#/clients`, `#/expenses`, `#/investments`, `#/service-orders`, `#/services`, `#/login`, `#/register`).
* **Hospedagem:** 100% estático (compatível com GitHub Pages, Vercel, Netlify ou servidor local).

---

## 2. 🗂️ Estrutura de Arquivos

```text
├── index.html                   # HTML base, sidebar, topbar, modal global e importação de scripts
├── css/
│   └── style.css                # Design system completo (temas claro/escuro, componentes, tabelas, modais)
├── js/
│   ├── app.js                   # Roteador (hash router), controle de rotas, eventos de tema e layout
│   ├── auth.js                  # Login, registro, logout e verificação de autenticação
│   ├── storage.js               # Camada de persistência híbrida (Supabase + Fallback LocalStorage)
│   ├── toast.js                 # Feedback visual flutuante (Toast.show)
│   ├── seed.js                  # Banco migrado e dados iniciais (71 clientes, 321 ordens de serviço, catálogo)
│   ├── views/
│   │   ├── auth.js              # Telas de login e cadastro (#/login e #/register)
│   │   └── dashboard.js         # Painel geral com métricas (#/dashboard)
│   └── modules/
│       ├── accounts.js          # Módulo de Contas Bancárias (#/accounts)
│       ├── clients.js           # Módulo de Clientes (#/clients)
│       ├── expenses.js          # Módulo de Despesas/Gastos (#/expenses)
│       ├── investments.js       # Módulo de Investimentos (#/investments)
│       ├── service-orders.js    # Módulo de Ordens de Serviço (#/service-orders)
│       └── services-catalog.js  # Módulo de Valores Médios & Catálogo (#/services)
└── README.md                    # Documentação do projeto
```

---

## 3. 💾 Camada de Persistência (`Storage`)

O objeto global `Storage` (`js/storage.js`) é a interface única para leitura e escrita de dados no sistema. Ele gerencia o isolamento por usuário e chaveamento automático:

### Métodos Principais:

```javascript
// 1. Obter todos os itens de uma coleção
const clientes = await Storage.get('clients');
const despesas = await Storage.get('expenses');

// 2. Adicionar um novo item (gera id automático e timestamps)
const novoCliente = await Storage.add('clients', {
  nome: 'Carlos Eduardo',
  empresa: 'Tech Inovações',
  email: 'carlos@tech.com',
  telefone: '(11) 98888-0000',
  endereco: 'Rua das Flores, 120'
});

// 3. Atualizar um item existente por ID
await Storage.update('clients', 'cli-123', {
  telefone: '(11) 99999-1111'
});

// 4. Remover um item por ID
await Storage.remove('clients', 'cli-123');

// 5. Encontrar um item por predicado
const cliente = await Storage.find('clients', c => c.id === 'cli-123');
```

> **Regra Importante:** Nunca acesse `localStorage` diretamente nos módulos; use sempre a API assíncrona `Storage.get`, `Storage.add`, `Storage.update` e `Storage.remove`.

---

## 4. 📝 Modelos de Dados (Schemas)

### 👥 Clientes (`clients`)
```javascript
{
  id: "cli-1",              // String ou UUID
  nome: "Nome Completo",    // Obrigatório
  empresa: "Empresa Ltda",  // Opcional ou referência de imóvel (ex: Apto 101)
  email: "contato@empresa.com",
  telefone: "(11) 99999-9999",
  endereco: "Endereço completo ou edifício"
}
```

### 💸 Despesas (`expenses`)
```javascript
{
  id: "exp-1",
  descricao: "Compra de cabos elétricos", // Obrigatório
  valor: 180.50,                          // Numérico (positivo)
  data: "2026-10-27",                     // Formato YYYY-MM-DD
  categoria: "Elétrica",                  // Alimentação, Transporte, Moradia, etc.
  conta_id: "acc-1"                       // Opcional: ID da conta bancária de saída
}
```

### 📋 Ordens de Serviço (`service_orders`)
```javascript
{
  id: "os-1",
  clienteId: "cli-1",                     // ID do cliente vinculado
  descricao: "Troca de Chuveiro e fiação", // Descrição do serviço
  valor: 180.00,                          // Valor total negociado
  data_abertura: "2026-10-27",            // Formato YYYY-MM-DD
  status: "concluida",                    // 'aberta' | 'em_andamento' | 'concluida'
  obs: "Garantia de 90 dias"
}
```

### 🏦 Contas Bancárias (`accounts`)
```javascript
{
  id: "acc-1",
  banco: "Nubank",                         // Nome da instituição
  titular: "Conta Principal",
  tipo: "Conta Corrente",                 // Corrente, Poupança, Cartão de Crédito, Investimento
  saldo: 15400.00
}
```

### 📊 Catálogo de Serviços & Médias (`services_catalog`)
```javascript
{
  id: "serv-1",
  categoria: "Instalações Elétricas",
  media: 78.85,
  minimo: 30.00,
  maximo: 220.00,
  total_atendimentos: 46,
  faturamento_acumulado: 3627.10,
  exemplos: ["Troca tomada simples 10A", "Disjuntor chuveiro"]
}
```

---

## 5. 🛠️ Como Adicionar um Novo Recurso ou Módulo

Para criar um novo módulo no sistema (por exemplo, `js/modules/fornecedores.js`):

### Passo 1: Criar o Módulo JavaScript
Seguir o padrão modular funcional do projeto:
```javascript
const FornecedoresModule = (() => {
  const COLLECTION = 'fornecedores';

  async function render(container) {
    const items = await Storage.get(COLLECTION);
    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Fornecedores</h1>
          <p class="subtitle">Gerencie os fornecedores de materiais e peças</p>
        </div>
        <button class="btn btn-primary" onclick="FornecedoresModule.openForm()">
          <i class="fas fa-plus"></i> Novo Fornecedor
        </button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nome</th><th>Contato</th><th style="text-align:right;">Ações</th></tr>
          </thead>
          <tbody>
            ${items.map(f => `
              <tr>
                <td><strong>${escapeHtml(f.nome)}</strong></td>
                <td>${escapeHtml(f.contato || '—')}</td>
                <td style="text-align:right;">
                  <button class="btn btn-sm btn-danger" onclick="FornecedoresModule.deleteItem('${f.id}')">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="3" style="text-align:center;padding:24px;">Nenhum fornecedor.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  async function openForm(id) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'Novo Fornecedor';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Nome do Fornecedor *</label>
        <input id="f-forn-nome" type="text" placeholder="Ex: Elétrica Central" />
      </div>
    `;
    document.getElementById('modal-submit').onclick = async () => {
      const nome = document.getElementById('f-forn-nome').value.trim();
      if (!nome) { Toast.show('Preencha o nome.', 'error'); return; }
      await Storage.add(COLLECTION, { nome });
      Toast.show('Fornecedor cadastrado!', 'success');
      overlay.classList.remove('open');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    };
    overlay.classList.add('open');
  }

  async function deleteItem(id) {
    if (!confirm('Excluir este fornecedor?')) return;
    await Storage.remove(COLLECTION, id);
    Toast.show('Fornecedor excluído.', 'success');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  return { render, openForm, deleteItem };
})();

window.FornecedoresModule = FornecedoresModule;
```

### Passo 2: Registrar no Roteador (`js/app.js`)
Adicionar a rota no dicionário `ROUTES`:
```javascript
const ROUTES = {
  ...
  fornecedores: { 
    view: FornecedoresModule, 
    title: 'Cadastro de Fornecedores', 
    icon: 'fa-truck', 
    needsAuth: true 
  },
};
```

### Passo 3: Incluir Script e Link no Menu (`index.html`)
1. No `<nav class="sidebar-nav">`:
```html
<li>
  <a href="#/fornecedores" class="nav-link">
    <i class="fas fa-truck"></i> <span>Fornecedores</span>
  </a>
</li>
```
2. No final do `<body>`:
```html
<script src="js/modules/fornecedores.js"></script>
```

---

## 6. 🎨 Componentes & Padrões Visuais Reutilizáveis

* **Notificações:** Use sempre `Toast.show('Mensagem', 'success' | 'error' | 'info')`.
* **Formatação Monetária:** Use a função global `formatBRL(valor)` (formata como `R$ 1.250,00`).
* **Segurança contra XSS:** Use sempre `escapeHtml(string)` ao interpolar variáveis de usuário em templates HTML.
* **Modal Global:** O sistema usa um modal único declarado em `index.html`:
  * Altere o título: `document.getElementById('modal-title').textContent = '...'`
  * Preencha o corpo: `document.getElementById('modal-body').innerHTML = '...'`
  * Atribua a ação ao botão: `document.getElementById('modal-submit').onclick = async () => { ... }`
  * Exiba o modal: `document.getElementById('modal-overlay').classList.add('open')`
  * Feche o modal: `document.getElementById('modal-overlay').classList.remove('open')`
* **Badges de Status:** `<span class="badge badge-success">Concluída</span>`, `badge-warning`, `badge-danger`, `badge-info`, `badge-default`.

# Gestão Pessoal e Empresarial — Dashboard em HTML e JavaScript

Dashboard 100% em HTML/CSS/JavaScript que roda direto no navegador, sem servidor. Integra:

- 🏦 Contas bancárias
- 👥 Clientes
- 💰 Gastos
- 📈 Investimentos
- 🔧 Ordens de serviço
- 📋 Cadastros gerais

Os dados ficam salvos no `localStorage` do navegador (sem API, sem backend).

## Como usar

1. Baixe ou clone o repositório:
   ```bash
   git clone https://github.com/V0idZ0mbie/gestao-pessoal-empresarial.git
   ```
2. Abra `index.html` no navegador (não precisa digitar servidor):
   - Em um editor: `cd gestao-pessoal-empresarial && code .`
   - Depois: `python -m http.server 8000` e acesse `http://localhost:8000`
3. Use o menu lateral para navegar entre os módulos.
4. Os dados de exemplo carregam automaticamente na primeira vez (basta clicar em "Importar dados de exemplo" se quiser resetar).

## Estrutura do projeto

```
├── index.html          # Ponto de entrada
├── css/
│   └── style.css       # Estilos globais
├── js/
│   ├── app.js          # Router / navegação / inicialização
│   ├── storage.js      # Abstração de localStorage
│   ├── modules/        # Módulos independentes (CRUD por módulo)
│   │   ├── accounts.js # Contas bancárias
│   │   ├── clients.js  # Clientes
│   │   ├── expenses.js # Gastos
│   │   ├── investments.js # Investimentos
│   │   └── service-orders.js # Ordens de serviço
│   └── views/
│       └── dashboard.js # Visão-resumo da Dashboard
├── data/
│   └── seed.js         # Dados de exemplo
└── README.md
```

## Módulos

| Módulo | Responsabilidade |
|--------|-------------------|
| Contas bancárias | Listar, adicionar, editar e excluir contas (banco, tipo, saldo) |
| Clientes | Cadastro de clientes com contato e endereço |
| Gastos | Registrar gastos com valor, data, categoria e descrição |
| Investimentos | Registrar investimentos (tipo, valor, data, lucro/reelei) |
| Ordens de serviço | Gerar e acompanhar OLS com status (aberta, em andamento, concluída) |

## Como expandir

- Cada `modules/*.js` é independente. Siga o padrão:
  - `const Storage = { ... }` — acesso ao `localStorage`
  - `function init() { ... }` — carrega a view
  - `function renderList() { ... }` — popula a tabela
  - `function openForm() / saveForm() / deleteItem() { ... }` — CRUD
- Adicione novos módulos seguindo o mesmo padrão.

## Segurança de dados

- Os dados ficam no navegador (localStorage).
- Não há servidor, portanto não há login. Para uso pessoal, mantenha o `index.html` local.
- Se quiser sincronizar entre dispositivos, o caminho é adicionar um backend (API REST + banco) e adaptar `storage.js`.

## Licença

MIT

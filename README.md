# Gestão Pessoal e Empresarial — Dashboard em HTML e JavaScript

Dashboard 100% estático em HTML/CSS/JavaScript, hospedável em qualquer
endpoint estático (GitHub Pages, Netlify, Vercel, etc.). **Não requer
servidor backend** — a autenticação e os dados ficam no navegador
(`localStorage`/`sessionStorage`).

Integra:

- 🏦 Contas bancárias
- 👥 Clientes
- 💰 Gastos
- 📈 Investimentos
- 🔧 Ordens de serviço
- 📋 Cadastros gerais

**Segurança de dados (cliente-side):**

- Senhas são hasheadas com SHA-256 + sal (Web Crypto API) e armazenadas
  em `localStorage` (coleção `gp_users`).
- Cada sessão tem um token temporário em `sessionStorage` (`gp_token`).
- Os dados de cada usuário são armazenados em `localStorage` com prefíxo
  `gp_` e filtrados pelo `userId` do usuário logado.
- ⚠️ **Limitação legítima:** como não há backend, os dados ficam **no
  navegador do usuário** e não são compartilháveis entre dispositivos nem
  sincronizáveis. Ideal para uso pessoal/na nuvem em um único perfil do
  navegador. Para sincronização multipla, adicione um backend (API REST +
  banco) e aponte `storage.js` a ele.

## Como usar

### Opção 1 — Hospedado (recomendado)

1. Fazer login no GitHub e ir em **Settings → Developers → GitHub Pages**
2. Configurar a página na raiz (`/`) ou `/static/`
3. O app estará disponível em `https://<seu-username>.github.io/gestao-pessoal-empresarial/`

### Opção 2 — Local

1. Clonar o repositório
2. Abrir `static/index.html` em um navegador (não precisa servidor)

## Como usar

1. **Criar conta** → clique em "Criar conta grátis" (ou "Fazer login" se
   já tiver cadastro) → preencha usuário e senha.
2. **Entrar** → use o menu lateral ou o link de login.
3. **Navegar** → use o menu lateral para ver Contas, Clientes, Gastos,
   Investimentos e Ordens de serviço.
4. **Importar dados de exemplo** → no Dashboard, clique em "Importar dados
   de exemplo" para carregar um conjunto de demonstração.

## Estrutura do projeto

```
static/
├── index.html          # Ponto de entrada
├── css/
│   └── style.css       # Estilos globais
├── js/
│   ├── app.js          # Router / navegação / inicialização
│   ├── auth.js         # Autenticação (login/register/logout)
│   ├── storage.js      # Abstração de localStorage (com escopo por usuário)
│   ├── toast.js        # Notificações
│   ├── views/          # Páginas
│   │   ├── auth.js     # Login / Cadastro
│   │   └── dashboard.js # Visão-resumo da Dashboard
│   └── modules/        # Módulos independentes (CRUD por módulo)
│       ├── accounts.js
│       ├── clients.js
│       ├── expenses.js
│       ├── investments.js
│       └── service-orders.js
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

Cada módulo segue o mesmo padrão:
- `renderList(container, ...)` — popula a tabela
- `openForm(id)` — abre o modal de adicionar/editar
- `deleteItem(id)` — exclui com confirmação
- Usa `Storage.get/add/update/remove/find` para persistência

## Como expandir

- Cada `modules/*.js` é independente.
- Adicione novos módulos seguindo o mesmo padrão.
- Para sincronizar entre dispositivos, substitua `storage.js` por uma
  implementação que chame uma API REST (é a única camada de persistência).

## Licença

MIT

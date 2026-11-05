# Gestão Pessoal e Empresarial — Dashboard em HTML e JavaScript

Dashboard 100% estático em HTML/CSS/JavaScript, hospedável em qualquer endpoint estático (GitHub Pages, Netlify, Vercel, etc.). **Não requer servidor backend** — a autenticação e os dados ficam no Supabase.

## Funcionalidades

- 🏦 **Contas bancárias** — Listar, adicionar, editar e excluir contas (banco, tipo, saldo)
- 👥 **Clientes** — Cadastro de clientes com contato e endereço
- 💰 **Gastos** — Registrar gastos com valor, data, categoria e descrição
- 💵 **Ganhos** — Registrar receitas vinculadas a contas e ordens de serviço
- 📈 **Investimentos** — Registrar investimentos (tipo, valor, data, lucro/reelei)
- 🔧 **Ordens de serviço** — Gerar e acompanhar OS por orçamento, andamento e conclusão; registrar pagamento, forma e conta de recebimento
- 📄 **Orçamentos em PDF** — Selecionar uma ou mais OS e gerar um documento imprimível para salvar como PDF e enviar ao cliente
- 📊 **Análise na Dashboard** — Visualizar ordens em orçamento, aguardando conclusão, aguardando pagamento e finalizadas
- 📋 **Cadastros** — Geral de cadastros

## Arquitetura

- **Frontend:** HTML/CSS/JS puro (sem framework, sem build, sem servidor)
- **Banco de dados:** Supabase (PostgreSQL + Supabase Auth)
- **Autenticação:** Supabase Auth (email + password)
- **Armazenamento:** Supabase Storage (PostgreSQL, dado isolado por `user_id`)
- **Deploy:** GitHub Pages (estático, sem build)

## Segurança de dados

- **Senhas:** gerenciadas pelo Supabase Auth (hash nativo, nunca expõe a senha no frontend)
- **Dados:** cada item de dado possui o campo `user_id`, que corresponde ao usuário logado no Supabase
- **API keys:** só chave anônima do Supabase é usada no frontend (não expõe credenciais sensíveis)

## Como usar

### Configurar Supabase (1_click)

1. Acesse [Supabase](https://supabase.com) e crie um projeto
2. Copie a **URL de projeto** (ex: `https://abc123.supabase.co`) e a **chave anônima** (`anon` key)
3. Edite `js/supabase.js` e preencha a chave pública `anon` do projeto:

   ```javascript
   window.SUPABASE_URL = "SUA_URL_AQUI";
   window.SUPABASE_ANON_KEY = "eyJ..."; // Settings > API > Publishable/anon key
   ```

4. Execute o arquivo [`supabase-migration.sql`](./supabase-migration.sql) no SQL Editor. Ele cria todas as tabelas, índices de segurança (RLS) e triggers usados pelo aplicativo.

5. Faça o upload do repositório e configure o GitHub Pages.

### Opção 1 — Hospedado (recomendado)

1. Fazer login no GitHub e ir em **Settings → Developers → GitHub Pages**
2. Configurar a página na raiz (`/`) e a fonte sendo o repositório principal
3. O app estará disponível em `https://<seu-username>.github.io/gestao-pessoal-empresarial/`

### Opção 2 — Local

1. Clonar o repositório
2. Abrir `index.html` em um navegador (não precisa servidor, mas é recomendável usar um servidor local para evitar bloqueios de CORS)

## Estrutura do projeto

```
.
├── index.html                  # Ponto de entrada
├── css/
│   └── style.css               # Estilos globais
├── js/
│   ├── app.js                  # Router / navegação / inicialização
│   ├── auth.js                 # Autenticação (Supabase Auth)
│   ├── storage.js              # Abstração de persistência (Supabase)
│   ├── supabase.js             # Configuração do Supabase
│   ├── toast.js                # Notificações
│   ├── views/
│   │   ├── auth.js             # Login / Cadastro
│   │   └── dashboard.js        # Visão-resumo da Dashboard
│   └── modules/
│       ├── accounts.js
│       ├── gains.js
│       ├── clients.js
│       ├── expenses.js
│       ├── investments.js
│       └── service-orders.js
├── README.md
└── .gitignore
```

## Como expor novos dados

Cada módulo `modules/*.js` é independente e usa a camada `Storage`:

- `Storage.get(collection)` — lista itens do usuário logado
- `Storage.add(collection, item)` — cria um novo item
- `Storage.update(collection, id, patch)` — atualiza um item
- `Storage.remove(collection, id)` — exclui um item

Para adicionar um novo módulo:

1. Crie `js/modules/novoModulo.js`
2. Siga o padrão dos módulos existentes
3. Registre a rota no `js/app.js`

## Testes automatizados

O projeto possui uma suíte sem dependências externas, baseada no `node:test`. Ela valida o carregamento dos scripts referenciados pelo HTML, rotas, módulos, autenticação offline, CRUD local, isolamento por usuário, integração de campos com o Supabase e ordenação de tabelas.

Execute antes de publicar alterações:

```bash
npm test
```

Ao adicionar uma nova rota, módulo ou operação de persistência, inclua um caso em `tests/system.test.js`.

## Licença

MIT

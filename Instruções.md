# Instruções para Agentes de IA — GestãoPro

Este documento orienta um Agente IA a operar, diagnosticar e manter o sistema **Gestão Pessoal & Empresarial**.

## 1. Objetivo e arquitetura

O sistema é uma aplicação estática em HTML, CSS e JavaScript, sem backend próprio.

- Interface: `index.html`
- Estilos: `css/style.css`
- Roteador: `js/app.js`
- Autenticação: `js/auth.js`
- Persistência: `js/storage.js`
- Banco remoto opcional: Supabase
- Fallback offline: `localStorage`, separado por usuário
- Testes: `tests/system.test.js`

Scripts externos carregados pelo HTML:

- Supabase JS v2
- Font Awesome
- Google Fonts

Não introduza frameworks ou dependências sem necessidade. Reutilize os módulos, componentes, mensagens e estilos existentes.

## 2. Como iniciar e validar o projeto

### 2.1 Executar os testes

Na raiz do repositório:

```bash
npm test
```

O teste verifica:

- Carregamento de todos os scripts do HTML.
- Existência dos módulos e rotas.
- CRUD local.
- Isolamento entre usuários.
- Conversão de `clienteId` para `cliente_id` no Supabase.
- Autenticação offline.
- Ordenação de tabelas.

Sempre execute os testes depois de modificar JavaScript, rotas, persistência ou HTML.

### 2.2 Executar localmente

Como o projeto é estático, pode ser aberto diretamente no navegador. Para evitar limitações de CORS, prefira um servidor local:

```bash
python -m http.server 8000
```

Depois, abra `http://localhost:8000`.

Não use comandos destrutivos. Não apague ou substitua alterações existentes sem autorização.

## 3. Navegação da aplicação

O sistema usa rotas por hash:

| Rota | Tela | Autenticação |
|---|---|---|
| `#/dashboard` | Dashboard e análise de OS | Obrigatória |
| `#/accounts` | Contas bancárias | Obrigatória |
| `#/clients` | Clientes | Obrigatória |
| `#/expenses` | Gastos | Obrigatória |
| `#/gains` | Ganhos e receitas | Obrigatória |
| `#/investments` | Investimentos | Obrigatória |
| `#/service-orders` | Ordens de serviço | Obrigatória |
| `#/services` | Catálogo e valores médios | Obrigatória |
| `#/login` | Login | Pública |
| `#/register` | Cadastro de usuário | Pública |

O roteamento está em `js/app.js`, no objeto global `ROUTES`. Não crie navegação paralela.

## 4. Procedimento operacional para o Agente IA

Antes de executar qualquer operação:

1. Identifique a intenção: consultar, criar, editar, excluir, lançar financeiro, gerar PDF ou alterar código.
2. Confirme a entidade e o usuário correto.
3. Consulte os dados atuais antes de editar ou excluir.
4. Nunca invente IDs, valores, clientes, contas ou status.
5. Valide campos obrigatórios e valores positivos.
6. Execute uma operação por vez quando houver risco de inconsistência.
7. Após salvar, consulte novamente e confirme o resultado.
8. Ao alterar código, execute `npm test` e informe o resultado.

Para operações pela interface, use a tela correspondente. Para manutenção ou automação interna, use a API `Storage`, descrita abaixo.

## 5. API de persistência

`js/storage.js` expõe o objeto global `Storage`.

```javascript
const items = await Storage.get('clients');

const created = await Storage.add('clients', {
  nome: 'Cliente Exemplo',
  empresa: 'Empresa Exemplo',
  email: 'cliente@example.com',
  telefone: '(11) 99999-9999',
  endereco: 'Rua Exemplo, 100'
});

const updated = await Storage.update('clients', created.id, {
  telefone: '(11) 98888-8888'
});

const found = await Storage.find('clients', item => item.id === created.id);

await Storage.remove('clients', created.id);
```

Coleções disponíveis:

- `clients`
- `accounts`
- `expenses`
- `gains`
- `investments`
- `service_orders`
- `services_catalog`

Regras:

- Use sempre `Storage`, nunca escreva diretamente em `localStorage`.
- Todos os métodos são assíncronos e devem usar `await`.
- `Storage.add` gera `id`, `user_id`, `created_at` e `updated_at`.
- `Storage.update` preserva os campos que não forem enviados.
- A camada tenta Supabase primeiro quando configurada e autenticada; caso contrário, usa armazenamento local.
- Os dados locais usam chaves no formato `gp_<userId>_<collection>`.

## 6. Modelos e operações por entidade

### 6.1 Clientes

Coleção: `clients`

Campos:

```javascript
{
  id,
  nome,       // obrigatório
  empresa,
  email,
  telefone,
  endereco
}
```

Operações na interface:

1. Acesse `#/clients`.
2. Clique em **Novo Cliente**.
3. Informe o nome e os demais dados.
4. Salve.
5. Para alterar, use o ícone de edição.
6. Para remover, use o ícone de lixeira e confirme.

Não exclua um cliente sem verificar se existem ordens vinculadas a ele.

### 6.2 Contas bancárias

Coleção: `accounts`

Campos:

```javascript
{
  id,
  banco,      // obrigatório
  titular,    // obrigatório
  tipo,
  saldo       // saldo inicial
}
```

O saldo exibido é calculado assim:

```text
saldo atual = saldo inicial + ganhos vinculados - gastos vinculados
```

Para cadastrar:

1. Acesse `#/accounts`.
2. Clique em **Nova Conta**.
3. Preencha banco, titular, modalidade e saldo inicial.
4. Salve.

Uma conta deve existir antes de registrar um pagamento de OS ou um ganho vinculado a ela.

### 6.3 Gastos

Coleção: `expenses`

Campos:

```javascript
{
  id,
  descricao,  // obrigatório
  valor,      // positivo
  data,       // YYYY-MM-DD
  categoria,
  conta_id,   // opcional
  ordem_id    // opcional
}
```

Para lançar um gasto:

1. Acesse `#/expenses`, ou use o botão de gasto dentro de uma OS.
2. Informe descrição, valor, data e categoria.
3. Se aplicável, selecione a conta de saída.
4. Se aplicável, vincule a uma OS.
5. Salve e confirme o lançamento.

### 6.4 Ganhos e receitas

Coleção: `gains`

Campos:

```javascript
{
  id,
  descricao,  // obrigatório
  valor,      // positivo
  data,       // YYYY-MM-DD
  categoria,
  conta_id,
  ordem_id,
  origem      // usado internamente para pagamento automático de OS
}
```

Para lançar:

1. Acesse `#/gains`, ou use o botão de ganho dentro de uma OS.
2. Informe descrição, valor, data e categoria.
3. Selecione a conta de entrada.
4. Opcionalmente, selecione a OS.
5. Salve.

Não duplique manualmente o pagamento automático de uma OS. Pagamentos criados pelo formulário de OS têm `origem: 'service_order_payment'`.

### 6.5 Investimentos

Coleção: `investments`

Campos:

```javascript
{
  id,
  nome,
  tipo,
  valor,
  data,
  lucro,
  obs
}
```

Use `#/investments` para criar, editar ou excluir investimentos.

### 6.6 Catálogo de serviços

Coleção: `services_catalog`

Campos principais:

```javascript
{
  id,
  categoria,
  media,
  minimo,
  maximo,
  total_atendimentos,
  faturamento_acumulado,
  exemplos
}
```

Use `#/services` para consultar médias e manter categorias.

## 7. Ordens de serviço

Coleção: `service_orders`

Campos:

```javascript
{
  id,
  clienteId,
  descricao,
  valor,
  data_abertura,
  data_fechamento,
  status,              // aberta | em_andamento | concluida
  obs,
  pago,                // boolean
  forma_pagamento,
  conta_pagamento_id,
  data_pagamento
}
```

### 7.1 Criar uma OS

1. Acesse `#/clients` e confirme que o cliente existe.
2. Acesse `#/service-orders`.
3. Clique em **Nova Ordem de Serviço**.
4. Selecione o cliente.
5. Informe descrição e valor maior que zero.
6. Informe a data de abertura.
7. Escolha o status:
   - `Aberta`: orçamento ou pendência inicial.
   - `Em Andamento`: serviço aguardando conclusão.
   - `Concluída`: serviço concluído, mas ainda pode aguardar pagamento.
8. Adicione observações, se necessário.
9. Deixe **Serviço pago** desmarcado quando ainda não recebeu.
10. Salve.

### 7.2 Registrar pagamento da OS

1. Abra a edição da OS.
2. Marque **Serviço pago**.
3. Selecione a forma de pagamento:
   - Pix
   - Transferência
   - Cartão de crédito
   - Cartão de débito
   - Dinheiro
   - Boleto
4. Selecione a conta que recebeu o valor.
5. Salve.

Ao salvar, o sistema:

- Marca a OS como paga.
- Cria ou atualiza um ganho vinculado à OS.
- Usa o valor da OS como valor do ganho.
- Atualiza o saldo calculado da conta.
- Evita duplicidade usando `ordem_id` e `origem`.

Ao desmarcar o pagamento, o ganho automático correspondente é removido. Ao excluir uma OS, o ganho automático dela também é removido.

### 7.3 Interpretação da Dashboard

Na Dashboard, as OS são agrupadas em:

- **Em orçamento**: `status === 'aberta'`.
- **Aguardando conclusão**: `status === 'em_andamento'`.
- **Aguardando pagamento**: `status === 'concluida'` e `pago` falso.
- **Finalizadas**: `pago` verdadeiro.

Não altere a definição desses grupos sem atualizar a interface, os testes e esta documentação.

## 8. Gerar orçamento em PDF

1. Acesse `#/service-orders`.
2. Marque uma ou mais caixas de seleção na primeira coluna.
3. Para selecionar todas as ordens visíveis, use a caixa no cabeçalho.
4. Clique em **Gerar orçamento**.
5. O sistema abrirá uma janela de impressão.
6. No navegador, escolha **Salvar como PDF**.
7. Salve o arquivo e envie ao cliente.

O documento contém:

- Identificador resumido da OS.
- Data de emissão.
- Nome, empresa e e-mail do cliente quando disponíveis.
- Descrição do serviço.
- Valor total orçado.
- Observações.
- Texto informando que se trata de um orçamento sujeito à aprovação.

Se a janela não abrir, permita pop-ups para o site e tente novamente.

## 9. Autenticação

Funções globais em `js/auth.js`:

```javascript
await registerUser(nome, email, senha);
await loginUser(email, senha);
await logout();
await isAuthenticated();
await getCurrentUser();
```

Regras:

- Nunca solicite ou armazene senhas em texto dentro de registros financeiros.
- Rotas protegidas devem redirecionar para `#/login`.
- No modo offline, a sessão é mantida em `sessionStorage`.
- No modo Supabase, a autenticação é feita pelo Supabase Auth.

## 10. Supabase e migrações

Configuração:

- Arquivo: `js/supabase.js`
- Migração: `supabase-migration.sql`

Antes de usar Supabase:

1. Configure a URL e a chave pública anônima.
2. Execute `supabase-migration.sql` no SQL Editor.
3. Confirme as políticas RLS.
4. Faça login com um usuário autenticado.
5. Teste criação e leitura de uma entidade.

Campos de pagamento necessários na tabela `service_orders`:

- `pago`
- `forma_pagamento`
- `conta_pagamento_id`
- `data_pagamento`

Campo adicional usado em `gains`:

- `origem`

O Supabase usa `cliente_id`, enquanto o frontend usa `clienteId`. A conversão é feita automaticamente por `Storage`.

Nunca coloque chaves privadas, tokens de serviço ou senhas no código do frontend.

## 11. Como alterar o código

### 11.1 Alterar uma tela existente

1. Leia o módulo inteiro antes de editar.
2. Localize `renderList` ou `render`.
3. Localize `openForm`, se o formulário for alterado.
4. Reutilize `Storage`, `Toast.show`, `escapeHtml` e `formatBRL`.
5. Preserve o padrão de modal global em `index.html`.
6. Atualize o README ou este arquivo se o comportamento mudar.
7. Execute `npm test`.
8. Execute `git diff --check`.

### 11.2 Criar uma nova entidade

1. Defina a coleção e o modelo de dados.
2. Crie um módulo em `js/modules/`.
3. Implemente `render`, `openForm`, `deleteItem` e ordenação quando aplicável.
4. Exponha o módulo em `window`.
5. Adicione o `<script>` em `index.html` antes de `js/app.js`.
6. Adicione a rota em `ROUTES`.
7. Adicione o item ao menu lateral em `index.html`.
8. Crie a tabela e as políticas em `supabase-migration.sql`.
9. Adicione testes em `tests/system.test.js`.
10. Execute `npm test`.

### 11.3 Tratamento de erros

- Mostre erros de validação com `Toast.show('mensagem', 'error')`.
- Envolva operações assíncronas de gravação em `try/catch`.
- Não esconda falhas com valores padrão que pareçam sucesso.
- Use `console.error` para falhas inesperadas de renderização.
- Nunca confirme uma operação antes de verificar o retorno de `Storage`.

## 12. Checklist final do Agente IA

Antes de informar que uma tarefa foi concluída:

- [ ] A mudança atende exatamente ao pedido.
- [ ] Os dados são lidos antes de editar ou excluir.
- [ ] Campos obrigatórios são validados.
- [ ] IDs e relacionamentos permanecem válidos.
- [ ] Não há duplicidade de ganhos ou gastos.
- [ ] A interface mantém o padrão visual existente.
- [ ] A documentação foi atualizada quando necessário.
- [ ] `npm test` passou.
- [ ] `git diff --check` passou.
- [ ] Nenhum segredo foi adicionado.
- [ ] Nenhuma alteração não relacionada foi incluída.

// ============ Dashboard / Visão-resumo ============
// Exibe métricas rápidas: valor total em contas, gastos do mês,
// investimentos e ordens de serviço abertas.

const dashboardSortState = {
  accounts: { column: null, direction: 'asc' },
  orders: { column: null, direction: 'asc' }
};
let dashboardPrivacyMode = false;

function dashboardMoney(value) {
  return dashboardPrivacyMode ? '••••••' : formatBRL(value);
}

function dashboardSortHeader(type, column, label) {
  const state = dashboardSortState[type];
  const active = state.column === column;
  const icon = active ? (state.direction === 'asc' ? 'fa-sort-asc' : 'fa-sort-desc') : 'fa-sort';
  return `<th class="sortable-header" onclick="DashboardView.sortBy('${type}', '${column}')">${label}<i class="fas ${icon}" style="margin-left:6px;font-size:0.8em;"></i></th>`;
}

function sortDashboardItems(items, type, clientMap) {
  const state = dashboardSortState[type];
  if (!state.column) return items.slice(-5).reverse();
  return items.slice().sort((a, b) => {
    let valueA = a[state.column];
    let valueB = b[state.column];
    if (state.column === 'cliente') {
      valueA = clientMap[a.clienteId] || '';
      valueB = clientMap[b.clienteId] || '';
    }
    if (state.column === 'valor' || state.column === 'saldo') {
      valueA = Number(valueA) || 0;
      valueB = Number(valueB) || 0;
    } else {
      valueA = (valueA || '').toString().toLocaleLowerCase('pt-BR');
      valueB = (valueB || '').toString().toLocaleLowerCase('pt-BR');
    }
    const result = typeof valueA === 'string' ? valueA.localeCompare(valueB, 'pt-BR') : valueA - valueB;
    return state.direction === 'asc' ? result : -result;
  }).slice(0, 5);
}

const DashboardView = {
  async render(container) {
    const accounts = await Storage.get('accounts');
    const expenses = await Storage.get('expenses');
    const gains = await Storage.get('gains');
    const investments = await Storage.get('investments');
    const sos = await Storage.get('service_orders');

    const month = new Date();
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 10);

    const thisMonth = expenses.filter(e => e.data >= monthStart && e.data <= monthEnd);
    const totalExpensesThisMonth = thisMonth.reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);
    const totalGains = gains.reduce((s, item) => s + (parseFloat(item.valor) || 0), 0);
    const totalInvestments = investments.reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);
    const orderAnalysis = {
      orcamento: sos.filter(s => s.status === 'aberta').length,
      aguardandoConclusao: sos.filter(s => s.status === 'em_andamento').length,
      aguardandoPagamento: sos.filter(s => s.status === 'concluida' && !s.pago).length,
      finalizadas: sos.filter(s => s.pago).length
    };
    const openSOs = orderAnalysis.orcamento + orderAnalysis.aguardandoConclusao;
    const accountBalances = Object.fromEntries(accounts.map(account => {
      const incoming = gains.filter(item => item.conta_id === account.id).reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
      const outgoing = expenses.filter(item => item.conta_id === account.id).reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
      return [account.id, (Number(account.saldo) || 0) + incoming - outgoing];
    }));
    const totalBankBalance = Object.values(accountBalances).reduce((sum, value) => sum + value, 0);
    const expensesByOrder = expenses.reduce((result, expense) => {
      if (!expense.ordem_id) return result;
      (result[expense.ordem_id] ||= []).push(expense);
      return result;
    }, {});
    const gainsByOrder = gains.reduce((result, gain) => {
      if (!gain.ordem_id) return result;
      (result[gain.ordem_id] ||= []).push(gain);
      return result;
    }, {});

    // Mapeamento de clientes para as ordens de serviço
    const clients = await Storage.get('clients');
    const clientMap = {};
    clients.forEach(c => { clientMap[c.id] = c.nome; });
    const dashboardAccounts = sortDashboardItems(accounts, 'accounts', clientMap);
    const dashboardOrders = sortDashboardItems(sos, 'orders', clientMap);

    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Dashboard Geral</h1>
          <p class="subtitle">Acompanhe a saúde financeira, clientes e histórico de ordens</p>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-ghost" onclick="DashboardView.togglePrivacy()" aria-pressed="${dashboardPrivacyMode}" title="${dashboardPrivacyMode ? 'Mostrar valores' : 'Ocultar valores'}">
            <i class="fas ${dashboardPrivacyMode ? 'fa-eye' : 'fa-eye-slash'}"></i> ${dashboardPrivacyMode ? 'Mostrar valores' : 'Ocultar valores'}
          </button>
          ${window.SeedData ? `<button class="btn btn-ghost" onclick="DashboardView.importHistoricalData()">
            <i class="fas fa-file-import"></i> Importar histórico
          </button>` : ''}
          <a href="#/services" class="btn btn-ghost">
            <i class="fas fa-calculator"></i> Ver Tabela de Médias
          </a>
        </div>
      </div>

      <div class="cards">
        <div class="card">
          <div class="card-title">
            <span>Saldo em Contas</span>
            <i class="fas fa-wallet"></i>
          </div>
          <div class="stat">
            <span class="stat-value" style="color:var(--primary);">${dashboardMoney(totalBankBalance)}</span>
            <span class="stat-label">${accounts.length} contas cadastradas</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Gastos do Mês</span>
            <i class="fas fa-arrow-trend-down"></i>
          </div>
          <div class="stat">
            <span class="stat-value ${totalExpensesThisMonth > 0 ? 'up' : ''}">
              ${dashboardMoney(totalExpensesThisMonth)}
            </span>
            <span class="stat-label">${thisMonth.length} lançamentos neste mês</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Ganhos Registrados</span>
            <i class="fas fa-arrow-trend-up"></i>
          </div>
          <div class="stat">
            <span class="stat-value" style="color:var(--success);">${dashboardMoney(totalGains)}</span>
            <span class="stat-label">${gains.length} lançamentos</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Investimentos</span>
            <i class="fas fa-chart-pie"></i>
          </div>
          <div class="stat">
            <span class="stat-value" style="color:var(--success);">${dashboardMoney(totalInvestments)}</span>
            <span class="stat-label">${investments.length} ativos em custódia</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Ordens em Aberto</span>
            <i class="fas fa-clipboard-list"></i>
          </div>
          <div class="stat">
            <span class="stat-value ${openSOs > 0 ? 'up' : ''}">${openSOs}</span>
            <span class="stat-label">demandas em execução</span>
          </div>
        </div>
      </div>

      <div class="list-card" style="margin-bottom:24px;">
        <div class="list-card-header">
          <h2>Análise das Ordens de Serviço</h2>
          <a href="#/service-orders" class="btn btn-sm btn-ghost">Gerenciar OS <i class="fas fa-arrow-right"></i></a>
        </div>
        <div class="cards" style="padding:0 20px 20px;">
          <div class="card"><div class="card-title"><span>Em orçamento</span><i class="fas fa-file-invoice"></i></div><div class="stat"><span class="stat-value">${orderAnalysis.orcamento}</span><span class="stat-label">aguardando aprovação</span></div></div>
          <div class="card"><div class="card-title"><span>Aguardando conclusão</span><i class="fas fa-hourglass-half"></i></div><div class="stat"><span class="stat-value">${orderAnalysis.aguardandoConclusao}</span><span class="stat-label">em andamento</span></div></div>
          <div class="card"><div class="card-title"><span>Aguardando pagamento</span><i class="fas fa-money-bill-wave"></i></div><div class="stat"><span class="stat-value">${orderAnalysis.aguardandoPagamento}</span><span class="stat-label">concluídas sem pagamento</span></div></div>
          <div class="card"><div class="card-title"><span>Finalizadas</span><i class="fas fa-check-circle"></i></div><div class="stat"><span class="stat-value" style="color:var(--success);">${orderAnalysis.finalizadas}</span><span class="stat-label">serviço e pagamento concluídos</span></div></div>
        </div>
      </div>

      <div class="grid">
        <div class="list-card">
          <div class="list-card-header">
            <h2>Contas Recentes</h2>
            <a href="#/accounts" class="btn btn-sm btn-ghost">Ver todas <i class="fas fa-arrow-right"></i></a>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  ${dashboardSortHeader('accounts', 'banco', 'Banco')}
                  ${dashboardSortHeader('accounts', 'titular', 'Titular')}
                  ${dashboardSortHeader('accounts', 'tipo', 'Tipo')}
                  ${dashboardSortHeader('accounts', 'saldo', 'Saldo')}
                </tr>
              </thead>
              <tbody>
                ${dashboardAccounts.map(a => `
                  <tr>
                    <td><strong>${escapeHtml(a.banco)}</strong></td>
                    <td>${escapeHtml(a.titular)}</td>
                    <td><span class="badge badge-default">${escapeHtml(a.tipo || 'Corrente')}</span></td>
                    <td style="font-weight:700;color:var(--success);">${dashboardMoney(accountBalances[a.id])}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4" style="color:var(--text-muted);text-align:center;padding:24px;">Nenhuma conta encontrada.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="list-card">
          <div class="list-card-header">
            <h2>Ordens de Serviço Recentes</h2>
            <a href="#/service-orders" class="btn btn-sm btn-ghost">Ver todas <i class="fas fa-arrow-right"></i></a>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  ${dashboardSortHeader('orders', 'cliente', 'Cliente')}
                  ${dashboardSortHeader('orders', 'descricao', 'Descrição')}
                  ${dashboardSortHeader('orders', 'valor', 'Valor')}
                  <th>Gastos vinculados</th>
                  <th>Recebido</th>
                  ${dashboardSortHeader('orders', 'status', 'Status')}
                </tr>
              </thead>
              <tbody>
                ${dashboardOrders.map(s => {
                  const clientName = clientMap[s.clienteId] || 'Cliente Avulso';
                  const badgeClass = s.status === 'concluida' ? 'success' : (s.status === 'em_andamento' ? 'warning' : 'info');
                  const labelStatus = s.status === 'concluida' ? 'Concluída' : (s.status === 'em_andamento' ? 'Em Andamento' : 'Aberta');
                  const linkedExpenses = expensesByOrder[s.id] || [];
                  const linkedGains = gainsByOrder[s.id] || [];
                  const linkedExpenseTotal = linkedExpenses.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
                  const linkedGainTotal = linkedGains.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
                  return `
                    <tr>
                      <td style="font-weight:600;">${escapeHtml(clientName)}</td>
                      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(s.descricao)}">
                        ${escapeHtml(s.descricao)}
                      </td>
                      <td style="font-weight:600;">${dashboardMoney(s.valor)}</td>
                      <td title="${linkedExpenses.length} lançamento(s)">${dashboardMoney(linkedExpenseTotal)}</td>
                      <td style="font-weight:600;color:var(--success);">${dashboardMoney(linkedGainTotal)}</td>
                      <td><span class="badge badge-${badgeClass}">${labelStatus}</span></td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="6" style="color:var(--text-muted);text-align:center;padding:24px;">Nenhuma ordem registrada.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  async sortBy(type, column) {
    const state = dashboardSortState[type];
    state.direction = state.column === column && state.direction === 'asc' ? 'desc' : 'asc';
    state.column = column;
    await this.render(document.getElementById('main-content'));
  },

  async togglePrivacy() {
    dashboardPrivacyMode = !dashboardPrivacyMode;
    await this.render(document.getElementById('main-content'));
  },

  async importHistoricalData() {
    if (!window.SeedData) {
      Toast.show('Dados históricos não estão disponíveis para importação.', 'error');
      return;
    }
    if (!confirm('Importar o histórico de clientes, ordens, contas e catálogo? Registros já importados não serão duplicados.')) return;

    try {
      const result = await window.SeedData.importAll();
      const total = Object.values(result).reduce((sum, value) => sum + value, 0);
      Toast.show(
        total
          ? `Histórico importado: ${total} registros novos.`
          : 'O histórico já está importado. Nenhum registro novo foi criado.',
        'success'
      );
      await this.render(document.getElementById('main-content'));
    } catch (error) {
      console.error('Erro ao importar histórico:', error);
      Toast.show('Erro ao importar histórico: ' + error.message, 'error');
    }
  },

};

window.DashboardView = DashboardView;

// Funções globais auxiliares
function escapeHtml(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatBRL(value) {
  const n = typeof value === 'number' ? value : parseFloat(value) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

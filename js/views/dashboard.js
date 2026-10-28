// ============ Dashboard / Visão-resumo ============
// Exibe métricas rápidas: valor total em contas, gastos do mês,
// investimentos e ordens de serviço abertas.

const DashboardView = {
  async render(container) {
    const accounts = await Storage.get('accounts');
    const expenses = await Storage.get('expenses');
    const investments = await Storage.get('investments');
    const sos = await Storage.get('service_orders');

    const month = new Date();
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 10);

    const thisMonth = expenses.filter(e => e.data >= monthStart && e.data <= monthEnd);
    const totalExpensesThisMonth = thisMonth.reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);
    const totalInvestments = investments.reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);
    const openSOs = sos.filter(s => s.status === 'aberta' || s.status === 'em_andamento').length;
    const totalBankBalance = accounts.reduce((s, a) => s + (parseFloat(a.saldo) || 0), 0);

    // Mapeamento de clientes para as ordens de serviço
    const clients = await Storage.get('clients');
    const clientMap = {};
    clients.forEach(c => { clientMap[c.id] = c.nome; });

    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Dashboard Geral</h1>
          <p class="subtitle">Acompanhe a saúde financeira e operacional do seu negócio</p>
        </div>
        <button class="btn btn-primary" onclick="DashboardView.onImportSeed()">
          <i class="fas fa-magic"></i> Importar Dados Demo
        </button>
      </div>

      <div class="cards">
        <div class="card">
          <div class="card-title">
            <span>Saldo em Contas</span>
            <i class="fas fa-wallet"></i>
          </div>
          <div class="stat">
            <span class="stat-value" style="color:var(--primary);">${formatBRL(totalBankBalance)}</span>
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
              ${formatBRL(totalExpensesThisMonth)}
            </span>
            <span class="stat-label">${thisMonth.length} lançamentos neste mês</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Investimentos</span>
            <i class="fas fa-chart-pie"></i>
          </div>
          <div class="stat">
            <span class="stat-value" style="color:var(--success);">${formatBRL(totalInvestments)}</span>
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
                  <th>Banco</th>
                  <th>Titular</th>
                  <th>Tipo</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                ${accounts.slice(-5).reverse().map(a => `
                  <tr>
                    <td><strong>${escapeHtml(a.banco)}</strong></td>
                    <td>${escapeHtml(a.titular)}</td>
                    <td><span class="badge badge-default">${escapeHtml(a.tipo || 'Corrente')}</span></td>
                    <td style="font-weight:700;color:var(--success);">${formatBRL(a.saldo)}</td>
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
                  <th>Cliente</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${sos.slice(-5).reverse().map(s => {
                  const clientName = clientMap[s.clienteId] || 'Cliente Avulso';
                  const badgeClass = s.status === 'concluida' ? 'success' : (s.status === 'em_andamento' ? 'warning' : 'info');
                  const labelStatus = s.status === 'concluida' ? 'Concluída' : (s.status === 'em_andamento' ? 'Em Andamento' : 'Aberta');
                  return `
                    <tr>
                      <td style="font-weight:600;">${escapeHtml(clientName)}</td>
                      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(s.descricao)}">
                        ${escapeHtml(s.descricao)}
                      </td>
                      <td style="font-weight:600;">${formatBRL(s.valor)}</td>
                      <td><span class="badge badge-${badgeClass}">${labelStatus}</span></td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="4" style="color:var(--text-muted);text-align:center;padding:24px;">Nenhuma ordem registrada.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  async onImportSeed() {
    if (!confirm('Deseja importar dados fictícios de demonstração para testar o sistema?')) return;
    try {
      if (window.SeedData && typeof window.SeedData.importAll === 'function') {
        await window.SeedData.importAll();
        Toast.show('Dados de exemplo importados com sucesso!', 'success');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        Toast.show('Módulo de semente de dados não encontrado.', 'error');
      }
    } catch (err) {
      Toast.show('Erro ao importar dados: ' + err.message, 'error');
    }
  }
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

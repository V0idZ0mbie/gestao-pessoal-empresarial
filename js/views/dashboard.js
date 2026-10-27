// ============ Dashboard / Visão-resumo ============
// Exibe métricas rápidas: valor total em contas, gastos do mês,
// investimentos e ordens de serviço abertas.

const DashboardView = {
  render(container) {
    const accounts = Storage.get('accounts', []);
    const expenses = Storage.get('expenses', []);
    const investments = Storage.get('investments', []);
    const sos = Storage.get('service-orders', []);

    const month = new Date();
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const thisMonth = expenses.filter(e => e.data >= monthStart && e.data <= monthEnd);
    const totalExpensesThisMonth = thisMonth.reduce((s, e) => s + (e.valor || 0), 0);
    const totalInvestments = investments.reduce((s, i) => s + (i.valor || 0), 0);
    const openSOs = sos.filter(s => s.status === 'aberta' || s.status === 'em_andamento').length;
    const totalBankBalance = accounts.reduce((s, a) => s + (a.saldo || 0), 0);

    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Dashboard</h1>
          <p class="subtitle">Visão geral do seu sistema de gestão</p>
        </div>
        <button class="btn btn-primary" onclick="DashboardView.onImportSeed()">
          <i class="fas fa-download"></i> Importar dados de exemplo
        </button>
      </div>

      <div class="cards">
        <div class="card">
          <div class="card-title"><i class="fas fa-university"></i> Contas</div>
          <div class="stat">
            <span class="stat-value">${accounts.length}</span>
            <span class="stat-label">contas cadastradas</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><i class="fas fa-shopping-cart"></i> Gastos (mês)</div>
          <div class="stat">
            <span class="stat-value ${totalExpensesThisMonth > 0 ? 'up' : ''}">
              ${formatBRL(totalExpensesThisMonth)}
            </span>
            <span class="stat-label">deste mês</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><i class="fas fa-chart-line"></i> Investimentos</div>
          <div class="stat">
            <span class="stat-value">${formatBRL(totalInvestments)}</span>
            <span class="stat-label">total investido</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><i class="fas fa-tasks"></i> Ordens em aberto</div>
          <div class="stat">
            <span class="stat-value ${openSOs > 0 ? 'up' : ''}">${openSOs}</span>
            <span class="stat-label">aguardando ação</span>
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="list-card">
          <div class="list-card-header">
            <h2>Contas recentes</h2>
            <a href="#/accounts" class="btn btn-sm btn-primary">Ver todas</a>
          </div>
          <div class="table-wrap" style="max-height:240px;overflow:auto;">
            <table>
              <thead><tr><th>Banco</th><th>Titular</th><th>Saldo</th></tr></thead>
              <tbody>
                ${accounts.slice(-5).reverse().map(a => `
                  <tr>
                    <td><strong>${escapeHtml(a.banco)}</strong></td>
                    <td>${escapeHtml(a.titular)}</td>
                    <td style="font-weight:600;color:var(--success);">${formatBRL(a.saldo)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="3" style="color:var(--text-muted);text-align:center;">Nenhuma conta</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="list-card">
          <div class="list-card-header">
            <h2>Ordens de serviço</h2>
            <a href="#/service-orders" class="btn btn-sm btn-primary">Ver todas</a>
          </div>
          <div class="table-wrap" style="max-height:240px;overflow:auto;">
            <table>
              <thead><tr><th>Cliente</th><th>Descrição</th><th>Status</th></tr></thead>
              <tbody>
                ${soS.slice(-5).reverse().map(s => {
                  const c = Storage.find('clients', cl => cl.id === s.clienteId);
                  return `
                    <tr>
                      <td>${escapeHtml(c ? c.nome : '—')}</td>
                      <td>${escapeHtml(s.descricao)}</td>
                      <td><span class="badge badge-${s.status === 'concluida' ? 'success' : s.status === 'em_andamento' ? 'warning' : 'default'}">${s.status}</span></td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="3" style="color:var(--text-muted);text-align:center;">Nenhuma OLS</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  async onImportSeed() {
    if (!confirm('Importar dados de exemplo? Isso substituirá os dados atuais.')) return;
    await SeedData.importAll();
    Toast.show('Dados de exemplo importados com sucesso!', 'success');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
};

// helper de escape
function escapeHtml(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// helper de moeda
function formatBRL(value) {
  const n = typeof value === 'number' ? value : parseFloat(value) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

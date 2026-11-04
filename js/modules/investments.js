// ============ Investimentos ===========
// CRUD de investimentos: nome, tipo, valor, data, lucro/rendimento, observações.

const InvestmentsModule = (() => {
  const COLLECTION = 'investments';
  
  // Estado de ordenação global
  let sortState = {
    column: null,
    direction: 'asc'
  };

  function getSortIcon() {
    const icons = {
      asc: 'fa-sort-asc',
      desc: 'fa-sort-desc',
      none: 'fa-sort'
    };
    return icons[sortState.direction] || 'fa-sort';
  }

  function getSortableHeader(column, label) {
    const isActive = sortState.column === column;
    const iconClass = isActive ? getSortIcon() : 'fa-sort';
    
    return `
      <th class="sortable-header" data-column="${column}" onclick="InvestmentsModule.sortBy('${column}')">
        ${label}
        <i class="fas ${iconClass}" style="margin-left:6px;font-size:0.8em;"></i>
      </th>
    `;
  }

  function sortItems(items, column) {
    if (!column) return items;
    
    return [...items].sort((a, b) => {
      let valA = a[column];
      let valB = b[column];
      
      if (column === 'valor' || column === 'lucro') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else if (column === 'data') {
        valA = valA ? new Date(valA + 'T00:00:00').getTime() : 0;
        valB = valB ? new Date(valB + 'T00:00:00').getTime() : 0;
      } else {
        valA = valA ? valA.toString().toLowerCase() : '';
        valB = valB ? valB.toString().toLowerCase() : '';
      }
      
      if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  async function renderList(container) {
    const items = await Storage.get(COLLECTION);
    const totalAporte = items.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
    const totalLucro = items.reduce((acc, curr) => acc + (parseFloat(curr.lucro) || 0), 0);

    // Aplica ordenação atual
    const sortedItems = sortItems(items, sortState.column);

    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Carteira de Investimentos</h1>
          <p class="subtitle">Patrimônio aportado: <strong>${formatBRL(totalAporte)}</strong> | Rendimentos: <strong style="color:var(--success);">${formatBRL(totalLucro)}</strong></p>
        </div>
        <button class="btn btn-primary" onclick="InvestmentsModule.openForm()">
          <i class="fas fa-plus"></i> Novo Ativo
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${getSortableHeader('data', 'Data do Aporte')}
              ${getSortableHeader('nome', 'Ativo / Aplicação')}
              ${getSortableHeader('tipo', 'Classe de Ativo')}
              ${getSortableHeader('valor', 'Valor Investido')}
              ${getSortableHeader('lucro', 'Lucro / Proventos')}
              ${getSortableHeader('obs', 'Notas')}
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${sortedItems.map(inv => `
              <tr>
                <td>${inv.data ? new Date(inv.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                <td style="font-weight:700;">
                  <i class="fas fa-chart-line" style="color:var(--primary);margin-right:8px;"></i>
                  ${escapeHtml(inv.nome)}
                </td>
                <td><span class="badge badge-default">${escapeHtml(inv.tipo || 'Renda Fixa')}</span></td>
                <td style="font-weight:700;color:var(--primary);">${formatBRL(inv.valor)}</td>
                <td style="font-weight:700;color:var(--success);">${inv.lucro ? formatBRL(inv.lucro) : '—'}</td>
                <td style="color:var(--text-muted);font-size:12.5px;">${escapeHtml(inv.obs || '—')}</td>
                <td style="white-space:nowrap;text-align:right;">
                  <button class="btn btn-sm btn-ghost" onclick="InvestmentsModule.openForm('${inv.id}')" title="Editar">
                    <i class="fas fa-pencil-alt"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="InvestmentsModule.deleteItem('${inv.id}')" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="color:var(--text-muted);text-align:center;padding:32px;">Nenhum investimento registrado. Clique em "Novo Ativo" para lançar.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  async function sortBy(column) {
    sortState.direction = sortState.column === column && sortState.direction === 'asc' ? 'desc' : 'asc';
    sortState.column = column;
    await renderList(document.getElementById('main-content').firstElementChild || document.querySelector('.main'));
  }

  async function openForm(id) {
    const items = await Storage.get(COLLECTION);
    const item = id ? items.find(i => i.id === id) : null;
    const overlay = document.getElementById('modal-overlay');

    const defaultDate = item?.data || new Date().toISOString().slice(0, 10);

    document.getElementById('modal-title').textContent = item ? 'Editar Investimento' : 'Novo Investimento / Aporte';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Nome do Ativo ou Aplicação *</label>
        <input id="f-nome" type="text" placeholder="Ex: CDB Liquidez Diária, Tesouro IPCA+, PETR4, HGLG11" value="${escapeHtml(item?.nome || '')}" />
      </div>
      <div class="form-group">
        <label>Classe do Ativo</label>
        <select id="f-tipo">
          <option value="Tesouro Direto" ${item?.tipo === 'Tesouro Direto' ? 'selected' : ''}>Tesouro Direto (Selic / IPCA+ / Prefixado)</option>
          <option value="CDB" ${item?.tipo === 'CDB' ? 'selected' : ''}>CDB / Renda Fixa Bancária</option>
          <option value="LCI / LCA" ${item?.tipo === 'LCI / LCA' ? 'selected' : ''}>LCI / LCA (Isento de IR)</option>
          <option value="Ações" ${item?.tipo === 'Ações' ? 'selected' : ''}>Ações / Mercado Fracionário</option>
          <option value="Fundos Imobiliários" ${item?.tipo === 'Fundos Imobiliários' ? 'selected' : ''}>Fundos Imobiliários (FIIs)</option>
          <option value="Criptoativos" ${item?.tipo === 'Criptoativos' ? 'selected' : ''}>Criptoativos</option>
          <option value="Outro" ${item?.tipo === 'Outro' ? 'selected' : ''}>Outro</option>
        </select>
      </div>
      <div class="form-group">
        <label>Valor Investido (R$) *</label>
        <input id="f-valor" type="number" step="0.01" min="0" placeholder="0,00" value="${item ? item.valor : ''}" />
      </div>
      <div class="form-group">
        <label>Data da Aplicação</label>
        <input id="f-data" type="date" value="${defaultDate}" />
      </div>
      <div class="form-group">
        <label>Lucro / Rendimento Acumulado (R$, opcional)</label>
        <input id="f-lucro" type="number" step="0.01" placeholder="0,00" value="${item && item.lucro !== undefined ? item.lucro : ''}" />
      </div>
      <div class="form-group">
        <label>Observações Estratégicas</label>
        <textarea id="f-obs" rows="2" placeholder="Corretora, prazo de vencimento, meta de rentabilidade">${escapeHtml(item?.obs || '')}</textarea>
      </div>
    `;

    document.getElementById('modal-submit').textContent = item ? 'Salvar Alterações' : 'Adicionar Ativo';

    document.getElementById('modal-submit').onclick = async () => {
      const nome = document.getElementById('f-nome').value.trim();
      const valor = parseFloat(document.getElementById('f-valor').value) || 0;
      const data = document.getElementById('f-data').value || new Date().toISOString().slice(0, 10);
      const tipo = document.getElementById('f-tipo').value;
      const lucroVal = document.getElementById('f-lucro').value;
      const lucro = lucroVal !== '' ? parseFloat(lucroVal) : 0;
      const obs = document.getElementById('f-obs').value.trim();

      if (!nome || valor <= 0) {
        Toast.show('Preencha o nome do ativo e o valor investido.', 'error');
        return;
      }

      const payload = { nome, tipo, valor, data, lucro, obs };

      try {
        if (item) {
          await Storage.update(COLLECTION, item.id, payload);
          Toast.show('Investimento atualizado!', 'success');
        } else {
          await Storage.add(COLLECTION, payload);
          Toast.show('Investimento cadastrado com sucesso!', 'success');
        }
        closeModal();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        Toast.show('Erro ao salvar investimento: ' + err.message, 'error');
      }
    };

    overlay.classList.add('open');
  }

  async function deleteItem(id) {
    const item = await Storage.find(COLLECTION, i => i.id === id);
    if (!item) return;
    if (!confirm(`Deseja remover o ativo "${item.nome}"?`)) return;

    try {
      await Storage.remove(COLLECTION, id);
      Toast.show('Ativo excluído com sucesso.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      Toast.show('Erro ao excluir: ' + err.message, 'error');
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  return { render: renderList, renderList, openForm, deleteItem, closeModal, sortBy };
})();

window.InvestmentsModule = InvestmentsModule;

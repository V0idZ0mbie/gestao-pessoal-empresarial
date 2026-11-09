// ============ Gastos / Despesas ===========
// CRUD de gastos: descrição, valor, data, categoria, conta vinculada.

const ExpensesModule = (() => {
  const COLLECTION = 'expenses';
  
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
      <th class="sortable-header" data-column="${column}" onclick="ExpensesModule.sortBy('${column}')">
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
      
      if (column === 'valor') {
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
    const accounts = await Storage.get('accounts');
    const totalGasto = items.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

    // Aplica ordenação atual
    const sortedItems = sortItems(items, sortState.column);

    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Controle de Gastos & Despesas</h1>
          <p class="subtitle">Total: <strong>${formatBRL(totalGasto)}</strong> | ${items.length} lançamentos</p>
        </div>
        <button class="btn btn-primary" onclick="ExpensesModule.openForm()">
          <i class="fas fa-plus"></i> Novo Lançamento
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${getSortableHeader('data', 'Data')}
              ${getSortableHeader('descricao', 'Descrição')}
              ${getSortableHeader('categoria', 'Categoria')}
              ${getSortableHeader('valor', 'Valor (R$)')}
              ${getSortableHeader('conta_id', 'Conta')}
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${sortedItems.map(e => `
              <tr>
                <td>${e.data ? new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                <td style="font-weight:700;">
                  <i class="fas fa-receipt" style="color:var(--danger);margin-right:8px;"></i>
                  ${escapeHtml(e.descricao)}
                </td>
                <td><span class="badge badge-default">${escapeHtml(e.categoria || 'Geral')}</span></td>
                <td style="font-weight:700;color:var(--danger);">${formatBRL(e.valor)}</td>
                <td>${escapeHtml(accounts.find(a => a.id === e.conta_id)?.banco || '—')}</td>
                <td style="white-space:nowrap;text-align:right;">
                  <button class="btn btn-sm btn-ghost" onclick="ExpensesModule.openForm('${e.id}')" title="Editar">
                    <i class="fas fa-pencil-alt"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="ExpensesModule.deleteItem('${e.id}')" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="color:var(--text-muted);text-align:center;padding:32px;">Nenhum gasto registrado. Clique em "Novo Lançamento" para cadastrar.</td></tr>'}
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

  async function openForm(id, ordemId = '') {
    const items = await Storage.get(COLLECTION);
    const item = id ? items.find(e => e.id === id) : null;
    const [accounts, orders, configuredCategories] = await Promise.all([
      Storage.get('accounts'),
      Storage.get('service_orders'),
      CategoriesModule.getCategories('expense')
    ]);
    const overlay = document.getElementById('modal-overlay');
    const primaryAccount = accounts.find(account => account.is_primary);
    const categories = item?.categoria && !configuredCategories.some(category => category.nome === item.categoria)
      ? [...configuredCategories, { nome: item.categoria }]
      : configuredCategories;

    const defaultDate = item?.data || new Date().toISOString().slice(0, 10);
    const selectedAccountId = item ? (item.conta_id || '') : (primaryAccount?.id || '');

    document.getElementById('modal-title').textContent = item ? 'Editar Despesa' : 'Novo Lançamento de Gasto';
        document.getElementById('modal-body').innerHTML = `
          <div class="form-group">
            <label>Descrição do Gasto *</label>
            <input id="f-descricao" type="text" placeholder="Ex: Assinatura de Software, Aluguel" value="${escapeHtml(item?.descricao || '')}" />
          </div>
          <div class="form-group">
            <label>Valor da Despesa (R$) *</label>
            <input id="f-valor" type="number" step="0.01" min="0" placeholder="0,00" value="${item ? item.valor : ''}" />
          </div>
          <div class="form-group">
            <label>Data de Pagamento / Vencimento</label>
            <input id="f-data" type="date" value="${defaultDate}" />
          </div>
          <div class="form-group">
            <label>Categoria Financeira</label>
            <select id="f-categoria">
              ${categories.map(category => `<option value="${escapeHtml(category.nome)}" ${item?.categoria === category.nome ? 'selected' : ''}>${escapeHtml(category.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Conta de Saída (opcional)</label>
            <select id="f-conta">
              <option value="">Nenhuma / Dinheiro físico</option>
              ${accounts.map(a => `<option value="${a.id}" ${selectedAccountId === a.id ? 'selected' : ''}>${escapeHtml(a.banco)} - ${escapeHtml(a.titular)}${a.is_primary ? ' (Principal)' : ''} - Saldo: ${formatBRL(a.saldo)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Ordem de serviço (opcional)</label>
            <select id="f-ordem">
              <option value="">Nenhuma</option>
              ${orders.map(o => `<option value="${o.id}" ${(item?.ordem_id || ordemId) === o.id ? 'selected' : ''}>${escapeHtml(o.descricao || o.id)}</option>`).join('')}
            </select>
          </div>
        `;

    document.getElementById('modal-submit').textContent = item ? 'Salvar Alterações' : 'Registrar Gasto';

    document.getElementById('modal-submit').onclick = async () => {
      const descricao = document.getElementById('f-descricao').value.trim();
      const valor = parseFloat(document.getElementById('f-valor').value) || 0;
      const data = document.getElementById('f-data').value || new Date().toISOString().slice(0, 10);
      const categoria = document.getElementById('f-categoria').value;
      const conta_id = document.getElementById('f-conta').value || null;
      const ordem_id = document.getElementById('f-ordem').value || null;

      if (!descricao || valor <= 0) {
        Toast.show('Preencha a descrição e um valor válido maior que zero.', 'error');
        return;
      }

      const payload = { descricao, valor, data, categoria, conta_id, ordem_id };

      try {
        if (item) {
          await Storage.update(COLLECTION, item.id, payload);
          Toast.show('Despesa atualizada.', 'success');
        } else {
          await Storage.add(COLLECTION, payload);
          Toast.show('Despesa registrada com sucesso!', 'success');
        }
        closeModal();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        Toast.show('Erro ao salvar: ' + err.message, 'error');
      }
    };

    overlay.classList.add('open');
  }

  async function deleteItem(id) {
    const item = await Storage.find(COLLECTION, e => e.id === id);
    if (!item) return;
    if (!confirm(`Remover despesa "${item.descricao}" no valor de ${formatBRL(item.valor)}?`)) return;

    try {
      await Storage.remove(COLLECTION, id);
      Toast.show('Despesa removida.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      Toast.show('Erro ao excluir: ' + err.message, 'error');
    }
  }

  return { render: renderList, renderList, openForm, deleteItem, closeModal, sortBy };
})();

window.ExpensesModule = ExpensesModule;

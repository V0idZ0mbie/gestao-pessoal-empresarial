// ============ Ganhos / Receitas ============
// Lançamentos de entrada vinculados opcionalmente a conta e ordem de serviço.

const GainsModule = (() => {
  const COLLECTION = 'gains';
  let sortState = { column: null, direction: 'asc' };

  function header(column, label) {
    const active = sortState.column === column;
    const icon = active ? (sortState.direction === 'asc' ? 'fa-sort-asc' : 'fa-sort-desc') : 'fa-sort';
    return `<th class="sortable-header" onclick="GainsModule.sortBy('${column}')">${label}<i class="fas ${icon}" style="margin-left:6px;font-size:.8em;"></i></th>`;
  }

  function sort(items) {
    if (!sortState.column) return items;
    return [...items].sort((a, b) => {
      let left = a[sortState.column] || '';
      let right = b[sortState.column] || '';
      if (sortState.column === 'valor') {
        left = Number(left) || 0;
        right = Number(right) || 0;
      } else {
        left = String(left).toLocaleLowerCase('pt-BR');
        right = String(right).toLocaleLowerCase('pt-BR');
      }
      const result = typeof left === 'string' ? left.localeCompare(right, 'pt-BR') : left - right;
      return sortState.direction === 'asc' ? result : -result;
    });
  }

  async function renderList(container) {
    const [items, accounts, orders] = await Promise.all([
      Storage.get(COLLECTION), Storage.get('accounts'), Storage.get('service_orders')
    ]);
    const accountMap = Object.fromEntries(accounts.map(account => [account.id, `${account.banco} - ${account.titular}`]));
    const orderMap = Object.fromEntries(orders.map(order => [order.id, order.descricao || order.id]));
    const total = items.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);

    container.innerHTML = `
      <div class="header"><div><h1>Ganhos & Receitas</h1><p class="subtitle">Total registrado: <strong>${formatBRL(total)}</strong> | ${items.length} lançamentos</p></div>
      <button class="btn btn-primary" onclick="GainsModule.openForm()"><i class="fas fa-plus"></i> Novo Ganho</button></div>
      <div class="table-wrap"><table><thead><tr>
        ${header('data', 'Data')}${header('descricao', 'Descrição')}${header('categoria', 'Categoria')}${header('valor', 'Valor')}${header('conta_id', 'Conta')}${header('ordem_id', 'Ordem de Serviço')}<th>Ações</th>
      </tr></thead><tbody>
      ${sort(items).map(item => `<tr>
        <td>${item.data ? new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
        <td><strong>${escapeHtml(item.descricao)}</strong></td><td><span class="badge badge-success">${escapeHtml(item.categoria || 'Geral')}</span></td>
        <td style="font-weight:700;color:var(--success);">${formatBRL(item.valor)}</td>
        <td>${escapeHtml(accountMap[item.conta_id] || '—')}</td><td>${escapeHtml(orderMap[item.ordem_id] || '—')}</td>
        <td style="white-space:nowrap;text-align:right;"><button class="btn btn-sm btn-ghost" onclick="GainsModule.openForm('${item.id}')"><i class="fas fa-pencil-alt"></i></button>
        <button class="btn btn-sm btn-danger" onclick="GainsModule.deleteItem('${item.id}')"><i class="fas fa-trash-alt"></i></button></td>
      </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">Nenhum ganho registrado.</td></tr>'}
      </tbody></table></div>`;
  }

  async function openForm(id, ordemId = '') {
    const [items, accounts, orders] = await Promise.all([Storage.get(COLLECTION), Storage.get('accounts'), Storage.get('service_orders')]);
    const item = id ? items.find(value => value.id === id) : null;
    const primaryAccount = accounts.find(account => account.is_primary);
    const selectedAccountId = item ? (item.conta_id || '') : (primaryAccount?.id || '');
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = item ? 'Editar Ganho' : 'Novo Ganho / Receita';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group"><label>Descrição *</label><input id="f-ganho-descricao" value="${escapeHtml(item?.descricao || '')}" placeholder="Ex: Pagamento da ordem de serviço"></div>
      <div class="form-group"><label>Valor (R$) *</label><input id="f-ganho-valor" type="number" step="0.01" min="0" value="${item?.valor || ''}"></div>
      <div class="form-group"><label>Data</label><input id="f-ganho-data" type="date" value="${item?.data || new Date().toISOString().slice(0, 10)}"></div>
      <div class="form-group"><label>Categoria</label><input id="f-ganho-categoria" value="${escapeHtml(item?.categoria || 'Serviços')}" placeholder="Ex: Serviços, salário, vendas"></div>
      <div class="form-group"><label>Conta de entrada</label><select id="f-ganho-conta"><option value="">Nenhuma</option>${accounts.map(account => `<option value="${account.id}" ${selectedAccountId === account.id ? 'selected' : ''}>${escapeHtml(account.banco)} - ${escapeHtml(account.titular)}${account.is_primary ? ' (Principal)' : ''}</option>`).join('')}</select></div>
      <div class="form-group"><label>Ordem de serviço (opcional)</label><select id="f-ganho-ordem"><option value="">Nenhuma</option>${orders.map(order => `<option value="${order.id}" ${(item?.ordem_id || ordemId) === order.id ? 'selected' : ''}>${escapeHtml(order.descricao || order.id)}</option>`).join('')}</select></div>`;
    document.getElementById('modal-submit').textContent = item ? 'Salvar Alterações' : 'Registrar Ganho';
    document.getElementById('modal-submit').onclick = async () => {
      const payload = {
        descricao: document.getElementById('f-ganho-descricao').value.trim(),
        valor: Number(document.getElementById('f-ganho-valor').value) || 0,
        data: document.getElementById('f-ganho-data').value,
        categoria: document.getElementById('f-ganho-categoria').value.trim() || 'Geral',
        conta_id: document.getElementById('f-ganho-conta').value || null,
        ordem_id: document.getElementById('f-ganho-ordem').value || null
      };
      if (!payload.descricao || payload.valor <= 0) return Toast.show('Informe descrição e valor válido.', 'error');
      try {
        if (item) await Storage.update(COLLECTION, item.id, payload); else await Storage.add(COLLECTION, payload);
        overlay.classList.remove('open'); Toast.show('Ganho salvo com sucesso.', 'success'); window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (error) { Toast.show('Erro ao salvar ganho: ' + error.message, 'error'); }
    };
    overlay.classList.add('open');
  }

  async function deleteItem(id) {
    if (!confirm('Deseja excluir este ganho?')) return;
    await Storage.remove(COLLECTION, id); window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  async function sortBy(column) {
    sortState.direction = sortState.column === column && sortState.direction === 'asc' ? 'desc' : 'asc';
    sortState.column = column; await renderList(document.getElementById('main-content').firstElementChild);
  }
  return { render: renderList, renderList, openForm, deleteItem, sortBy };
})();

window.GainsModule = GainsModule;

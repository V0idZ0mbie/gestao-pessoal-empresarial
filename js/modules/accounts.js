// ============ Contas Bancárias ===========
// CRUD de contas: banco, titular, tipo, saldo.

const AccountsModule = (() => {
  const COLLECTION = 'accounts';
  
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
      <th class="sortable-header" data-column="${column}" onclick="AccountsModule.sortBy('${column}')">
        ${label}
        <i class="fas ${iconClass}" style="margin-left:6px;font-size:0.8em;"></i>
      </th>
    `;
  }

  function sortItems(items, column) {
    if (!column) return items;
    
    return [...items].sort((a, b) => {
      let valA = column === 'saldo_atual' ? balances[a.id] : a[column];
      let valB = column === 'saldo_atual' ? balances[b.id] : b[column];
      
      if (column === 'saldo' || column === 'saldo_atual') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
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
    const [gains, expenses] = await Promise.all([Storage.get('gains'), Storage.get('expenses')]);
    const balances = Object.fromEntries(items.map(account => {
      const incoming = gains.filter(item => item.conta_id === account.id).reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
      const outgoing = expenses.filter(item => item.conta_id === account.id).reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
      return [account.id, (Number(account.saldo) || 0) + incoming - outgoing];
    }));
    const totalSaldo = Object.values(balances).reduce((acc, value) => acc + value, 0);

    // Aplica ordenação atual
    const sortedItems = sortItems(items, sortState.column);

    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Contas Bancárias</h1>
          <p class="subtitle">Saldo consolidado: <strong>${formatBRL(totalSaldo)}</strong> | ${items.length} contas</p>
        </div>
        <button class="btn btn-primary" onclick="AccountsModule.openForm()">
          <i class="fas fa-plus"></i> Nova Conta
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${getSortableHeader('banco', 'Instituição / Banco')}
              ${getSortableHeader('titular', 'Titular')}
              ${getSortableHeader('tipo', 'Modalidade')}
              ${getSortableHeader('saldo_atual', 'Saldo Atual')}
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${sortedItems.map(a => `
              <tr>
                <td style="font-weight:700;">
                  <i class="fas fa-university" style="color:var(--primary);margin-right:8px;"></i>
                  ${escapeHtml(a.banco)}
                </td>
                <td>${escapeHtml(a.titular)}</td>
                <td><span class="badge badge-default">${escapeHtml(a.tipo || 'Corrente')}</span></td>
                <td style="font-weight:700;color:${(parseFloat(a.saldo) || 0) >= 0 ? 'var(--success)' : 'var(--danger)'};">
                  ${formatBRL(balances[a.id])}
                </td>
                <td style="white-space:nowrap;text-align:right;">
                  <button class="btn btn-sm btn-ghost" onclick="AccountsModule.openForm('${a.id}')" title="Editar">
                    <i class="fas fa-pencil-alt"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="AccountsModule.deleteItem('${a.id}')" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:32px;">Nenhuma conta cadastrada ainda. Clique em "Nova Conta" para começar.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  async function openForm(id) {
    const items = await Storage.get(COLLECTION);
    const item = id ? items.find(a => a.id === id) : null;
    const overlay = document.getElementById('modal-overlay');

    document.getElementById('modal-title').textContent = item ? 'Editar Conta Bancária' : 'Nova Conta Bancária';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Nome da Instituição Financeira / Banco *</label>
        <input id="f-banco" type="text" placeholder="Ex: Nubank, Itaú, Santander, Caixa" value="${escapeHtml(item?.banco || '')}" />
      </div>
      <div class="form-group">
        <label>Identificação / Titular *</label>
        <input id="f-titular" type="text" placeholder="Ex: Conta Pessoal, Reserva PJ, João Silva" value="${escapeHtml(item?.titular || '')}" />
      </div>
      <div class="form-group">
        <label>Modalidade da Conta</label>
        <select id="f-tipo">
          <option value="Conta Corrente" ${item?.tipo === 'Conta Corrente' ? 'selected' : ''}>Conta Corrente</option>
          <option value="Poupança" ${item?.tipo === 'Poupança' ? 'selected' : ''}>Poupança</option>
          <option value="Cartão de Crédito" ${item?.tipo === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito</option>
          <option value="Investimento / Carteira" ${item?.tipo === 'Investimento / Carteira' ? 'selected' : ''}>Investimento / Carteira</option>
        </select>
      </div>
      <div class="form-group">
        <label>Saldo Inicial (R$) *</label>
        <input id="f-saldo" type="number" step="0.01" placeholder="0,00" value="${item ? item.saldo : ''}" />
      </div>
    `;
    
    document.getElementById('modal-submit').textContent = item ? 'Salvar Alterações' : 'Cadastrar Conta';

    document.getElementById('modal-submit').onclick = async () => {
      const banco = document.getElementById('f-banco').value.trim();
      const titular = document.getElementById('f-titular').value.trim();
      const tipo = document.getElementById('f-tipo').value;
      const saldo = parseFloat(document.getElementById('f-saldo').value) || 0;

      if (!banco || !titular) {
        Toast.show('Preencha os campos obrigatórios (Banco e Titular).', 'error');
        return;
      }

      try {
        const payload = { banco, titular, tipo, saldo };
        if (item) {
          await Storage.update(COLLECTION, item.id, payload);
          Toast.show('Conta atualizada com sucesso!', 'success');
        } else {
          await Storage.add(COLLECTION, payload);
          Toast.show('Conta cadastrada com sucesso!', 'success');
        }
        closeModal();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        Toast.show('Erro ao salvar conta: ' + err.message, 'error');
      }
    };

    overlay.classList.add('open');
  }

  async function deleteItem(id) {
    const item = await Storage.find(COLLECTION, a => a.id === id);
    if (!item) return;
    if (!confirm(`Deseja realmente excluir a conta "${item.banco} - ${item.titular}"?`)) return;

    try {
      await Storage.remove(COLLECTION, id);
      Toast.show('Conta removida com sucesso.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      Toast.show('Erro ao excluir conta: ' + err.message, 'error');
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  async function sortBy(column) {
    sortState.direction = sortState.column === column && sortState.direction === 'asc' ? 'desc' : 'asc';
    sortState.column = column;
    await renderList(document.getElementById('main-content').firstElementChild || document.querySelector('.main'));
  }

  return { render: renderList, renderList, openForm, deleteItem, closeModal, sortBy };
})();

window.AccountsModule = AccountsModule;

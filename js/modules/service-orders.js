// ============ Ordens de Serviço ============
// CRUD de OS: cliente, descrição, valor, status, pagamento, data e observações.

const ServiceOrdersModule = (() => {
  const COLLECTION = 'service_orders';
  
  // Estado de ordenação global
  let sortState = {
    column: null, // 'cliente', 'valor', 'data', 'status'
    direction: 'asc' // 'asc' or 'desc'
  };
  const selectedOrderIds = new Set();
  let expenseRowSequence = 0;
  let expenseFormAccounts = [];
  let primaryAccountId = '';

  function renderExpenseRow(expense = {}) {
    const rowId = `os-expense-${expenseRowSequence++}`;
    return `
      <div class="os-expense-row" data-os-expense-row data-expense-id="${escapeHtml(expense.id || '')}" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(120px,1fr) minmax(150px,1fr) auto;gap:8px;align-items:end;margin-bottom:10px;">
        <div class="form-group" style="margin:0;">
          <label for="${rowId}-description">Descrição do gasto *</label>
          <input id="${rowId}-description" data-expense-description type="text" value="${escapeHtml(expense.descricao || '')}" placeholder="Ex: Peças, material, transporte">
        </div>
        <div class="form-group" style="margin:0;">
          <label for="${rowId}-value">Valor (R$) *</label>
          <input id="${rowId}-value" data-expense-value type="number" step="0.01" min="0" value="${expense.valor ?? ''}" placeholder="0,00">
        </div>
        <div class="form-group" style="margin:0;">
          <label for="${rowId}-account">Conta de saída</label>
          <select id="${rowId}-account" data-expense-account>
            <option value="">Nenhuma</option>
            ${expenseFormAccounts.map(account => `<option value="${account.id}" ${(expense.conta_id || primaryAccountId) === account.id ? 'selected' : ''}>${escapeHtml(account.banco)} - ${escapeHtml(account.titular)}${account.is_primary ? ' (Principal)' : ''}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="btn btn-sm btn-danger" aria-label="Remover gasto" onclick="ServiceOrdersModule.removeExpenseRow(this)">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>`;
  }

  function addExpenseRow(expense = {}) {
    const container = document.getElementById('f-os-expenses');
    if (!container) return;
    container.insertAdjacentHTML('beforeend', renderExpenseRow({
      ...expense,
      conta_id: expense.conta_id || primaryAccountId
    }));
  }

  function removeExpenseRow(button) {
    const row = button.closest('[data-os-expense-row]');
    if (row) row.remove();
  }

  function getSortIcon() {
    const icons = {
      asc: 'fa-sort-asc',
      desc: 'fa-sort-desc',
      none: 'fa-sort'
    };
    return icons[sortState.direction];
  }

  function getSortableHeader(column, label) {
    const isActive = sortState.column === column;
    const iconClass = isActive ? getSortIcon() : 'fa-sort';
    
    return `
      <th class="sortable-header" data-column="${column}" onclick="ServiceOrdersModule.sortBy('${column}')">
        ${label}
        <i class="fas ${iconClass}" style="margin-left:6px;font-size:0.8em;"></i>
      </th>
    `;
  }

  function sortItems(items, column) {
    if (!column) {
      const statusOrder = { aberta: 1, em_andamento: 2, concluida: 3 };
      return [...items].sort((a, b) => {
        const statusDifference = (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
        if (statusDifference !== 0) return statusDifference;

        const dateA = a.data_abertura ? new Date(a.data_abertura + 'T00:00:00').getTime() : 0;
        const dateB = b.data_abertura ? new Date(b.data_abertura + 'T00:00:00').getTime() : 0;
        return dateA - dateB;
      });
    }
    
    return [...items].sort((a, b) => {
      let valA = a[column] || (column === 'cliente' ? '' : column === 'status' ? '' : 0);
      let valB = b[column] || (column === 'cliente' ? '' : column === 'status' ? '' : 0);
      
      if (column === 'valor') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else if (column === 'data') {
        valA = valA ? new Date(valA + 'T00:00:00').getTime() : 0;
        valB = valB ? new Date(valB + 'T00:00:00').getTime() : 0;
      } else if (column === 'cliente') {
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
      } else if (column === 'status') {
        const order = { concluida: 1, em_andamento: 2, aberta: 3, '': 0 };
        valA = order[valA] || 0;
        valB = order[valB] || 0;
      }
      
      if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function normalizeSearchText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  function filterByClientName(query) {
    const normalizedQuery = normalizeSearchText(query);
    const rows = Array.from(document.querySelectorAll('[data-service-order-row]'));
    let visibleRows = 0;
    rows.forEach(row => {
      const matches = normalizeSearchText(row.dataset.clientName).includes(normalizedQuery);
      row.style.display = matches ? '' : 'none';
      if (matches) visibleRows++;
    });

    const emptyResult = document.getElementById('service-orders-no-results');
    if (emptyResult) emptyResult.style.display = rows.length && !visibleRows ? '' : 'none';

    const selectAll = document.getElementById('select-all-orders');
    if (selectAll) {
      const visibleInputs = rows
        .filter(row => row.style.display !== 'none')
        .map(row => row.querySelector('input[type="checkbox"]'));
      selectAll.checked = visibleInputs.length > 0 && visibleInputs.every(input => selectedOrderIds.has(input.dataset.orderId));
    }
  }

  async function renderList(container) {
    const [items, clients, accounts, expenses] = await Promise.all([
      Storage.get(COLLECTION), Storage.get('clients'), Storage.get('accounts'), Storage.get('expenses')
    ]);
    const clientMap = {};
    clients.forEach(c => { clientMap[c.id] = c.nome; });
    const accountMap = Object.fromEntries(accounts.map(account => [account.id, `${account.banco} - ${account.titular}`]));
    const expensesByOrder = expenses.reduce((result, expense) => {
      if (!expense.ordem_id) return result;
      (result[expense.ordem_id] ||= []).push(expense);
      return result;
    }, {});

    const totalValor = items.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
    const availableIds = new Set(items.map(item => item.id));
    selectedOrderIds.forEach(id => {
      if (!availableIds.has(id)) selectedOrderIds.delete(id);
    });

    // Aplica ordenação atual
    const sortedItems = sortItems(items, sortState.column);

    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Ordens de Serviço (OS)</h1>
          <p class="subtitle">Acompanhe projetos, orçamentos e serviços contratados | Total: <strong>${formatBRL(totalValor)}</strong></p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
          <button id="generate-quotes-btn" class="btn btn-ghost" onclick="ServiceOrdersModule.generateQuotePdf()" ${selectedOrderIds.size ? '' : 'disabled'}>
            <i class="fas fa-file-pdf"></i> Gerar orçamento${selectedOrderIds.size ? ` (${selectedOrderIds.size})` : ''}
          </button>
          <button class="btn btn-primary" onclick="ServiceOrdersModule.openForm()">
            <i class="fas fa-plus"></i> Nova Ordem de Serviço
          </button>
        </div>
      </div>

      <div class="form-group" style="max-width:420px;margin-bottom:16px;">
        <label for="service-order-client-search">Filtrar por cliente</label>
        <div style="position:relative;">
          <i class="fas fa-search" aria-hidden="true" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);"></i>
          <input id="service-order-client-search" type="search" placeholder="Digite o nome do cliente" oninput="ServiceOrdersModule.filterByClientName(this.value)" style="padding-left:36px;">
        </div>
      </div>

      <div class="bulk-actions" aria-label="Alterações em massa">
        <strong><i class="fas fa-check-square"></i> ${selectedOrderIds.size || 'Nenhuma'} selecionada${selectedOrderIds.size === 1 ? '' : 's'}</strong>
        <label>
          Status da OS
          <select id="bulk-status">
            <option value="">— Não alterar —</option>
            <option value="aberta">Aberta</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
          </select>
        </label>
        <button class="btn btn-sm btn-primary" onclick="ServiceOrdersModule.applyBulkStatus()" ${selectedOrderIds.size ? '' : 'disabled'}>
          Aplicar status
        </button>
        <label>
          Pagamento
          <select id="bulk-payment">
            <option value="">— Não alterar —</option>
            <option value="paid">Pago</option>
            <option value="pending">Aguardando pagamento</option>
          </select>
        </label>
        <button class="btn btn-sm btn-primary" onclick="ServiceOrdersModule.applyBulkPayment()" ${selectedOrderIds.size ? '' : 'disabled'}>
          Aplicar pagamento
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:42px;text-align:center;">
                <input id="select-all-orders" type="checkbox" aria-label="Selecionar todas as ordens visíveis" onchange="ServiceOrdersModule.toggleAllSelection(this.checked)" ${items.length && selectedOrderIds.size === items.length ? 'checked' : ''}>
              </th>
              ${getSortableHeader('cliente', 'Cliente Vinculado')}
              ${getSortableHeader('descricao', 'Descrição do Serviço')}
              ${getSortableHeader('valor', 'Preço')}
              <th>Gastos vinculados</th>
              ${getSortableHeader('data', 'Data de Abertura')}
              ${getSortableHeader('status', 'Status Atual')}
              <th>Pagamento</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${sortedItems.map(so => {
              const clientName = clientMap[so.clienteId] || '—';
              const badgeClass = so.status === 'concluida' ? 'success' : (so.status === 'em_andamento' ? 'warning' : 'info');
              const statusName = so.status === 'concluida' ? 'Concluída' : (so.status === 'em_andamento' ? 'Em Andamento' : 'Aberta');
              const paymentLabel = so.pago ? 'Pago' : 'Aguardando pagamento';
              const paymentClass = so.pago ? 'success' : 'warning';
              const linkedExpenses = expensesByOrder[so.id] || [];
              const linkedExpenseTotal = linkedExpenses.reduce((sum, expense) => sum + (Number(expense.valor) || 0), 0);
              return `
                <tr data-service-order-row data-client-name="${escapeHtml(clientName)}">
                  <td style="text-align:center;">
                    <input type="checkbox" data-order-id="${escapeHtml(so.id)}" aria-label="Selecionar orçamento de ${escapeHtml(clientName)}" onchange="ServiceOrdersModule.toggleSelection('${so.id}', this.checked)" ${selectedOrderIds.has(so.id) ? 'checked' : ''}>
                  </td>
                  <td style="font-weight:700;">
                    <i class="fas fa-briefcase" style="color:var(--primary);margin-right:8px;"></i>
                    ${escapeHtml(clientName)}
                  </td>
                  <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(so.descricao)}">
                    ${escapeHtml(so.descricao)}
                  </td>
                  <td style="font-weight:700;color:var(--success);">${formatBRL(so.valor)}</td>
                  <td title="${linkedExpenses.length} lançamento(s)">${formatBRL(linkedExpenseTotal)}${linkedExpenses.length ? `<small style="display:block;color:var(--text-muted);">${linkedExpenses.length} lançamento(s)</small>` : ''}</td>
                  <td>${so.data_abertura ? new Date(so.data_abertura + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td><span class="badge badge-${badgeClass}">${statusName}</span></td>
                  <td>
                    <span class="badge badge-${paymentClass}">${paymentLabel}</span>
                    ${so.pago ? `<small style="display:block;color:var(--text-muted);">${escapeHtml(so.forma_pagamento || 'Forma não informada')} · ${escapeHtml(accountMap[so.conta_pagamento_id] || 'Conta não informada')}</small>` : ''}
                  </td>
                  <td style="white-space:nowrap;text-align:right;">
                    <button class="btn btn-sm btn-ghost" onclick="GainsModule.openForm(null, '${so.id}')" title="Registrar ganho desta OS">
                      <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost" onclick="ExpensesModule.openForm(null, '${so.id}')" title="Registrar gasto desta OS">
                      <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost" onclick="ServiceOrdersModule.openForm('${so.id}')" title="Editar">
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="ServiceOrdersModule.deleteItem('${so.id}')" title="Excluir">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="9" style="color:var(--text-muted);text-align:center;padding:32px;">Nenhuma Ordem de Serviço cadastrada. Clique em "Nova Ordem de Serviço" para emitir uma.</td></tr>'}
            <tr id="service-orders-no-results" style="display:none;"><td colspan="9" style="color:var(--text-muted);text-align:center;padding:32px;">Nenhuma ordem encontrada para este cliente.</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function toggleSelection(id, checked) {
    if (checked) selectedOrderIds.add(id);
    else selectedOrderIds.delete(id);

    const button = document.getElementById('generate-quotes-btn');
    if (button) {
      button.disabled = selectedOrderIds.size === 0;
      button.innerHTML = `<i class="fas fa-file-pdf"></i> Gerar orçamento${selectedOrderIds.size ? ` (${selectedOrderIds.size})` : ''}`;
    }
    updateBulkActionsState();
  }

  function toggleAllSelection(checked) {
    document.querySelectorAll('[data-service-order-row]').forEach(row => {
      if (row.style.display === 'none') return;
      const input = row.querySelector('input[type="checkbox"]');
      const id = input.dataset.orderId;
      input.checked = checked;
      if (checked) selectedOrderIds.add(id);
      else selectedOrderIds.delete(id);
    });
    const button = document.getElementById('generate-quotes-btn');
    if (button) {
      button.disabled = selectedOrderIds.size === 0;
      button.innerHTML = `<i class="fas fa-file-pdf"></i> Gerar orçamento${selectedOrderIds.size ? ` (${selectedOrderIds.size})` : ''}`;
    }
    updateBulkActionsState();
  }

  function updateBulkActionsState() {
    const hasSelection = selectedOrderIds.size > 0;
    document.querySelectorAll('.bulk-actions button').forEach(button => {
      button.disabled = !hasSelection;
    });
    const count = document.querySelector('.bulk-actions strong');
    if (count) {
      count.innerHTML = `<i class="fas fa-check-square"></i> ${selectedOrderIds.size || 'Nenhuma'} selecionada${selectedOrderIds.size === 1 ? '' : 's'}`;
    }
  }

  async function applyBulkStatus() {
    const status = document.getElementById('bulk-status')?.value;
    if (!status || !selectedOrderIds.size) {
      Toast.show('Selecione as ordens e o novo status da OS.', 'error');
      return;
    }

    try {
      const items = await Storage.get(COLLECTION);
      const selectedItems = items.filter(item => selectedOrderIds.has(item.id));
      await Promise.all(selectedItems.map(item => Storage.update(COLLECTION, item.id, { status })));
      Toast.show(`Status atualizado em ${selectedItems.length} ordem(ns) de serviço.`, 'success');
      await renderList(document.getElementById('main-content').firstElementChild || document.querySelector('.main'));
    } catch (err) {
      Toast.show('Erro ao atualizar o status em massa: ' + err.message, 'error');
    }
  }

  async function syncServiceOrderFinancials(order, orderExpenses = null, existingExpenseIds = []) {
    const gains = await Storage.get('gains');
    const orderGains = gains.filter(gain => gain.ordem_id === order.id && (
      gain.origem === 'service_order_revenue' || gain.origem === 'service_order_payment'
    ));
    const revenue = orderGains[0];
    const accounts = await Storage.get('accounts');
    const primaryAccount = accounts.find(account => account.is_primary);
    const revenuePayload = {
      descricao: `Pagamento da OS - ${order.descricao}`,
      valor: order.valor,
      data: order.data_pagamento || new Date().toISOString().slice(0, 10),
      categoria: 'Receita de OS',
      conta_id: order.conta_pagamento_id || primaryAccount?.id || null,
      ordem_id: order.id,
      origem: 'service_order_payment'
    };
    if (order.pago && Number(order.valor) > 0) {
      if (revenue) await Storage.update('gains', revenue.id, revenuePayload);
      else await Storage.add('gains', revenuePayload);
      await Promise.all(orderGains.slice(1).map(gain => Storage.remove('gains', gain.id)));
    } else {
      await Promise.all(orderGains.map(gain => Storage.remove('gains', gain.id)));
    }

    if (orderExpenses) {
      const expenses = await Storage.get('expenses');
      const linkedExpenses = expenses.filter(expense => expense.ordem_id === order.id);
      const desiredIds = new Set(orderExpenses.map(expense => expense.id).filter(Boolean));
      const expenseIdsToRemove = new Set(existingExpenseIds);
      for (const expense of orderExpenses) {
        const expensePayload = {
          descricao: expense.descricao,
          valor: expense.valor,
          data: expense.data || order.data_abertura || new Date().toISOString().slice(0, 10),
          categoria: expense.categoria === 'Gasto de OS' || !expense.categoria
            ? 'Gastos de serviço'
            : expense.categoria,
          conta_id: expense.conta_id || null,
          ordem_id: order.id,
          origem: 'service_order_expense'
        };
        if (expense.id) await Storage.update('expenses', expense.id, expensePayload);
        else await Storage.add('expenses', expensePayload);
      }
      await Promise.all(linkedExpenses
        .filter(expense => expenseIdsToRemove.has(expense.id) && !desiredIds.has(expense.id))
        .map(expense => Storage.remove('expenses', expense.id)));
    }
  }

  async function applyBulkPayment() {
    const paymentStatus = document.getElementById('bulk-payment')?.value;
    if (!paymentStatus || !selectedOrderIds.size) {
      Toast.show('Selecione as ordens e o novo status de pagamento.', 'error');
      return;
    }

    try {
      const items = await Storage.get(COLLECTION);
      const accounts = await Storage.get('accounts');
      const primaryAccount = accounts.find(account => account.is_primary);
      const selectedItems = items.filter(item => selectedOrderIds.has(item.id));
      const pago = paymentStatus === 'paid';
      for (const item of selectedItems) {
        const paymentPatch = {
          pago,
          conta_pagamento_id: pago ? (item.conta_pagamento_id || primaryAccount?.id || null) : null,
          data_pagamento: pago ? (item.data_pagamento || new Date().toISOString().slice(0, 10)) : null
        };
        const updatedOrder = await Storage.update(COLLECTION, item.id, paymentPatch);
        await syncServiceOrderFinancials(updatedOrder || { ...item, ...paymentPatch });
      }
      const warning = pago && selectedItems.some(item => !item.forma_pagamento)
        ? ' A forma de pagamento deve ser preenchida na edição individual.'
        : pago && !primaryAccount && selectedItems.some(item => !item.conta_pagamento_id)
          ? ' Cadastre uma conta principal ou escolha uma conta na edição individual.'
          : '';
      Toast.show(`Pagamento atualizado em ${selectedItems.length} ordem(ns) de serviço.${warning}`, 'success');
      await renderList(document.getElementById('main-content').firstElementChild || document.querySelector('.main'));
    } catch (err) {
      Toast.show('Erro ao atualizar o pagamento em massa: ' + err.message, 'error');
    }
  }

  function switchFormTab(tabName) {
    document.querySelectorAll('.os-form-tab').forEach(tab => {
      const isActive = tab.dataset.tab === tabName;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('.os-form-tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.tabPanel === tabName);
    });
  }

  async function generateQuotePdf() {
    const [items, clients] = await Promise.all([Storage.get(COLLECTION), Storage.get('clients')]);
    const selectedItems = items.filter(item => selectedOrderIds.has(item.id));
    if (!selectedItems.length) {
      Toast.show('Selecione pelo menos uma ordem de serviço para gerar o orçamento.', 'error');
      return;
    }

    const clientMap = Object.fromEntries(clients.map(client => [client.id, client]));
    const generatedAt = new Date().toLocaleDateString('pt-BR');
    const quoteRows = selectedItems.map(item => {
      const client = clientMap[item.clienteId] || {};
      return `
        <section class="quote">
          <div class="quote-header">
            <div>
              <h2>Orçamento de Serviço</h2>
              <p>Emitido em ${generatedAt}</p>
            </div>
            <strong>OS #${escapeHtml(item.id.slice(0, 8).toUpperCase())}</strong>
          </div>
          <div class="client">
            <strong>Cliente</strong>
            <span>${escapeHtml(client.nome || 'Cliente não informado')}</span>
            ${client.empresa ? `<span>${escapeHtml(client.empresa)}</span>` : ''}
            ${client.email ? `<span>${escapeHtml(client.email)}</span>` : ''}
          </div>
          <div class="service">
            <strong>Serviço orçado</strong>
            <p>${escapeHtml(item.descricao)}</p>
          </div>
          <div class="total">
            <span>Valor total do orçamento</span>
            <strong>${formatBRL(item.valor)}</strong>
          </div>
          ${item.obs ? `<p class="notes"><strong>Observações:</strong> ${escapeHtml(item.obs)}</p>` : ''}
          <p class="validity">Este documento apresenta o valor orçado para o serviço descrito. A execução está sujeita à aprovação do cliente.</p>
        </section>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Toast.show('Não foi possível abrir o documento. Permita pop-ups para gerar o PDF.', 'error');
      return;
    }
    printWindow.document.write(`<!doctype html>
      <html lang="pt-BR"><head><meta charset="UTF-8"><title>Orçamento de Serviço</title>
      <style>
        *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:32px;background:#fff}
        .quote{max-width:760px;margin:0 auto 36px;padding:32px;border:1px solid #dbe2ea;border-radius:10px;page-break-after:always}
        .quote:last-child{page-break-after:auto}.quote-header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #2563eb;padding-bottom:18px}
        h2{margin:0 0 6px;font-size:24px;color:#1d4ed8}.quote-header p,.validity{margin:0;color:#64748b;font-size:12px}
        .client,.service{display:flex;flex-direction:column;gap:5px;margin-top:24px}.client strong,.service strong{color:#64748b;text-transform:uppercase;font-size:11px;letter-spacing:.08em}
        .service p{margin:0;line-height:1.6}.total{display:flex;justify-content:space-between;align-items:center;margin-top:30px;padding:18px;background:#eff6ff;border-radius:8px}
        .total strong{font-size:24px;color:#1d4ed8}.notes{margin-top:24px;line-height:1.5}.validity{margin-top:28px}
        @media print{body{padding:0}.quote{border:0;margin:0;max-width:none;padding:20px}}
      </style></head><body>${quoteRows}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function openForm(id) {
    const items = await Storage.get(COLLECTION);
    const so = id ? items.find(s => s.id === id) : null;
    const [clients, accounts, allExpenses] = await Promise.all([
      Storage.get('clients'), Storage.get('accounts'), Storage.get('expenses')
    ]);
    expenseFormAccounts = accounts;
    primaryAccountId = accounts.find(account => account.is_primary)?.id || '';
    const paymentAccountId = so?.conta_pagamento_id || primaryAccountId;
    const sortedClients = [...clients].sort((a, b) => (
      (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
    ));
    const linkedExpenses = so ? allExpenses.filter(expense => expense.ordem_id === so.id) : [];
    const initialExpenses = linkedExpenses;
    const overlay = document.getElementById('modal-overlay');

    const defaultDate = so?.data_abertura || new Date().toISOString().slice(0, 10);

    document.getElementById('modal-title').textContent = so ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço';
    document.getElementById('modal-body').innerHTML = `
      <div class="os-form-tabs" role="tablist" aria-label="Dados da ordem de serviço">
        <button type="button" class="os-form-tab active" data-tab="order-data" role="tab" aria-selected="true" onclick="ServiceOrdersModule.switchFormTab('order-data')">
          Dados da OS
        </button>
        <button type="button" class="os-form-tab" data-tab="internal-control" role="tab" aria-selected="false" onclick="ServiceOrdersModule.switchFormTab('internal-control')">
          Controle interno
        </button>
      </div>
      <div class="os-form-tab-panel active" data-tab-panel="order-data" role="tabpanel">
        <div class="form-group">
          <label>Cliente Beneficiário *</label>
          <select id="f-cliente">
            <option value="">— Selecione o Cliente —</option>
            ${sortedClients.map(c => `<option value="${c.id}" ${so?.clienteId === c.id ? 'selected' : ''}>${escapeHtml(c.nome)} ${c.empresa ? '(' + escapeHtml(c.empresa) + ')' : ''}</option>`).join('')}
          </select>
          ${clients.length === 0 ? '<small style="color:var(--warning);display:block;margin-top:4px;">Nenhum cliente cadastrado. Cadastre clientes no menu "Clientes" primeiro.</small>' : ''}
        </div>
        <div class="form-group">
          <label>Escopo do Serviço / Descrição *</label>
          <textarea id="f-descricao" rows="2" placeholder="Descreva os serviços prestados ou tarefas a serem entregues">${escapeHtml(so?.descricao || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Valor Cobrado (R$) *</label>
          <input id="f-valor" type="number" step="0.01" min="0" placeholder="0,00" value="${so ? so.valor : ''}" />
        </div>
        <div class="form-group">
          <label>Data de Abertura / Início</label>
          <input id="f-data" type="date" value="${defaultDate}" />
        </div>
        <div class="form-group">
          <label>Situação / Status</label>
          <select id="f-status">
            <option value="aberta" ${so?.status === 'aberta' ? 'selected' : ''}>Aberta (Pendente / Aguardando)</option>
            <option value="em_andamento" ${so?.status === 'em_andamento' ? 'selected' : ''}>Em Andamento (Em Execução)</option>
            <option value="concluida" ${so?.status === 'concluida' ? 'selected' : ''}>Concluída (Finalizada)</option>
          </select>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input id="f-pago" type="checkbox" ${so?.pago ? 'checked' : ''} onchange="ServiceOrdersModule.togglePaymentFields()" />
            Serviço pago
          </label>
        </div>
        <div id="payment-fields" style="${so?.pago ? '' : 'display:none;'}">
          <div class="form-group">
            <label>Forma de pagamento *</label>
            <select id="f-forma-pagamento">
              <option value="">— Selecione —</option>
              ${['Pix', 'Transferência', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Boleto'].map(method => `<option value="${method}" ${so?.forma_pagamento === method ? 'selected' : ''}>${method}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Conta que recebeu o pagamento *</label>
            <select id="f-conta-pagamento">
              <option value="">— Selecione a conta —</option>
              ${accounts.map(account => `<option value="${account.id}" ${paymentAccountId === account.id ? 'selected' : ''}>${escapeHtml(account.banco)} - ${escapeHtml(account.titular)}${account.is_primary ? ' (Principal)' : ''}</option>`).join('')}
            </select>
            ${accounts.length === 0 ? '<small style="color:var(--warning);display:block;margin-top:4px;">Cadastre uma conta antes de registrar um pagamento.</small>' : ''}
          </div>
        </div>
        <div class="form-group">
          <label>Observações Adicionais</label>
          <textarea id="f-obs" rows="2" placeholder="Termos de entrega, prazos, formas de pagamento">${escapeHtml(so?.obs || '')}</textarea>
        </div>
      </div>
      <div class="os-form-tab-panel" data-tab-panel="internal-control" role="tabpanel">
        <div class="form-group">
          <label>Gastos vinculados à OS</label>
          <small class="form-help">Cada gasto será registrado separadamente e vinculado a esta ordem.</small>
        </div>
        <div id="f-os-expenses">${initialExpenses.map(expense => renderExpenseRow(expense)).join('')}</div>
        <button type="button" class="btn btn-sm btn-ghost" onclick="ServiceOrdersModule.addExpenseRow()">
          <i class="fas fa-plus"></i> Adicionar gasto
        </button>
      </div>
    `;

    document.getElementById('modal-submit').textContent = so ? 'Salvar Alterações' : 'Criar Ordem de Serviço';

    document.getElementById('modal-submit').onclick = async () => {
      const clienteId = document.getElementById('f-cliente').value;
      const descricao = document.getElementById('f-descricao').value.trim();
      const valor = parseFloat(document.getElementById('f-valor').value) || 0;
      const expensesContainer = document.getElementById('f-os-expenses');
      const expensesToSave = Array.from(expensesContainer.querySelectorAll('[data-os-expense-row]'))
        .map(row => {
          const id = row.dataset.expenseId || '';
          const existingExpense = linkedExpenses.find(expense => expense.id === id);
          return {
            id,
            descricao: row.querySelector('[data-expense-description]').value.trim(),
            rawValue: row.querySelector('[data-expense-value]').value,
            categoria: existingExpense?.categoria,
            conta_id: row.querySelector('[data-expense-account]').value || null,
            data: existingExpense?.data
          };
        })
        .filter(expense => expense.descricao || expense.rawValue !== '')
        .map(expense => ({ ...expense, valor: Number(expense.rawValue) }));
      const data = document.getElementById('f-data').value || new Date().toISOString().slice(0, 10);
      const status = document.getElementById('f-status').value;
      const obs = document.getElementById('f-obs').value.trim();
      const pago = document.getElementById('f-pago').checked;
      const formaPagamento = pago ? document.getElementById('f-forma-pagamento').value : null;
      const contaPagamentoId = pago ? document.getElementById('f-conta-pagamento').value : null;

      if (!clienteId) {
        Toast.show('Selecione um cliente para vincular à ordem.', 'error');
        return;
      }
      if (!descricao || valor <= 0) {
        Toast.show('Preencha a descrição do serviço e informe um valor válido.', 'error');
        return;
      }
      if (expensesToSave.some(expense => (
        !expense.descricao || !Number.isFinite(expense.valor) || expense.valor < 0
      ))) {
        Toast.show('Informe a descrição e um valor válido para cada gasto da OS.', 'error');
        return;
      }
      if (pago && (!formaPagamento || !contaPagamentoId)) {
        Toast.show('Informe a forma de pagamento e a conta que recebeu o valor.', 'error');
        return;
      }

      const totalExpenses = expensesToSave.reduce((sum, expense) => sum + expense.valor, 0);
      const payload = {
        clienteId, descricao, valor, custo_reparo: totalExpenses, data_abertura: data, status, obs, pago,
        forma_pagamento: formaPagamento,
        conta_pagamento_id: pago ? (contaPagamentoId || primaryAccountId || null) : null,
        data_pagamento: pago ? (so?.data_pagamento || new Date().toISOString().slice(0, 10)) : null
      };

      try {
        const savedOrder = so
          ? await Storage.update(COLLECTION, so.id, payload)
          : await Storage.add(COLLECTION, payload);
        const financialOrder = savedOrder || (so ? { ...so, ...payload } : null);
        if (!financialOrder) throw new Error('Não foi possível recuperar a ordem de serviço salva.');
        await syncServiceOrderFinancials(financialOrder, expensesToSave, linkedExpenses.map(expense => expense.id));

        if (so) {
          Toast.show('Ordem de serviço atualizada com sucesso!', 'success');
        } else {
          Toast.show('Ordem de serviço aberta com sucesso!', 'success');
        }
        closeModal();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        Toast.show('Erro ao salvar ordem de serviço: ' + err.message, 'error');
      }
    };

    overlay.classList.add('open');
  }

  async function deleteItem(id) {
    const item = await Storage.find(COLLECTION, s => s.id === id);
    if (!item) return;
    if (!confirm(`Tem certeza que deseja excluir esta Ordem de Serviço?`)) return;

    try {
      await Storage.remove(COLLECTION, id);
      const gains = await Storage.get('gains');
      const expenses = await Storage.get('expenses');
      await Promise.all(gains
        .filter(gain => gain.ordem_id === id && (
          gain.origem === 'service_order_revenue' || gain.origem === 'service_order_payment'
        ))
        .map(gain => Storage.remove('gains', gain.id)));
      await Promise.all(expenses
        .filter(expense => expense.ordem_id === id)
        .map(expense => Storage.remove('expenses', expense.id)));
      Toast.show('Ordem de serviço excluída.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      Toast.show('Erro ao excluir: ' + err.message, 'error');
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  function togglePaymentFields() {
    const checkbox = document.getElementById('f-pago');
    const fields = document.getElementById('payment-fields');
    if (checkbox && fields) fields.style.display = checkbox.checked ? '' : 'none';
  }

  async function sortBy(column) {
    sortState.direction = sortState.column === column && sortState.direction === 'asc' ? 'desc' : 'asc';
    sortState.column = column;
    await renderList(document.getElementById('main-content').firstElementChild || document.querySelector('.main'));
  }

  return {
    render: renderList, renderList, openForm, deleteItem, closeModal, sortBy,
    togglePaymentFields, toggleSelection, toggleAllSelection, generateQuotePdf, switchFormTab,
    applyBulkStatus, applyBulkPayment, addExpenseRow, removeExpenseRow, filterByClientName
  };
})();

window.ServiceOrdersModule = ServiceOrdersModule;

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

/* ========== CSS for sortable headers ========== */
const _sortableCSS = `
.sortable-header {
  cursor: pointer;
  user-select: none;
}
.sortable-header:hover {
  background-color: rgba(59, 130, 246, 0.1);
  transition: background-color 0.15s;
}
`;
if (!document.getElementById('sortable-headers-css')) {
  const style = document.createElement('style');
  style.id = 'sortable-headers-css';
  style.textContent = _sortableCSS;
  document.head.appendChild(style);
}

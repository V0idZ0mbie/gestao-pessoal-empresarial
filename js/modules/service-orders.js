// ============ Ordens de Serviço ============
// CRUD de OS: cliente, descrição, valor, status, data de abertura, observações.

const ServiceOrdersModule = (() => {
  const COLLECTION = 'service_orders';
  
  // Estado de ordenação global
  let sortState = {
    column: null, // 'cliente', 'valor', 'data', 'status'
    direction: 'asc' // 'asc' or 'desc'
  };

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
    if (!column) return items;
    
    const newDirection = sortState.column === column && sortState.direction === 'asc' ? 'desc' : 'asc';
    sortState.column = column;
    sortState.direction = newDirection;
    
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

  async function renderList(container) {
    const items = await Storage.get(COLLECTION);
    const clients = await Storage.get('clients');
    const clientMap = {};
    clients.forEach(c => { clientMap[c.id] = c.nome; });

    const totalValor = items.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

    // Aplica ordenação atual
    const sortedItems = sortItems(items, sortState.column);

    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Ordens de Serviço (OS)</h1>
          <p class="subtitle">Acompanhe projetos, orçamentos e serviços contratados | Total: <strong>${formatBRL(totalValor)}</strong></p>
        </div>
        <button class="btn btn-primary" onclick="ServiceOrdersModule.openForm()">
          <i class="fas fa-plus"></i> Nova Ordem de Serviço
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${getSortableHeader('cliente', 'Cliente Vinculado')}
              ${getSortableHeader('descricao', 'Descrição do Serviço')}
              ${getSortableHeader('valor', 'Preço')}
              ${getSortableHeader('data', 'Data de Abertura')}
              ${getSortableHeader('status', 'Status Atual')}
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${sortedItems.map(so => {
              const clientName = clientMap[so.clienteId] || '—';
              const badgeClass = so.status === 'concluida' ? 'success' : (so.status === 'em_andamento' ? 'warning' : 'info');
              const statusName = so.status === 'concluida' ? 'Concluída' : (so.status === 'em_andamento' ? 'Em Andamento' : 'Aberta');
              return `
                <tr>
                  <td style="font-weight:700;">
                    <i class="fas fa-briefcase" style="color:var(--primary);margin-right:8px;"></i>
                    ${escapeHtml(clientName)}
                  </td>
                  <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(so.descricao)}">
                    ${escapeHtml(so.descricao)}
                  </td>
                  <td style="font-weight:700;color:var(--success);">${formatBRL(so.valor)}</td>
                  <td>${so.data_abertura ? new Date(so.data_abertura + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td><span class="badge badge-${badgeClass}">${statusName}</span></td>
                  <td style="white-space:nowrap;text-align:right;">
                    <button class="btn btn-sm btn-ghost" onclick="ServiceOrdersModule.openForm('${so.id}')" title="Editar">
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="ServiceOrdersModule.deleteItem('${so.id}')" title="Excluir">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="6" style="color:var(--text-muted);text-align:center;padding:32px;">Nenhuma Ordem de Serviço cadastrada. Clique em "Nova Ordem de Serviço" para emitir uma.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  async function openForm(id) {
    const items = await Storage.get(COLLECTION);
    const so = id ? items.find(s => s.id === id) : null;
    const clients = await Storage.get('clients');
    const overlay = document.getElementById('modal-overlay');

    const defaultDate = so?.data_abertura || new Date().toISOString().slice(0, 10);

    document.getElementById('modal-title').textContent = so ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Cliente Beneficiário *</label>
        <select id="f-cliente">
          <option value="">— Selecione o Cliente —</option>
          ${clients.map(c => `<option value="${c.id}" ${so?.clienteId === c.id ? 'selected' : ''}>${escapeHtml(c.nome)} ${c.empresa ? '(' + escapeHtml(c.empresa) + ')' : ''}</option>`).join('')}
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
        <label>Observações Adicionais</label>
        <textarea id="f-obs" rows="2" placeholder="Termos de entrega, prazos, formas de pagamento">${escapeHtml(so?.obs || '')}</textarea>
      </div>
    `;

    document.getElementById('modal-submit').textContent = so ? 'Salvar Alterações' : 'Criar Ordem de Serviço';

    document.getElementById('modal-submit').onclick = async () => {
      const clienteId = document.getElementById('f-cliente').value;
      const descricao = document.getElementById('f-descricao').value.trim();
      const valor = parseFloat(document.getElementById('f-valor').value) || 0;
      const data = document.getElementById('f-data').value || new Date().toISOString().slice(0, 10);
      const status = document.getElementById('f-status').value;
      const obs = document.getElementById('f-obs').value.trim();

      if (!clienteId) {
        Toast.show('Selecione um cliente para vincular à ordem.', 'error');
        return;
      }
      if (!descricao || valor <= 0) {
        Toast.show('Preencha a descrição do serviço e informe um valor válido.', 'error');
        return;
      }

      const payload = { clienteId, descricao, valor, data_abertura: data, status, obs };

      try {
        if (so) {
          await Storage.update(COLLECTION, so.id, payload);
          Toast.show('Ordem de serviço atualizada com sucesso!', 'success');
        } else {
          await Storage.add(COLLECTION, payload);
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
      Toast.show('Ordem de serviço excluída.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      Toast.show('Erro ao excluir: ' + err.message, 'error');
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  async function sortBy(column) {
    sortItems([], column); // Atualiza o estado global
    await renderList(document.getElementById('main-content').firstElementChild || document.querySelector('.main'));
  }

  return { render: renderList, renderList, openForm, deleteItem, closeModal, sortBy };
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

// ============ Ordens de Serviço ============
// CRUD de OLS: cliente, descrição, valor, status, datas.

const ServiceOrdersModule = (() => {
  const COLLECTION = 'service-orders';

  function collection() { return Storage.get(COLLECTION, []); }
  function save(items) { Storage.set(COLLECTION, items); }

  const STATUSES = ['aberta', 'em_andamento', 'concluida'];

  function renderList(container) {
    const items = collection();
    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Ordens de Serviço</h1>
          <p class="subtitle">Gerar e acompanhar abertura de serviços.</p>
        </div>
        <button class="btn btn-primary" onclick="ServiceOrdersModule.openForm()"><i class="fas fa-plus"></i> Nova OLS</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Cliente</th><th>Descrição</th><th>Valor</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            ${items.map(so => {
              const c = Storage.find('clients', cl => cl.id === so.clienteId);
              return `
                <tr>
                  <td style="font-weight:600;">${escapeHtml(c ? c.nome : '—')}</td>
                  <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(so.descricao)}">${escapeHtml(so.descricao)}</td>
                  <td style="font-weight:600;color:var(--success);">${formatBRL(so.valor)}</td>
                  <td>${so.dataAbertura ? new Date(so.dataAbertura).toLocaleDateString('pt-BR') : '—'}</td>
                  <td><span class="badge badge-${so.status === 'concluida' ? 'success' : so.status === 'em_andamento' ? 'warning' : 'default'}">${so.status}</span></td>
                  <td style="white-space:nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="ServiceOrdersModule.openForm('${so.id}')"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="ServiceOrdersModule.deleteItem('${so.id}')"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="6" style="color:var(--text-muted);text-align:center;">Nenhuma ordem de serviço cadastrada.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function openForm(id) {
    const items = collection();
    const so = id ? items.find(s => s.id === id) : null;
    const overlay = document.getElementById('modal-overlay');
    const title = so ? 'Editar ordem de serviço' : 'Nova ordem de serviço';
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Cliente *</label>
        <select id="f-cliente">
          <option value="">— Selecionar cliente —</option>
          ${collection('clients').map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Descrição do serviço *</label>
        <textarea id="f-descricao" rows="2" placeholder="O que será feito"></textarea>
      </div>
      <div class="form-group">
        <label>Valor (R$) *</label>
        <input id="f-valor" type="number" step="0.01" min="0" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label>Data de abertura</label>
        <input id="f-data" type="date" />
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="f-status">
          <option value="aberta">Aberta</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>
      <div class="form-group">
        <label>Observações</label>
        <textarea id="f-obs" rows="2" placeholder="Observações"></textarea>
      </div>
    `;
    document.getElementById('modal-submit').textContent = so ? 'Atualizar' : 'Salvar';

    document.getElementById('modal-submit').onclick = () => {
      const clienteId = document.getElementById('f-cliente').value;
      const descricao = document.getElementById('f-descricao').value.trim();
      const valor = parseFloat(document.getElementById('f-valor').value) || 0;
      const data = document.getElementById('f-data').value || new Date().toISOString().slice(0, 10);
      const status = document.getElementById('f-status').value;
      if (!clienteId) { Toast.show('Selecione um cliente.', 'error'); return; }
      if (!descricao) { Toast.show('Preencha a descrição.', 'error'); return; }
      const payload = { clienteId, descricao, valor, dataAbertura: data, status, obs: document.getElementById('f-obs').value.trim() };
      if (so) {
        Storage.update(COLLECTION, so.id, payload);
        Toast.show('OLS atualizada.', 'success');
      } else {
        const newId = Storage.nextId(COLLECTION);
        Storage.add(COLLECTION, { id: newId, ...payload, createdAt: new Date().toISOString() });
        Toast.show('OLS criada.', 'success');
      }
      closeModal();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    };
    overlay.classList.add('open');
  }

  function deleteItem(id) {
    const item = collection().find(s => s.id === id);
    if (!item) return;
    if (!confirm(`Excluir a OLS de ${item.clienteId}?`)) return;
    Storage.remove(COLLECTION, id);
    Toast.show('OLS excluída.', 'success');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  function init() { console.log('[ServiceOrdersModule] initialized'); }

  return { init, renderList, openForm, deleteItem, closeModal };
})();

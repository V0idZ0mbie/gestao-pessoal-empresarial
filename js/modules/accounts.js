// ============ Contas Bancárias ============
// CRUD de contas: banco, titular, tipo, saldo.

const AccountsModule = (() => {
  const COLLECTION = 'accounts';

  function collection() { return Storage.get(COLLECTION, []); }
  function save(items) { Storage.set(COLLECTION, items); }

  function renderList(container) {
    const items = collection();
    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Contas Bancárias</h1>
          <p class="subtitle">Gerencie suas contas (corrente, poupança, cartão).</p>
        </div>
        <button class="btn btn-primary" onclick="AccountsModule.openForm()"><i class="fas fa-plus"></i> Nova conta</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Banco</th><th>Titular</th><th>Tipo</th><th>Saldo</th><th>Ações</th></tr></thead>
          <tbody>
            ${items.map(a => `
              <tr>
                <td style="font-weight:600;">${escapeHtml(a.banco)}</td>
                <td>${escapeHtml(a.titular)}</td>
                <td><span class="badge badge-default">${escapeHtml(a.tipo)}</span></td>
                <td style="font-weight:600;color:var(--success);">${formatBRL(a.saldo)}</td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-sm btn-primary" onclick="AccountsModule.openForm('${a.id}')"><i class="fas fa-edit"></i> Editar</button>
                  <button class="btn btn-sm btn-danger" onclick="AccountsModule.deleteItem('${a.id}')"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;">Nenhuma conta cadastrada.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function openForm(id) {
    const items = collection();
    const item = id ? items.find(a => a.id === id) : null;
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = item ? 'Editar conta' : 'Nova conta';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Banco</label>
        <input id="f-banco" type="text" placeholder="Ex: Itaú, Bradesco, Caixa" />
      </div>
      <div class="form-group">
        <label>Titular</label>
        <input id="f-titular" type="text" placeholder="Nome do titular" />
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="f-tipo">
          <option value="Corrente">Corrente</option>
          <option value="Poupança">Poupança</option>
          <option value="Cartão de crédito">Cartão de crédito</option>
          <option value="Investimento">Investimento</option>
        </select>
      </div>
      <div class="form-group">
        <label>Saldo (R$)</label>
        <input id="f-saldo" type="number" step="0.01" min="0" placeholder="0,00" />
      </div>
    `;
    document.getElementById('modal-title').textContent = item ? 'Editar conta' : 'Nova conta';
    document.getElementById('modal-submit').textContent = item ? 'Atualizar' : 'Salvar';

    document.getElementById('modal-submit').onclick = () => {
      const banco = document.getElementById('f-banco').value.trim();
      const titular = document.getElementById('f-titular').value.trim();
      const tipo = document.getElementById('f-tipo').value;
      const saldo = parseFloat(document.getElementById('f-saldo').value) || 0;
      if (!banco || !titular) { Toast.show('Preencha banco e titular.', 'error'); return; }
      if (item) {
        Storage.update(COLLECTION, item.id, { banco, titular, tipo, saldo });
        Toast.show('Conta atualizada.', 'success');
      } else {
        const newId = Storage.nextId(COLLECTION);
        Storage.add(COLLECTION, { id: newId, banco, titular, tipo, saldo, createdAt: new Date().toISOString() });
        Toast.show('Conta cadastrada.', 'success');
      }
      closeModal();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    };
    overlay.classList.add('open');
  }

  function deleteItem(id) {
    const item = collection().find(a => a.id === id);
    if (!item) return;
    if (!confirm(`Excluir a conta de ${item.titular} (${item.banco})?`)) return;
    Storage.remove(COLLECTION, id);
    Toast.show('Conta excluída.', 'success');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  function init() {
    console.log('[AccountsModule] initialized');
  }

  return { init, renderList, openForm, deleteItem, closeModal };
})();

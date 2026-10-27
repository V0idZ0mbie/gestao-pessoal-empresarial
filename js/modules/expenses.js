// ============ Gastos ============
// CRUD de gastos: descricao, valor, data, categoria.

const ExpensesModule = (() => {
  const COLLECTION = 'expenses';

  function collection() { return Storage.get(COLLECTION); }

  async function renderList(container) {
    const items = await Storage.get(COLLECTION);
    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Gastos</h1>
          <p class="subtitle">Acompanhe seus gastos e categorias.</p>
        </div>
        <button class="btn btn-primary" onclick="ExpensesModule.openForm()"><i class="fas fa-plus"></i> Novo gasto</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Descricao</th><th>Categoria</th><th>Valor</th><th>Acoes</th></tr></thead>
          <tbody>
            ${items.map(e => `
              <tr>
                <td>${e.data ? new Date(e.data).toLocaleDateString('pt-BR') : '—'}</td>
                <td style="font-weight:600;">${escapeHtml(e.descricao)}</td>
                <td><span class="badge badge-default">${escapeHtml(e.categoria)}</span></td>
                <td style="font-weight:600;color:var(--danger);">${formatBRL(e.valor)}</td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-sm btn-primary" onclick="ExpensesModule.openForm('${e.id}')"><i class="fas fa-edit"></i> Editar</button>
                  <button class="btn btn-sm btn-danger" onclick="ExpensesModule.deleteItem('${e.id}')"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;">Nenhum gasto cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  async function openForm(id) {
    const items = await collection();
    const item = id ? items.find(e => e.id === id) : null;
    const overlay = document.getElementById('modal-overlay');
    const title = item ? 'Editar gasto' : 'Novo gasto';
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Descricao *</label>
        <input id="f-descricao" type="text" placeholder="O que foi gasto" />
      </div>
      <div class="form-group">
        <label>Valor (R$) *</label>
        <input id="f-valor" type="number" step="0.01" min="0" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label>Data</label>
        <input id="f-data" type="date" />
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <select id="f-categoria">
          <option value="Alimentacao">Alimentacao</option>
          <option value="Transporte">Transporte</option>
          <option value="Moradia">Moradia</option>
          <option value="Saude">Saude</option>
          <option value="Lazer">Lazer</option>
          <option value="Educacao">Educacao</option>
          <option value="Outros">Outros</option>
        </select>
      </div>
      <div class="form-group">
        <label>Conta vinculada (opcional)</label>
        <select id="f-conta">
          <option value="">Sem conta vinculada</option>
          ${collection().map(a => `<option value="${a.id}">${escapeHtml(a.banco)} — ${formatBRL(a.saldo)}</option>`).join('')}
        </select>
      </div>
    `;
    document.getElementById('modal-submit').textContent = item ? 'Atualizar' : 'Salvar';

    document.getElementById('modal-submit').onclick = async () => {
      const descricao = document.getElementById('f-descricao').value.trim();
      const valor = parseFloat(document.getElementById('f-valor').value) || 0;
      const data = document.getElementById('f-data').value;
      if (!descricao) { Toast.show('Preencha a descricao.', 'error'); return; }
      const dataObj = data || new Date().toISOString().slice(0, 10);
      const payload = { descricao, valor, data: dataObj, categoria: document.getElementById('f-categoria').value };
      try {
        if (item) {
          await Storage.update(COLLECTION, item.id, payload);
          Toast.show('Gasto atualizado.', 'success');
        } else {
          const newItem = await Storage.add(COLLECTION, { ...payload, createdAt: new Date().toISOString() });
          Toast.show('Gasto registrado.', 'success');
        }
        closeModal();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        Toast.show(err.message || 'Erro ao salvar.', 'error');
      }
    };
    overlay.classList.add('open');
  }

  async function deleteItem(id) {
    const item = await Storage.find(COLLECTION, e => e.id === id);
    if (!item) return;
    if (!confirm(`Excluir o gasto ${item.descricao} (R$ ${item.valor})?`)) return;
    try {
      await Storage.remove(COLLECTION, id);
      Toast.show('Gasto excluido.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      Toast.show(err.message || 'Erro ao excluir.', 'error');
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  function init() { console.log('[ExpensesModule] initialized'); }

  return { init, renderList, openForm, deleteItem, closeModal };
})();

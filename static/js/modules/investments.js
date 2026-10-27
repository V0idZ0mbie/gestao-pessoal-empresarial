// ============ Investimentos ============
// CRUD de investimentos: nome, tipo, valor, data, lucro.

const InvestmentsModule = (() => {
  const COLLECTION = 'investments';

  function collection() { return Storage.get(COLLECTION); }

  async function renderList(container) {
    const items = await Storage.get(COLLECTION);
    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Investimentos</h1>
          <p class="subtitle">Controle de aplicacoes e investimentos.</p>
        </div>
        <button class="btn btn-primary" onclick="InvestmentsModule.openForm()"><i class="fas fa-plus"></i> Novo investimento</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Nome</th><th>Tipo</th><th>Valor</th><th>Lucro</th><th>Acoes</th></tr></thead>
          <tbody>
            ${items.map(inv => `
              <tr>
                <td>${inv.data ? new Date(inv.data).toLocaleDateString('pt-BR') : '—'}</td>
                <td style="font-weight:600;">${escapeHtml(inv.nome)}</td>
                <td><span class="badge badge-default">${escapeHtml(inv.tipo)}</span></td>
                <td style="font-weight:600;color:var(--success);">${formatBRL(inv.valor)}</td>
                <td style="font-weight:600;color:var(--success);">${inv.lucro ? formatBRL(inv.lucro) : '—'}</td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-sm btn-primary" onclick="InvestmentsModule.openForm('${inv.id}')"><i class="fas fa-edit"></i> Editar</button>
                  <button class="btn btn-sm btn-danger" onclick="InvestmentsModule.deleteItem('${inv.id}')"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="color:var(--text-muted);text-align:center;">Nenhum investimento cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function openForm(id) {
    const items = collection();
    const item = id ? items.find(i => i.id === id) : null;
    const overlay = document.getElementById('modal-overlay');
    const title = item ? 'Editar investimento' : 'Novo investimento';
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Nome *</label>
        <input id="f-nome" type="text" placeholder="Ex: CDB, Acoes, Fundo Imobiliario" />
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="f-tipo">
          <option value="Tesouro Selic">Tesouro Selic</option>
          <option value="CDB">CDB</option>
          <option value="LTN">LTN</option>
          <option value="LCI/LCA">LCI / LCA</option>
          <option value="Acoes">Acoes</option>
          <option value="Fundos de Investimento">Fundos de Investimento</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
      <div class="form-group">
        <label>Valor investido (R$) *</label>
        <input id="f-valor" type="number" step="0.01" min="0" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label>Data</label>
        <input id="f-data" type="date" />
      </div>
      <div class="form-group">
        <label>Lucro/reelei (R$, opcional)</label>
        <input id="f-lucro" type="number" step="0.01" min="0" placeholder="0,00" />
      </div>
      <div class="form-group">
        <label>Observacoes</label>
        <textarea id="f-obs" rows="2" placeholder="Observacoes"></textarea>
      </div>
    `;
    document.getElementById('modal-submit').textContent = item ? 'Atualizar' : 'Salvar';

    document.getElementById('modal-submit').onclick = async () => {
      const nome = document.getElementById('f-nome').value.trim();
      const valor = parseFloat(document.getElementById('f-valor').value) || 0;
      if (!nome) { Toast.show('Preencha o nome.', 'error'); return; }
      const data = document.getElementById('f-data').value || new Date().toISOString().slice(0, 10);
      const payload = {
        nome,
        tipo: document.getElementById('f-tipo').value,
        valor,
        data,
        lucro: document.getElementById('f-lucro').value ? parseFloat(document.getElementById('f-lucro').value) : undefined,
        obs: document.getElementById('f-obs').value.trim(),
      };
      try {
        if (item) {
          await Storage.update(COLLECTION, item.id, payload);
          Toast.show('Investimento atualizado.', 'success');
        } else {
          const newItem = await Storage.add(COLLECTION, { ...payload, createdAt: new Date().toISOString() });
          Toast.show('Investimento registrado.', 'success');
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
    const item = await Storage.find(COLLECTION, i => i.id === id);
    if (!item) return;
    if (!confirm(`Excluir o investimento ${item.nome}?`)) return;
    try {
      await Storage.remove(COLLECTION, id);
      Toast.show('Investimento excluido.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      Toast.show(err.message || 'Erro ao excluir.', 'error');
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  function init() { console.log('[InvestmentsModule] initialized'); }

  return { init, renderList, openForm, deleteItem, closeModal };
})();

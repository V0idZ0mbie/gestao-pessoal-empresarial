// ============ Gastos / Despesas ============
// CRUD de gastos: descrição, valor, data, categoria, conta vinculada.

const ExpensesModule = (() => {
  const COLLECTION = 'expenses';

  async function renderList(container) {
    const items = await Storage.get(COLLECTION);
    const totalGasto = items.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Controle de Gastos & Despesas</h1>
          <p class="subtitle">Total acumulado em despesas: <strong>${formatBRL(totalGasto)}</strong></p>
        </div>
        <button class="btn btn-primary" onclick="ExpensesModule.openForm()">
          <i class="fas fa-plus"></i> Novo Lançamento
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição do Gasto</th>
              <th>Categoria</th>
              <th>Valor (R$)</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(e => `
              <tr>
                <td>${e.data ? new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                <td style="font-weight:700;">
                  <i class="fas fa-receipt" style="color:var(--danger);margin-right:8px;"></i>
                  ${escapeHtml(e.descricao)}
                </td>
                <td><span class="badge badge-default">${escapeHtml(e.categoria || 'Geral')}</span></td>
                <td style="font-weight:700;color:var(--danger);">${formatBRL(e.valor)}</td>
                <td style="white-space:nowrap;text-align:right;">
                  <button class="btn btn-sm btn-ghost" onclick="ExpensesModule.openForm('${e.id}')" title="Editar">
                    <i class="fas fa-pencil-alt"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="ExpensesModule.deleteItem('${e.id}')" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:32px;">Nenhum gasto registrado. Clique em "Novo Lançamento" para cadastrar.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  async function openForm(id) {
    const items = await Storage.get(COLLECTION);
    const item = id ? items.find(e => e.id === id) : null;
    const accounts = await Storage.get('accounts');
    const overlay = document.getElementById('modal-overlay');

    const defaultDate = item?.data || new Date().toISOString().slice(0, 10);

    document.getElementById('modal-title').textContent = item ? 'Editar Despesa' : 'Novo Lançamento de Gasto';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Descrição do Gasto *</label>
        <input id="f-descricao" type="text" placeholder="Ex: Assinatura de Software, Aluguel, Combustível" value="${escapeHtml(item?.descricao || '')}" />
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
          <option value="Alimentação" ${item?.categoria === 'Alimentação' ? 'selected' : ''}>Alimentação</option>
          <option value="Transporte" ${item?.categoria === 'Transporte' ? 'selected' : ''}>Transporte</option>
          <option value="Moradia / Escritório" ${item?.categoria === 'Moradia / Escritório' ? 'selected' : ''}>Moradia / Escritório</option>
          <option value="Saúde & Bem-estar" ${item?.categoria === 'Saúde & Bem-estar' ? 'selected' : ''}>Saúde & Bem-estar</option>
          <option value="Lazer & Viagens" ${item?.categoria === 'Lazer & Viagens' ? 'selected' : ''}>Lazer & Viagens</option>
          <option value="Educação & Treinamentos" ${item?.categoria === 'Educação & Treinamentos' ? 'selected' : ''}>Educação & Treinamentos</option>
          <option value="Impostos & Taxas" ${item?.categoria === 'Impostos & Taxas' ? 'selected' : ''}>Impostos & Taxas</option>
          <option value="Outros" ${item?.categoria === 'Outros' ? 'selected' : ''}>Outros</option>
        </select>
      </div>
      <div class="form-group">
        <label>Conta de Saída (opcional)</label>
        <select id="f-conta">
          <option value="">Nenhuma / Dinheiro físico</option>
          ${accounts.map(a => `<option value="${a.id}" ${item?.conta_id === a.id ? 'selected' : ''}>${escapeHtml(a.banco)} — Saldo: ${formatBRL(a.saldo)}</option>`).join('')}
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

      if (!descricao || valor <= 0) {
        Toast.show('Preencha a descrição e um valor válido maior que zero.', 'error');
        return;
      }

      const payload = { descricao, valor, data, categoria, conta_id };

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

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  return { render: renderList, renderList, openForm, deleteItem, closeModal };
})();

window.ExpensesModule = ExpensesModule;

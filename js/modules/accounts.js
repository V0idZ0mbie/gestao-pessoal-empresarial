// ============ Contas Bancárias ============
// CRUD de contas: banco, titular, tipo, saldo.

const AccountsModule = (() => {
  const COLLECTION = 'accounts';

  async function renderList(container) {
    const items = await Storage.get(COLLECTION);
    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Contas Bancárias</h1>
          <p class="subtitle">Gerencie suas contas corrente, poupança, carteiras digitais e cartões</p>
        </div>
        <button class="btn btn-primary" onclick="AccountsModule.openForm()">
          <i class="fas fa-plus"></i> Nova Conta
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Instituição / Banco</th>
              <th>Titular</th>
              <th>Modalidade</th>
              <th>Saldo Disponível</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(a => `
              <tr>
                <td style="font-weight:700;">
                  <i class="fas fa-university" style="color:var(--primary);margin-right:8px;"></i>
                  ${escapeHtml(a.banco)}
                </td>
                <td>${escapeHtml(a.titular)}</td>
                <td><span class="badge badge-default">${escapeHtml(a.tipo || 'Corrente')}</span></td>
                <td style="font-weight:700;color:${(parseFloat(a.saldo) || 0) >= 0 ? 'var(--success)' : 'var(--danger)'};">
                  ${formatBRL(a.saldo)}
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
        <label>Saldo Atual (R$) *</label>
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

  return { render: renderList, renderList, openForm, deleteItem, closeModal };
})();

window.AccountsModule = AccountsModule;

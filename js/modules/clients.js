// ============ Clientes ============
// CRUD de clientes: nome, empresa, email, telefone, endereço.

const ClientsModule = (() => {
  const COLLECTION = 'clients';
  let sortState = { column: null, direction: 'asc' };

  function getSortableHeader(column, label) {
    const active = sortState.column === column;
    const icon = active ? (sortState.direction === 'asc' ? 'fa-sort-asc' : 'fa-sort-desc') : 'fa-sort';
    return `<th class="sortable-header" onclick="ClientsModule.sortBy('${column}')">${label}<i class="fas ${icon}" style="margin-left:6px;font-size:0.8em;"></i></th>`;
  }

  function sortItems(items) {
    if (!sortState.column) return items;
    return [...items].sort((a, b) => {
      const value = item => {
        if (sortState.column === 'contato') return `${item.email || ''} ${item.telefone || ''}`;
        return item[sortState.column] || '';
      };
      const aValue = value(a).toString().toLocaleLowerCase('pt-BR');
      const bValue = value(b).toString().toLocaleLowerCase('pt-BR');
      const result = aValue.localeCompare(bValue, 'pt-BR');
      return sortState.direction === 'asc' ? result : -result;
    });
  }

  async function renderList(container) {
    const items = sortItems(await Storage.get(COLLECTION));
    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Base de Clientes</h1>
          <p class="subtitle">Gestão de contatos comerciais, empresas e clientes parceiros</p>
        </div>
        <button class="btn btn-primary" onclick="ClientsModule.openForm()">
          <i class="fas fa-user-plus"></i> Novo Cliente
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${getSortableHeader('nome', 'Nome Completo')}
              ${getSortableHeader('empresa', 'Empresa / Razão Social')}
              ${getSortableHeader('contato', 'Canais de Contato')}
              ${getSortableHeader('endereco', 'Localização')}
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(c => `
              <tr>
                <td style="font-weight:700;">
                  <i class="fas fa-user-circle" style="color:var(--primary);margin-right:8px;"></i>
                  ${escapeHtml(c.nome)}
                </td>
                <td>${escapeHtml(c.empresa) || '<span style="color:var(--text-dim);">Pessoa Física</span>'}</td>
                <td>
                  <div style="display:flex;flex-direction:column;gap:2px;">
                    ${c.email ? `<span><i class="fas fa-envelope" style="font-size:11px;color:var(--text-dim);margin-right:4px;"></i> ${escapeHtml(c.email)}</span>` : ''}
                    ${c.telefone ? `<span><i class="fas fa-phone" style="font-size:11px;color:var(--text-dim);margin-right:4px;"></i> ${escapeHtml(c.telefone)}</span>` : ''}
                    ${!c.email && !c.telefone ? '<span style="color:var(--text-dim);">—</span>' : ''}
                  </div>
                </td>
                <td style="color:var(--text-muted);">${escapeHtml(c.endereco) || '—'}</td>
                <td style="white-space:nowrap;text-align:right;">
                  <button class="btn btn-sm btn-ghost" onclick="ClientsModule.openForm('${c.id}')" title="Editar">
                    <i class="fas fa-pencil-alt"></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="ClientsModule.deleteItem('${c.id}')" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:32px;">Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para adicionar.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  async function sortBy(column) {
    sortState.direction = sortState.column === column && sortState.direction === 'asc' ? 'desc' : 'asc';
    sortState.column = column;
    await renderList(document.getElementById('main-content').firstElementChild || document.querySelector('.main'));
  }

  async function openForm(id) {
    const items = await Storage.get(COLLECTION);
    const item = id ? items.find(c => c.id === id) : null;
    const overlay = document.getElementById('modal-overlay');

    document.getElementById('modal-title').textContent = item ? 'Editar Cliente' : 'Novo Cliente';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Nome Completo do Cliente *</label>
        <input id="f-nome" type="text" placeholder="Ex: Roberto Albuquerque" value="${escapeHtml(item?.nome || '')}" />
      </div>
      <div class="form-group">
        <label>Empresa / Organização (opcional)</label>
        <input id="f-empresa" type="text" placeholder="Ex: Albuquerque & Filhos Ltda" value="${escapeHtml(item?.empresa || '')}" />
      </div>
      <div class="form-group">
        <label>E-mail de Contato</label>
        <input id="f-email" type="email" placeholder="cliente@dominio.com.br" value="${escapeHtml(item?.email || '')}" />
      </div>
      <div class="form-group">
        <label>Telefone / WhatsApp</label>
        <input id="f-telefone" type="tel" placeholder="(11) 98765-4321" value="${escapeHtml(item?.telefone || '')}" />
      </div>
      <div class="form-group">
        <label>Endereço / Cidade</label>
        <textarea id="f-endereco" rows="2" placeholder="Rua, Número, Bairro, Cidade - UF">${escapeHtml(item?.endereco || '')}</textarea>
      </div>
    `;

    document.getElementById('modal-submit').textContent = item ? 'Salvar Alterações' : 'Cadastrar Cliente';

    document.getElementById('modal-submit').onclick = async () => {
      const nome = document.getElementById('f-nome').value.trim();
      if (!nome) {
        Toast.show('O nome do cliente é obrigatório.', 'error');
        return;
      }

      const payload = {
        nome,
        empresa: document.getElementById('f-empresa').value.trim(),
        email: document.getElementById('f-email').value.trim(),
        telefone: document.getElementById('f-telefone').value.trim(),
        endereco: document.getElementById('f-endereco').value.trim(),
      };

      try {
        if (item) {
          await Storage.update(COLLECTION, item.id, payload);
          Toast.show('Dados do cliente atualizados com sucesso!', 'success');
        } else {
          await Storage.add(COLLECTION, payload);
          Toast.show('Cliente registrado com sucesso!', 'success');
        }
        closeModal();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        Toast.show('Erro ao salvar cliente: ' + err.message, 'error');
      }
    };

    overlay.classList.add('open');
  }

  async function deleteItem(id) {
    const item = await Storage.find(COLLECTION, c => c.id === id);
    if (!item) return;
    if (!confirm(`Tem certeza que deseja excluir o cliente "${item.nome}"?`)) return;

    try {
      await Storage.remove(COLLECTION, id);
      Toast.show('Cliente removido.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      Toast.show('Erro ao remover: ' + err.message, 'error');
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  return { render: renderList, renderList, openForm, deleteItem, closeModal, sortBy };
})();

window.ClientsModule = ClientsModule;

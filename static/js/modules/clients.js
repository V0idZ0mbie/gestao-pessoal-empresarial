// ============ Clientes ============
// CRUD de clientes: nome, email, telefone, empresa, endereço.

const ClientsModule = (() => {
  const COLLECTION = 'clients';

  function collection() { return Storage.get(COLLECTION); }

  async function renderList(container) {
    const items = await Storage.get(COLLECTION);
    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Clientes</h1>
          <p class="subtitle">Cadastro e controle de seus clientes.</p>
        </div>
        <button class="btn btn-primary" onclick="ClientsModule.openForm()"><i class="fas fa-plus"></i> Novo cliente</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Empresa</th><th>Contato</th><th>Ações</th></tr></thead>
          <tbody>
            ${items.map(c => `
              <tr>
                <td style="font-weight:600;">${escapeHtml(c.nome)}</td>
                <td>${escapeHtml(c.empresa) || '—'}</td>
                <td>${escapeHtml(c.email || c.telefone || '—')}</td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-sm btn-primary" onclick="ClientsModule.openForm('${c.id}')"><i class="fas fa-edit"></i> Editar</button>
                  <button class="btn btn-sm btn-danger" onclick="ClientsModule.deleteItem('${c.id}')"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="color:var(--text-muted);text-align:center;">Nenhum cliente cadastrado.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function openForm(id) {
    const items = collection();
    const item = id ? items.find(c => c.id === id) : null;
    const overlay = document.getElementById('modal-overlay');
    const title = item ? 'Editar cliente' : 'Novo cliente';
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Nome *</label>
        <input id="f-nome" type="text" placeholder="Nome completo" />
      </div>
      <div class="form-group">
        <label>Empresa</label>
        <input id="f-empresa" type="text" placeholder="Empresa (se for PJ)" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input id="f-email" type="email" placeholder="email@exemplo.com" />
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input id="f-telefone" type="tel" placeholder="(11) 99999-9999" />
      </div>
      <div class="form-group">
        <label>Endereço</label>
        <textarea id="f-endereco" rows="2" placeholder="Endereço, número, cidade"></textarea>
      </div>
    `;
    document.getElementById('modal-submit').textContent = item ? 'Atualizar' : 'Salvar';

    document.getElementById('modal-submit').onclick = async () => {
      const nome = document.getElementById('f-nome').value.trim();
      if (!nome) { Toast.show('Preencha o nome.', 'error'); return; }
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
          Toast.show('Cliente atualizado.', 'success');
        } else {
          const newItem = await Storage.add(COLLECTION, { ...payload, createdAt: new Date().toISOString() });
          Toast.show('Cliente cadastrado.', 'success');
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
    const item = await Storage.find(COLLECTION, c => c.id === id);
    if (!item) return;
    if (!confirm(`Excluir o cliente ${item.nome}?`)) return;
    try {
      await Storage.remove(COLLECTION, id);
      Toast.show('Cliente excluído.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      Toast.show(err.message || 'Erro ao excluir.', 'error');
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  function init() { console.log('[ClientsModule] initialized'); }

  return { init, renderList, openForm, deleteItem, closeModal };
})();

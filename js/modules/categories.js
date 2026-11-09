// ============ Categorias financeiras ============

const CategoriesModule = (() => {
  const COLLECTION = 'categories';
  const DEFAULTS = {
    expense: [
      'Alimentação',
      'Transporte',
      'Moradia / Escritório',
      'Saúde & Bem-estar',
      'Lazer & Viagens',
      'Educação & Treinamentos',
      'Impostos & Taxas',
      'Gastos de serviço',
      'Outros'
    ],
    gain: ['Serviços', 'Salário', 'Vendas', 'Outros']
  };
  let defaultsPromise = null;

  async function ensureDefaults() {
    if (defaultsPromise) return defaultsPromise;
    defaultsPromise = (async () => {
      let items = await Storage.get(COLLECTION);
      for (const type of Object.keys(DEFAULTS)) {
        if (items.some(item => item.tipo === type)) continue;
        const created = await Promise.all(DEFAULTS[type].map(nome => Storage.add(COLLECTION, { tipo: type, nome })));
        items = [...items, ...created];
      }
      return items;
    })();
    try {
      return await defaultsPromise;
    } finally {
      defaultsPromise = null;
    }
  }

  async function getCategories(type) {
    const items = await ensureDefaults();
    return items.filter(item => item.tipo === type).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async function render(container) {
    const items = await ensureDefaults();
    const route = window.App?.getRoute() || 'settings';
    const activeTab = route === 'settings/categories' ? 'categories' : 'accounts';
    const categories = items.filter(item => item.tipo === 'expense' || item.tipo === 'gain');
    const categoryRows = categories
      .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome, 'pt-BR'))
      .map(item => `
        <tr>
          <td><span class="badge badge-${item.tipo === 'expense' ? 'default' : 'success'}">${item.tipo === 'expense' ? 'Gasto' : 'Ganho'}</span></td>
          <td>${escapeHtml(item.nome)}</td>
          <td style="white-space:nowrap;text-align:right;">
            <button class="btn btn-sm btn-ghost" onclick="CategoriesModule.rename('${item.id}')" title="Renomear"><i class="fas fa-pencil-alt"></i> Renomear</button>
            <button class="btn btn-sm btn-danger" onclick="CategoriesModule.remove('${item.id}')" title="Remover"><i class="fas fa-trash-alt"></i></button>
          </td>
        </tr>`).join('');

    container.innerHTML = `
      <div class="header">
        <div><h1>Configurações</h1><p class="subtitle">Gerencie contas e categorias financeiras.</p></div>
      </div>
      <div class="os-form-tabs" role="tablist" aria-label="Seções de configurações">
        <a class="os-form-tab ${activeTab === 'accounts' ? 'active' : ''}" role="tab" aria-selected="${activeTab === 'accounts'}" href="#/settings/accounts">
          <i class="fas fa-university"></i> Contas
        </a>
        <a class="os-form-tab ${activeTab === 'categories' ? 'active' : ''}" role="tab" aria-selected="${activeTab === 'categories'}" href="#/settings/categories">
          <i class="fas fa-tags"></i> Categorias
        </a>
      </div>
      <div id="settings-content">
        ${activeTab === 'accounts' ? '' : `
          <div class="header" style="margin-top:20px;">
            <div><h2>Categorias de gastos e ganhos</h2><p class="subtitle">Categorias removidas permanecem no histórico dos lançamentos existentes.</p></div>
            <button class="btn btn-primary" onclick="CategoriesModule.openForm()"><i class="fas fa-plus"></i> Nova categoria</button>
          </div>
          <div class="table-wrap">
            <table><thead><tr><th>Tipo</th><th>Categoria</th><th style="text-align:right;">Ações</th></tr></thead>
              <tbody>${categoryRows}</tbody>
            </table>
          </div>`}
      </div>`;

    if (activeTab === 'accounts') {
      await AccountsModule.renderList(document.getElementById('settings-content'));
    }
  }

  async function openForm(id = '') {
    const categories = await Storage.get(COLLECTION);
    const item = id ? categories.find(category => category.id === id) : null;
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = item ? 'Renomear categoria' : 'Nova categoria';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Tipo de categoria</label>
        <select id="f-category-type" ${item ? 'disabled' : ''}>
          <option value="expense" ${item?.tipo === 'expense' ? 'selected' : ''}>Gasto</option>
          <option value="gain" ${item?.tipo === 'gain' ? 'selected' : ''}>Ganho</option>
        </select>
      </div>
      <div class="form-group">
        <label>Nome *</label>
        <input id="f-category-name" value="${escapeHtml(item?.nome || '')}" maxlength="80" placeholder="Nome da categoria">
      </div>`;
    document.getElementById('modal-submit').textContent = item ? 'Salvar nome' : 'Adicionar categoria';
    document.getElementById('modal-submit').onclick = async () => {
      const tipo = item?.tipo || document.getElementById('f-category-type').value;
      const nome = document.getElementById('f-category-name').value.trim();
      if (!nome) {
        Toast.show('Informe o nome da categoria.', 'error');
        return;
      }
      const duplicate = categories.some(category => category.tipo === tipo
        && category.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR')
        && category.id !== item?.id);
      if (duplicate) {
        Toast.show('Já existe uma categoria com esse nome para este tipo.', 'error');
        return;
      }
      try {
        if (item) {
          const oldName = item.nome;
          await Storage.update(COLLECTION, item.id, { nome });
          await renameTransactions(tipo, oldName, nome);
        } else {
          await Storage.add(COLLECTION, { tipo, nome });
        }
        overlay.classList.remove('open');
        Toast.show(item ? 'Categoria renomeada.' : 'Categoria adicionada.', 'success');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (error) {
        Toast.show('Erro ao salvar categoria: ' + error.message, 'error');
      }
    };
    overlay.classList.add('open');
  }

  async function renameTransactions(type, oldName, newName) {
    const collection = type === 'expense' ? 'expenses' : 'gains';
    const items = await Storage.get(collection);
    await Promise.all(items
      .filter(item => item.categoria === oldName)
      .map(item => Storage.update(collection, item.id, { categoria: newName })));
  }

  async function rename(id) {
    await openForm(id);
  }

  async function remove(id) {
    const categories = await Storage.get(COLLECTION);
    const item = categories.find(category => category.id === id);
    if (!item || !confirm(`Remover a categoria "${item.nome}"? Os lançamentos existentes serão mantidos.`)) return;
    try {
      await Storage.remove(COLLECTION, id);
      Toast.show('Categoria removida.', 'success');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (error) {
      Toast.show('Erro ao remover categoria: ' + error.message, 'error');
    }
  }

  return { render, getCategories, openForm, rename, remove };
})();

window.CategoriesModule = CategoriesModule;

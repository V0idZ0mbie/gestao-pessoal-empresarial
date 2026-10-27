// ============ Persistência via localStorage (Cliente-side) ============
// Substitui o localStorage + API. Todas as operações são síncronas e
// usam o storage do navegador.
//
// Os dados são isolados por usuário: cada item armazenado tem um campo
// `userId` que corresponde ao usuário logado. Assim, cada usuário vê
// apenas os seus próprios dados, mesmo que o app seja hospedado em uma
// única instância (sem servidor).
//
// Exemplo de uso (no frontend):
//   await Storage.get('accounts');          // lista das contas do usuário
//   await Storage.add('accounts', { banco: 'Itaú', titular: 'João', saldo: 1000 });
//
// Cada operação envia um token JWT no cabeçalho Authorization:
//   Authorization: Bearer ***

const Storage = {
  // --------------------------------------------------------------------------
  // Helpers internos
  // --------------------------------------------------------------------------

  _getCollectionKey(collection) {
    return `gp_${collection}`;
  },

  _getUserId() {
    return sessionStorage.getItem("gp_userId");
  },

  // --------------------------------------------------------------------------
  // CRUD
  // --------------------------------------------------------------------------

  // Lista todos os itens da coleção do usuário logado.
  get(collection) {
    const userId = this._getUserId();
    if (!userId) return [];
    const key = this._getCollectionKey(collection);
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    return items.filter(item => item.userId === userId);
  },

  // Cria um novo item. O backend gera o id.
  add(collection, item) {
    const key = this._getCollectionKey(collection);
    const userId = this._getUserId();
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    item.userId = userId;
    items.push(item);
    localStorage.setItem(key, JSON.stringify(items));
    return item;
  },

  // Atualiza parcialmente um item.
  update(collection, id, patch) {
    const key = this._getCollectionKey(collection);
    const userId = this._getUserId();
    if (!userId) return null;
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    const idx = items.findIndex(
      (i) => i.id === id && i.userId === userId
    );
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch };
    localStorage.setItem(key, JSON.stringify(items));
    return items[idx];
  },

  // Remove um item.
  remove(collection, id) {
    const key = this._getCollectionKey(collection);
    const userId = this._getUserId();
    if (!userId) return null;
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    const filtered = items.filter((i) => !(i.id === id && i.userId === userId));
    localStorage.setItem(key, JSON.stringify(filtered));
    return filtered.filter((i) => i.userId === userId);
  },

  // Busca o primeiro item que satisfizer o predicado.
  find(collection, predicate) {
    const userId = this._getUserId();
    if (!userId) return null;
    const key = this._getCollectionKey(collection);
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    return items.find((i) => i.userId === userId && predicate(i));
  },

  // Gera o próximo id (apenas para o frontend; o backend já gera IDs).
  // Mantido para compatibilidade, mas o backend trata a geração.
  nextId(collection) {
    const key = this._getCollectionKey(collection);
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    const userId = this._getUserId();
    const userItems = items.filter((i) => i.userId === userId);
    return userItems.length ? Math.max(...userItems.map((i) => i.id)) + 1 : 1;
  },
};

// --------------------------------------------------------------------------
// Expoe o token JWT para os módulos
// --------------------------------------------------------------------------
window.getToken = function () {
  return sessionStorage.getItem("gp_token");
};

window.setToken = function (token) {
  sessionStorage.setItem("gp_token", token);
};

window.clearToken = function () {
  sessionStorage.removeItem("gp_token");
};

window.isAuthenticated = function () {
  return !!getToken();
};

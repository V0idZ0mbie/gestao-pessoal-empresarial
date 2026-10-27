// ============= Persistência via Supabase =============
// Substitui o localStorage + API. Todas as operações são assíncronas
// e usam o Supabase (PostgreSQL).
//
// Os dados são isolados por usuário: cada item armazenado tem um campo
// `user_id` que corresponde ao usuário logado. Assim, cada usuário vê
// apenas os seus próprios dados, mesmo hospedado em uma única instância.
//
// Exemplo de uso (no frontend):
//   const accounts = await Storage.get('accounts');
//   await Storage.add('accounts', { banco: 'Itaú', titular: 'João', saldo: 1000 });
//
// Requer que window.supabase esteja disponível (definido em supabase.js).

const Storage = {
  // --------------------------------------------------------------------------
  // Helpers internos
  // --------------------------------------------------------------------------

  _getCurrentUserId() {
    return window.supabase.auth.getUser().then(({ data: { user } }) => user?.id);
  },

  // --------------------------------------------------------------------------
  // CRUD
  // --------------------------------------------------------------------------

  // Lista todos os itens da coleção do usuário logado.
  async get(collection) {
    const userId = await this._getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await window.supabase
      .from(collection)
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },

  // Cria um novo item. O Supabase gera o id.
  async add(collection, item) {
    const userId = await this._getCurrentUserId();
    if (!userId) throw new Error("Not authenticated");
    const { data, error } = await window.supabase
      .from(collection)
      .insert({ ...item, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Atualiza parcialmente um item.
  async update(collection, id, patch) {
    const userId = await this._getCurrentUserId();
    if (!userId) throw new Error("Not authenticated");
    const { data, error } = await window.supabase
      .from(collection)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Remove um item.
  async remove(collection, id) {
    const userId = await this._getCurrentUserId();
    if (!userId) throw new Error("Not authenticated");
    const { error } = await window.supabase
      .from(collection)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  },

  // Busca o primeiro item que satisfizer o predicado.
  async find(collection, predicate) {
    const items = await this.get(collection);
    return items.find(predicate);
  },

  // Gera o próximo id (apenas para o frontend; o Supabase já gera IDs).
  // Mantido para compatibilidade.
  async nextId(collection) {
    const userId = await this._getCurrentUserId();
    if (!userId) return 1;
    const { data, error } = await window.supabase
      .from(collection)
      .select('id')
      .eq('user_id', userId)
      .order('id', { ascending: false })
      .limit(1);
    if (error) throw error;
    const ids = data || [];
    return ids.length ? Math.max(...ids.map((i) => i.id)) + 1 : 1;
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

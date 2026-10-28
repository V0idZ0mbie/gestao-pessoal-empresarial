// ============= Persistência Híbrida (Supabase com Fallback Local) =============
// Se o Supabase estiver online e autenticado, sincroniza com o PostgreSQL.
// Se não houver conexão ou for modo offline/demo, usa localStorage isolado por usuário.

const Storage = {
  async _getCurrentUserId() {
    if (window.supabase && window.supabase.auth) {
      try {
        const { data } = await window.supabase.auth.getUser();
        if (data?.user?.id) return data.user.id;
      } catch (e) {
        // Fallback silencioso
      }
    }
    return sessionStorage.getItem('gp_userId') || 'local-guest-user';
  },

  _getLocalKey(collection, userId) {
    return `gp_${userId}_${collection}`;
  },

  _getFromLocalStorage(collection, userId) {
    try {
      const data = localStorage.getItem(this._getLocalKey(collection, userId));
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  _saveToLocalStorage(collection, userId, items) {
    try {
      localStorage.setItem(this._getLocalKey(collection, userId), JSON.stringify(items));
    } catch (e) {
      console.warn('Erro ao salvar no storage local:', e);
    }
  },

  // Lista todos os itens da coleção
  async get(collection) {
    const userId = await this._getCurrentUserId();

    // Se temos cliente supabase ativo com sessão válida
    if (window.supabase && window.supabase.from && !userId.startsWith('local-')) {
      try {
        const { data, error } = await window.supabase
          .from(collection)
          .select('*')
          .eq('user_id', userId);
        if (!error && data) return data;
      } catch (err) {
        console.warn(`[Storage] Supabase get falhou para ${collection}, usando dados locais:`, err.message);
      }
    }

    const localItems = this._getFromLocalStorage(collection, userId);
    // Se a coleção estiver vazia localmente e for clients/service_orders/services_catalog, carrega o banco migrado automaticamente
    if (localItems.length === 0) {
      if (collection === 'clients' && window.MIGRATED_CLIENTS) {
        this._saveToLocalStorage(collection, userId, window.MIGRATED_CLIENTS);
        return window.MIGRATED_CLIENTS;
      }
      if (collection === 'service_orders' && window.MIGRATED_ORDERS) {
        this._saveToLocalStorage(collection, userId, window.MIGRATED_ORDERS);
        return window.MIGRATED_ORDERS;
      }
      if (collection === 'services_catalog' && window.MIGRATED_SERVICES_CATALOG) {
        this._saveToLocalStorage(collection, userId, window.MIGRATED_SERVICES_CATALOG);
        return window.MIGRATED_SERVICES_CATALOG;
      }
    }

    return localItems;
  },

  // Cria um novo item
  async add(collection, item) {
    const userId = await this._getCurrentUserId();
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));
    const now = new Date().toISOString();
    const newItem = {
      id,
      ...item,
      user_id: userId,
      created_at: item.created_at || now,
      updated_at: now
    };

    if (window.supabase && window.supabase.from && !userId.startsWith('local-')) {
      try {
        const { data, error } = await window.supabase
          .from(collection)
          .insert(newItem)
          .select()
          .single();
        if (!error && data) {
          // Atualiza também o cache local
          const localItems = this._getFromLocalStorage(collection, userId);
          localItems.push(data);
          this._saveToLocalStorage(collection, userId, localItems);
          return data;
        }
      } catch (err) {
        console.warn(`[Storage] Supabase add falhou para ${collection}, salvando localmente:`, err.message);
      }
    }

    const items = this._getFromLocalStorage(collection, userId);
    items.push(newItem);
    this._saveToLocalStorage(collection, userId, items);
    return newItem;
  },

  // Atualiza um item
  async update(collection, id, patch) {
    const userId = await this._getCurrentUserId();
    const now = new Date().toISOString();

    if (window.supabase && window.supabase.from && !userId.startsWith('local-')) {
      try {
        const { data, error } = await window.supabase
          .from(collection)
          .update({ ...patch, updated_at: now })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
        if (!error && data) {
          const items = this._getFromLocalStorage(collection, userId);
          const idx = items.findIndex(i => i.id === id);
          if (idx !== -1) items[idx] = data;
          this._saveToLocalStorage(collection, userId, items);
          return data;
        }
      } catch (err) {
        console.warn(`[Storage] Supabase update falhou para ${collection}:`, err.message);
      }
    }

    const items = this._getFromLocalStorage(collection, userId);
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...patch, updated_at: now };
      this._saveToLocalStorage(collection, userId, items);
      return items[idx];
    }
    return null;
  },

  // Remove um item
  async remove(collection, id) {
    const userId = await this._getCurrentUserId();

    if (window.supabase && window.supabase.from && !userId.startsWith('local-')) {
      try {
        await window.supabase
          .from(collection)
          .delete()
          .eq('id', id)
          .eq('user_id', userId);
      } catch (err) {
        console.warn(`[Storage] Supabase remove falhou para ${collection}:`, err.message);
      }
    }

    const items = this._getFromLocalStorage(collection, userId);
    const filtered = items.filter(i => i.id !== id);
    this._saveToLocalStorage(collection, userId, filtered);
    return true;
  },

  // Busca o primeiro item compatível
  async find(collection, predicate) {
    const items = await this.get(collection);
    return items.find(predicate) || null;
  }
};

window.Storage = Storage;

// --------------------------------------------------------------------------
// Auth Helpers globais
// --------------------------------------------------------------------------
window.getToken = async function () {
  if (window.supabase?.auth) {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
    } catch (e) {}
  }
  return sessionStorage.getItem("gp_token") || null;
};

window.isAuthenticated = async function () {
  if (window.supabase?.auth) {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (session?.user) return true;
    } catch (e) {}
  }
  return !!sessionStorage.getItem("gp_userId");
};

window.getCurrentUser = async function () {
  if (window.supabase?.auth) {
    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      if (user) return user;
    } catch (e) {}
  }
  const id = sessionStorage.getItem("gp_userId");
  const email = sessionStorage.getItem("gp_userEmail") || "demo@gestaopro.com";
  const name = sessionStorage.getItem("gp_userName") || "Administrador";
  if (id) {
    return { id, email, user_metadata: { full_name: name, username: name } };
  }
  return null;
};

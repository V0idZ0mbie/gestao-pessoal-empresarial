// ============= Persistência Híbrida (Supabase com Fallback Local) =============
// Se o Supabase estiver online e autenticado, sincroniza com o PostgreSQL.
// Se não houver conexão ou for modo offline/demo, usa localStorage isolado por usuário.

const Storage = {
  CACHE_TTL_MS: 5 * 60 * 1000,
  _memoryCache: new Map(),
  _inFlightGets: new Map(),

  _isCloudEnabled(userId) {
    return Boolean(window.supabaseConfigured && window.supabase?.from && !userId.startsWith('local-'));
  },

  _toDatabaseItem(collection, item) {
    if (collection === 'service_orders' && Object.prototype.hasOwnProperty.call(item, 'clienteId')) {
      const { clienteId, ...rest } = item;
      return { ...rest, cliente_id: clienteId };
    }
    return item;
  },

  _fromDatabaseItem(collection, item) {
    if (collection === 'service_orders' && Object.prototype.hasOwnProperty.call(item, 'cliente_id')) {
      const { cliente_id, ...rest } = item;
      return { ...rest, clienteId: cliente_id };
    }
    return item;
  },

  async _getCurrentUserId() {
    const storedUserId = sessionStorage.getItem('gp_userId');
    if (storedUserId) return storedUserId;

    if (window.supabase && window.supabase.auth) {
      try {
        const { data } = await window.supabase.auth.getSession();
        if (data?.session?.user?.id) return data.session.user.id;
      } catch (e) {
        // Fallback silencioso
      }
    }
    return 'local-guest-user';
  },

  _getLocalKey(collection, userId) {
    return `gp_${userId}_${collection}`;
  },

  _getCacheKey(collection, userId) {
    return `gp_cache_${userId}_${collection}`;
  },

  _readCache(collection, userId) {
    const key = this._getCacheKey(collection, userId);
    const memoryEntry = this._memoryCache.get(key);
    if (memoryEntry) return memoryEntry;
    try {
      const saved = sessionStorage.getItem(key);
      if (!saved) return null;
      const entry = JSON.parse(saved);
      if (!Array.isArray(entry.items) || !Number.isFinite(entry.cachedAt)) {
        sessionStorage.removeItem(key);
        return null;
      }
      this._memoryCache.set(key, entry);
      return entry;
    } catch (error) {
      console.warn(`[Storage] Cache inválido para ${collection}:`, error.message);
      return null;
    }
  },

  _saveCache(collection, userId, items, cachedAt = Date.now()) {
    const key = this._getCacheKey(collection, userId);
    const entry = { cachedAt, items };
    this._memoryCache.set(key, entry);
    try {
      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn(`[Storage] Não foi possível armazenar o cache de ${collection}:`, error.message);
    }
  },

  _updateCache(collection, userId, updateItems) {
    const cached = this._readCache(collection, userId);
    if (cached) this._saveCache(collection, userId, updateItems(cached.items), cached.cachedAt);
  },

  _copyItems(items) {
    return items.map(item => ({ ...item }));
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
    const cached = this._readCache(collection, userId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return this._copyItems(cached.items);
    }

    if (this._isCloudEnabled(userId)) {
      const requestKey = this._getCacheKey(collection, userId);
      let request = this._inFlightGets.get(requestKey);
      if (!request) {
        request = (async () => {
          try {
            const { data, error } = await window.supabase
              .from(collection)
              .select('*')
              .eq('user_id', userId);
            if (error) throw error;
            if (data) {
              const items = data.map(item => this._fromDatabaseItem(collection, item));
              this._saveCache(collection, userId, items);
              return items;
            }
          } catch (err) {
            console.warn(`[Storage] Supabase get falhou para ${collection}:`, err.message);
          } finally {
            this._inFlightGets.delete(requestKey);
          }
          return null;
        })();
        this._inFlightGets.set(requestKey, request);
      }
      const cloudItems = await request;
      if (cloudItems) return this._copyItems(cloudItems);
    }

    if (cached) return this._copyItems(cached.items);
    const localItems = this._getFromLocalStorage(collection, userId);
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

    if (this._isCloudEnabled(userId)) {
      try {
        const { data, error } = await window.supabase
          .from(collection)
          .insert(this._toDatabaseItem(collection, newItem))
          .select()
          .single();
        if (!error && data) {
          const normalizedData = this._fromDatabaseItem(collection, data);
          this._updateCache(collection, userId, items => [...items.filter(existing => existing.id !== normalizedData.id), normalizedData]);
          // Atualiza também o cache local
          const localItems = this._getFromLocalStorage(collection, userId);
          localItems.push(normalizedData);
          this._saveToLocalStorage(collection, userId, localItems);
          return normalizedData;
        }
      } catch (err) {
        console.warn(`[Storage] Supabase add falhou para ${collection}, salvando localmente:`, err.message);
      }
    }

    const items = this._getFromLocalStorage(collection, userId);
    items.push(newItem);
    this._saveToLocalStorage(collection, userId, items);
    this._updateCache(collection, userId, cachedItems => [...cachedItems.filter(existing => existing.id !== newItem.id), newItem]);
    return newItem;
  },

  // Atualiza um item
  async update(collection, id, patch) {
    const userId = await this._getCurrentUserId();
    const now = new Date().toISOString();

    if (this._isCloudEnabled(userId)) {
      try {
        const { data, error } = await window.supabase
          .from(collection)
          .update(this._toDatabaseItem(collection, { ...patch, updated_at: now }))
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
        if (!error && data) {
          const normalizedData = this._fromDatabaseItem(collection, data);
          this._updateCache(collection, userId, items => items.map(item => (
            item.id === id ? normalizedData : item
          )));
          const items = this._getFromLocalStorage(collection, userId);
          const idx = items.findIndex(i => i.id === id);
          if (idx !== -1) items[idx] = normalizedData;
          this._saveToLocalStorage(collection, userId, items);
          return normalizedData;
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
      this._updateCache(collection, userId, cachedItems => cachedItems.map(item => (
        item.id === id ? { ...item, ...patch, updated_at: now } : item
      )));
      return items[idx];
    }
    return null;
  },

  // Remove um item
  async remove(collection, id) {
    const userId = await this._getCurrentUserId();

    if (this._isCloudEnabled(userId)) {
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
    this._updateCache(collection, userId, cachedItems => cachedItems.filter(item => item.id !== id));
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

// ============ Persistência via localStorage ============
// Cada módulo tem uma "coleção" no localStorage. Os métodos abaixo
// expõem operações CRUD simples.

const Storage = {
  // Retorna um array (ou o fallback)
  get(collection, fallback = []) {
    try {
      const raw = localStorage.getItem(`gp_${collection}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },

  // Salva um array completo
  set(collection, items) {
    localStorage.setItem(`gp_${collection}`, JSON.stringify(items));
  },

  // Adiciona um item e retorna o resulting array
  add(collection, item) {
    const items = Storage.get(collection, []);
    items.push(item);
    Storage.set(collection, items);
    return item;
  },

  // Atualiza um item pelo id
  update(collection, id, patch) {
    const items = Storage.get(collection, []);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch };
    Storage.set(collection, items);
    return items[idx];
  },

  // Remove um item pelo id
  remove(collection, id) {
    const items = Storage.get(collection, []);
    const filtered = items.filter(i => i.id !== id);
    Storage.set(collection, filtered);
    return filtered;
  },

  // Busca por condição
  find(collection, predicate) {
    return Storage.get(collection, []).find(predicate);
  },

  // IDs sequenciais baseados no maior id existente
  nextId(collection) {
    const items = Storage.get(collection, []);
    return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
  }
};

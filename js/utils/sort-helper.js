// ============ Ordenação de Colunas (Helper Reutilizável) ============
// Fornece funcionalidade de ordenação asc/desc para colunas clicáveis

const SortHelper = {
  // Estado de ordenação por coluna
  states: {},

  // Atualiza o estado de ordenação e retorna a nova direção
  toggle(column) {
    const current = this.states[column] || 'asc';
    const newDirection = current === 'asc' ? 'desc' : 'asc';
    this.states[column] = newDirection;
    return newDirection;
  },

  // Retorna o ícone apropriado baseado no estado
  getIcon(column) {
    const state = this.states[column] || 'none';
    if (state === 'asc') return 'fa-sort-asc';
    if (state === 'desc') return 'fa-sort-desc';
    return 'fa-sort';
  },

  // Gera o header de coluna ordenável
  getHeader(column, label) {
    const state = this.states[column] || 'none';
    const icon = this.getIcon(column);
    return `
      <th class="sortable-header" data-column="${column}" onclick="SortHelper.renderSorted('${column}')>
        ${label}
        <i class="fas ${icon}" style="margin-left:6px;font-size:0.8em;"></i>
      </th>
    `;
  },

  // Ordena itens baseado na coluna e direção atual
  sort(items, column, accessor = null) {
    if (!column || items.length === 0) return items;

    const direction = this.states[column] || 'asc';
    const col = accessor || column;

    return [...items].sort((a, b) => {
      let valA = a[col];
      let valB = b[col];

      // Normalização baseada no tipo de coluna
      if (column === 'valor' || column === 'saldo' || column === 'lucro') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else if (column === 'data') {
        valA = valA ? new Date(valA + 'T00:00:00').getTime() : 0;
        valB = valB ? new Date(valB + 'T00:00:00').getTime() : 0;
      } else if (column === 'cliente' || column === 'descricao' || column === 'nome') {
        valA = valA ? valA.toString().toLowerCase() : '';
        valB = valB ? valB.toString().toLowerCase() : '';
      } else if (column === 'status') {
        const order = { concluida: 1, em_andamento: 2, aberta: 3, '': 0 };
        valA = order[valA] || 0;
        valB = order[valB] || 0;
      } else {
        valA = valA || 0;
        valB = valB || 0;
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  // Renderiza itens ordenados (chama a função de renderização do módulo)
  async renderSorted(column, renderFn, container) {
    const direction = this.toggle(column);
    const items = await Storage.get(container.dataset.collection || 'items');
    const sorted = this.sort(items, column);
    await renderFn(container, sorted);
  }
};

window.SortHelper = SortHelper;
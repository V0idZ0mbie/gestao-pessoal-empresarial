// ============ Módulo de Tabela de Serviços e Valores Médios ============
// Exibe a tabela consolidada de serviços prestados, valores médios praticados,
// faixa de preço (mínimo e máximo) e frequência de atendimentos.

const ServicesCatalogModule = (() => {
  const COLLECTION = 'services_catalog';
  let sortState = { column: null, direction: 'asc' };

  function getSortableHeader(column, label) {
    const active = sortState.column === column;
    const icon = active ? (sortState.direction === 'asc' ? 'fa-sort-asc' : 'fa-sort-desc') : 'fa-sort';
    return `<th class="sortable-header" onclick="ServicesCatalogModule.sortBy('${column}')">${label}<i class="fas ${icon}" style="margin-left:6px;font-size:0.8em;"></i></th>`;
  }

  function sortItems(items) {
    if (!sortState.column) return items;
    const numeric = ['media', 'minimo', 'maximo', 'total_atendimentos', 'faturamento_acumulado'];
    return [...items].sort((a, b) => {
      let aValue = a[sortState.column];
      let bValue = b[sortState.column];
      if (numeric.includes(sortState.column)) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else {
        aValue = (Array.isArray(aValue) ? aValue.join(' ') : aValue || '').toString().toLocaleLowerCase('pt-BR');
        bValue = (Array.isArray(bValue) ? bValue.join(' ') : bValue || '').toString().toLocaleLowerCase('pt-BR');
      }
      const result = typeof aValue === 'string' ? aValue.localeCompare(bValue, 'pt-BR') : aValue - bValue;
      return sortState.direction === 'asc' ? result : -result;
    });
  }

  async function render(container) {
    let items = await Storage.get(COLLECTION);
    
    // Se ainda não foi importado no storage, usa a constante migrada global
    if (!items || items.length === 0) {
      items = window.MIGRATED_SERVICES_CATALOG || [];
    }
    items = sortItems(items);

    const totalAtendimentos = items.reduce((acc, curr) => acc + (curr.total_atendimentos || 0), 0);
    const faturamentoHistorico = items.reduce((acc, curr) => acc + (curr.faturamento_acumulado || 0), 0);

    container.innerHTML = `
      <div class="header">
        <div>
          <h1>Tabela de Serviços & Valores Médios</h1>
          <p class="subtitle">
            Base analítica migrada: <strong>${items.length} categorias</strong> | 
            <strong>${totalAtendimentos} atendimentos realizados</strong> | 
            Total histórico: <strong>${formatBRL(faturamentoHistorico)}</strong>
          </p>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-primary" onclick="ServicesCatalogModule.openForm()">
            <i class="fas fa-plus"></i> Novo Serviço / Preço
          </button>
        </div>
      </div>

      <!-- Cards de Resumo -->
      <div class="cards">
        <div class="card">
          <div class="card-title">
            <span>Ticket Médio Geral</span>
            <i class="fas fa-calculator"></i>
          </div>
          <div class="stat">
            <span class="stat-value" style="color:var(--primary);">
              ${totalAtendimentos > 0 ? formatBRL(faturamentoHistorico / totalAtendimentos) : 'R$ 0,00'}
            </span>
            <span class="stat-label">por serviço prestado</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Categoria com Mais Demandas</span>
            <i class="fas fa-bolt"></i>
          </div>
          <div class="stat">
            <span class="stat-value" style="font-size:18px;color:var(--warning);">Instalações Elétricas</span>
            <span class="stat-label">46 ordens (Média R$ 78,85)</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Maior Volume em Hidráulica</span>
            <i class="fas fa-faucet"></i>
          </div>
          <div class="stat">
            <span class="stat-value" style="font-size:18px;color:var(--info);">Pias, Registros & Torneiras</span>
            <span class="stat-label">44 ordens (Média R$ 87,61)</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>Serviços de Alto Valor</span>
            <i class="fas fa-paint-roller"></i>
          </div>
          <div class="stat">
            <span class="stat-value" style="font-size:18px;color:var(--success);">Pinturas & Reformas</span>
            <span class="stat-label">Ticket Médio de R$ 379,12</span>
          </div>
        </div>
      </div>

      <!-- Barra de Filtro e Busca -->
      <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center;">
        <div style="flex:1;position:relative;">
          <input 
            type="text" 
            id="service-search-input" 
            placeholder="Buscar por categoria ou tipo de serviço (ex: chuveiro, pintura, tomada, torneira)..." 
            style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text);"
            oninput="ServicesCatalogModule.filterTable()"
          />
        </div>
      </div>

      <!-- Tabela Consolidada -->
      <div class="table-wrap">
        <table id="services-table">
          <thead>
            <tr>
              ${getSortableHeader('categoria', 'Especialidade / Categoria')}
              ${getSortableHeader('media', 'Valor Médio Cobrado')}
              ${getSortableHeader('minimo', 'Faixa de Preço (Mín - Máx)')}
              ${getSortableHeader('total_atendimentos', 'Demanda (Qtd.)')}
              ${getSortableHeader('faturamento_acumulado', 'Faturamento Histórico')}
              ${getSortableHeader('exemplos', 'Exemplos de Serviços no Banco')}
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(s => {
              const exemplosStr = Array.isArray(s.exemplos) ? s.exemplos.join(' • ') : (s.exemplos || '—');
              return `
                <tr class="service-row" data-cat="${escapeHtml(s.categoria.toLowerCase())}" data-ex="${escapeHtml(exemplosStr.toLowerCase())}">
                  <td style="font-weight:700;">
                    <i class="fas fa-wrench" style="color:var(--primary);margin-right:8px;"></i>
                    ${escapeHtml(s.categoria)}
                  </td>
                  <td style="font-weight:800;color:var(--success);font-size:15px;">
                    ${formatBRL(s.media)}
                  </td>
                  <td style="color:var(--text-muted);">
                    ${formatBRL(s.minimo)} — ${formatBRL(s.maximo)}
                  </td>
                  <td>
                    <span class="badge badge-default" style="font-weight:700;">
                      ${s.total_atendimentos || 1} ordens
                    </span>
                  </td>
                  <td style="font-weight:700;">
                    ${formatBRL(s.faturamento_acumulado || s.media)}
                  </td>
                  <td style="font-size:12.5px;color:var(--text-muted);max-width:280px;" title="${escapeHtml(exemplosStr)}">
                    ${escapeHtml(exemplosStr)}
                  </td>
                  <td style="white-space:nowrap;text-align:right;">
                    <button class="btn btn-sm btn-ghost" onclick="ServicesCatalogModule.openForm('${s.id || ''}', '${escapeHtml(s.categoria)}', ${s.media})" title="Editar ou Ajustar Preço">
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function filterTable() {
    const query = (document.getElementById('service-search-input')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('.service-row');
    rows.forEach(row => {
      const cat = row.getAttribute('data-cat') || '';
      const ex = row.getAttribute('data-ex') || '';
      if (cat.includes(query) || ex.includes(query)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }

      async function sortBy(column) {
        sortState.direction = sortState.column === column && sortState.direction === 'asc' ? 'desc' : 'asc';
        sortState.column = column;
        await render(document.getElementById('main-content').firstElementChild || document.querySelector('.main'));
      }
    });
  }

  async function openForm(id, cat = '', val = 0) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = id ? 'Ajustar Preço Médio' : 'Cadastrar Categoria / Serviço';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>Nome do Serviço / Categoria *</label>
        <input id="f-serv-cat" type="text" placeholder="Ex: Manutenção de Portas e Fechaduras" value="${escapeHtml(cat)}" />
      </div>
      <div class="form-group">
        <label>Valor Médio Estimado (R$) *</label>
        <input id="f-serv-val" type="number" step="0.01" min="0" placeholder="0,00" value="${val || ''}" />
      </div>
      <div class="form-group">
        <label>Exemplos de Itens Inclusos</label>
        <textarea id="f-serv-desc" rows="2" placeholder="Ex: troca de maçaneta, lubrificação, alinhamento"></textarea>
      </div>
    `;

    document.getElementById('modal-submit').textContent = 'Salvar Tabela';

    document.getElementById('modal-submit').onclick = async () => {
      const categoria = document.getElementById('f-serv-cat').value.trim();
      const media = parseFloat(document.getElementById('f-serv-val').value) || 0;
      const desc = document.getElementById('f-serv-desc').value.trim();

      if (!categoria || media <= 0) {
        Toast.show('Preencha o nome do serviço e um valor médio válido.', 'error');
        return;
      }

      const payload = {
        categoria,
        media,
        minimo: media * 0.8,
        maximo: media * 1.3,
        total_atendimentos: 1,
        faturamento_acumulado: media,
        exemplos: desc ? [desc] : [categoria]
      };

      try {
        await Storage.add(COLLECTION, payload);
        Toast.show('Serviço atualizado com sucesso na tabela de preços!', 'success');
        document.getElementById('modal-overlay').classList.remove('open');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        Toast.show('Erro ao salvar: ' + err.message, 'error');
      }
    };

    overlay.classList.add('open');
  }

  return { render, renderList: render, filterTable, openForm, sortBy };
})();

window.ServicesCatalogModule = ServicesCatalogModule;

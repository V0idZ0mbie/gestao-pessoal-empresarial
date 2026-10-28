// ============= Dados de demonstração (Seed) =============
window.SeedData = {
  async importAll() {
    const now = new Date().toISOString();
    const accountsData = [
      { banco: 'Nubank', titular: 'Principal', tipo: 'Corrente', saldo: 8450.50 },
      { banco: 'Itaú Unibanco', titular: 'Empresarial PJ', tipo: 'Corrente', saldo: 34200.00 },
      { banco: 'Banco Inter', titular: 'Reserva Emergência', tipo: 'Poupança', saldo: 15300.00 },
      { banco: 'XP Investimentos', titular: 'Carteira Aporte', tipo: 'Investimento', saldo: 52000.00 }
    ];

    const clientsData = [
      { nome: 'Ana Souza', empresa: 'Tech Corp Soluções', email: 'ana@techcorp.com', telefone: '(11) 98888-7777', endereco: 'Av. Paulista, 1000 — São Paulo/SP' },
      { nome: 'Carlos Lima', empresa: 'Lima & Associados', email: 'carlos@lima.contab', telefone: '(21) 97777-6666', endereco: 'Rua das Flores, 50 — Rio de Janeiro/RJ' },
      { nome: 'Marina Costa', empresa: 'Indústria Nova Era', email: 'marina@costa.ind', telefone: '(31) 96666-5555', endereco: 'Av. Brasil, 250 — Belo Horizonte/MG' },
      { nome: 'Pedro Santos', empresa: 'Studio Criativo Freelance', email: 'pedro@santos.dev', telefone: '(41) 95555-4444', endereco: 'Rua das Palmeiras, 80 — Curitiba/PR' }
    ];

    const expensesData = [
      { descricao: 'Aluguel do escritório coworking', valor: 2800.00, data: new Date().toISOString().slice(0,10), categoria: 'Moradia' },
      { descricao: 'Servidores AWS & Cloud hosting', valor: 650.40, data: new Date().toISOString().slice(0,10), categoria: 'Outros' },
      { descricao: 'Almoço de equipe comercial', valor: 240.50, data: new Date().toISOString().slice(0,10), categoria: 'Alimentação' },
      { descricao: 'Internet Fibra 600MB', valor: 149.90, data: new Date().toISOString().slice(0,10), categoria: 'Moradia' },
      { descricao: 'Combustível visitas presenciais', valor: 320.00, data: new Date().toISOString().slice(0,10), categoria: 'Transporte' }
    ];

    const investmentsData = [
      { nome: 'Tesouro Direto IPCA+ 2029', tipo: 'Tesouro Selic', valor: 25000.00, data: new Date().toISOString().slice(0,10), lucro: 840.50, obs: 'Proteção contra inflação' },
      { nome: 'CDB Liquidez Diária 110% CDI', tipo: 'CDB', valor: 30000.00, data: new Date().toISOString().slice(0,10), lucro: 1220.00, obs: 'Reserva de oportunidade' },
      { nome: 'Fundos Imobiliários HGLG11', tipo: 'Fundos de Investimento', valor: 18000.00, data: new Date().toISOString().slice(0,10), lucro: 750.00, obs: 'Proventos mensais isentos' },
      { nome: 'Carteira de Ações Dividendos', tipo: 'Ações', valor: 14000.00, data: new Date().toISOString().slice(0,10), lucro: 1100.00, obs: 'Foco longo prazo' }
    ];

    // Insere dados sequencialmente
    for (const a of accountsData) {
      await Storage.add('accounts', a);
    }

    const createdClients = [];
    for (const c of clientsData) {
      const res = await Storage.add('clients', c);
      createdClients.push(res);
    }

    for (const e of expensesData) {
      await Storage.add('expenses', e);
    }

    for (const inv of investmentsData) {
      await Storage.add('investments', inv);
    }

    const firstClientId = (createdClients[0] && createdClients[0].id) ? createdClients[0].id : 'cliente-1';
    const secondClientId = (createdClients[1] && createdClients[1].id) ? createdClients[1].id : 'cliente-2';

    const serviceOrdersData = [
      { clienteId: firstClientId, descricao: 'Desenvolvimento e implantação de Dashboard ERP', valor: 6500.00, data_abertura: new Date().toISOString().slice(0,10), status: 'em_andamento', obs: 'Entrega da fase 1 programada' },
      { clienteId: secondClientId, descricao: 'Auditoria fiscal e conciliação bancária', valor: 3200.00, data_abertura: new Date().toISOString().slice(0,10), status: 'aberta', obs: 'Aguardando extratos contábeis' },
      { clienteId: firstClientId, descricao: 'Consultoria de infraestrutura cloud e segurança', valor: 4800.00, data_abertura: new Date().toISOString().slice(0,10), status: 'concluida', obs: 'Homologado com sucesso' }
    ];

    for (const so of serviceOrdersData) {
      await Storage.add('service_orders', so);
    }
  }
};

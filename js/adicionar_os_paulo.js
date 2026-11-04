// Script para adicionar ordem de serviço de reinstalação de cabo de rede
// Executar no console do browser após carregar o GestãoPro

const crypto = window.crypto || {};

// ID do Paulo
const CLIENTE_ID = 'cli-25';

// Dados do serviço
const SERVICO = {
    descricao: '[Instalações & Manutenção Elétrica] Reinstalação de cabo de rede para câmera de segurança',
    valor: 189.90,  // Material (39,90) + Mão de obra (150,00)
    data_abertura: new Date().toISOString().slice(0, 10),
    status: 'concluida',
    obs: 'Material: R$ 39,90 (cabo rede CAT6) | Mão de obra: R$ 150,00'
};

// Registrar despesa de material
const DESPESA_MATERIAL = {
    descricao: 'Cabo de rede CAT6 para câmera de segurança (Paulo)',
    valor: 39.90,
    data: new Date().toISOString().slice(0, 10),
    categoria: 'Materiais de Infraestrutura'
};

// Função para gerar ID único
function gerarId() {
    return (crypto.randomUUID || ('id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)))();
}

// Adicionar ordem de serviço
async function adicionarOS() {
    try {
        // Buscar clientes para garantir que o Paulo existe
        const clientes = await Storage.get('clients');
        const paulo = clientes.find(c => c.id === CLIENTE_ID || c.nome === 'Paulo');
        
        if (!paulo) {
            console.error('Cliente Paulo não encontrado');
            return false;
        }
        
        const payload = {
            id: gerarId(),
            clienteId: CLIENTE_ID,
            ...SERVICO,
            user_id: await Storage._getCurrentUserId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const ordem = await Storage.add('service_orders', payload);
        console.log('✅ Ordem de serviço criada:', ordem);
        
        // Registrar despesa de material
        const despesaPayload = {
            id: gerarId(),
            ...DESPESA_MATERIAL,
            user_id: await Storage._getCurrentUserId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const despesa = await Storage.add('expenses', despesaPayload);
        console.log('✅ Despesa de material registrada:', despesa);
        
        // Disparar evento para atualizar a interface
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        
        return true;
    } catch (err) {
        console.error('Erro ao criar ordem de serviço:', err);
        return false;
    }
}

// Executar
adicionarOS().then(success => {
    if (success) {
        Toast.show('OS criada com sucesso! Valor: R$ 189,90 (Material: R$ 39,90 + Mão de obra: R$ 150,00)', 'success');
    }
});
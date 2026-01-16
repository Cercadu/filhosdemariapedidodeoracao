// ===== CONFIGURAÇÃO =====
const API_URL = "https://script.google.com/macros/s/AKfycbxLpomWiKs_ZoDJvBqg-RtJHeEGL6Ct2zqAayYX9i41YHThHopGXT8Z5ga0YMcz7eLB/exec";

// ===== VARIÁVEIS GLOBAIS =====
let todosPedidos = [];
let intercessorNome = '';
let pedidoAtual = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Área de Intercessão - Inicializando...');
    console.log('🌐 API URL:', API_URL);
    
    carregarPedidos();
    configurarEventos();
    setInterval(carregarPedidos, 120000);
});

// ===== CONFIGURAÇÃO DE EVENTOS =====
function configurarEventos() {
    // Botão de recarregar
    const btnRecarregar = document.getElementById('btn-recargar');
    if (btnRecarregar) {
        btnRecarregar.addEventListener('click', function() {
            carregarPedidos();
            mostrarNotificacao('🔄 Lista atualizada', 'success');
        });
    }
    
    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const filtro = this.dataset.filter;
            filtrarPedidos(filtro);
        });
    });
    
    // Modal - Confirmar
    const btnConfirmar = document.getElementById('btn-confirmar');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', confirmarIntercessor);
    }
    
    // Modal - Anônimo
    const btnAnonimo = document.getElementById('btn-anonimo');
    if (btnAnonimo) {
        btnAnonimo.addEventListener('click', function() {
            intercessorNome = 'Anônimo';
            fecharModal();
            executarMarcacaoOracao();
        });
    }
    
    // Modal - Enter para confirmar
    const nomeInput = document.getElementById('nome-intercessor');
    if (nomeInput) {
        nomeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmarIntercessor();
            }
        });
    }
}

// ===== CARREGAMENTO DE PEDIDOS =====
async function carregarPedidos() {
    console.log('📥 Carregando pedidos...');
    
    const lista = document.getElementById('lista-pedidos');
    const statusDiv = document.getElementById('status');
    
    if (!lista || !statusDiv) {
        console.error('❌ Elementos não encontrados');
        return;
    }
    
    // Mostra loading
    statusDiv.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Carregando pedidos de oração</h3>
            <p>Aguarde um momento...</p>
        </div>
    `;
    
    lista.innerHTML = '';
    
    try {
        const response = await fetch(API_URL + '?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Dados recebidos:', data);
        
        todosPedidos = data;
        
        if (!Array.isArray(data) || data.length === 0) {
            statusDiv.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Aguardando novos pedidos de oração...</p>
                </div>
            `;
            atualizarEstatisticas([]);
            return;
        }
        
        // Atualiza interface
        atualizarEstatisticas(data);
        renderizarPedidos(data);
        statusDiv.innerHTML = '';
        
        console.log(`✅ ${data.length} pedidos carregados`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        
        statusDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar pedidos</h3>
                <p>${error.message}</p>
                <p>Verifique sua conexão com a internet.</p>
                <button onclick="carregarPedidos()" class="btn-control" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Tentar novamente
                </button>
            </div>
        `;
    }
}

// ===== ATUALIZAÇÃO DE ESTATÍSTICAS =====
function atualizarEstatisticas(pedidos) {
    if (!Array.isArray(pedidos)) {
        pedidos = [];
    }
    
    const total = pedidos.length;
    let pendentes = 0;
    let emOracao = 0;
    
    pedidos.forEach(pedido => {
        const status = pedido.status || '';
        if (status.includes('oração') || status.includes('Orando')) {
            emOracao++;
        } else {
            pendentes++;
        }
    });
    
    console.log(`📊 Estatísticas: Total=${total}, Pendentes=${pendentes}, EmOração=${emOracao}`);
    
    atualizarElemento('total-pedidos', total);
    atualizarElemento('pendentes', pendentes);
    atualizarElemento('em-oracao', emOracao);
}

function atualizarElemento(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor;
    }
}

// ===== RENDERIZAÇÃO DE PEDIDOS =====
function renderizarPedidos(pedidos) {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    // Ordena do mais recente para o mais antigo
    const pedidosOrdenados = [...pedidos].reverse();
    
    pedidosOrdenados.forEach(pedido => {
        const card = criarCardPedido(pedido);
        lista.appendChild(card);
    });
}

function criarCardPedido(pedido) {
    const card = document.createElement('div');
    card.className = 'pedido-card';
    
    const status = pedido.status || '';
    const estaOrando = status.includes('oração') || status.includes('Orando');
    
    if (estaOrando) {
        card.classList.add('praying');
    }
    
    const nomeExibicao = pedido.anonimo === 'Sim' 
        ? '🙈 Anônimo' 
        : (pedido.nome ? pedido.nome.trim() : '🙈 Anônimo');
    
    const dataFormatada = formatarData(pedido.timestamp);
    
    card.innerHTML = `
        <div class="pedido-header">
            <div class="pedido-nome">
                <i class="fas fa-user"></i> ${nomeExibicao}
            </div>
            <div class="pedido-status ${estaOrando ? 'status-praying' : 'status-pending'}">
                ${estaOrando ? '🙏 Em oração' : '⏳ Aguardando'}
            </div>
        </div>
        
        <div class="pedido-body">
            <div class="pedido-texto">${pedido.pedido || 'Pedido de oração'}</div>
        </div>
        
        <div class="pedido-footer">
            <div class="pedido-data">
                <i class="far fa-clock"></i>
                ${dataFormatada}
                ${pedido.dataOracao ? `<br><small><i class="fas fa-hands-praying"></i> ${pedido.dataOracao}</small>` : ''}
            </div>
            
            ${estaOrando ? 
                `<div class="orando-info">
                    <i class="fas fa-check-circle"></i>
                    ${pedido.intercessor ? `Por: ${pedido.intercessor}` : 'Intercessor'}
                </div>` : 
                `<button class="btn-orar" onclick="iniciarOracao(${pedido.linha})">
                    <i class="fas fa-hands-praying"></i>
                    Orar por este
                </button>`
            }
        </div>
    `;
    
    return card;
}

function formatarData(timestamp) {
    if (!timestamp) return 'Sem data';
    
    try {
        const data = new Date(timestamp);
        
        if (isNaN(data.getTime())) {
            return timestamp;
        }
        
        const dia = data.getDate().toString().padStart(2, '0');
        const mes = (data.getMonth() + 1).toString().padStart(2, '0');
        const ano = data.getFullYear();
        const horas = data.getHours().toString().padStart(2, '0');
        const minutos = data.getMinutes().toString().padStart(2, '0');
        
        return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
        
    } catch (error) {
        console.warn('Erro ao formatar data:', error);
        return timestamp;
    }
}

// ===== SISTEMA DE ORAÇÃO (SIMPLIFICADO E CORRIGIDO) =====
function iniciarOracao(linha) {
    console.log(`🙏 Iniciando oração para linha ${linha}`);
    
    // SALVA O PEDIDO ATUAL
    pedidoAtual = linha;
    console.log('💾 Pedido salvo:', pedidoAtual);
    
    // Mostra modal
    const modal = document.getElementById('modal-intercessor');
    if (modal) {
        modal.classList.add('active');
        const nomeInput = document.getElementById('nome-intercessor');
        if (nomeInput) {
            nomeInput.value = '';
            nomeInput.focus();
        }
    } else {
        console.warn('Modal não encontrado, usando fallback');
        intercessorNome = 'Intercessor';
        executarMarcacaoOracao();
    }
}

function confirmarIntercessor() {
    console.log('✅ Confirmando intercessor...');
    
    const nomeInput = document.getElementById('nome-intercessor');
    if (nomeInput) {
        intercessorNome = nomeInput.value.trim();
        if (!intercessorNome) intercessorNome = 'Intercessor';
    } else {
        intercessorNome = 'Intercessor';
    }
    
    console.log('🙏 Intercessor:', intercessorNome);
    
    fecharModal();
    executarMarcacaoOracao();
}

function fecharModal() {
    const modal = document.getElementById('modal-intercessor');
    if (modal) {
        modal.classList.remove('active');
    }
    
    const nomeInput = document.getElementById('nome-intercessor');
    if (nomeInput) {
        nomeInput.value = '';
    }
}

async function executarMarcacaoOracao() {
    console.log('🚀 Executando marcação de oração...');
    console.log('📌 pedidoAtual:', pedidoAtual);
    console.log('🙏 intercessorNome:', intercessorNome);
    
    if (!pedidoAtual) {
        mostrarNotificacao('❌ Nenhum pedido selecionado', 'error');
        return;
    }
    
    const linhaNumero = parseInt(pedidoAtual);
    if (isNaN(linhaNumero)) {
        mostrarNotificacao('❌ Erro: Pedido inválido', 'error');
        return;
    }
    
    console.log(`📝 Marcando linha ${linhaNumero} como orando por ${intercessorNome}`);
    
    // Encontra e desabilita o botão
    const botoes = document.querySelectorAll('.btn-orar');
    let botaoEncontrado = null;
    
    botoes.forEach(botao => {
        const onclickAttr = botao.getAttribute('onclick') || '';
        // Verifica se o onclick contém o número da linha
        if (onclickAttr.includes(`(${linhaNumero})`)) {
            botaoEncontrado = botao;
            console.log('✅ Botão encontrado');
        }
    });
    
    if (botaoEncontrado) {
        botaoEncontrado.disabled = true;
        botaoEncontrado.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }
    
    try {
        // CORREÇÃO: Usando método correto para POST
        const response = await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', // Google Apps Script requer no-cors para POST
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                linha: linhaNumero,
                intercessor: intercessorNome
            })
        });
        
        console.log('📨 Resposta do POST:', response);
        
        // Como estamos usando no-cors, não podemos ler a resposta
        // Mas podemos assumir que funcionou se não houver erro
        
        // Atualiza interface
        if (botaoEncontrado) {
            botaoEncontrado.innerHTML = '<i class="fas fa-check-circle"></i> Oração registrada!';
            botaoEncontrado.classList.add('orando');
            
            // Atualiza status no card
            const card = botaoEncontrado.closest('.pedido-card');
            if (card) {
                card.classList.add('praying');
                const statusDiv = card.querySelector('.pedido-status');
                if (statusDiv) {
                    statusDiv.textContent = '🙏 Em oração';
                    statusDiv.className = 'pedido-status status-praying';
                }
            }
        }
        
        // Mostra confirmação
        mostrarNotificacao(`✅ Oração registrada por ${intercessorNome}`, 'success');
        
        // Atualiza a lista após 1 segundo
        setTimeout(() => {
            carregarPedidos();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao marcar como orando:', error);
        
        // Reativa botão
        if (botaoEncontrado) {
            botaoEncontrado.disabled = false;
            botaoEncontrado.innerHTML = '<i class="fas fa-hands-praying"></i> Orar por este';
        }
        
        mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
    }
}

// Função antiga mantida para compatibilidade
async function marcarComoOrando() {
    console.log('⚠️ marcarComoOrando() chamada - redirecionando...');
    executarMarcacaoOracao();
}

// ===== FILTRAGEM =====
function filtrarPedidos(filtro) {
    if (!Array.isArray(todosPedidos) || todosPedidos.length === 0) {
        return;
    }
    
    let pedidosFiltrados;
    
    switch(filtro) {
        case 'pending':
            pedidosFiltrados = todosPedidos.filter(p => {
                const status = p.status || '';
                return !status.includes('oração') && !status.includes('Orando');
            });
            break;
            
        case 'praying':
            pedidosFiltrados = todosPedidos.filter(p => {
                const status = p.status || '';
                return status.includes('oração') || status.includes('Orando');
            });
            break;
            
        default: // 'all'
            pedidosFiltrados = [...todosPedidos];
            break;
    }
    
    renderizarPedidos(pedidosFiltrados);
}

// ===== NOTIFICAÇÕES =====
function mostrarNotificacao(mensagem, tipo = 'info') {
    // Remove notificações existentes
    const notificacoesAntigas = document.querySelectorAll('.notificacao');
    notificacoesAntigas.forEach(n => n.remove());
    
    // Cria nova notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    
    // Ícone baseado no tipo
    let icon = 'info-circle';
    if (tipo === 'success') icon = 'check-circle';
    if (tipo === 'error') icon = 'exclamation-circle';
    if (tipo === 'warning') icon = 'exclamation-triangle';
    
    notificacao.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${mensagem}</span>
    `;
    
    // Adiciona ao body
    document.body.appendChild(notificacao);
    
    // Mostra com animação
    setTimeout(() => {
        notificacao.classList.add('show');
    }, 10);
    
    // Remove após 3 segundos
    setTimeout(() => {
        notificacao.classList.remove('show');
        setTimeout(() => {
            if (notificacao.parentNode) {
                notificacao.parentNode.removeChild(notificacao);
            }
        }, 300);
    }, 3000);
}

// ===== FUNÇÕES GLOBAIS =====
window.iniciarOracao = iniciarOracao;
window.fecharModal = fecharModal;
window.confirmarIntercessor = confirmarIntercessor;
window.marcarComoOrando = marcarComoOrando;
window.executarMarcacaoOracao = executarMarcacaoOracao;

// Adiciona funções ao escopo global
if (typeof window !== 'undefined') {
    window.carregarPedidos = carregarPedidos;
    window.filtrarPedidos = filtrarPedidos;
}

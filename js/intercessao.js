// ===== CONFIGURAÇÃO =====
const API_URL = "https://script.google.com/macros/s/AKfycbzeGaVRYS1q9Tom1er3cmt4UwPY61qpICNBG1a5NOhMiPeIaNiPEBHiSKDY5yRf9QmQ/exec";

// ===== VARIÁVEIS GLOBAIS =====
let todosPedidos = [];
let intercessorNome = '';
let pedidoAtual = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Área de Intercessão - Inicializando...');
    
    // Carrega pedidos
    carregarPedidos();
    
    // Configura eventos
    configurarEventos();
    
    // Atualiza automaticamente a cada 2 minutos
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
            // Remove classe active de todos
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // Adiciona ao clicado
            this.classList.add('active');
            
            // Aplica filtro
            const filtro = this.dataset.filter;
            filtrarPedidos(filtro);
            
            // Feedback
            const filtroNomes = {
                'all': 'Todos',
                'pending': 'Pendentes',
                'praying': 'Em oração'
            };
            mostrarNotificacao(`📋 Mostrando: ${filtroNomes[filtro]}`, 'info');
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
            marcarComoOrando();
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
    
    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            fecharModal();
        }
    });
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
    
    // Mostra estado de carregamento
    statusDiv.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Carregando pedidos de oração</h3>
            <p>Conectando com o banco de dados espiritual...</p>
        </div>
    `;
    
    lista.innerHTML = '';
    
    try {
        // Faz requisição para a API
        const response = await fetch(API_URL + '?t=' + Date.now()); // Cache busting
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Dados recebidos:', data);
        
        // Verifica se é um array válido
        if (!Array.isArray(data)) {
            throw new Error('Resposta da API não é um array');
        }
        
        todosPedidos = data;
        
        // Se não há pedidos
        if (data.length === 0) {
            statusDiv.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Aguardando novos pedidos de oração...</p>
                    <p><small>Seja o primeiro a enviar um pedido!</small></p>
                </div>
            `;
            atualizarEstatisticas([]);
            return;
        }
        
        // Atualiza interface
        atualizarEstatisticas(data);
        renderizarPedidos(data);
        
        // Remove mensagem de status
        statusDiv.innerHTML = '';
        
        console.log(`✅ ${data.length} pedidos carregados com sucesso`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar pedidos:', error);
        
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
        
        // Mostra notificação de erro
        mostrarNotificacao('❌ Erro ao carregar pedidos', 'error');
    }
}

// ===== ATUALIZAÇÃO DE ESTATÍSTICAS =====
function atualizarEstatisticas(pedidos) {
    // Garante que pedidos é um array
    if (!Array.isArray(pedidos)) {
        pedidos = [];
    }
    
    const total = pedidos.length;
    let pendentes = 0;
    let emOracao = 0;
    
    // Conta pedidos por status
    pedidos.forEach(pedido => {
        const status = pedido.status || '';
        if (status.includes('oração') || status.includes('Orando')) {
            emOracao++;
        } else {
            pendentes++;
        }
    });
    
    console.log(`📊 Estatísticas: Total=${total}, Pendentes=${pendentes}, EmOração=${emOracao}`);
    
    // Atualiza elementos na tela
    atualizarElemento('total-pedidos', total);
    atualizarElemento('pendentes', pendentes);
    atualizarElemento('em-oracao', emOracao);
}

// Função auxiliar para atualizar elementos
function atualizarElemento(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        // Anima a mudança de valor
        const atual = parseInt(elemento.textContent) || 0;
        if (atual !== valor) {
            animarContador(elemento, atual, valor);
        }
    }
}

// Anima contador
function animarContador(elemento, inicio, fim) {
    const duracao = 500; // ms
    const incremento = (fim - inicio) / (duracao / 16);
    let atual = inicio;
    
    const timer = setInterval(() => {
        atual += incremento;
        
        if ((incremento > 0 && atual >= fim) || (incremento < 0 && atual <= fim)) {
            elemento.textContent = fim;
            clearInterval(timer);
        } else {
            elemento.textContent = Math.round(atual);
        }
    }, 16);
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

// Cria card individual
function criarCardPedido(pedido) {
    const card = document.createElement('div');
    card.className = 'pedido-card';
    
    // Determina status
    const status = pedido.status || '';
    const estaOrando = status.includes('oração') || status.includes('Orando');
    
    if (estaOrando) {
        card.classList.add('praying');
    }
    
    // Formata nome
    const nomeExibicao = pedido.anonimo === 'Sim' 
        ? '🙈 Anônimo' 
        : (pedido.nome ? pedido.nome.trim() : '🙈 Anônimo');
    
    // Formata data
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

// Formata data
function formatarData(timestamp) {
    if (!timestamp) return 'Sem data';
    
    try {
        const data = new Date(timestamp);
        
        // Verifica se é uma data válida
        if (isNaN(data.getTime())) {
            return timestamp;
        }
        
        // Formata: DD/MM/AAAA HH:MM
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

// ===== SISTEMA DE ORAÇÃO =====
function iniciarOracao(linha) {
    console.log(`🙏 Iniciando oração para linha ${linha}`);
    pedidoAtual = linha;
    
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
        // Fallback se não houver modal
        intercessorNome = 'Intercessor';
        marcarComoOrando();
    }
}

function confirmarIntercessor() {
    const nomeInput = document.getElementById('nome-intercessor');
    if (nomeInput) {
        intercessorNome = nomeInput.value.trim();
        
        // Se vazio, usa padrão
        if (!intercessorNome) {
            intercessorNome = 'Intercessor';
        }
    } else {
        intercessorNome = 'Intercessor';
    }
    
    fecharModal();
    marcarComoOrando();
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
    
    pedidoAtual = null;
}

async function marcarComoOrando() {
    if (!pedidoAtual) {
        mostrarNotificacao('❌ Nenhum pedido selecionado', 'error');
        return;
    }
    
    console.log(`📝 Marcando linha ${pedidoAtual} como orando por ${intercessorNome}`);
    
    // Encontra e desabilita o botão
    const botoes = document.querySelectorAll('.btn-orar');
    let botaoEncontrado = null;
    
    botoes.forEach(botao => {
        if (botao.getAttribute('onclick')?.includes(pedidoAtual)) {
            botaoEncontrado = botao;
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        }
    });
    
    try {
        // Envia para API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                linha: pedidoAtual,
                intercessor: intercessorNome
            })
        });
        
        const resultado = await response.json();
        console.log('📨 Resposta da API:', resultado);
        
        if (resultado.success) {
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
            
            // Atualiza estatísticas após 1 segundo
            setTimeout(() => {
                carregarPedidos();
            }, 1000);
            
        } else {
            throw new Error(resultado.message || 'Erro desconhecido');
        }
        
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

// ===== FUNÇÕES GLOBAIS (para onclick) =====
window.iniciarOracao = iniciarOracao;
window.fecharModal = fecharModal;

// Adiciona funções ao escopo global para os eventos onclick
if (typeof window !== 'undefined') {
    window.carregarPedidos = carregarPedidos;
    window.filtrarPedidos = filtrarPedidos;
}

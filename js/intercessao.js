// ===== CONFIGURAÇÃO =====
const API_URL = "https://script.google.com/macros/s/AKfycbxLpomWiKs_ZoDJvBqg-RtJHeEGL6Ct2zqAayYX9i41YHThHopGXT8Z5ga0YMcz7eLB/exec";

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

// ===== SISTEMA DE ORAÇÃO (CORRIGIDO) =====

// Variável global para armazenar o pedido selecionado
let pedidoSelecionadoParaOrar = null;

function iniciarOracao(linha) {
    console.log(`🙏 Iniciando oração para linha ${linha}`);
    
    // SALVA O PEDIDO em DUAS variáveis globais
    pedidoAtual = linha;
    pedidoSelecionadoParaOrar = linha;
    
    console.log('💾 Pedidos salvos:', {
        pedidoAtual: pedidoAtual,
        pedidoSelecionadoParaOrar: pedidoSelecionadoParaOrar
    });
    
    // Mostra modal
    const modal = document.getElementById('modal-intercessor');
    if (modal) {
        modal.classList.add('active');
        const nomeInput = document.getElementById('nome-intercessor');
        if (nomeInput) {
            nomeInput.value = '';
            nomeInput.focus();
        }
        
        // Atualiza título do modal para mostrar qual pedido
        const modalTitle = modal.querySelector('h3');
        if (modalTitle) {
            modalTitle.innerHTML = `<i class="fas fa-hands-praying"></i> Orar pelo Pedido #${linha}`;
        }
    } else {
        console.warn('Modal não encontrado, usando fallback');
        intercessorNome = 'Intercessor';
        marcarComoOrando();
    }
}

function confirmarIntercessor() {
    console.log('✅ Confirmando intercessor...');
    console.log('📌 pedidoAtual:', pedidoAtual);
    console.log('📌 pedidoSelecionadoParaOrar:', pedidoSelecionadoParaOrar);
    
    const nomeInput = document.getElementById('nome-intercessor');
    if (nomeInput) {
        intercessorNome = nomeInput.value.trim();
        if (!intercessorNome) intercessorNome = 'Intercessor';
    } else {
        intercessorNome = 'Intercessor';
    }
    
    console.log('🙏 Intercessor:', intercessorNome);
    
    fecharModal();
    
    // Usa a variável específica para oração
    const linhaParaOrar = pedidoSelecionadoParaOrar || pedidoAtual;
    
    if (!linhaParaOrar) {
        console.error('❌ Nenhuma linha encontrada para orar!');
        mostrarNotificacao('❌ Erro: Pedido perdido. Clique novamente em "Orar".', 'error');
        return;
    }
    
    console.log('🎯 Linha para orar:', linhaParaOrar);
    
    // Pequeno delay para garantir que o modal fechou
    setTimeout(() => {
        executarMarcacaoOracao(linhaParaOrar);
    }, 50);
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
    
    // NÃO LIMPA pedidoAtual aqui! Só quando a oração for concluída
}

async function executarMarcacaoOracao(linha) {
    console.log(`🚀 Executando marcação para linha ${linha}`);
    
    if (!linha) {
        mostrarNotificacao('❌ Nenhum pedido selecionado', 'error');
        return;
    }
    
    const linhaNumero = parseInt(linha);
    if (isNaN(linhaNumero)) {
        mostrarNotificacao('❌ Erro: Pedido inválido', 'error');
        return;
    }
    
    console.log(`📝 Marcando linha ${linhaNumero} como orando por ${intercessorNome}`);
    
    // Encontra e desabilita o botão CORRETAMENTE
    const botoes = document.querySelectorAll('.btn-orar');
    let botaoEncontrado = null;
    
    botoes.forEach(botao => {
        // Converte o onclick para string e busca o número
        const onclickAttr = botao.getAttribute('onclick') || '';
        // Procura por "iniciarOracao(NUMERO)"
        if (onclickAttr.includes(`(${linhaNumero})`)) {
            botaoEncontrado = botao;
        }
    });
    
    // Se não encontrou, tenta encontrar qualquer botão disponível
    if (!botaoEncontrado && botoes.length > 0) {
        botaoEncontrado = botoes[0]; // Primeiro botão disponível
    }
    
    if (botaoEncontrado) {
        botaoEncontrado.disabled = true;
        botaoEncontrado.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }
    
    try {
        // Envia para API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                linha: linhaNumero,
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
            
            // Limpa as variáveis APÓS sucesso
            pedidoAtual = null;
            pedidoSelecionadoParaOrar = null;
            
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
        
        // Mantém as variáveis para tentar novamente
        console.log('🔄 Mantendo pedido para nova tentativa:', pedidoSelecionadoParaOrar);
    }
}

// Função original mantida para compatibilidade
async function marcarComoOrando() {
    console.log('⚠️ marcarComoOrando() chamada diretamente - usando backup');
    
    // Tenta usar a variável específica
    const linhaParaOrar = pedidoSelecionadoParaOrar || pedidoAtual;
    
    if (!linhaParaOrar) {
        mostrarNotificacao('❌ Nenhum pedido selecionado', 'error');
        return;
    }
    
    executarMarcacaoOracao(linhaParaOrar);
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
window.confirmarIntercessor = confirmarIntercessor;
window.marcarComoOrando = marcarComoOrando;

// Adiciona funções ao escopo global para os eventos onclick
if (typeof window !== 'undefined') {
    window.carregarPedidos = carregarPedidos;
    window.filtrarPedidos = filtrarPedidos;
}

// ===== SISTEMA DE BACKUP (para evitar perda do pedido) =====
(function() {
    console.log('🛡️ Sistema de backup inicializado');
    
    // Backup no localStorage quando um pedido é selecionado
    const backupPedido = (linha) => {
        localStorage.setItem('backupPedidoOracao', linha);
        localStorage.setItem('backupTimestamp', Date.now());
        console.log('💾 Backup salvo:', linha);
    };
    
    // Restaura do backup se necessário
    const restaurarBackup = () => {
        const backup = localStorage.getItem('backupPedidoOracao');
        const timestamp = localStorage.getItem('backupTimestamp');
        
        if (backup && timestamp) {
            const tempoPassado = Date.now() - parseInt(timestamp);
            // Só restaura se foi nos últimos 5 minutos
            if (tempoPassado < 5 * 60 * 1000) {
                console.log('🔄 Restaurando backup:', backup);
                pedidoSelecionadoParaOrar = parseInt(backup);
                return true;
            }
        }
        return false;
    };
    
    // Monitora cliques nos botões "Orar"
    document.addEventListener('click', function(e) {
        const botao = e.target.closest('.btn-orar');
        if (botao) {
            const onclick = botao.getAttribute('onclick') || '';
            const match = onclick.match(/iniciarOracao\((\d+)\)/);
            if (match && match[1]) {
                backupPedido(match[1]);
            }
        }
    });
    
    // Tenta restaurar backup ao carregar a página
    setTimeout(() => {
        if (!pedidoSelecionadoParaOrar) {
            restaurarBackup();
        }
    }, 1000);
    
    console.log('✅ Sistema de backup pronto');
})();

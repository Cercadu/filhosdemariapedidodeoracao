// ===== CONFIGURAÇÃO =====
// TESTE: Use esta URL de teste primeiro
const API_URL_TESTE = "https://script.google.com/macros/s/AKfycbxLpomWiKs_ZoDJvBqg-RtJHeEGL6Ct2zqAayYX9i41YHThHopGXT8Z5ga0YMcz7eLB/exec";
const API_URL = API_URL_TESTE; // Use a URL que você testou e funcionou

// ===== VARIÁVEIS GLOBAIS =====
let todosPedidos = [];
let intercessorNome = '';
let pedidoAtual = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Área de Intercessão - Inicializando...');
    console.log('🌐 API URL:', API_URL);
    
    // Testa a conexão primeiro
    testarConexaoAPI().then(conectado => {
        if (conectado) {
            carregarPedidos();
            configurarEventos();
            setInterval(carregarPedidos, 120000);
        } else {
            mostrarErroConexao();
        }
    });
});

// ===== TESTE DE CONEXÃO =====
async function testarConexaoAPI() {
    console.log('🔍 Testando conexão com a API...');
    
    try {
        const response = await fetch(API_URL + '?teste=' + Date.now(), {
            method: 'GET',
            mode: 'no-cors' // Tenta modo no-cors primeiro
        }).catch(() => {
            // Se no-cors falhar, tenta normal
            return fetch(API_URL + '?teste=' + Date.now());
        });
        
        console.log('📡 Status da resposta:', response.status, response.statusText);
        
        if (response.ok || response.type === 'opaque') {
            console.log('✅ Conexão com API estabelecida');
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Erro na conexão:', error);
        return false;
    }
}

function mostrarErroConexao() {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = `
        <div class="error-message">
            <i class="fas fa-wifi-slash"></i>
            <h3>Erro de Conexão</h3>
            <p>Não foi possível conectar com o servidor.</p>
            <p><strong>Possíveis causas:</strong></p>
            <ol style="text-align: left; margin: 10px 0;">
                <li>API do Google Apps Script não está publicada</li>
                <li>URL da API está incorreta</li>
                <li>Permissões não estão como "Qualquer pessoa"</li>
                <li>Problema de rede/conexão</li>
            </ol>
            <div style="margin-top: 20px;">
                <button onclick="testarConexaoManual()" class="btn-control">
                    <i class="fas fa-plug"></i> Testar Conexão Manualmente
                </button>
                <button onclick="window.open('${API_URL}', '_blank')" class="btn-control" style="margin-left: 10px;">
                    <i class="fas fa-external-link-alt"></i> Abrir API no Navegador
                </button>
            </div>
        </div>
    `;
}

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
    
    // Modal
    const btnConfirmar = document.getElementById('btn-confirmar');
    const btnAnonimo = document.getElementById('btn-anonimo');
    
    if (btnConfirmar) btnConfirmar.addEventListener('click', confirmarIntercessor);
    if (btnAnonimo) btnAnonimo.addEventListener('click', () => {
        intercessorNome = 'Anônimo';
        fecharModal();
        marcarComoOrando();
    });
}

// ===== CARREGAMENTO DE PEDIDOS (COM TRATAMENTO DE ERRO) =====
async function carregarPedidos() {
    console.log('📥 Carregando pedidos...');
    
    const lista = document.getElementById('lista-pedidos');
    const statusDiv = document.getElementById('status');
    
    if (!lista || !statusDiv) return;
    
    // Mostra loading
    statusDiv.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Conectando ao servidor...</h3>
            <p>Isso pode levar alguns segundos</p>
        </div>
    `;
    
    lista.innerHTML = '';
    
    try {
        console.log('🔄 Fazendo request para:', API_URL);
        
        // Timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(API_URL + '?t=' + Date.now(), {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📡 Resposta recebida. Status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Dados recebidos. Tipo:', typeof data);
        
        if (data.error) {
            throw new Error(`Erro da API: ${data.error}`);
        }
        
        if (!Array.isArray(data)) {
            console.warn('⚠️ Dados não são array:', data);
            // Tenta converter se for objeto único
            todosPedidos = Array.isArray(data) ? data : [data];
        } else {
            todosPedidos = data;
        }
        
        // Se não há pedidos
        if (todosPedidos.length === 0) {
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
        atualizarEstatisticas(todosPedidos);
        renderizarPedidos(todosPedidos);
        statusDiv.innerHTML = '';
        
        console.log(`✅ ${todosPedidos.length} pedidos carregados`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        
        let mensagemErro = error.message;
        if (error.name === 'AbortError') {
            mensagemErro = 'Timeout: A requisição demorou muito. Tente novamente.';
        }
        
        statusDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Falha na Conexão</h3>
                <p><strong>${mensagemErro}</strong></p>
                <p>Verifique:</p>
                <ol style="text-align: left; margin: 10px 20px;">
                    <li>Se a API está publicada como "Aplicativo da Web"</li>
                    <li>Se o acesso está como "Qualquer pessoa"</li>
                    <li>Sua conexão com a internet</li>
                </ol>
                <div style="margin-top: 20px;">
                    <button onclick="testarConexaoManual()" class="btn-control">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                    <button onclick="window.open('${API_URL}', '_blank')" class="btn-control" style="margin-left: 10px;">
                        <i class="fas fa-external-link-alt"></i> Testar API Direto
                    </button>
                </div>
            </div>
        `;
        
        mostrarNotificacao('❌ Erro de conexão com o servidor', 'error');
    }
}

// ===== TESTE MANUAL =====
async function testarConexaoManual() {
    console.log('🔧 Teste manual iniciado...');
    
    try {
        // Tenta acessar diretamente
        const resposta = await fetch(API_URL);
        const dados = await resposta.text();
        
        console.log('Resposta bruta:', dados.substring(0, 200) + '...');
        
        alert(`✅ Conexão estabelecida!\nStatus: ${resposta.status}\n\nTeste novamente carregar os pedidos.`);
        
        // Recarrega após teste
        carregarPedidos();
        
    } catch (error) {
        console.error('Teste manual falhou:', error);
        alert(`❌ Falha na conexão:\n\n${error.message}\n\nVerifique a URL da API.`);
    }
}

// ===== FUNÇÕES RESTANTES (mantenha as mesmas do seu código anterior) =====
// ... (copie as funções restantes do seu código anterior aqui) ...

function atualizarEstatisticas(pedidos) {
    if (!Array.isArray(pedidos)) pedidos = [];
    const total = pedidos.length;
    let pendentes = 0, emOracao = 0;
    
    pedidos.forEach(p => {
        const status = p.status || '';
        if (status.includes('oração') || status.includes('Orando')) emOracao++;
        else pendentes++;
    });
    
    atualizarElemento('total-pedidos', total);
    atualizarElemento('pendentes', pendentes);
    atualizarElemento('em-oracao', emOracao);
}

function atualizarElemento(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function renderizarPedidos(pedidos) {
    const lista = document.getElementById('lista-pedidos');
    if (!lista) return;
    
    lista.innerHTML = '';
    [...pedidos].reverse().forEach(pedido => {
        lista.appendChild(criarCardPedido(pedido));
    });
}

function criarCardPedido(pedido) {
    const card = document.createElement('div');
    card.className = 'pedido-card';
    
    const status = pedido.status || '';
    const estaOrando = status.includes('oração') || status.includes('Orando');
    if (estaOrando) card.classList.add('praying');
    
    const nomeExibicao = pedido.anonimo === 'Sim' ? '🙈 Anônimo' : (pedido.nome?.trim() || '🙈 Anônimo');
    const dataFormatada = formatarData(pedido.timestamp);
    
    card.innerHTML = `
        <div class="pedido-header">
            <div class="pedido-nome"><i class="fas fa-user"></i> ${nomeExibicao}</div>
            <div class="pedido-status ${estaOrando ? 'status-praying' : 'status-pending'}">
                ${estaOrando ? '🙏 Em oração' : '⏳ Aguardando'}
            </div>
        </div>
        <div class="pedido-body">
            <div class="pedido-texto">${pedido.pedido || 'Pedido de oração'}</div>
        </div>
        <div class="pedido-footer">
            <div class="pedido-data">
                <i class="far fa-clock"></i> ${dataFormatada}
                ${pedido.dataOracao ? `<br><small><i class="fas fa-hands-praying"></i> ${pedido.dataOracao}</small>` : ''}
            </div>
            ${estaOrando ? 
                `<div class="orando-info"><i class="fas fa-check-circle"></i> ${pedido.intercessor ? `Por: ${pedido.intercessor}` : 'Intercessor'}</div>` : 
                `<button class="btn-orar" onclick="iniciarOracao(${pedido.linha})"><i class="fas fa-hands-praying"></i> Orar por este</button>`
            }
        </div>
    `;
    
    return card;
}

function formatarData(timestamp) {
    if (!timestamp) return 'Sem data';
    try {
        const data = new Date(timestamp);
        if (isNaN(data.getTime())) return timestamp;
        const dia = data.getDate().toString().padStart(2, '0');
        const mes = (data.getMonth() + 1).toString().padStart(2, '0');
        const ano = data.getFullYear();
        const horas = data.getHours().toString().padStart(2, '0');
        const minutos = data.getMinutes().toString().padStart(2, '0');
        return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
    } catch { return timestamp; }
}

function iniciarOracao(linha) {
    pedidoAtual = linha;
    const modal = document.getElementById('modal-intercessor');
    if (modal) {
        modal.classList.add('active');
        const nomeInput = document.getElementById('nome-intercessor');
        if (nomeInput) {
            nomeInput.value = '';
            nomeInput.focus();
        }
    } else {
        intercessorNome = 'Intercessor';
        marcarComoOrando();
    }
}

function confirmarIntercessor() {
    const nomeInput = document.getElementById('nome-intercessor');
    intercessorNome = nomeInput ? nomeInput.value.trim() : 'Intercessor';
    if (!intercessorNome) intercessorNome = 'Intercessor';
    
    fecharModal();
    
    if (!pedidoAtual) {
        mostrarNotificacao('❌ Nenhum pedido selecionado', 'error');
        return;
    }
    
    setTimeout(() => marcarComoOrando(), 50);
}

function fecharModal() {
    const modal = document.getElementById('modal-intercessor');
    if (modal) modal.classList.remove('active');
    const nomeInput = document.getElementById('nome-intercessor');
    if (nomeInput) nomeInput.value = '';
}

async function marcarComoOrando() {
    if (!pedidoAtual) {
        mostrarNotificacao('❌ Nenhum pedido selecionado', 'error');
        return;
    }
    
    const botoes = document.querySelectorAll('.btn-orar');
    let botaoEncontrado = null;
    
    botoes.forEach(botao => {
        if (botao.getAttribute('onclick')?.includes(`(${pedidoAtual})`)) {
            botaoEncontrado = botao;
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        }
    });
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                linha: pedidoAtual,
                intercessor: intercessorNome
            })
        });
        
        const resultado = await response.json();
        
        if (resultado.success) {
            if (botaoEncontrado) {
                botaoEncontrado.innerHTML = '<i class="fas fa-check-circle"></i> Oração registrada!';
                botaoEncontrado.classList.add('orando');
            }
            
            mostrarNotificacao(`✅ Oração registrada por ${intercessorNome}`, 'success');
            setTimeout(() => carregarPedidos(), 1000);
            
        } else {
            throw new Error(resultado.message);
        }
        
    } catch (error) {
        console.error('Erro:', error);
        if (botaoEncontrado) {
            botaoEncontrado.disabled = false;
            botaoEncontrado.innerHTML = '<i class="fas fa-hands-praying"></i> Orar por este';
        }
        mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
    }
}

function filtrarPedidos(filtro) {
    if (!Array.isArray(todosPedidos)) return;
    let filtrados = [...todosPedidos];
    
    switch(filtro) {
        case 'pending':
            filtrados = filtrados.filter(p => !(p.status || '').includes('oração') && !(p.status || '').includes('Orando'));
            break;
        case 'praying':
            filtrados = filtrados.filter(p => (p.status || '').includes('oração') || (p.status || '').includes('Orando'));
            break;
    }
    
    renderizarPedidos(filtrados);
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    const notificacoesAntigas = document.querySelectorAll('.notificacao');
    notificacoesAntigas.forEach(n => n.remove());
    
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    
    let icon = 'info-circle';
    if (tipo === 'success') icon = 'check-circle';
    if (tipo === 'error') icon = 'exclamation-circle';
    
    notificacao.innerHTML = `<i class="fas fa-${icon}"></i><span>${mensagem}</span>`;
    document.body.appendChild(notificacao);
    
    setTimeout(() => notificacao.classList.add('show'), 10);
    setTimeout(() => {
        notificacao.classList.remove('show');
        setTimeout(() => notificacao.remove(), 300);
    }, 3000);
}

// ===== FUNÇÕES GLOBAIS =====
window.iniciarOracao = iniciarOracao;
window.fecharModal = fecharModal;
window.confirmarIntercessor = confirmarIntercessor;
window.marcarComoOrando = marcarComoOrando;
window.carregarPedidos = carregarPedidos;
window.filtrarPedidos = filtrarPedidos;
window.testarConexaoManual = testarConexaoManual;

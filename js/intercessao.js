const API_URL = "https://script.google.com/macros/s/AKfycbyXPpE3_Nqyfle2tRXNpDkKs4yh4oIAANF_Gocw5HkZK2X0yiNEqHt7SrK_86S5qMk4/exec";

// Estado global
let pedidos = [];
let intercessorAtual = '';
let pedidoEmOracao = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  carregarPedidos();
  configurarEventos();
  configurarConfetti();
});

// Configura eventos
function configurarEventos() {
  // Botão recarregar
  document.getElementById('btn-recargar').addEventListener('click', carregarPedidos);
  
  // Filtros
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      filtrarPedidos(this.dataset.filter);
    });
  });
  
  // Modal
  document.getElementById('btn-confirmar').addEventListener('click', confirmarIntercessor);
  document.getElementById('btn-anonimo').addEventListener('click', () => {
    intercessorAtual = 'Anônimo';
    document.getElementById('modal-intercessor').classList.remove('active');
    confirmarOracao();
  });
  
  // Fechar modal com ESC
  document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('modal-intercessor');
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
      pedidoEmOracao = null;
    }
  });
}

// Carrega pedidos da API
async function carregarPedidos() {
  const lista = document.getElementById('lista-pedidos');
  const statusDiv = document.getElementById('status');
  
  if (!lista || !statusDiv) return;
  
  // Mostra loading
  statusDiv.innerHTML = `
    <div class="loading-message">
      <i class="fas fa-spinner fa-spin"></i>
      <h3>Buscando pedidos de oração...</h3>
      <p>Conectando com o Ministério Filhos de Maria</p>
    </div>
  `;
  
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!Array.isArray(data) || data.length === 0) {
      statusDiv.innerHTML = `
        <div class="empty-message">
          <i class="fas fa-inbox"></i>
          <h3>Nenhum pedido encontrado</h3>
          <p>Aguardando novos pedidos de oração...</p>
        </div>
      `;
      lista.innerHTML = '';
      atualizarEstatisticas([]);
      return;
    }
    
    pedidos = data;
    
    // Atualiza interface
    atualizarEstatisticas(pedidos);
    renderizarPedidos(pedidos);
    
    // Remove mensagem de status
    statusDiv.innerHTML = '';
    
    // Efeito visual de novos pedidos
    verificarNovosPedidos();
    
  } catch (error) {
    console.error('Erro:', error);
    statusDiv.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Erro ao carregar pedidos</h3>
        <p>${error.message}</p>
        <button onclick="carregarPedidos()" class="btn-action" style="margin-top: 1rem;">
          <i class="fas fa-redo"></i> Tentar novamente
        </button>
      </div>
    `;
  }
}

// ATUALIZA ESTATÍSTICAS - VERSÃO SIMPLES E SEGURA
function atualizarEstatisticas(pedidos) {
  // Verifica se pedidos é um array válido
  if (!Array.isArray(pedidos)) {
    pedidos = [];
  }
  
  const total = pedidos.length;
  let pendentes = 0;
  let emOracao = 0;
  
  // Conta manualmente para evitar erros
  pedidos.forEach(pedido => {
    if (!pedido.status || 
        pedido.status === '' || 
        pedido.status === '⏳ Pendente' || 
        pedido.status === 'Pendente') {
      pendentes++;
    } else {
      emOracao++;
    }
  });
  
  console.log('Total:', total, 'Pendentes:', pendentes, 'Em oração:', emOracao);
  
  // Atualiza na tela com segurança
  atualizarElemento('total-pedidos', total);
  atualizarElemento('pendentes', pendentes);
  atualizarElemento('em-oracao', emOracao);
}

// FUNÇÃO AUXILIAR PARA ATUALIZAR ELEMENTOS
function atualizarElemento(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) {
    elemento.textContent = valor;
  }
}

// Anima contadores
function animarContador(id, valorFinal) {
  const elemento = document.getElementById(id);
  if (!elemento) return;
  
  let valorAtual = parseInt(elemento.textContent) || 0;
  const incremento = valorFinal > valorAtual ? 1 : -1;
  
  const animacao = setInterval(() => {
    valorAtual += incremento;
    elemento.textContent = valorAtual;
    
    if (valorAtual === valorFinal) {
      clearInterval(animacao);
    }
  }, 50);
}

// Renderiza pedidos
function renderizarPedidos(pedidosParaRenderizar) {
  const lista = document.getElementById('lista-pedidos');
  if (!lista) return;
  
  lista.innerHTML = '';
  
  pedidosParaRenderizar.forEach(pedido => {
    const card = criarCardPedido(pedido);
    lista.appendChild(card);
  });
}

// Cria card de pedido
function criarCardPedido(pedido) {
  const card = document.createElement('div');
  card.className = `pedido-card ${pedido.status.includes('oração') ? 'praying' : ''}`;
  card.dataset.id = pedido.id;
  card.dataset.status = pedido.status.includes('oração') ? 'praying' : 'pending';
  
  const nomeExibicao = pedido.anonimo === 'Sim' 
    ? '<i class="fas fa-user-secret"></i> Anônimo' 
    : `<i class="fas fa-user"></i> ${pedido.nome || 'Anônimo'}`;
  
  const estaOrando = pedido.status.includes('oração');
  
  card.innerHTML = `
    <div class="pedido-header">
      <div class="pedido-nome">${nomeExibicao}</div>
      <div class="pedido-status ${estaOrando ? 'status-praying' : 'status-pending'}">
        ${estaOrando ? '<i class="fas fa-hands-praying"></i> Em oração' : '<i class="fas fa-clock"></i> Aguardando'}
      </div>
    </div>
    
    <div class="pedido-body">
      <div class="pedido-texto">${pedido.pedido || 'Pedido sem descrição'}</div>
    </div>
    
    <div class="pedido-footer">
      <div class="pedido-data">
        <i class="far fa-clock"></i>
        ${formatarData(pedido.timestamp)}
        ${pedido.dataOracao ? `<br><small><i class="fas fa-hands-praying"></i> Oração iniciada: ${pedido.dataOracao}</small>` : ''}
      </div>
      
      ${estaOrando ? 
        `<div class="orando-info">
          <i class="fas fa-check-circle"></i>
          ${pedido.intercessor ? `Orando por: ${pedido.intercessor}` : 'Em oração'}
        </div>` : 
        `<button class="btn-orar" onclick="iniciarOracao(${pedido.linha})">
          <i class="fas fa-hands-praying"></i>
          Orar por este pedido
        </button>`
      }
    </div>
  `;
  
  return card;
}

// Formata data
function formatarData(timestamp) {
  if (!timestamp) return 'Data não informada';
  
  try {
    const data = new Date(timestamp);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return timestamp;
  }
}

// Inicia processo de oração
function iniciarOracao(linha) {
  pedidoEmOracao = linha;
  
  // Mostra modal para identificar intercessor
  const modal = document.getElementById('modal-intercessor');
  modal.classList.add('active');
  document.getElementById('nome-intercessor').focus();
}

// Confirma intercessor
function confirmarIntercessor() {
  const nomeInput = document.getElementById('nome-intercessor');
  intercessorAtual = nomeInput.value.trim() || 'Intercessor';
  
  const modal = document.getElementById('modal-intercessor');
  modal.classList.remove('active');
  nomeInput.value = '';
  
  confirmarOracao();
}

// Confirma oração na API
async function confirmarOracao() {
  if (!pedidoEmOracao) return;
  
  try {
    const btn = document.querySelector(`.pedido-card[data-linha="${pedidoEmOracao}"] .btn-orar`);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    }
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        linha: pedidoEmOracao,
        intercessor: intercessorAtual
      })
    });
    
    const resultado = await response.json();
    
    if (resultado.success) {
      // Efeitos visuais
      lancarConfetti();
      mostrarNotificacaoSucesso();
      
      // Atualiza interface
      setTimeout(() => {
        carregarPedidos();
        intercessorAtual = '';
        pedidoEmOracao = null;
      }, 1500);
      
    } else {
      throw new Error(resultado.message);
    }
    
  } catch (error) {
    console.error('Erro:', error);
    alert(`Erro ao registrar oração: ${error.message}`);
    
    // Reativa botão
    const btn = document.querySelector(`.pedido-card[data-linha="${pedidoEmOracao}"] .btn-orar`);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-hands-praying"></i> Orar por este pedido';
    }
  }
}

// Filtra pedidos
function filtrarPedidos(filtro) {
  const lista = document.getElementById('lista-pedidos');
  if (!lista) return;
  
  let pedidosFiltrados = [...pedidos];
  
  switch(filtro) {
    case 'pending':
      pedidosFiltrados = pedidosFiltrados.filter(p => !p.status.includes('oração'));
      break;
    case 'praying':
      pedidosFiltrados = pedidosFiltrados.filter(p => p.status.includes('oração'));
      break;
  }
  
  renderizarPedidos(pedidosFiltrados);
}

// Verifica novos pedidos
function verificarNovosPedidos() {
  const cards = document.querySelectorAll('.pedido-card[data-status="pending"]');
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.style.animation = 'pulse 2s ease';
      setTimeout(() => card.style.animation = '', 2000);
    }, index * 200);
  });
}

// Notificação de sucesso
function mostrarNotificacaoSucesso() {
  const notificacao = document.createElement('div');
  notificacao.className = 'notificacao-sucesso';
  notificacao.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <div>
      <strong>Oração registrada!</strong>
      <p>Obrigado por interceder ${intercessorAtual}!</p>
    </div>
  `;
  
  document.body.appendChild(notificacao);
  
  setTimeout(() => {
    notificacao.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notificacao.classList.remove('show');
    setTimeout(() => notificacao.remove(), 300);
  }, 3000);
  
  // Estilo da notificação
  notificacao.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    z-index: 1000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
  `;
  
  notificacao.querySelector('i').style.fontSize = '2rem';
  
  // Adiciona classe .show via CSS
  const style = document.createElement('style');
  style.textContent = `
    .notificacao-sucesso.show {
      transform: translateX(0) !important;
    }
  `;
  document.head.appendChild(style);
}

// Sistema de Confetti
function configurarConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function lancarConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  
  const confettiCount = 150;
  const confetti = [];
  
  // Cria confetti
  for (let i = 0; i < confettiCount; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 10 + 5,
      d: Math.random() * confettiCount,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      tilt: Math.random() * 10 - 10,
      tiltAngleIncrement: Math.random() * 0.07 + 0.05,
      tiltAngle: 0
    });
  }
  
  // Animação
  function animarConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    confetti.forEach(c => {
      c.y += Math.cos(c.d) + 1 + c.r / 2;
      c.x += Math.sin(c.d);
      c.tiltAngle += c.tiltAngleIncrement;
      c.tilt = Math.sin(c.tiltAngle) * 15;
      
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.tilt);
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(0, 0, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Recicla confetti
      if (c.y > canvas.height) {
        c.y = -c.r;
      }
    });
    
    requestAnimationFrame(animarConfetti);
  }
  
  animarConfetti();
  
  // Para animação após 3 segundos
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 3000);
}

// Auto-refresh a cada 1 minuto
setInterval(carregarPedidos, 60000);

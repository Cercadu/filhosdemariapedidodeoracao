const API_URL = "https://script.google.com/macros/s/AKfycbwQvj1oRj3Q8oZ-SlHCYyPjvTMk8JFweQx6wP-aR4dTID-c39O49oK8KxqD8c9l48vj5w/exec";

function carregarPedidos() {
  const lista = document.getElementById("lista-pedidos");
  const statusDiv = document.getElementById("status");
  
  if (!lista || !statusDiv) {
    console.error("Elementos não encontrados no DOM");
    return;
  }
  
  statusDiv.innerHTML = "⏳ Carregando pedidos...";
  lista.innerHTML = "";

  fetch(API_URL)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("Dados recebidos:", data); // Para debug
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        statusDiv.innerHTML = "📭 Nenhum pedido encontrado.";
        return;
      }

      statusDiv.innerHTML = `📋 ${data.length} pedido(s) encontrado(s)`;

      // Ordena do mais recente para o mais antigo
      data.reverse().forEach(pedido => {
        const card = document.createElement("div");
        card.className = "pedido-card";

        const nomeExibicao = pedido.anonimo === "Sim" 
          ? "🙈 Anônimo" 
          : (pedido.nome || "🙈 Anônimo");

        card.innerHTML = `
          <div class="pedido-conteudo">
            <p class="pedido-texto">"${pedido.pedido || 'Pedido sem texto'}"</p>
            <div class="pedido-metadata">
              <span class="pedido-nome">${nomeExibicao}</span>
              <span class="pedido-data">${pedido.timestamp || ''}</span>
            </div>
          </div>
          <div class="pedido-acoes">
            <button 
              class="botao-orar"
              onclick="orarPorEstePedido(${pedido.linha}, this)">
              🙏 Estou orando
            </button>
          </div>
        `;

        lista.appendChild(card);
      });
    })
    .catch(err => {
      console.error("Erro ao carregar pedidos:", err);
      statusDiv.innerHTML = `
        ❌ Erro ao carregar pedidos: ${err.message}<br>
        <small>Verifique se a API está publicada corretamente</small>
      `;
    });
}

function orarPorEstePedido(linha, botao) {
  if (!linha) {
    alert("Erro: linha não identificada");
    return;
  }
  
  botao.disabled = true;
  botao.textContent = "⏳ Atualizando...";
  
  fetch(API_URL, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      linha: linha,
      acao: "orando" 
    })
  })
  .then(res => res.json())
  .then(resultado => {
    if (resultado.success) {
      botao.textContent = "✅ Já oramos";
      botao.classList.add("orando");
      setTimeout(() => {
        botao.textContent = "🙏 Obrigado por orar";
      }, 2000);
    } else {
      botao.disabled = false;
      botao.textContent = "🙏 Estou orando";
      alert("Erro ao atualizar: " + (resultado.message || "Tente novamente"));
    }
  })
  .catch(err => {
    botao.disabled = false;
    botao.textContent = "🙏 Estou orando";
    console.error("Erro:", err);
    alert("Erro de conexão. Tente novamente.");
  });
}

// Carrega os pedidos quando a página carrega
document.addEventListener('DOMContentLoaded', carregarPedidos);

// Recarrega a cada 30 segundos
setInterval(carregarPedidos, 30000);

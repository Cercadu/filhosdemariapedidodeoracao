const API_URL = "https://script.google.com/macros/s/XXXXXXXXXXXX/exec";

const lista = document.getElementById("lista-pedidos");
const statusDiv = document.getElementById("status");

statusDiv.innerHTML = "⏳ Carregando pedidos...";

fetch(API_URL)
  .then(res => res.json())
  .then(data => {

    if (!Array.isArray(data) || data.length === 0) {
      statusDiv.innerHTML = "📭 Nenhum pedido encontrado.";
      return;
    }

    statusDiv.innerHTML = "";

    data.reverse().forEach(p => {
      const card = document.createElement("div");
      card.className = "pedido-card";

      card.innerHTML = `
        <p class="pedido-texto">${p.pedido}</p>
        <p class="pedido-info">
          ${p.anonimo === "Sim" ? "Anônimo" : (p.nome || "Anônimo")}
        </p>
        <button 
          ${p.status === "Orando" ? "disabled" : ""}
          onclick="orar(${p.linha}, this)">
          ${p.status === "Orando" ? "🙏 Já estamos orando" : "🟢 Orar por este pedido"}
        </button>
      `;

      lista.appendChild(card);
    });
  })
  .catch(err => {
    statusDiv.innerHTML = "❌ Erro ao carregar pedidos.";
    console.error(err);
  });

function orar(linha, botao) {
  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ linha })
  }).then(() => {
    botao.innerText = "🙏 Já estamos orando";
    botao.disabled = true;
  });
}

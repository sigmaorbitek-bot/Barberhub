// ==================================================
// BARBERHUB — PÁGINA INICIAL
// ==================================================

const ROTAS_INICIAIS = {
  barbearia: "./login/index.html",
  cliente: "./login/cliente.html",
};

// ==================================================
// ENTRAR
// ==================================================

function entrar(tipo) {
  const destino = ROTAS_INICIAIS[tipo];

  if (!destino) {
    console.error("[BarberHub] Tipo de acesso inválido:", tipo);

    return;
  }

  window.location.href = destino;
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================

function iniciarPaginaInicial() {
  const botoes = document.querySelectorAll("[data-destino]");

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      const tipo = botao.dataset.destino;

      entrar(tipo);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarPaginaInicial);
} else {
  iniciarPaginaInicial();
}

// BARBERHUB — PÁGINA INICIAL

const ROTAS_INICIAIS = {
  barbearia: "./login/index.html",
  cliente: "./login/cliente.html",
};

function entrar(tipo) {
  const destino = ROTAS_INICIAIS[tipo];

  if (!destino) {
    console.error(
      "[BarberHub] Tipo de acesso inválido:",
      tipo,
    );

    return;
  }

  window.location.href = destino;
}

async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn(
      "[BarberHub] Service Worker não suportado neste navegador.",
    );

    return;
  }

  try {
    const registro =
      await navigator.serviceWorker.register(
        "/sw.js",
        {
          scope: "/",
        },
      );

    console.log(
      "[BarberHub] Service Worker registrado:",
      registro.scope,
    );
  } catch (erro) {
    console.error(
      "[BarberHub] Erro ao registrar Service Worker:",
      erro,
    );
  }
}

function iniciarPaginaInicial() {
  const botoes =
    document.querySelectorAll(
      "[data-destino]",
    );

  botoes.forEach((botao) => {
    botao.addEventListener(
      "click",
      () => {
        const tipo =
          botao.dataset.destino;

        entrar(tipo);
      },
    );
  });

  registrarServiceWorker();
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarPaginaInicial,
  );
} else {
  iniciarPaginaInicial();
}
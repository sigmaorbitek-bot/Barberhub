// BARBERHUB — SERVICE WORKER

// 01. INSTALAÇÃO

self.addEventListener("install", (event) => {
  console.log("[SW] BarberHub instalado.");

  self.skipWaiting();
});


// 02. ATIVAÇÃO

self.addEventListener("activate", (event) => {
  console.log("[SW] BarberHub ativado.");

  event.waitUntil(
    self.clients.claim(),
  );
});


// 03. RECEBER NOTIFICAÇÃO PUSH

self.addEventListener("push", (event) => {
  let dados = {
    titulo: "BarberHub",
    mensagem:
      "Você recebeu uma nova notificação.",
    url: "/",
  };

  try {
    if (event.data) {
      const dadosRecebidos =
        event.data.json();

      dados = {
        ...dados,
        ...dadosRecebidos,
      };
    }
  } catch (erro) {
    console.error(
      "[SW] Erro ao ler dados do push:",
      erro,
    );

    try {
      const texto =
        event.data?.text();

      if (texto) {
        dados.mensagem = texto;
      }
    } catch (erroTexto) {
      console.error(
        "[SW] Erro ao ler texto do push:",
        erroTexto,
      );
    }
  }

  const titulo =
    dados.titulo ||
    "BarberHub";

  const url =
    dados.url ||
    "/";

  const opcoes = {
    body:
      dados.mensagem ||
      "Você recebeu uma nova notificação.",

    icon:
      "/assets/barber.png",

    badge:
      "/assets/barber.png",

    data: {
      url,
    },

    tag:
      dados.tag ||
      undefined,
  };

  event.waitUntil(
    self.registration.showNotification(
      titulo,
      opcoes,
    ),
  );
});


// 04. CLIQUE NA NOTIFICAÇÃO

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const urlRecebida =
      event.notification?.data?.url ||
      "/";

    const urlDestino =
      new URL(
        urlRecebida,
        self.location.origin,
      ).href;

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(async (janelas) => {
          for (const janela of janelas) {
            if (!("focus" in janela)) {
              continue;
            }

            try {
              if ("navigate" in janela) {
                await janela.navigate(
                  urlDestino,
                );
              }

              return janela.focus();
            } catch (erro) {
              console.warn(
                "[SW] Não foi possível reutilizar a janela:",
                erro,
              );
            }
          }

          if (
            self.clients.openWindow
          ) {
            return self.clients.openWindow(
              urlDestino,
            );
          }

          return null;
        }),
    );
  },
);
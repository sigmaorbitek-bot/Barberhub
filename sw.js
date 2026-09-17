self.addEventListener("push", (event) => {
  let dados = {
    titulo: "BarberHub",
    mensagem: "Você recebeu uma nova notificação.",
    url: "/",
  };

  try {
    if (event.data) {
      dados = {
        ...dados,
        ...event.data.json(),
      };
    }
  } catch (erro) {
    console.error("[SW] Erro ao ler push:", erro);
  }

  const opcoes = {
    body: dados.mensagem,
    icon: "/assets/barber.png",
    badge: "/assets/barber.png",
    data: {
      url: dados.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(dados.titulo || "BarberHub", opcoes),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((janelas) => {
      for (const janela of janelas) {
        if ("focus" in janela) {
          janela.navigate(url);
          return janela.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }

      return null;
    }),
  );
});
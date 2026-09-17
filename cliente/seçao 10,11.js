// 10. MEUS AGENDAMENTOS

// 10.1 CARREGAR AGENDAMENTOS

async function carregarAgendamentos() {
  if (!usuarioAtual?.id) {
    agendamentos = [];

    renderizarAgendamentos();
    atualizarResumoDashboard();

    return [];
  }

  try {
    let cliente = clienteAtual;

    if (!cliente?.id) {
      cliente = await garantirClienteAtual();
    }

    if (!cliente?.id) {
      agendamentos = [];

      renderizarAgendamentos();
      atualizarResumoDashboard();

      return [];
    }

    const { data, error } = await supabaseClient
      .from("agendamentos")
      .select(
        `
          id,
          barbearia_id,
          cliente_id,
          servico_id,
          profissional_id,
          data_hora,
          status,
          created_at,
          cliente_nome,
          cliente_telefone,

          barbearias (
            id,
            nome,
            cidade,
            endereco,
            telefone,
            logo_url
          ),

          servicos (
            id,
            nome,
            preco,
            duracao
          ),

          profissionais (
            id,
            nome,
            telefone,
            foto_url
          )
        `,
      )
      .eq("cliente_id", cliente.id)
      .order("data_hora", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    agendamentos = data || [];

    renderizarAgendamentos();

    atualizarResumoDashboard();

    return agendamentos;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar agendamentos", erro);

    agendamentos = [];

    renderizarAgendamentos();

    atualizarResumoDashboard();

    return [];
  }
}

// 10.2 TEXTO DO STATUS

function textoStatus(status) {
  const statusMap = {
    pendente: "Pendente",

    confirmado: "Confirmado",

    concluido: "Concluído",

    cancelado: "Cancelado",
  };

  return statusMap[status] || status || "Indefinido";
}

// 10.3 VERIFICAR SE PODE CANCELAR

function podeCancelarAgendamento(agendamento) {
  if (!agendamento) {
    return false;
  }

  const statusPermitido =
    agendamento.status === "pendente" || agendamento.status === "confirmado";

  if (!statusPermitido) {
    return false;
  }

  const data = new Date(agendamento.data_hora);

  if (Number.isNaN(data.getTime())) {
    return false;
  }

  return data > new Date();
}

// 10.4 RENDERIZAR AGENDAMENTOS

function renderizarAgendamentos() {
  const lista = document.getElementById("lista-meus-agendamentos");

  if (!lista) {
    return;
  }

  const agora = new Date();

  let listaFiltrada = [...agendamentos];

  if (filtroAgendamentosAtual === "proximos") {
    listaFiltrada = listaFiltrada.filter((agendamento) => {
      const data = new Date(agendamento.data_hora);

      return (
        !Number.isNaN(data.getTime()) &&
        data >= agora &&
        agendamento.status !== "cancelado" &&
        agendamento.status !== "concluido"
      );
    });

    listaFiltrada.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
  }

  if (filtroAgendamentosAtual === "todos") {
    listaFiltrada.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
  }

  if (filtroAgendamentosAtual === "cancelados") {
    listaFiltrada = listaFiltrada.filter(
      (agendamento) => agendamento.status === "cancelado",
    );

    listaFiltrada.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
  }

  if (!listaFiltrada.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          Nenhum agendamento encontrado.
        </p>

        ${
          filtroAgendamentosAtual === "proximos"
            ? `
              <button
                type="button"
                class="btn-principal"
                onclick="mudarAba('agendamento')"
              >
                📅 Agendar horário
              </button>
            `
            : ""
        }

      </div>
    `;

    return;
  }

  lista.innerHTML = listaFiltrada
    .map((agendamento) => {
      const barbearia = agendamento.barbearias;

      const servico = agendamento.servicos;

      const profissional = agendamento.profissionais;

      const data = new Date(agendamento.data_hora);

      const podeCancelar = podeCancelarAgendamento(agendamento);

      return `
            <article
              class="item-agendamento"
              data-agendamento-id="${escapeHTML(agendamento.id)}"
            >

              <div
                class="item-agendamento-topo"
              >

                <div>

                  <h3>
                    ${escapeHTML(barbearia?.nome || "Barbearia")}
                  </h3>

                  <p>
                    ${escapeHTML(servico?.nome || "Serviço")}
                  </p>

                </div>

                <span
                  class="status status-${escapeHTML(agendamento.status)}"
                >
                  ${escapeHTML(textoStatus(agendamento.status))}
                </span>

              </div>

              <div
                class="item-agendamento-detalhes"
              >

                <p>
                  📅
                  <strong>
                    ${formatarData(data)}
                  </strong>
                </p>

                <p>
                  🕐
                  <strong>
                    ${formatarHora(data)}
                  </strong>
                </p>

                ${
                  servico
                    ? `
                      <p>
                        ⏱️
                        ${Number(servico.duracao) || 30}
                        minutos
                      </p>

                      <p>
                        💰
                        ${formatarPreco(servico.preco)}
                      </p>
                    `
                    : ""
                }

                ${
                  profissional
                    ? `
                      <p>
                        💇
                        ${escapeHTML(profissional.nome)}
                      </p>
                    `
                    : `
                      <p>
                        💇 Qualquer profissional
                      </p>
                    `
                }

                ${
                  barbearia?.cidade
                    ? `
                      <p>
                        📍
                        ${escapeHTML(barbearia.cidade)}
                      </p>
                    `
                    : ""
                }

              </div>

              ${
                podeCancelar
                  ? `
                    <div
                      class="item-agendamento-acoes"
                    >

                      <button
                        type="button"
                        class="btn-secundario btn-cancelar-agendamento"
                        data-id="${escapeHTML(agendamento.id)}"
                      >
                        Cancelar agendamento
                      </button>

                    </div>
                  `
                  : ""
              }

            </article>
          `;
    })
    .join("");
}

// 10.5 CANCELAR AGENDAMENTO

async function cancelarAgendamento(id) {
  if (!id || !usuarioAtual?.id) {
    return false;
  }

  const agendamento = agendamentos.find(
    (item) => String(item.id) === String(id),
  );

  if (!agendamento) {
    return false;
  }

  if (!podeCancelarAgendamento(agendamento)) {
    alert("Esse agendamento não pode mais ser cancelado.");

    return false;
  }

  const confirmou = window.confirm(
    "Tem certeza que deseja cancelar este agendamento?",
  );

  if (!confirmou) {
    return false;
  }

  try {
    let cliente = clienteAtual;

    if (!cliente?.id) {
      cliente = await garantirClienteAtual();
    }

    if (!cliente?.id) {
      throw new Error("Cadastro de cliente não identificado.");
    }

    const { data, error } = await supabaseClient
      .from("agendamentos")
      .update({
        status: "cancelado",
      })
      .eq("id", id)
      .eq("cliente_id", cliente.id)
      .select(
        `
          id,
          status
        `,
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "Agendamento não encontrado ou sem permissão para cancelamento.",
      );
    }

    await carregarAgendamentos();

    mostrarMensagem(
      "mensagem-agendamento",
      "Agendamento cancelado com sucesso! ✅",
      "sucesso",
    );

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao cancelar agendamento", erro);

    mostrarMensagem(
      "mensagem-agendamento",
      "Não foi possível cancelar o agendamento.",
      "erro",
    );

    return false;
  }
}
// 11. NOTIFICAÇÕES

// 11.1 CARREGAR NOTIFICAÇÕES

async function carregarNotificacoesCliente() {
  const lista = document.getElementById("lista-notificacoes-cliente");

  if (!usuarioAtual?.id) {
    notificacoesCliente = [];

    renderizarNotificacoesCliente();

    return [];
  }

  if (lista) {
    lista.innerHTML = `
      <div class="lista-vazia">
        <p>
          🔔 Carregando notificações...
        </p>
      </div>
    `;
  }

  try {
    const { data, error } = await supabaseClient
      .from("notificacoes")
      .select(
        `
            id,
            barbearia_id,
            cliente_id,
            tipo,
            titulo,
            mensagem,
            referencia_id,
            lida,
            created_at
          `,
      )
      .eq("cliente_id", usuarioAtual.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      throw error;
    }

    notificacoesCliente = Array.isArray(data) ? data : [];

    renderizarNotificacoesCliente();

    return notificacoesCliente;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar notificações", erro);

    notificacoesCliente = [];

    if (lista) {
      lista.innerHTML = `
        <div class="lista-vazia">

          <p>
            Não foi possível carregar suas notificações.
          </p>

          <small>
            Tente novamente em alguns instantes.
          </small>

        </div>
      `;
    }

    return [];
  }
}

// 11.2 CLASSE VISUAL

function classeNotificacao(tipo) {
  const tipos = {
    pendente: "notificacao-pendente",

    agendamento_pendente: "notificacao-pendente",

    confirmado: "notificacao-confirmado",

    agendamento_confirmado: "notificacao-confirmado",

    cancelado: "notificacao-cancelado",

    agendamento_cancelado: "notificacao-cancelado",

    concluido: "notificacao-concluido",

    agendamento_concluido: "notificacao-concluido",

    lembrete_agendamento: "notificacao-proximo",

    proximo: "notificacao-proximo",

    pedido_atualizado: "notificacao-info",

    pedido_confirmado: "notificacao-confirmado",

    pedido_concluido: "notificacao-concluido",

    pedido_cancelado: "notificacao-cancelado",
  };

  return tipos[tipo] || "notificacao-info";
}

// 11.3 ÍCONE

function obterIconeNotificacao(tipo) {
  const icones = {
    pendente: "📅",

    agendamento_pendente: "📅",

    confirmado: "✅",

    agendamento_confirmado: "✅",

    cancelado: "❌",

    agendamento_cancelado: "❌",

    concluido: "🎉",

    agendamento_concluido: "🎉",

    lembrete_agendamento: "⏰",

    proximo: "⏰",

    pedido_atualizado: "🛍️",

    pedido_confirmado: "✅",

    pedido_concluido: "📦",

    pedido_cancelado: "❌",
  };

  return icones[tipo] || "🔔";
}

// 11.4 TOTAL NÃO LIDAS

function obterTotalNotificacoesNaoLidas() {
  return notificacoesCliente.filter((notificacao) => notificacao.lida !== true)
    .length;
}

// 11.5 MARCAR UMA COMO LIDA

async function marcarNotificacaoComoLida(notificacaoId) {
  if (!notificacaoId || !usuarioAtual?.id) {
    return false;
  }

  try {
    const { data, error } = await supabaseClient
      .from("notificacoes")
      .update({
        lida: true,
      })
      .eq("id", notificacaoId)
      .eq("cliente_id", usuarioAtual.id)
      .eq("lida", false)
      .select(
        `
            id,
            lida
          `,
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    const notificacaoLocal = notificacoesCliente.find(
      (item) => String(item.id) === String(notificacaoId),
    );

    if (notificacaoLocal) {
      notificacaoLocal.lida = true;
    }

    renderizarNotificacoesCliente();

    return Boolean(data);
  } catch (erro) {
    mostrarErroConsole("Erro ao marcar notificação como lida", erro);

    return false;
  }
}

// 11.6 MARCAR TODAS COMO LIDAS

async function marcarTodasNotificacoesComoLidas() {
  if (!usuarioAtual?.id) {
    return false;
  }

  const possuiNaoLidas = notificacoesCliente.some(
    (notificacao) => notificacao.lida !== true,
  );

  if (!possuiNaoLidas) {
    return true;
  }

  try {
    const { error } = await supabaseClient
      .from("notificacoes")
      .update({
        lida: true,
      })
      .eq("cliente_id", usuarioAtual.id)
      .eq("lida", false);

    if (error) {
      throw error;
    }

    notificacoesCliente.forEach((notificacao) => {
      notificacao.lida = true;
    });

    renderizarNotificacoesCliente();

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao marcar notificações como lidas", erro);

    return false;
  }
}

// 11.7 FORMATAR DATA

function formatarDataNotificacao(data) {
  if (!data) {
    return "";
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return "";
  }

  return dataObj.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// 11.8 RENDERIZAR NOTIFICAÇÕES

function renderizarNotificacoesCliente() {
  const lista = document.getElementById("lista-notificacoes-cliente");

  if (!lista) {
    return;
  }

  const dados = Array.isArray(notificacoesCliente) ? notificacoesCliente : [];

  if (!dados.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          🔔 Você não possui notificações.
        </p>

        <small>
          Quando houver novidades sobre seus
          agendamentos ou pedidos,
          elas aparecerão aqui.
        </small>

      </div>
    `;

    return;
  }

  const totalNaoLidas = obterTotalNotificacoesNaoLidas();

  const botaoTodas =
    totalNaoLidas > 0
      ? `
        <div
          class="notificacoes-acoes"
        >

          <button
            type="button"
            class="btn-secundario"
            id="btn-marcar-todas-notificacoes"
          >
            ✅ Marcar todas como lidas
          </button>

        </div>
      `
      : "";

  const itens = dados
    .map((notificacao) => {
      const lida = notificacao.lida === true;

      const titulo = notificacao.titulo || "Notificação";

      const mensagem = notificacao.mensagem || "";

      const data = formatarDataNotificacao(notificacao.created_at);

      const icone = obterIconeNotificacao(notificacao.tipo);

      return `
            <article
              class="
                item-notificacao
                ${
                  lida ? "item-notificacao--lida" : "item-notificacao--nao-lida"
                }
                ${classeNotificacao(notificacao.tipo)}
              "
            >

              <div
                class="item-notificacao-icone"
                aria-hidden="true"
              >
                ${escapeHTML(icone)}
              </div>

              <div
                class="item-notificacao-conteudo"
              >

                <div
                  class="item-notificacao-topo"
                >

                  <div>

                    <h3>
                      ${escapeHTML(titulo)}
                    </h3>

                    ${
                      !lida
                        ? `
                          <span
                            class="notificacao-badge"
                          >
                            Nova
                          </span>
                        `
                        : ""
                    }

                  </div>

                  ${
                    data
                      ? `
                        <small>
                          ${escapeHTML(data)}
                        </small>
                      `
                      : ""
                  }

                </div>

                ${
                  mensagem
                    ? `
                      <p>
                        ${escapeHTML(mensagem)}
                      </p>
                    `
                    : ""
                }

              </div>

              ${
                !lida
                  ? `
                    <div
                      class="item-notificacao-acoes"
                    >

                      <button
                        type="button"
                        class="
                          btn-secundario
                          btn-marcar-notificacao
                        "
                        data-id="${escapeHTML(notificacao.id)}"
                      >
                        Marcar como lida
                      </button>

                    </div>
                  `
                  : ""
              }

            </article>
          `;
    })
    .join("");

  lista.innerHTML = `
    ${botaoTodas}

    <div
      class="lista-notificacoes"
    >
      ${itens}
    </div>
  `;

  const btnTodas = document.getElementById("btn-marcar-todas-notificacoes");

  btnTodas?.addEventListener("click", marcarTodasNotificacoesComoLidas);
}

// 11.9 EVENTOS

function configurarEventosNotificacoes() {
  const lista = document.getElementById("lista-notificacoes-cliente");

  if (!lista) {
    return;
  }

  if (lista.dataset.notificacoesConfiguradas === "true") {
    return;
  }

  lista.dataset.notificacoesConfiguradas = "true";

  lista.addEventListener("click", (evento) => {
    const botao = evento.target.closest(".btn-marcar-notificacao");

    if (!botao) {
      return;
    }

    const notificacaoId = botao.dataset.id;

    marcarNotificacaoComoLida(notificacaoId);
  });
}

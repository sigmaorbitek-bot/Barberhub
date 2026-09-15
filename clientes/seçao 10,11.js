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

// 11.1 CHAVE LOCAL DAS NOTIFICAÇÕES

function obterChaveNotificacoes() {
  if (!usuarioAtual?.id) {
    return null;
  }

  return `barberhub_notificacoes_${usuarioAtual.id}`;
}

// 11.2 OBTER NOTIFICAÇÕES LIDAS

function obterNotificacoesLidas() {
  const chave = obterChaveNotificacoes();

  if (!chave) {
    return [];
  }

  try {
    const dados = localStorage.getItem(chave);

    if (!dados) {
      return [];
    }

    const lista = JSON.parse(dados);

    return Array.isArray(lista) ? lista : [];
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar notificações lidas", erro);

    return [];
  }
}

// 11.3 SALVAR NOTIFICAÇÕES LIDAS

function salvarNotificacoesLidas(notificacoesLidas) {
  const chave = obterChaveNotificacoes();

  if (!chave) {
    return;
  }

  try {
    localStorage.setItem(chave, JSON.stringify(notificacoesLidas));
  } catch (erro) {
    mostrarErroConsole("Erro ao salvar notificações lidas", erro);
  }
}

// 11.4 VERIFICAR SE ESTÁ LIDA

function notificacaoEstaLida(notificacaoId) {
  if (!notificacaoId) {
    return false;
  }

  const lidas = obterNotificacoesLidas();

  return lidas.includes(notificacaoId);
}

// 11.5 MARCAR UMA COMO LIDA

function marcarNotificacaoComoLida(notificacaoId) {
  if (!notificacaoId) {
    return;
  }

  const lidas = obterNotificacoesLidas();

  if (!lidas.includes(notificacaoId)) {
    lidas.push(notificacaoId);
  }

  salvarNotificacoesLidas(lidas);

  renderizarNotificacoesCliente();
}

// 11.6 MARCAR TODAS COMO LIDAS

function marcarTodasNotificacoesComoLidas() {
  const ids = notificacoesCliente.map((notificacao) => notificacao.id);

  salvarNotificacoesLidas(ids);

  renderizarNotificacoesCliente();
}

// 11.7 LIMPAR NOTIFICAÇÕES ANTIGAS DO STORAGE

function limparNotificacoesLidasAntigas() {
  const idsAtuais = new Set(
    notificacoesCliente.map((notificacao) => notificacao.id),
  );

  const lidas = obterNotificacoesLidas();

  const validas = lidas.filter((id) => idsAtuais.has(id));

  if (validas.length !== lidas.length) {
    salvarNotificacoesLidas(validas);
  }
}

// 11.8 CARREGAR NOTIFICAÇÕES

async function carregarNotificacoesCliente() {
  if (!usuarioAtual?.id) {
    notificacoesCliente = [];

    renderizarNotificacoesCliente();

    return [];
  }

  try {
    await carregarAgendamentos();

    const notificacoes = [];

    agendamentos.forEach((agendamento) => {
      const barbearia = agendamento.barbearias;

      const servico = agendamento.servicos;

      const profissional = agendamento.profissionais;

      const data = new Date(agendamento.data_hora);

      if (Number.isNaN(data.getTime())) {
        return;
      }

      const nomeBarbearia = barbearia?.nome || "Barbearia";

      const nomeServico = servico?.nome || "Serviço";

      const nomeProfissional = profissional?.nome || null;

      const dataFormatada = formatarData(agendamento.data_hora);

      const horaFormatada = formatarHora(agendamento.data_hora);

      const detalhesBase =
        `${nomeServico} · ` + `${dataFormatada} às ${horaFormatada}`;

      if (agendamento.status === "pendente") {
        notificacoes.push({
          id: `agendamento-${agendamento.id}-pendente`,

          tipo: "pendente",

          icone: "📅",

          titulo: "Agendamento realizado",

          mensagem: `Seu agendamento na ${nomeBarbearia} está aguardando confirmação.`,

          detalhes: detalhesBase,

          timestamp: agendamento.created_at || agendamento.data_hora,

          agendamentoId: agendamento.id,
        });
      }

      if (agendamento.status === "confirmado") {
        notificacoes.push({
          id: `agendamento-${agendamento.id}-confirmado`,

          tipo: "confirmado",

          icone: "✅",

          titulo: "Agendamento confirmado",

          mensagem: `Seu horário na ${nomeBarbearia} foi confirmado.`,

          detalhes: detalhesBase,

          timestamp: agendamento.data_hora,

          agendamentoId: agendamento.id,
        });
      }

      if (agendamento.status === "cancelado") {
        notificacoes.push({
          id: `agendamento-${agendamento.id}-cancelado`,

          tipo: "cancelado",

          icone: "❌",

          titulo: "Agendamento cancelado",

          mensagem: `Seu agendamento na ${nomeBarbearia} foi cancelado.`,

          detalhes: detalhesBase,

          timestamp: agendamento.data_hora,

          agendamentoId: agendamento.id,
        });
      }

      if (agendamento.status === "concluido") {
        notificacoes.push({
          id: `agendamento-${agendamento.id}-concluido`,

          tipo: "concluido",

          icone: "🎉",

          titulo: "Atendimento concluído",

          mensagem: `Seu atendimento na ${nomeBarbearia} foi concluído.`,

          detalhes: detalhesBase,

          timestamp: agendamento.data_hora,

          agendamentoId: agendamento.id,
        });
      }

      const agora = new Date();

      const ativo =
        agendamento.status === "pendente" ||
        agendamento.status === "confirmado";

      if (data > agora && ativo) {
        const detalhes = nomeProfissional
          ? `${detalhesBase} · ${nomeProfissional}`
          : detalhesBase;

        notificacoes.push({
          id: `proximo-${agendamento.id}`,

          tipo: "proximo",

          icone: "⏰",

          titulo: "Você tem um horário marcado",

          mensagem: `Seu próximo atendimento será na ${nomeBarbearia}.`,

          detalhes,

          timestamp: agendamento.data_hora,

          agendamentoId: agendamento.id,
        });
      }
    });

    const mapa = new Map();

    notificacoes.forEach((notificacao) => {
      mapa.set(notificacao.id, notificacao);
    });

    notificacoesCliente = Array.from(mapa.values());

    notificacoesCliente.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );

    limparNotificacoesLidasAntigas();

    renderizarNotificacoesCliente();

    return notificacoesCliente;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar notificações", erro);

    notificacoesCliente = [];

    renderizarNotificacoesCliente();

    return [];
  }
}

// 11.9 CLASSE VISUAL

function classeNotificacao(tipo) {
  const tipos = {
    pendente: "notificacao-pendente",

    confirmado: "notificacao-confirmado",

    cancelado: "notificacao-cancelado",

    concluido: "notificacao-concluido",

    proximo: "notificacao-proximo",
  };

  return tipos[tipo] || "notificacao-info";
}

// 11.10 TOTAL NÃO LIDAS

function obterTotalNotificacoesNaoLidas() {
  return notificacoesCliente.filter(
    (notificacao) => !notificacaoEstaLida(notificacao.id),
  ).length;
}

// 11.11 RENDERIZAR NOTIFICAÇÕES

function renderizarNotificacoesCliente() {
  const lista = document.getElementById("lista-notificacoes-cliente");

  if (!lista) {
    return;
  }

  if (!notificacoesCliente.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          🔔 Você não possui notificações.
        </p>

        <small>
          Quando houver novidades sobre seus
          agendamentos, elas aparecerão aqui.
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

  const itens = notificacoesCliente
    .map((notificacao) => {
      const lida = notificacaoEstaLida(notificacao.id);

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
                ${escapeHTML(notificacao.icone)}
              </div>

              <div
                class="item-notificacao-conteudo"
              >

                <div
                  class="item-notificacao-topo"
                >

                  <div>

                    <h3>
                      ${escapeHTML(notificacao.titulo)}
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

                </div>

                <p>
                  ${escapeHTML(notificacao.mensagem)}
                </p>

                <small>
                  ${escapeHTML(notificacao.detalhes)}
                </small>

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

  if (btnTodas) {
    btnTodas.addEventListener("click", marcarTodasNotificacoesComoLidas);
  }
}

// 11.12 EVENTOS DAS NOTIFICAÇÕES

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

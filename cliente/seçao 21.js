// 21. PAINEL EXTRA DO CLIENTE
// Pedidos, gastos, resumo inicial e sininho de notificações.

(() => {
  let pedidosClienteCache = [];
  let filtroPedidosCliente = "todos";

  let financeiroClienteCache = {
    agendamentos: [],
    pedidos: [],
  };

  // 21.1 — NOVAS ABAS

  DADOS_ABAS.pedidos = {
    titulo: "Meus pedidos",
    descricao: "Acompanhe suas compras e o andamento dos seus pedidos.",
  };

  DADOS_ABAS.financeiro = {
    titulo: "Meus gastos",
    descricao: "Veja quanto você gastou com serviços e produtos.",
  };

  // 21.2 — FUNÇÕES AUXILIARES

  function escaparHtmlExtra(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatarMoedaExtra(valor) {
    const numero = Number(valor);

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number.isFinite(numero) ? numero : 0);
  }

  function formatarDataHoraExtra(valor) {
    if (!valor) {
      return "-";
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return "-";
    }

    return data.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function obterStatusPedidoExtra(status) {
    const nomes = {
      pendente: "Pendente",
      confirmado: "Confirmado",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };

    return nomes[status] || "Indefinido";
  }

  function obterClasseStatusPedidoExtra(status) {
    const classes = {
      pendente: "status-pendente",
      confirmado: "status-confirmado",
      concluido: "status-concluido",
      cancelado: "status-cancelado",
    };

    return classes[status] || "status-pendente";
  }

  function estaNoMesAtual(dataValor) {
    if (!dataValor) {
      return false;
    }

    const data = new Date(dataValor);

    if (Number.isNaN(data.getTime())) {
      return false;
    }

    const agora = new Date();

    return (
      data.getFullYear() === agora.getFullYear() &&
      data.getMonth() === agora.getMonth()
    );
  }

  async function obterClienteAtualExtra() {
    if (clienteAtual?.id) {
      return clienteAtual;
    }

    if (typeof garantirClienteAtual === "function") {
      return await garantirClienteAtual();
    }

    return null;
  }

  // 21.3 — CARREGAR PEDIDOS DO CLIENTE

  async function carregarPedidosCliente() {
    const lista = document.getElementById("lista-pedidos-cliente");

    if (!usuarioAtual?.id) {
      pedidosClienteCache = [];

      renderizarPedidosCliente();
      atualizarResumoPedidosCliente();

      return [];
    }

    if (lista) {
      lista.innerHTML = `
        <div class="lista-vazia">
          <p>📦 Carregando seus pedidos...</p>
        </div>
      `;
    }

    try {
      const { data, error } = await supabaseClient
        .from("pedidos")
        .select(
          `
            id,
            cliente_id,
            barbearia_id,
            produto_id,
            quantidade,
            preco_unitario,
            status,
            origem_pedido,
            created_at,
            atualizado_at,
            confirmado_at,
            concluido_at,
            arquivado,
            arquivado_at,

            produtos:produto_id (
              id,
              nome,
              preco,
              foto_url
            ),

            barbearias:barbearia_id (
              id,
              nome,
              cidade,
              logo_url
            )
          `,
        )
        .eq("cliente_id", usuarioAtual.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      pedidosClienteCache = Array.isArray(data) ? data : [];

      renderizarPedidosCliente();
      atualizarResumoPedidosCliente();
      renderizarPedidoAtivoInicio();

      return pedidosClienteCache;
    } catch (erro) {
      console.error("[BarberHub] Erro ao carregar pedidos do cliente:", erro);

      pedidosClienteCache = [];

      atualizarResumoPedidosCliente();
      renderizarPedidoAtivoInicio();

      if (lista) {
        lista.innerHTML = `
          <div class="lista-vazia">
            <p>Não foi possível carregar seus pedidos.</p>

            <small>
              Atualize a página e tente novamente.
            </small>
          </div>
        `;
      }

      return [];
    }
  }

  // 21.4 — RENDERIZAR PEDIDOS

  function renderizarPedidosCliente() {
    const lista = document.getElementById("lista-pedidos-cliente");

    if (!lista) {
      return;
    }

    let pedidos = [...pedidosClienteCache];

    if (filtroPedidosCliente !== "todos") {
      pedidos = pedidos.filter(
        (pedido) => pedido.status === filtroPedidosCliente,
      );
    }

    if (!pedidos.length) {
      lista.innerHTML = `
        <div class="lista-vazia">
          <p>📦 Nenhum pedido encontrado.</p>

          <small>
            Seus pedidos de produtos aparecerão aqui.
          </small>
        </div>
      `;

      return;
    }

    lista.innerHTML = pedidos
      .map((pedido) => {
        const produto = pedido.produtos;

        const barbearia = pedido.barbearias;

        const quantidade = Number(pedido.quantidade) || 0;

        const preco = Number(pedido.preco_unitario) || 0;

        const total = quantidade * preco;

        const nomeProduto = produto?.nome?.trim() || "Produto";

        const nomeBarbearia = barbearia?.nome?.trim() || "Barbearia";

        const status = pedido.status || "pendente";

        const dataPedido = pedido.created_at || null;

        return `
          <article class="item-agendamento">

            <div class="item-agendamento-topo">

              <div>
                <h3>
                  📦 ${escaparHtmlExtra(nomeProduto)}
                </h3>

                <p>
                  ${escaparHtmlExtra(nomeBarbearia)}
                </p>
              </div>

              <span
                class="
                  status
                  ${obterClasseStatusPedidoExtra(status)}
                "
              >
                ${escaparHtmlExtra(obterStatusPedidoExtra(status))}
              </span>

            </div>

            <div class="item-agendamento-detalhes">

              <p>
                Quantidade:
                <strong>
                  ${quantidade}
                </strong>
              </p>

              <p>
                Preço unitário:
                <strong>
                  ${formatarMoedaExtra(preco)}
                </strong>
              </p>

              <p>
                Total:
                <strong>
                  ${formatarMoedaExtra(total)}
                </strong>
              </p>

              <p>
                Pedido:
                <strong>
                  ${escaparHtmlExtra(formatarDataHoraExtra(dataPedido))}
                </strong>
              </p>

            </div>

          </article>
        `;
      })
      .join("");
  }

  // 21.5 — FILTROS DOS PEDIDOS

  function configurarFiltrosPedidosCliente() {
    document.querySelectorAll(".filtro-pedido-cliente").forEach((botao) => {
      if (botao.dataset.eventoPedidoConfigurado === "true") {
        return;
      }

      botao.dataset.eventoPedidoConfigurado = "true";

      botao.addEventListener("click", () => {
        filtroPedidosCliente = botao.dataset.filtroPedido || "todos";

        document.querySelectorAll(".filtro-pedido-cliente").forEach((item) => {
          item.classList.toggle("ativo", item === botao);
        });

        renderizarPedidosCliente();
      });
    });
  }

  // 21.6 — RESUMO DE PEDIDOS NO INÍCIO

  function atualizarResumoPedidosCliente() {
    const elemento = document.getElementById("total-pedidos-ativos");

    if (!elemento) {
      return;
    }

    const ativos = pedidosClienteCache.filter(
      (pedido) =>
        pedido.status === "pendente" || pedido.status === "confirmado",
    );

    elemento.textContent = String(ativos.length);
  }

  // 21.7 — PEDIDO EM ANDAMENTO NO INÍCIO

  function renderizarPedidoAtivoInicio() {
    const container = document.getElementById("card-pedido-ativo");

    if (!container) {
      return;
    }

    const pedido = pedidosClienteCache.find(
      (item) => item.status === "pendente" || item.status === "confirmado",
    );

    if (!pedido) {
      container.innerHTML = `
        <div class="lista-vazia">
          <p>📦 Nenhum pedido em andamento.</p>

          <small>
            Quando você comprar algum produto,
            poderá acompanhar o pedido aqui.
          </small>
        </div>
      `;

      return;
    }

    const produto = pedido.produtos?.nome || "Produto";

    const barbearia = pedido.barbearias?.nome || "Barbearia";

    const quantidade = Number(pedido.quantidade) || 0;

    const preco = Number(pedido.preco_unitario) || 0;

    const total = quantidade * preco;

    container.innerHTML = `
      <article class="item-agendamento">

        <div class="item-agendamento-topo">

          <div>
            <h3>
              📦 ${escaparHtmlExtra(produto)}
            </h3>

            <p>
              ${escaparHtmlExtra(barbearia)}
            </p>
          </div>

          <span
            class="
              status
              ${obterClasseStatusPedidoExtra(pedido.status)}
            "
          >
            ${escaparHtmlExtra(obterStatusPedidoExtra(pedido.status))}
          </span>

        </div>

        <div class="item-agendamento-detalhes">

          <p>
            Quantidade:
            <strong>
              ${quantidade}
            </strong>
          </p>

          <p>
            Total:
            <strong>
              ${formatarMoedaExtra(total)}
            </strong>
          </p>

        </div>

      </article>
    `;
  }

  // 21.8 — CARREGAR FINANCEIRO DO CLIENTE

  async function carregarFinanceiroCliente() {
    const lista = document.getElementById("lista-gastos-cliente");

    if (!usuarioAtual?.id) {
      financeiroClienteCache = {
        agendamentos: [],
        pedidos: [],
      };

      renderizarFinanceiroCliente();

      return financeiroClienteCache;
    }

    const cliente = await obterClienteAtualExtra();

    if (!cliente?.id) {
      financeiroClienteCache = {
        agendamentos: [],
        pedidos: [],
      };

      renderizarFinanceiroCliente();

      return financeiroClienteCache;
    }

    if (lista) {
      lista.innerHTML = `
        <div class="lista-vazia">
          <p>💰 Carregando seus gastos...</p>
        </div>
      `;
    }

    try {
      const [respostaAgendamentos, respostaPedidos] = await Promise.all([
        supabaseClient
          .from("agendamentos")
          .select(
            `
              id,
              cliente_id,
              barbearia_id,
              servico_id,
              data_hora,
              status,

              servicos:servico_id (
                id,
                nome,
                preco
              ),

              barbearias:barbearia_id (
                id,
                nome
              )
            `,
          )
          .eq("cliente_id", cliente.id)
          .eq("status", "concluido")
          .order("data_hora", {
            ascending: false,
          }),

        supabaseClient
          .from("pedidos")
          .select(
            `
              id,
              cliente_id,
              barbearia_id,
              produto_id,
              quantidade,
              preco_unitario,
              status,
              created_at,
              confirmado_at,
              concluido_at,

              produtos:produto_id (
                id,
                nome
              ),

              barbearias:barbearia_id (
                id,
                nome
              )
            `,
          )
          .eq("cliente_id", usuarioAtual.id)
          .in("status", ["confirmado", "concluido"])
          .order("confirmado_at", {
            ascending: false,
            nullsFirst: false,
          }),
      ]);

      if (respostaAgendamentos.error) {
        throw respostaAgendamentos.error;
      }

      if (respostaPedidos.error) {
        throw respostaPedidos.error;
      }

      financeiroClienteCache = {
        agendamentos: respostaAgendamentos.data || [],

        pedidos: respostaPedidos.data || [],
      };

      renderizarFinanceiroCliente();

      return financeiroClienteCache;
    } catch (erro) {
      console.error("[BarberHub] Erro ao carregar gastos do cliente:", erro);

      financeiroClienteCache = {
        agendamentos: [],
        pedidos: [],
      };

      renderizarFinanceiroCliente();

      if (lista) {
        lista.innerHTML = `
          <div class="lista-vazia">
            <p>
              Não foi possível carregar seus gastos.
            </p>

            <small>
              Atualize a página e tente novamente.
            </small>
          </div>
        `;
      }

      return financeiroClienteCache;
    }
  }

  // 21.9 — CALCULAR FINANCEIRO

  function calcularFinanceiroCliente() {
    const agendamentos = financeiroClienteCache.agendamentos || [];

    const pedidos = financeiroClienteCache.pedidos || [];

    const servicosMes = agendamentos.filter((agendamento) =>
      estaNoMesAtual(agendamento.data_hora),
    );

    const pedidosMes = pedidos.filter((pedido) =>
      estaNoMesAtual(pedido.confirmado_at),
    );

    const totalServicos = servicosMes.reduce((total, agendamento) => {
      const valor = Number(agendamento.servicos?.preco);

      return total + (Number.isFinite(valor) ? valor : 0);
    }, 0);

    const totalProdutos = pedidosMes.reduce((total, pedido) => {
      const quantidade = Number(pedido.quantidade);

      const preco = Number(pedido.preco_unitario);

      const quantidadeSegura = Number.isFinite(quantidade) ? quantidade : 0;

      const precoSeguro = Number.isFinite(preco) ? preco : 0;

      return total + quantidadeSegura * precoSeguro;
    }, 0);

    return {
      servicos: totalServicos,
      produtos: totalProdutos,
      total: totalServicos + totalProdutos,
    };
  }

  // 21.10 — RENDERIZAR FINANCEIRO

  function renderizarFinanceiroCliente() {
    const resumo = calcularFinanceiroCliente();

    const gastoInicio = document.getElementById("gasto-mes-cliente");

    const totalMes = document.getElementById("financeiro-cliente-mes");

    const totalServicos = document.getElementById(
      "financeiro-cliente-servicos",
    );

    const totalProdutos = document.getElementById(
      "financeiro-cliente-produtos",
    );

    if (gastoInicio) {
      gastoInicio.textContent = formatarMoedaExtra(resumo.total);
    }

    if (totalMes) {
      totalMes.textContent = formatarMoedaExtra(resumo.total);
    }

    if (totalServicos) {
      totalServicos.textContent = formatarMoedaExtra(resumo.servicos);
    }

    if (totalProdutos) {
      totalProdutos.textContent = formatarMoedaExtra(resumo.produtos);
    }

    renderizarHistoricoGastosCliente();
  }

  // 21.11 — HISTÓRICO DE GASTOS

  function renderizarHistoricoGastosCliente() {
    const lista = document.getElementById("lista-gastos-cliente");

    if (!lista) {
      return;
    }

    const itens = [];

    financeiroClienteCache.agendamentos.forEach((agendamento) => {
      itens.push({
        tipo: "servico",
        data: agendamento.data_hora,
        nome: agendamento.servicos?.nome || "Serviço",
        barbearia: agendamento.barbearias?.nome || "Barbearia",
        valor: Number(agendamento.servicos?.preco) || 0,
      });
    });

    financeiroClienteCache.pedidos.forEach((pedido) => {
      if (!pedido.confirmado_at) {
        return;
      }

      const quantidade = Number(pedido.quantidade) || 0;

      const preco = Number(pedido.preco_unitario) || 0;

      itens.push({
        tipo: "produto",
        data: pedido.confirmado_at,
        nome: pedido.produtos?.nome || "Produto",
        barbearia: pedido.barbearias?.nome || "Barbearia",
        valor: quantidade * preco,
        quantidade,
      });
    });

    itens.sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    );

    if (!itens.length) {
      lista.innerHTML = `
        <div class="lista-vazia">
          <p>💰 Nenhum gasto registrado.</p>

          <small>
            Serviços concluídos e produtos confirmados
            aparecerão aqui.
          </small>
        </div>
      `;

      return;
    }

    lista.innerHTML = itens
      .slice(0, 50)
      .map((item) => {
        const icone = item.tipo === "servico" ? "✂️" : "🛍️";

        const descricaoQuantidade =
          item.tipo === "produto"
            ? `
              <p>
                Quantidade:
                <strong>
                  ${item.quantidade}
                </strong>
              </p>
            `
            : "";

        return `
          <article class="item-agendamento">

            <div class="item-agendamento-topo">

              <div>
                <h3>
                  ${icone}
                  ${escaparHtmlExtra(item.nome)}
                </h3>

                <p>
                  ${escaparHtmlExtra(item.barbearia)}
                </p>
              </div>

              <strong>
                ${formatarMoedaExtra(item.valor)}
              </strong>

            </div>

            <div class="item-agendamento-detalhes">

              <p>
                Data:
                <strong>
                  ${escaparHtmlExtra(formatarDataHoraExtra(item.data))}
                </strong>
              </p>

              ${descricaoQuantidade}

            </div>

          </article>
        `;
      })
      .join("");
  }

  // 21.12 — NOTIFICAÇÕES DO INÍCIO E BADGE

  function atualizarResumoNotificacoesCliente() {
    const notificacoes = Array.isArray(notificacoesCliente)
      ? notificacoesCliente
      : [];

    const naoLidas = notificacoes.filter(
      (notificacao) => notificacao.lida !== true,
    );

    const totalInicio = document.getElementById("total-notificacoes-inicio");

    const badge = document.getElementById("badge-notificacoes-mobile");

    if (totalInicio) {
      totalInicio.textContent = String(naoLidas.length);
    }

    if (badge) {
      badge.textContent =
        naoLidas.length > 99 ? "99+" : String(naoLidas.length);

      badge.hidden = naoLidas.length === 0;
    }

    renderizarNotificacoesRecentesInicio();
  }

  // 21.13 — NOTIFICAÇÕES RECENTES NO INÍCIO

  function renderizarNotificacoesRecentesInicio() {
    const container = document.getElementById("notificacoes-recentes-inicio");

    if (!container) {
      return;
    }

    const notificacoes = Array.isArray(notificacoesCliente)
      ? notificacoesCliente
      : [];

    const recentes = notificacoes.slice(0, 3);

    if (!recentes.length) {
      container.innerHTML = `
        <div class="lista-vazia">
          <p>🔔 Nenhuma notificação recente.</p>

          <small>
            Seus avisos aparecerão aqui.
          </small>
        </div>
      `;

      return;
    }

    container.innerHTML = recentes
      .map((notificacao) => {
        const icone =
          typeof obterIconeNotificacao === "function"
            ? obterIconeNotificacao(notificacao.tipo)
            : "🔔";

        const classe =
          typeof classeNotificacao === "function"
            ? classeNotificacao(notificacao.tipo)
            : "";

        return `
            <article
              class="
                item-notificacao
                ${
                  notificacao.lida
                    ? "item-notificacao--lida"
                    : "item-notificacao--nao-lida"
                }
                ${classe}
              "
            >

              <div
                class="item-notificacao-icone"
              >
                ${escaparHtmlExtra(icone)}
              </div>

              <div
                class="item-notificacao-conteudo"
              >

                <div
                  class="item-notificacao-topo"
                >
                  <div>
                    <h3>
                      ${escaparHtmlExtra(notificacao.titulo || "Notificação")}
                    </h3>

                    ${
                      !notificacao.lida
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
                  ${escaparHtmlExtra(notificacao.mensagem || "")}
                </p>

                <small>
                  ${escaparHtmlExtra(
                    formatarDataHoraExtra(notificacao.created_at),
                  )}
                </small>

              </div>

            </article>
          `;
      })
      .join("");
  }

  // 21.14 — ATUALIZAR DADOS EXTRAS DO INÍCIO

  async function carregarResumoExtraInicio() {
    await Promise.all([
      carregarPedidosCliente(),
      carregarFinanceiroCliente(),
      carregarNotificacoesCliente(),
    ]);

    atualizarResumoPedidosCliente();
    renderizarPedidoAtivoInicio();
    atualizarResumoNotificacoesCliente();
  }

  // 21.15 — ESTENDER CARREGAMENTO DAS ABAS

  const carregarDadosDaAbaOriginal = carregarDadosDaAba;

  carregarDadosDaAba = async function (aba) {
    if (aba === "pedidos") {
      await carregarPedidosCliente();

      return;
    }

    if (aba === "financeiro") {
      await carregarFinanceiroCliente();

      return;
    }

    await carregarDadosDaAbaOriginal(aba);

    if (aba === "inicio") {
      await carregarResumoExtraInicio();
    }
  };

  // 21.16 — ATUALIZAR BADGE DEPOIS DE LER NOTIFICAÇÕES

  if (typeof renderizarNotificacoesCliente === "function") {
    const renderizarNotificacoesOriginal = renderizarNotificacoesCliente;

    renderizarNotificacoesCliente = function (...args) {
      const resultado = renderizarNotificacoesOriginal(...args);

      atualizarResumoNotificacoesCliente();

      return resultado;
    };
  }

  // 21.17 — ATUALIZAR PEDIDOS APÓS COMPRA

  if (typeof comprarProdutoCliente === "function") {
    const comprarProdutoOriginal = comprarProdutoCliente;

    comprarProdutoCliente = async function (...args) {
      const resultado = await comprarProdutoOriginal(...args);

      if (resultado === true) {
        await carregarPedidosCliente();

        await carregarFinanceiroCliente();
      }

      return resultado;
    };
  }

  // 21.18 — EVENTOS

  function configurarEventosPainelExtraCliente() {
    configurarFiltrosPedidosCliente();
  }

  // 21.19 — ATUALIZAR AO VOLTAR PARA O APP

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    if (!usuarioAtual?.id) {
      return;
    }

    try {
      await Promise.all([
        carregarPedidosCliente(),
        carregarNotificacoesCliente(),
      ]);

      atualizarResumoNotificacoesCliente();
    } catch (erro) {
      console.warn(
        "[BarberHub] Não foi possível atualizar o resumo do cliente:",
        erro,
      );
    }
  });

  // 21.20 — PREPARAR

  document.addEventListener("DOMContentLoaded", () => {
    configurarEventosPainelExtraCliente();

    console.log("[BarberHub] Painel extra do cliente carregado.");
  });
})();

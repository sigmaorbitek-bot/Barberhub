// 12. PRODUTOS

// 12.1 CARREGAR PRODUTOS

async function carregarProdutosCliente() {
  const lista = document.getElementById("lista-produtos-cliente");

  if (!lista) {
    return [];
  }

  lista.innerHTML = `
    <div class="lista-vazia">
      <p>
        🛍️ Carregando produtos...
      </p>
    </div>
  `;

  try {
    const { data, error } = await supabaseClient
      .from("produtos")
      .select(
        `
          id,
          barbearia_id,
          nome,
          preco,
          estoque,
          foto_url,

          barbearias (
            id,
            nome,
            cidade,
            telefone,
            logo_url
          )
        `,
      )
      .gt("estoque", 0)
      .order("nome", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    produtosCliente = data || [];

    renderizarProdutosCliente();

    return produtosCliente;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar produtos", erro);

    produtosCliente = [];

    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          Não foi possível carregar os produtos.
        </p>

        <small>
          Tente novamente em alguns instantes.
        </small>

      </div>
    `;

    return [];
  }
}

// 12.2 AGRUPAR PRODUTOS POR BARBEARIA

function agruparProdutosPorBarbearia(produtos) {
  const grupos = new Map();

  produtos.forEach((produto) => {
    const barbearia = produto.barbearias;

    if (!barbearia?.id) {
      return;
    }

    if (!grupos.has(barbearia.id)) {
      grupos.set(barbearia.id, {
        barbearia,
        produtos: [],
      });
    }

    grupos.get(barbearia.id).produtos.push(produto);
  });

  return Array.from(grupos.values());
}

// 12.3 COMPRAR PRODUTO

async function comprarProdutoCliente(produtoId) {
  if (!usuarioAtual?.id) {
    alert("Sua sessão expirou. Faça login novamente.");

    return false;
  }

  if (!produtoId) {
    return false;
  }

  const produto = produtosCliente.find(
    (item) => String(item.id) === String(produtoId),
  );

  if (!produto) {
    alert("Produto não encontrado.");

    return false;
  }

  const estoque = Number(produto.estoque) || 0;

  if (estoque <= 0) {
    alert("Este produto está esgotado.");

    await carregarProdutosCliente();

    return false;
  }

  const barbearia = produto.barbearias;

  if (!barbearia?.id) {
    alert("Barbearia do produto não encontrada.");

    return false;
  }

  if (!barbearia.telefone) {
    alert("Esta barbearia não possui telefone cadastrado.");

    return false;
  }

  const confirmou = window.confirm(
    `Deseja solicitar 1 unidade de "${produto.nome}" por ${formatarPreco(produto.preco)}?`,
  );

  if (!confirmou) {
    return false;
  }

  try {
    mostrarMensagem("mensagem-produto", "Registrando seu pedido...", "info");

    const { data: pedido, error } = await supabaseClient.rpc("criar_pedido", {
      p_produto_id: produto.id,

      p_quantidade: 1,
    });

    if (error) {
      throw error;
    }

    if (!pedido) {
      throw new Error("A função criar_pedido não retornou o pedido criado.");
    }

    const pedidoCriado = Array.isArray(pedido) ? pedido[0] : pedido;

    const nomeClienteAtual =
      perfilAtual?.nome ||
      clienteAtual?.nome ||
      usuarioAtual.email ||
      "Cliente";

    const valorUnitario = Number(produto.preco) || 0;

    const total = Number(pedidoCriado?.total) || valorUnitario;

    const pedidoId = pedidoCriado?.id || "Novo pedido";

    const mensagem = `Olá! 👋

Tenho um novo pedido pelo BarberHub.

🆔 Pedido: ${pedidoId}
👤 Cliente: ${nomeClienteAtual}
💈 Barbearia: ${barbearia.nome}
🛍️ Produto: ${produto.nome}
📦 Quantidade: 1
💰 Valor unitário: ${formatarPreco(valorUnitario)}
💰 Total: ${formatarPreco(total)}
📌 Status: Pendente

Gostaria de confirmar a compra e saber como realizar o pagamento.

Pedido iniciado pelo BarberHub.`;

    mostrarMensagem(
      "mensagem-produto",
      "Pedido criado com sucesso! ✅",
      "sucesso",
    );

    if (barbearia.telefone) {
      const abriu = abrirWhatsApp(barbearia.telefone, mensagem);

      if (!abriu) {
        mostrarMensagem(
          "mensagem-produto",
          "Pedido criado, mas não foi possível abrir o WhatsApp.",
          "info",
        );
      }
    }

    await carregarProdutosCliente();

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao criar pedido", erro);

    const mensagemErro = String(erro?.message || "").toLowerCase();

    if (mensagemErro.includes("estoque insuficiente")) {
      await carregarProdutosCliente();

      mostrarMensagem(
        "mensagem-produto",
        "Este produto acabou de ficar sem estoque.",
        "erro",
      );

      return false;
    }

    if (
      mensagemErro.includes("não autenticado") ||
      mensagemErro.includes("not authenticated")
    ) {
      mostrarMensagem(
        "mensagem-produto",
        "Sua sessão expirou. Faça login novamente.",
        "erro",
      );

      return false;
    }

    if (mensagemErro.includes("não é um cliente")) {
      mostrarMensagem(
        "mensagem-produto",
        "Sua conta não possui permissão de cliente.",
        "erro",
      );

      return false;
    }

    if (erro?.code === "42501") {
      mostrarMensagem(
        "mensagem-produto",
        "Você não tem permissão para criar este pedido.",
        "erro",
      );

      return false;
    }

    mostrarMensagem(
      "mensagem-produto",
      "Não foi possível registrar seu pedido.",
      "erro",
    );

    return false;
  }
}

// 12.4 RENDERIZAR PRODUTOS

function renderizarProdutosCliente() {
  const lista = document.getElementById("lista-produtos-cliente");

  if (!lista) {
    return;
  }

  const disponiveis = produtosCliente.filter(
    (produto) => Number(produto.estoque) > 0,
  );

  if (!disponiveis.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          🛍️ Nenhum produto disponível no momento.
        </p>

        <small>
          As barbearias ainda não possuem produtos disponíveis para venda.
        </small>

      </div>
    `;

    return;
  }

  const grupos = agruparProdutosPorBarbearia(disponiveis);

  lista.innerHTML = grupos
    .map((grupo) => {
      const barbearia = grupo.barbearia;

      const logo = barbearia.logo_url || "../assets/barber.png";

      const produtos = grupo.produtos
        .map((produto) => {
          const foto = produto.foto_url || "../assets/barber.png";

          const estoque = Number(produto.estoque) || 0;

          return `
                    <article
                      class="item-produto-cliente"
                    >

                      <div
                        class="item-produto-cliente-imagem"
                      >
                        <img
                          src="${escapeHTML(foto)}"
                          alt="${escapeHTML(produto.nome || "Produto")}"
                          onerror="this.src='../assets/barber.png'"
                        />
                      </div>

                      <div
                        class="item-produto-cliente-conteudo"
                      >

                        <h4>
                          ${escapeHTML(produto.nome || "Produto")}
                        </h4>

                        <strong>
                          ${formatarPreco(produto.preco)}
                        </strong>

                        <small>
                          ✅ Disponível
                        </small>

                        <span
                          class="produto-estoque"
                        >
                          ${estoque}
                          ${
                            estoque === 1
                              ? " unidade disponível"
                              : " unidades disponíveis"
                          }
                        </span>

                        <button
                          type="button"
                          class="
                            btn-principal
                            btn-comprar-produto
                          "
                          data-produto-id="${escapeHTML(produto.id)}"
                        >
                          🛒 Comprar
                        </button>

                      </div>

                    </article>
                  `;
        })
        .join("");

      return `
            <section
              class="produtos-barbearia"
            >

              <div
                class="produtos-barbearia-cabecalho"
              >

                <div
                  class="produtos-barbearia-logo"
                >
                  <img
                    src="${escapeHTML(logo)}"
                    alt="Logo ${escapeHTML(barbearia.nome || "Barbearia")}"
                    onerror="this.src='../assets/barber.png'"
                  />
                </div>

                <div
                  class="produtos-barbearia-info"
                >

                  <h3>
                    ${escapeHTML(barbearia.nome || "Barbearia")}
                  </h3>

                  ${
                    barbearia.cidade
                      ? `
                        <p>
                          📍
                          ${escapeHTML(barbearia.cidade)}
                        </p>
                      `
                      : ""
                  }

                </div>

              </div>

              <div
                class="produtos-barbearia-lista"
              >
                ${produtos}
              </div>

            </section>
          `;
    })
    .join("");
}

// 12.5 EVENTOS DOS PRODUTOS

function configurarEventosProdutos() {
  const lista = document.getElementById("lista-produtos-cliente");

  if (!lista) {
    return;
  }

  if (lista.dataset.produtosConfigurados === "true") {
    return;
  }

  lista.dataset.produtosConfigurados = "true";

  lista.addEventListener("click", (evento) => {
    const botao = evento.target.closest(".btn-comprar-produto");

    if (!botao) {
      return;
    }

    const produtoId = botao.dataset.produtoId;

    comprarProdutoCliente(produtoId);
  });
}

// 12.6 ATUALIZAR PRODUTOS

async function atualizarProdutosCliente() {
  return carregarProdutosCliente();
}

// 13. AVALIAÇÕES

// 13.1 CARREGAR AVALIAÇÕES

async function carregarAvaliacoesCliente() {
  if (!usuarioAtual?.id) {
    avaliacoesCliente = [];

    renderizarAvaliacoesPendentes();
    renderizarMeusComentarios();

    return [];
  }

  try {
    await carregarAgendamentos();

    const { data, error } = await supabaseClient
      .from("avaliacoes")
      .select(
        `
          id,
          cliente_id,
          barbearia_id,
          agendamento_id,
          nota,
          comentario,
          created_at,

          barbearias (
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

    avaliacoesCliente = data || [];

    renderizarAvaliacoesPendentes();
    renderizarMeusComentarios();

    return avaliacoesCliente;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar avaliações", erro);

    avaliacoesCliente = [];

    renderizarAvaliacoesPendentes();
    renderizarMeusComentarios();

    return [];
  }
}

// 13.2 VERIFICAR SE JÁ FOI AVALIADO

function agendamentoFoiAvaliado(agendamentoId) {
  if (!agendamentoId) {
    return false;
  }

  return avaliacoesCliente.some(
    (avaliacao) => String(avaliacao.agendamento_id) === String(agendamentoId),
  );
}

// 13.3 ATENDIMENTOS PENDENTES

function obterAgendamentosPendentesAvaliacao() {
  return agendamentos.filter(
    (agendamento) =>
      agendamento.status === "concluido" &&
      !agendamentoFoiAvaliado(agendamento.id),
  );
}

// 13.4 RENDERIZAR AVALIAÇÕES PENDENTES

function renderizarAvaliacoesPendentes() {
  const lista = document.getElementById("lista-avaliacoes-pendentes");

  if (!lista) {
    return;
  }

  const pendentes = obterAgendamentosPendentesAvaliacao();

  if (!pendentes.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          ⭐ Você não possui atendimentos pendentes de avaliação.
        </p>

        <small>
          Os atendimentos concluídos aparecerão aqui para você avaliar.
        </small>

      </div>
    `;

    return;
  }

  lista.innerHTML = pendentes
    .map((agendamento) => {
      const barbearia = agendamento.barbearias;

      const servico = agendamento.servicos;

      const profissional = agendamento.profissionais;

      return `
            <article
              class="item-avaliacao"
              data-agendamento-id="${escapeHTML(agendamento.id)}"
            >

              <div
                class="item-avaliacao-topo"
              >

                <div>

                  <h3>
                    ${escapeHTML(barbearia?.nome || "Barbearia")}
                  </h3>

                  <p>
                    ${escapeHTML(servico?.nome || "Serviço")}
                  </p>

                </div>

                ${
                  profissional
                    ? `
                      <span>
                        💇
                        ${escapeHTML(profissional.nome)}
                      </span>
                    `
                    : ""
                }

              </div>

              <div
                class="item-avaliacao-detalhes"
              >

                <p>
                  📅
                  ${formatarData(agendamento.data_hora)}
                </p>

                <p>
                  🕐
                  ${formatarHora(agendamento.data_hora)}
                </p>

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

              <div
                class="avaliacao-formulario"
              >

                <div
                  class="form-campo"
                >

                  <label
                    for="nota-${escapeHTML(agendamento.id)}"
                  >
                    Sua nota
                  </label>

                  <select
                    id="nota-${escapeHTML(agendamento.id)}"
                    class="campo-nota-avaliacao"
                  >

                    <option value="">
                      Selecione uma nota
                    </option>

                    <option value="5">
                      ⭐⭐⭐⭐⭐ — Excelente
                    </option>

                    <option value="4">
                      ⭐⭐⭐⭐ — Muito bom
                    </option>

                    <option value="3">
                      ⭐⭐⭐ — Bom
                    </option>

                    <option value="2">
                      ⭐⭐ — Regular
                    </option>

                    <option value="1">
                      ⭐ — Ruim
                    </option>

                  </select>

                </div>

                <div
                  class="form-campo"
                >

                  <label
                    for="comentario-${escapeHTML(agendamento.id)}"
                  >
                    Comentário
                  </label>

                  <textarea
                    id="comentario-${escapeHTML(agendamento.id)}"
                    placeholder="Conte como foi sua experiência..."
                    maxlength="500"
                  ></textarea>

                  <small class="campo-ajuda">
                    O comentário é opcional.
                  </small>

                </div>

                <div
                  class="form-item-botoes"
                >

                  <button
                    type="button"
                    class="
                      btn-principal
                      btn-enviar-avaliacao
                    "
                    data-agendamento-id="${escapeHTML(agendamento.id)}"
                  >
                    ⭐ Enviar avaliação
                  </button>

                </div>

              </div>

            </article>
          `;
    })
    .join("");
}

// 13.5 RENDERIZAR MEUS COMENTÁRIOS

function renderizarMeusComentarios() {
  const lista = document.getElementById("lista-meus-comentarios");

  if (!lista) {
    return;
  }

  if (!avaliacoesCliente.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          💬 Você ainda não enviou nenhuma avaliação.
        </p>

        <small>
          Depois de concluir um atendimento,
          você poderá deixar sua opinião aqui.
        </small>

      </div>
    `;

    return;
  }

  lista.innerHTML = avaliacoesCliente
    .map((avaliacao) => {
      const barbearia = avaliacao.barbearias;

      const nota = Number(avaliacao.nota) || 0;

      const notaLimitada = Math.max(1, Math.min(5, nota));

      const estrelas = "⭐".repeat(notaLimitada);

      return `
            <article
              class="item-comentario-cliente"
            >

              <div
                class="item-comentario-topo"
              >

                <div>

                  <h3>
                    ${escapeHTML(barbearia?.nome || "Barbearia")}
                  </h3>

                  <span
                    aria-label="${notaLimitada} de 5 estrelas"
                  >
                    ${estrelas}
                  </span>

                </div>

                <small>
                  ${formatarData(avaliacao.created_at)}
                </small>

              </div>

              ${
                barbearia?.cidade
                  ? `
                    <small>
                      📍
                      ${escapeHTML(barbearia.cidade)}
                    </small>
                  `
                  : ""
              }

              <p>
                ${
                  avaliacao.comentario
                    ? escapeHTML(avaliacao.comentario)
                    : "Sem comentário."
                }
              </p>

            </article>
          `;
    })
    .join("");
}

// 13.6 ENVIAR AVALIAÇÃO

async function enviarAvaliacao(agendamentoId) {
  if (!usuarioAtual?.id) {
    mostrarMensagem(
      "mensagem-avaliacao",
      "Sua sessão expirou. Faça login novamente.",
      "erro",
    );

    return false;
  }

  if (!agendamentoId) {
    return false;
  }

  limparMensagem("mensagem-avaliacao");

  const agendamento = agendamentos.find(
    (item) => String(item.id) === String(agendamentoId),
  );

  if (!agendamento) {
    mostrarMensagem(
      "mensagem-avaliacao",
      "Atendimento não encontrado.",
      "erro",
    );

    return false;
  }

  if (agendamento.status !== "concluido") {
    mostrarMensagem(
      "mensagem-avaliacao",
      "Você só pode avaliar atendimentos concluídos.",
      "erro",
    );

    return false;
  }

  if (agendamentoFoiAvaliado(agendamentoId)) {
    mostrarMensagem(
      "mensagem-avaliacao",
      "Esse atendimento já foi avaliado.",
      "erro",
    );

    return false;
  }

  const campoNota = document.getElementById(`nota-${agendamentoId}`);

  const campoComentario = document.getElementById(
    `comentario-${agendamentoId}`,
  );

  const nota = Number(campoNota?.value);

  const comentario = campoComentario?.value?.trim() || null;

  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    mostrarMensagem(
      "mensagem-avaliacao",
      "Selecione uma nota de 1 a 5 estrelas.",
      "erro",
    );

    campoNota?.focus();

    return false;
  }

  if (comentario && comentario.length > 500) {
    mostrarMensagem(
      "mensagem-avaliacao",
      "O comentário pode ter no máximo 500 caracteres.",
      "erro",
    );

    campoComentario?.focus();

    return false;
  }

  const botao = document.querySelector(
    `.btn-enviar-avaliacao[data-agendamento-id="${CSS.escape(
      String(agendamentoId),
    )}"]`,
  );

  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Enviando...";
    }

    mostrarMensagem("mensagem-avaliacao", "Enviando sua avaliação...", "info");

    const { data, error } = await supabaseClient
      .from("avaliacoes")
      .insert({
        cliente_id: usuarioAtual.id,

        barbearia_id: agendamento.barbearia_id,

        agendamento_id: agendamento.id,

        nota,

        comentario,
      })
      .select(
        `
          id,
          cliente_id,
          barbearia_id,
          agendamento_id,
          nota,
          comentario,
          created_at,

          barbearias (
            id,
            nome,
            cidade,
            logo_url
          )
        `,
      )
      .single();

    if (error) {
      throw error;
    }

    console.log("[BarberHub] Avaliação criada:", data);

    mostrarMensagem(
      "mensagem-avaliacao",
      "Avaliação enviada com sucesso! ⭐",
      "sucesso",
    );

    await carregarAvaliacoesCliente();

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao enviar avaliação", erro);

    if (erro?.code === "23505") {
      mostrarMensagem(
        "mensagem-avaliacao",
        "Esse atendimento já possui uma avaliação.",
        "erro",
      );

      await carregarAvaliacoesCliente();

      return false;
    }

    if (erro?.code === "42501") {
      mostrarMensagem(
        "mensagem-avaliacao",
        "Você não tem permissão para avaliar este atendimento.",
        "erro",
      );

      return false;
    }

    mostrarMensagem(
      "mensagem-avaliacao",
      "Não foi possível enviar sua avaliação.",
      "erro",
    );

    return false;
  } finally {
    if (botao) {
      botao.disabled = false;

      botao.textContent = "⭐ Enviar avaliação";
    }
  }
}

// 13.7 EVENTOS DAS AVALIAÇÕES

function configurarEventosAvaliacoes() {
  const lista = document.getElementById("lista-avaliacoes-pendentes");

  if (!lista) {
    return;
  }

  if (lista.dataset.avaliacoesConfiguradas === "true") {
    return;
  }

  lista.dataset.avaliacoesConfiguradas = "true";

  lista.addEventListener("click", (evento) => {
    const botao = evento.target.closest(".btn-enviar-avaliacao");

    if (!botao) {
      return;
    }

    const agendamentoId = botao.dataset.agendamentoId;

    enviarAvaliacao(agendamentoId);
  });
}

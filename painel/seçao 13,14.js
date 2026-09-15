// 13. NOTIFICAÇÕES

const totalNotificacoesEl = document.getElementById("total-notificacoes");
const listaNotificacoesEl = document.getElementById("lista-notificacoes");
const btnNotificacoesEl = document.getElementById("btn-notificacoes");
const badgeNotificacoesEl = document.getElementById("badge-notificacoes");
const btnNotificacoesMobileEl = document.getElementById(
  "btn-notificacoes-mobile",
);
const badgeNotificacoesMobileEl = document.getElementById(
  "badge-notificacoes-mobile",
);
const somNotificacao = new Audio("../assets/notificacao.mp3");
somNotificacao.volume = 0.6;

let notificacoesInicializadas = false;
let ultimaNotificacaoConhecida = null;

// TOCAR SOM

function tocarSomNotificacao() {
  try {
    somNotificacao.currentTime = 0;

    somNotificacao.play().catch(() => {
      // Navegadores podem bloquear áudio
      // até existir interação do usuário.
    });
  } catch (erro) {
    console.warn("Não foi possível tocar a notificação:", erro);
  }
}

// CARREGAR NOTIFICAÇÕES

async function carregarNotificacoes() {
  if (!lojaId) {
    return false;
  }

  try {
    const { data, error } = await supabaseClient
      .from("notificacoes")
      .select(
        `
          id,
          barbearia_id,
          tipo,
          titulo,
          mensagem,
          referencia_id,
          lida,
          created_at
        `,
      )
      .eq("barbearia_id", lojaId)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      throw error;
    }

    const novasNotificacoes = data || [];
    const notificacaoMaisRecente = novasNotificacoes[0] || null;

    if (
      notificacoesInicializadas &&
      notificacaoMaisRecente &&
      notificacaoMaisRecente.id !== ultimaNotificacaoConhecida
    ) {
      tocarSomNotificacao();
    }

    notificacoesCache = novasNotificacoes;
    ultimaNotificacaoConhecida = notificacaoMaisRecente?.id || null;
    notificacoesInicializadas = true;

    renderizarNotificacoes(notificacoesCache);

    return true;
  } catch (erro) {
    console.error("Erro ao carregar notificações:", erro);

    notificacoesCache = [];
    atualizarContadorNotificacoes();

    if (listaNotificacoesEl) {
      listaNotificacoesEl.innerHTML = `
        <p class="em-breve">
          Não foi possível carregar as notificações.
        </p>
      `;
    }

    return false;
  }
}

// CONTADOR

function atualizarContadorNotificacoes() {
  const lista = Array.isArray(notificacoesCache) ? notificacoesCache : [];

  const quantidadeNaoLidas = lista.filter(
    (notificacao) => !notificacao.lida,
  ).length;

  if (totalNotificacoesEl) {
    totalNotificacoesEl.textContent = String(quantidadeNaoLidas);
  }

  const textoBadge =
    quantidadeNaoLidas > 99 ? "99+" : String(quantidadeNaoLidas);

  if (badgeNotificacoesEl) {
    badgeNotificacoesEl.textContent = textoBadge;

    badgeNotificacoesEl.hidden = quantidadeNaoLidas === 0;
  }

  if (badgeNotificacoesMobileEl) {
    badgeNotificacoesMobileEl.textContent = textoBadge;

    badgeNotificacoesMobileEl.hidden = quantidadeNaoLidas === 0;
  }
}

// RENDERIZAR NOTIFICAÇÕES

function renderizarNotificacoes(notificacoes) {
  const lista = Array.isArray(notificacoes) ? notificacoes : [];

  atualizarContadorNotificacoes();

  if (!listaNotificacoesEl) {
    return;
  }

  listaNotificacoesEl.innerHTML = "";

  if (!lista.length) {
    listaNotificacoesEl.innerHTML = `
      <div class="item-vazio">
        <p>
          🔔 Nenhuma notificação.
        </p>
      </div>
    `;

    return;
  }

  lista.forEach((notificacao) => {
    const item = document.createElement("div");
    const titulo = notificacao.titulo || "Notificação";
    const mensagem = notificacao.mensagem || "";
    const dataObj = notificacao.created_at
      ? new Date(notificacao.created_at)
      : null;

    const dataFormatada =
      dataObj && !Number.isNaN(dataObj.getTime())
        ? dataObj.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          })
        : "";

    const classeEstado = notificacao.lida ? "lida" : "nao-lida";
    item.classList.add("item-lista", "notificacao-item", classeEstado);
    item.dataset.notificacaoId = notificacao.id;
    item.innerHTML = `
        <div class="item-info">

          <div class="notificacao-cabecalho">

            <strong>
              ${escaparHtml(titulo)}
            </strong>

            ${
              dataFormatada
                ? `
                  <span>
                    ${escaparHtml(dataFormatada)}
                  </span>
                `
                : ""
            }

          </div>

          ${
            mensagem
              ? `
                <p>
                  ${escaparHtml(mensagem)}
                </p>
              `
              : ""
          }

        </div>

        ${
          !notificacao.lida
            ? `
              <div class="item-acoes">

                <button
                  type="button"
                  onclick="marcarNotificacaoComoLida('${escaparHtml(
                    notificacao.id,
                  )}')"
                >
                  ✓ Marcar como lida
                </button>

              </div>
            `
            : ""
        }
      `;

    listaNotificacoesEl.appendChild(item);
  });
}

// MARCAR UMA COMO LIDA

async function marcarNotificacaoComoLida(id) {
  if (!id || !lojaId) {
    return false;
  }

  try {
    const { data, error } = await supabaseClient
      .from("notificacoes")
      .update({
        lida: true,
      })
      .eq("id", id)
      .eq("barbearia_id", lojaId)
      .eq("lida", false)
      .select("id, lida")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      await carregarNotificacoes();

      return false;
    }

    const notificacaoLocal = notificacoesCache.find(
      (item) => String(item.id) === String(id),
    );

    if (notificacaoLocal) {
      notificacaoLocal.lida = true;
    }

    renderizarNotificacoes(notificacoesCache);

    return true;
  } catch (erro) {
    console.error("Erro ao marcar notificação como lida:", erro);

    return false;
  }
}

// MARCAR TODAS COMO LIDAS

async function marcarTodasNotificacoesComoLidas() {
  if (!lojaId) {
    return false;
  }

  const possuiNaoLidas = notificacoesCache.some(
    (notificacao) => !notificacao.lida,
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
      .eq("barbearia_id", lojaId)
      .eq("lida", false);

    if (error) {
      throw error;
    }

    notificacoesCache.forEach((notificacao) => {
      notificacao.lida = true;
    });

    renderizarNotificacoes(notificacoesCache);

    return true;
  } catch (erro) {
    console.error("Erro ao marcar todas as notificações como lidas:", erro);

    return false;
  }
}

// ABRIR ÁREA DE NOTIFICAÇÕES

async function abrirNotificacoes() {
  await mudarAba("visao-geral");
  await carregarNotificacoes();

  requestAnimationFrame(() => {
    const secao = document.getElementById("lista-notificacoes");

    secao?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

if (btnNotificacoesEl) {
  btnNotificacoesEl.addEventListener("click", abrirNotificacoes);
}

if (btnNotificacoesMobileEl) {
  btnNotificacoesMobileEl.addEventListener("click", abrirNotificacoes);
}

// 14. FINANCEIRO

const listaFinanceiroEl = document.getElementById("lista-financeiro");
const formGasto = document.getElementById("form-gasto");
const btnSalvarGasto = document.getElementById("btn-salvar-gasto");
const btnCancelarGasto = document.getElementById("btn-cancelar-gasto");
const campoGastoId = document.getElementById("gasto-id");
const campoGastoDescricao = document.getElementById("gasto-descricao");
const campoGastoValor = document.getElementById("gasto-valor");
const campoGastoCategoria = document.getElementById("gasto-categoria");
const campoGastoData = document.getElementById("gasto-data");
const campoGastoPagamento = document.getElementById("gasto-pagamento");
const campoGastoObservacao = document.getElementById("gasto-observacao");
const financeiroEntradasEl = document.getElementById("financeiro-entradas");
const financeiroSaidasEl = document.getElementById("financeiro-saidas");
const financeiroLucroEl = document.getElementById("financeiro-lucro");

// CARREGAR FINANCEIRO

async function carregarFinanceiro() {
  if (!lojaId) {
    return false;
  }

  try {
    const agora = new Date();

    const inicioMes = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    const inicioProximoMes = new Date(
      agora.getFullYear(),
      agora.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );

    const dataInicial = obterDataLocalISO(inicioMes);

    const dataFinal = obterDataLocalISO(inicioProximoMes);

    const [respostaGastos, respostaAgendamentos] = await Promise.all([
      supabaseClient
        .from("gastos")
        .select(
          `
          id,
          barbearia_id,
          descricao,
          valor,
          categoria,
          data_gasto,
          pagamento,
          observacao
        `,
        )
        .eq("barbearia_id", lojaId)
        .gte("data_gasto", dataInicial)
        .lt("data_gasto", dataFinal)
        .order("data_gasto", {
          ascending: false,
        }),

      supabaseClient
        .from("agendamentos")
        .select(
          `
          id,
          status,
          data_hora,

          servicos:servico_id (
            id,
            nome,
            preco
          )
        `,
        )
        .eq("barbearia_id", lojaId)
        .gte("data_hora", inicioMes.toISOString())
        .lt("data_hora", inicioProximoMes.toISOString())
        .eq("status", "concluido"),
    ]);

    if (respostaGastos.error) {
      throw respostaGastos.error;
    }

    if (respostaAgendamentos.error) {
      throw respostaAgendamentos.error;
    }

    gastosCache = respostaGastos.data || [];

    const agendamentosFinanceiros = respostaAgendamentos.data || [];
    const entradas = agendamentosFinanceiros.reduce((total, agendamento) => {
      const preco = Number(agendamento.servicos?.preco);
      return total + (Number.isFinite(preco) ? preco : 0);
    }, 0);

    const saidas = gastosCache.reduce((total, gasto) => {
      const valor = Number(gasto.valor);

      return total + (Number.isFinite(valor) ? valor : 0);
    }, 0);

    const lucro = entradas - saidas;

    atualizarResumoFinanceiro({
      entradas,
      saidas,
      lucro,
    });

    renderizarGastos(gastosCache);

    prepararFormularioGasto();

    return true;
  } catch (erro) {
    console.error("Erro ao carregar financeiro:", erro);

    gastosCache = [];

    atualizarResumoFinanceiro({
      entradas: 0,
      saidas: 0,
      lucro: 0,
    });

    if (listaFinanceiroEl) {
      listaFinanceiroEl.innerHTML = `
        <p class="em-breve">
          Não foi possível carregar os dados financeiros.
        </p>
      `;
    }

    return false;
  }
}

// ATUALIZAR RESUMO FINANCEIRO

function atualizarResumoFinanceiro({
  entradas = 0,
  saidas = 0,
  lucro = 0,
} = {}) {
  if (financeiroEntradasEl) {
    financeiroEntradasEl.textContent = formatarMoeda(entradas);
  }

  if (financeiroSaidasEl) {
    financeiroSaidasEl.textContent = formatarMoeda(saidas);
  }

  if (financeiroLucroEl) {
    financeiroLucroEl.textContent = formatarMoeda(lucro);
  }
}

// PREPARAR FORMULÁRIO

function prepararFormularioGasto() {
  if (!campoGastoData) {
    return;
  }

  if (!campoGastoData.value) {
    campoGastoData.value = obterDataLocalISO();
  }
}

// RENDERIZAR GASTOS

function renderizarGastos(gastos) {
  if (!listaFinanceiroEl) {
    return;
  }

  const lista = Array.isArray(gastos) ? gastos : [];

  listaFinanceiroEl.innerHTML = "";

  if (!lista.length) {
    listaFinanceiroEl.innerHTML = `
      <p class="em-breve">
        Nenhum gasto cadastrado neste mês.
      </p>
    `;

    return;
  }

  lista.forEach((gasto) => {
    const item = document.createElement("div");
    item.classList.add("item-lista");
    const descricao = gasto.descricao || "Gasto";
    const categoria = gasto.categoria || "Sem categoria";
    const pagamento = gasto.pagamento
      ? formatarFormaPagamento(gasto.pagamento)
      : "";

    item.innerHTML = `
      <div class="item-info">

        <h3>
          ${escaparHtml(descricao)}
        </h3>

        <p>
          ${escaparHtml(categoria)}
          ·
          ${escaparHtml(formatarData(gasto.data_gasto))}
        </p>

        ${
          pagamento
            ? `
              <p>
                Pagamento:
                ${escaparHtml(pagamento)}
              </p>
            `
            : ""
        }

        ${
          gasto.observacao
            ? `
              <small>
                ${escaparHtml(gasto.observacao)}
              </small>
            `
            : ""
        }

      </div>

      <div class="item-acoes">

        <strong>
          -
          ${formatarMoeda(gasto.valor)}
        </strong>

        <button
          type="button"
          title="Editar gasto"
          onclick="editarGasto('${escaparHtml(gasto.id)}')"
        >
          ✏️
        </button>

        <button
          type="button"
          title="Excluir gasto"
          onclick="excluirGasto('${escaparHtml(gasto.id)}')"
        >
          🗑️
        </button>

      </div>
    `;

    listaFinanceiroEl.appendChild(item);
  });
}

// FORMATAR FORMA DE PAGAMENTO

function formatarFormaPagamento(pagamento) {
  const formas = {
    pix: "Pix",
    dinheiro: "Dinheiro",
    cartao: "Cartão",
    boleto: "Boleto",
    outro: "Outro",
  };

  return formas[pagamento] || pagamento || "";
}

// SALVAR / EDITAR GASTO

if (formGasto) {
  formGasto.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = campoGastoId?.value?.trim() || "";
    const descricao = campoGastoDescricao?.value?.trim() || "";
    const valor = Number(campoGastoValor?.value);
    const categoria = campoGastoCategoria?.value?.trim() || "";
    const dataGasto = campoGastoData?.value?.trim() || "";
    const pagamento = campoGastoPagamento?.value?.trim() || "";
    const observacao = campoGastoObservacao?.value?.trim() || "";

    if (!descricao) {
      mostrarMensagem(
        "mensagem-gasto",
        "Informe a descrição do gasto.",
        "erro",
      );

      campoGastoDescricao?.focus();

      return;
    }

    if (!Number.isFinite(valor) || valor <= 0) {
      mostrarMensagem(
        "mensagem-gasto",
        "Informe um valor válido para o gasto.",
        "erro",
      );

      campoGastoValor?.focus();

      return;
    }

    if (!categoria) {
      mostrarMensagem(
        "mensagem-gasto",
        "Selecione a categoria do gasto.",
        "erro",
      );

      campoGastoCategoria?.focus();

      return;
    }

    if (!dataGasto) {
      mostrarMensagem("mensagem-gasto", "Informe a data do gasto.", "erro");

      campoGastoData?.focus();

      return;
    }

    if (!pagamento) {
      mostrarMensagem(
        "mensagem-gasto",
        "Selecione a forma de pagamento.",
        "erro",
      );

      campoGastoPagamento?.focus();

      return;
    }

    if (!lojaId) {
      mostrarMensagem("mensagem-gasto", "Barbearia não identificada.", "erro");

      return;
    }

    if (btnSalvarGasto) {
      btnSalvarGasto.disabled = true;

      btnSalvarGasto.textContent = "Salvando...";
    }

    try {
      const dadosGasto = {
        descricao,
        valor,
        categoria,
        data_gasto: dataGasto,
        pagamento,
        observacao: observacao || null,
      };

      if (id) {
        const { data, error } = await supabaseClient
          .from("gastos")
          .update(dadosGasto)
          .eq("id", id)
          .eq("barbearia_id", lojaId)
          .select("id")
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("Gasto não encontrado ou sem permissão para edição.");
        }
      } else {
        const { error } = await supabaseClient.from("gastos").insert({
          barbearia_id: lojaId,

          ...dadosGasto,
        });

        if (error) {
          throw error;
        }
      }

      cancelarEdicaoGasto();

      await carregarFinanceiro();

      mostrarMensagem(
        "mensagem-gasto",
        id ? "Gasto atualizado com sucesso!" : "Gasto cadastrado com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro ao salvar gasto:", erro);

      mostrarMensagem(
        "mensagem-gasto",
        "Não foi possível salvar o gasto.",
        "erro",
      );
    } finally {
      if (btnSalvarGasto) {
        btnSalvarGasto.disabled = false;

        btnSalvarGasto.textContent = campoGastoId?.value
          ? "Salvar edição"
          : "+ Adicionar gasto";
      }
    }
  });
}

// EDITAR GASTO

function editarGasto(id) {
  if (!id) {
    return;
  }

  const gasto = gastosCache.find((item) => String(item.id) === String(id));

  if (!gasto) {
    mostrarMensagem("mensagem-gasto", "Gasto não encontrado.", "erro");

    return;
  }

  if (campoGastoId) {
    campoGastoId.value = gasto.id;
  }

  if (campoGastoDescricao) {
    campoGastoDescricao.value = gasto.descricao || "";
  }

  if (campoGastoValor) {
    campoGastoValor.value = gasto.valor ?? "";
  }

  if (campoGastoCategoria) {
    campoGastoCategoria.value = gasto.categoria || "";
  }

  if (campoGastoData) {
    campoGastoData.value = gasto.data_gasto || "";
  }

  if (campoGastoPagamento) {
    campoGastoPagamento.value = gasto.pagamento || "";
  }

  if (campoGastoObservacao) {
    campoGastoObservacao.value = gasto.observacao || "";
  }

  if (btnSalvarGasto) {
    btnSalvarGasto.textContent = "Salvar edição";
  }

  if (btnCancelarGasto) {
    btnCancelarGasto.hidden = false;
  }

  formGasto?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  campoGastoDescricao?.focus();
}

// CANCELAR EDIÇÃO

function cancelarEdicaoGasto() {
  if (!formGasto) {
    return;
  }

  formGasto.reset();

  if (campoGastoId) {
    campoGastoId.value = "";
  }

  if (campoGastoData) {
    campoGastoData.value = obterDataLocalISO();
  }

  if (btnSalvarGasto) {
    btnSalvarGasto.disabled = false;

    btnSalvarGasto.textContent = "+ Adicionar gasto";
  }

  if (btnCancelarGasto) {
    btnCancelarGasto.hidden = true;
  }
}

if (btnCancelarGasto) {
  btnCancelarGasto.addEventListener("click", cancelarEdicaoGasto);
}

// EXCLUIR GASTO

async function excluirGasto(id) {
  if (!id || !lojaId) {
    return;
  }

  const gasto = gastosCache.find((item) => String(item.id) === String(id));

  if (!gasto) {
    mostrarMensagem("mensagem-gasto", "Gasto não encontrado.", "erro");

    return;
  }

  const confirmou = confirm(
    `Deseja realmente remover o gasto "${gasto.descricao || "Gasto"}"?`,
  );

  if (!confirmou) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("gastos")
      .delete()
      .eq("id", id)
      .eq("barbearia_id", lojaId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      mostrarMensagem(
        "mensagem-gasto",
        "O gasto não foi encontrado ou não pôde ser removido.",
        "erro",
      );

      await carregarFinanceiro();

      return;
    }

    if (String(campoGastoId?.value) === String(id)) {
      cancelarEdicaoGasto();
    }

    await carregarFinanceiro();

    mostrarMensagem("mensagem-gasto", "Gasto removido com sucesso!", "sucesso");
  } catch (erro) {
    console.error("Erro ao excluir gasto:", erro);

    mostrarMensagem(
      "mensagem-gasto",
      "Não foi possível remover o gasto.",
      "erro",
    );
  }
}

prepararFormularioGasto();

// 15. CONFIGURAÇÕES

const formConfiguracaoBarbearia = document.getElementById(
  "form-configuracao-barbearia",
);

const formConfiguracaoUsuario = document.getElementById(
  "form-configuracao-usuario",
);

const btnAlterarSenha = document.getElementById("btn-alterar-senha");

const btnExcluirBarbearia = document.getElementById("btn-excluir-barbearia");

const campoConfigNome = document.getElementById("config-nome");

const campoConfigTelefone = document.getElementById("config-telefone");

const campoConfigCidade = document.getElementById("config-cidade");

const campoConfigEndereco = document.getElementById("config-endereco");

const campoConfigUsuarioNome = document.getElementById("config-usuario-nome");

const campoConfigUsuarioTelefone = document.getElementById(
  "config-usuario-telefone",
);

const campoConfigUsuarioEmail = document.getElementById("config-usuario-email");

// CARREGAR CONFIGURAÇÕES

async function carregarConfiguracoes() {
  if (!lojaAtual || !sessaoAtual?.user?.id) {
    return false;
  }

  try {
    if (campoConfigNome) {
      campoConfigNome.value = lojaAtual.nome || "";
    }

    if (campoConfigTelefone) {
      campoConfigTelefone.value = lojaAtual.telefone || "";
    }

    if (campoConfigCidade) {
      campoConfigCidade.value = lojaAtual.cidade || "";
    }

    if (campoConfigEndereco) {
      campoConfigEndereco.value = lojaAtual.endereco || "";
    }

    const { data: perfil, error } = await supabaseClient
      .from("profiles")
      .select(
        `
        id,
        nome,
        telefone,
        tipo
      `,
      )
      .eq("id", sessaoAtual.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (campoConfigUsuarioNome) {
      campoConfigUsuarioNome.value = perfil?.nome || "";
    }

    if (campoConfigUsuarioTelefone) {
      campoConfigUsuarioTelefone.value = perfil?.telefone || "";
    }

    if (campoConfigUsuarioEmail) {
      campoConfigUsuarioEmail.value = sessaoAtual.user.email || "";
    }

    return true;
  } catch (erro) {
    console.error("Erro ao carregar configurações:", erro);

    return false;
  }
}

// SALVAR DADOS DA BARBEARIA

if (formConfiguracaoBarbearia) {
  formConfiguracaoBarbearia.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!lojaId || !sessaoAtual?.user?.id) {
      return;
    }

    const nome = campoConfigNome?.value?.trim() || "";

    const telefone = campoConfigTelefone?.value?.trim() || "";

    const cidade = campoConfigCidade?.value?.trim() || "";

    const endereco = campoConfigEndereco?.value?.trim() || "";

    if (!nome) {
      mostrarMensagem(
        "mensagem-configuracao",
        "Informe o nome da barbearia.",
        "erro",
      );

      campoConfigNome?.focus();

      return;
    }

    if (!cidade) {
      mostrarMensagem(
        "mensagem-configuracao",
        "Informe a cidade da barbearia.",
        "erro",
      );

      campoConfigCidade?.focus();

      return;
    }

    const botao = formConfiguracaoBarbearia.querySelector(
      'button[type="submit"]',
    );

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Salvando...";
    }

    try {
      const { data, error } = await supabaseClient
        .from("barbearias")
        .update({
          nome,
          telefone: telefone || null,
          cidade,
          endereco: endereco || null,
        })
        .eq("id", lojaId)
        .eq("dono_id", sessaoAtual.user.id)
        .select(
          `
            id,
            dono_id,
            nome,
            cidade,
            endereco,
            telefone,
            horario_abertura,
            horario_fechamento,
            dias_funcionamento,
            logo_url,
            created_at
          `,
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "A barbearia não foi encontrada ou não pôde ser atualizada.",
        );
      }

      lojaAtual = data;

      atualizarCabecalhoLoja();

      mostrarMensagem(
        "mensagem-configuracao",
        "Dados da barbearia atualizados com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro ao atualizar barbearia:", erro);

      mostrarMensagem(
        "mensagem-configuracao",
        "Não foi possível salvar os dados da barbearia.",
        "erro",
      );
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Salvar alterações";
      }
    }
  });
}

// SALVAR DADOS DO USUÁRIO

if (formConfiguracaoUsuario) {
  formConfiguracaoUsuario.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!sessaoAtual?.user?.id) {
      return;
    }

    const nome = campoConfigUsuarioNome?.value?.trim() || "";
    const telefone = campoConfigUsuarioTelefone?.value?.trim() || "";

    if (!nome) {
      mostrarMensagem("mensagem-configuracao", "Informe seu nome.", "erro");

      campoConfigUsuarioNome?.focus();

      return;
    }

    const botao = formConfiguracaoUsuario.querySelector(
      'button[type="submit"]',
    );

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Salvando...";
    }

    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .update({
          nome,
          telefone: telefone || null,
        })
        .eq("id", sessaoAtual.user.id)
        .select(
          `
            id,
            nome,
            telefone,
            tipo
          `,
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Perfil não encontrado.");
      }

      mostrarMensagem(
        "mensagem-configuracao",
        "Seus dados foram atualizados com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro ao atualizar usuário:", erro);

      mostrarMensagem(
        "mensagem-configuracao",
        "Não foi possível salvar seus dados.",
        "erro",
      );
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Salvar dados";
      }
    }
  });
}

// ALTERAR SENHA

if (btnAlterarSenha) {
  btnAlterarSenha.addEventListener("click", async () => {
    const novaSenha = prompt("Digite sua nova senha:");

    if (!novaSenha) {
      return;
    }

    if (novaSenha.length < 6) {
      mostrarMensagem(
        "mensagem-configuracao",
        "A senha precisa ter pelo menos 6 caracteres.",
        "erro",
      );

      return;
    }

    const confirmacao = prompt("Digite novamente a nova senha:");

    if (novaSenha !== confirmacao) {
      mostrarMensagem(
        "mensagem-configuracao",
        "As senhas informadas não são iguais.",
        "erro",
      );

      return;
    }

    btnAlterarSenha.disabled = true;
    btnAlterarSenha.textContent = "Alterando...";

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: novaSenha,
      });

      if (error) {
        throw error;
      }

      mostrarMensagem(
        "mensagem-configuracao",
        "Senha alterada com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro ao alterar senha:", erro);

      mostrarMensagem(
        "mensagem-configuracao",
        "Não foi possível alterar a senha.",
        "erro",
      );
    } finally {
      btnAlterarSenha.disabled = false;
      btnAlterarSenha.textContent = "Alterar senha";
    }
  });
}

// EXCLUIR BARBEARIA

if (btnExcluirBarbearia) {
  btnExcluirBarbearia.addEventListener("click", async () => {
    if (!lojaAtual || !lojaId || !sessaoAtual?.user?.id) {
      return;
    }

    const nomeBarbearia = lojaAtual.nome || "";

    const confirmacao = prompt(
      `Digite "${nomeBarbearia}" para confirmar a exclusão:`,
    );

    if (confirmacao !== nomeBarbearia) {
      mostrarMensagem("mensagem-configuracao", "Exclusão cancelada.", "erro");

      return;
    }

    const segundaConfirmacao = confirm(
      "ATENÇÃO: esta ação é permanente. Deseja realmente excluir a barbearia?",
    );

    if (!segundaConfirmacao) {
      return;
    }

    btnExcluirBarbearia.disabled = true;

    btnExcluirBarbearia.textContent = "Excluindo...";

    try {
      const { data, error } = await supabaseClient
        .from("barbearias")
        .delete()
        .eq("id", lojaId)
        .eq("dono_id", sessaoAtual.user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "Barbearia não encontrada ou sem permissão para exclusão.",
        );
      }

      window.location.href = "../barbearias/index.html";
    } catch (erro) {
      console.error("Erro ao excluir barbearia:", erro);

      let mensagem = "Não foi possível excluir a barbearia.";

      if (erro?.code === "23503") {
        mensagem =
          "A barbearia possui registros vinculados e não pode ser excluída diretamente.";
      }

      mostrarMensagem("mensagem-configuracao", mensagem, "erro");

      btnExcluirBarbearia.disabled = false;

      btnExcluirBarbearia.textContent = "Excluir esta barbearia";
    }
  });
}

// 9. PROFISSIONAIS

const formBarbeiro = document.getElementById("form-barbeiro");

const listaProfissionaisEl = document.getElementById("lista-profissionais");

const btnSalvarBarbeiro = document.getElementById("btn-salvar-barbeiro");

const btnCancelarBarbeiro = document.getElementById("btn-cancelar-barbeiro");

const inputFotoBarbeiro = document.getElementById("barbeiro-foto");

const previewBarbeiro = document.getElementById("preview-barbeiro");

const previewBarbeiroImg = document.getElementById("preview-barbeiro-img");

const campoBarbeiroId = document.getElementById("barbeiro-id");

const campoBarbeiroNome = document.getElementById("barbeiro-nome");

const campoBarbeiroTelefone = document.getElementById("barbeiro-tel");

const campoBarbeiroFotoAtual = document.getElementById("barbeiro-foto-atual");

let previewBarbeiroObjectUrl = null;

// CARREGAR PROFISSIONAIS

async function carregarProfissionais() {
  if (!listaProfissionaisEl || !lojaId) {
    return false;
  }

  listaProfissionaisEl.innerHTML = `
    <p class="em-breve">
      Carregando profissionais...
    </p>
  `;

  try {
    const { data, error } = await supabaseClient
      .from("profissionais")
      .select(
        `
            id,
            barbearia_id,
            nome,
            telefone,
            foto_url,
            ativo,
            created_at
          `,
      )
      .eq("barbearia_id", lojaId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    profissionaisCache = Array.isArray(data) ? data : [];

    renderizarProfissionais(profissionaisCache);

    atualizarCardProfissionais();

    return true;
  } catch (erro) {
    console.error("Erro ao carregar profissionais:", erro);

    profissionaisCache = [];

    listaProfissionaisEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os profissionais.
      </p>
    `;

    atualizarCardProfissionais();

    return false;
  }
}

// ATUALIZAR CARD

function atualizarCardProfissionais() {
  const elemento = document.getElementById("total-profissionais");

  if (!elemento) {
    return;
  }

  const total = Array.isArray(profissionaisCache)
    ? profissionaisCache.length
    : 0;

  elemento.textContent = String(total);
}

// RENDERIZAR PROFISSIONAIS

function renderizarProfissionais(profissionais) {
  if (!listaProfissionaisEl) {
    return;
  }

  listaProfissionaisEl.innerHTML = "";

  const lista = Array.isArray(profissionais) ? profissionais : [];

  if (!lista.length) {
    listaProfissionaisEl.innerHTML = `
      <p class="em-breve">
        Nenhum profissional cadastrado.
      </p>
    `;

    return;
  }

  lista.forEach((profissional) => {
    const item = document.createElement("div");

    item.classList.add("item-lista");

    const nome = profissional.nome?.trim() || "Profissional";

    const telefone = profissional.telefone?.trim() || "Telefone não informado";

    const estaAtivo = profissional.ativo !== false;

    item.innerHTML = `
        <div class="item-info item-info--com-foto">

          ${
            profissional.foto_url
              ? `
                <img
                  src="${escaparHtml(profissional.foto_url)}"
                  alt="${escaparHtml(nome)}"
                  class="produto-thumb"
                  loading="lazy"
                  onerror="this.style.display='none'"
                >
              `
              : `
                <div
                  class="produto-thumb produto-thumb--vazia"
                  aria-hidden="true"
                >
                  💈
                </div>
              `
          }

          <div>

            <h3>
              ${escaparHtml(nome)}
            </h3>

            <p>
              ${escaparHtml(telefone)}
            </p>

            <p>
              ${estaAtivo ? "🟢 Ativo" : "🔴 Inativo"}
            </p>

          </div>

        </div>

        <div class="item-acoes">

          <button
            type="button"
            title="Editar profissional"
            aria-label="Editar profissional"
            onclick="editarBarbeiro('${escaparHtml(profissional.id)}')"
          >
            ✏️
          </button>

          <button
            type="button"
            title="Excluir profissional"
            aria-label="Excluir profissional"
            onclick="excluirBarbeiro('${escaparHtml(profissional.id)}')"
          >
            🗑️
          </button>

        </div>
      `;

    listaProfissionaisEl.appendChild(item);
  });
}

// PREVIEW DA FOTO

function limparPreviewBarbeiroObjectUrl() {
  if (!previewBarbeiroObjectUrl) {
    return;
  }

  URL.revokeObjectURL(previewBarbeiroObjectUrl);

  previewBarbeiroObjectUrl = null;
}

function restaurarPreviewBarbeiroAtual() {
  const fotoAtual = campoBarbeiroFotoAtual?.value?.trim() || "";

  if (fotoAtual && previewBarbeiroImg) {
    previewBarbeiroImg.src = fotoAtual;

    if (previewBarbeiro) {
      previewBarbeiro.hidden = false;
    }

    return;
  }

  if (previewBarbeiroImg) {
    previewBarbeiroImg.src = "";
  }

  if (previewBarbeiro) {
    previewBarbeiro.hidden = true;
  }
}

if (inputFotoBarbeiro) {
  inputFotoBarbeiro.addEventListener("change", () => {
    limparPreviewBarbeiroObjectUrl();

    const arquivo = inputFotoBarbeiro.files?.[0];

    if (!arquivo) {
      restaurarPreviewBarbeiroAtual();

      return;
    }

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

    if (!tiposPermitidos.includes(arquivo.type)) {
      mostrarMensagem(
        "mensagem-barbeiro",
        "Escolha uma imagem JPG, PNG ou WEBP.",
        "erro",
      );

      inputFotoBarbeiro.value = "";

      restaurarPreviewBarbeiroAtual();

      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      mostrarMensagem(
        "mensagem-barbeiro",
        "A imagem deve ter no máximo 5 MB.",
        "erro",
      );

      inputFotoBarbeiro.value = "";

      restaurarPreviewBarbeiroAtual();

      return;
    }

    previewBarbeiroObjectUrl = URL.createObjectURL(arquivo);

    if (previewBarbeiroImg) {
      previewBarbeiroImg.src = previewBarbeiroObjectUrl;
    }

    if (previewBarbeiro) {
      previewBarbeiro.hidden = false;
    }
  });
}

// SALVAR / EDITAR PROFISSIONAL

if (formBarbeiro) {
  formBarbeiro.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = campoBarbeiroId?.value?.trim() || "";

    const nome = campoBarbeiroNome?.value?.trim() || "";

    const telefone = campoBarbeiroTelefone?.value?.trim() || "";

    const arquivoFoto = inputFotoBarbeiro?.files?.[0];

    const fotoAtual = campoBarbeiroFotoAtual?.value?.trim() || "";

    if (!nome) {
      mostrarMensagem(
        "mensagem-barbeiro",
        "Digite o nome do profissional.",
        "erro",
      );

      campoBarbeiroNome?.focus();

      return;
    }

    if (!lojaId) {
      mostrarMensagem(
        "mensagem-barbeiro",
        "Barbearia não identificada.",
        "erro",
      );

      return;
    }

    if (btnSalvarBarbeiro) {
      btnSalvarBarbeiro.disabled = true;

      btnSalvarBarbeiro.textContent = "Salvando...";
    }

    try {
      let fotoUrl = fotoAtual || null;

      if (arquivoFoto) {
        fotoUrl = await enviarArquivoStorage(arquivoFoto, "profissionais");

        if (!fotoUrl) {
          throw new Error("Não foi possível enviar a foto.");
        }
      }

      const dadosProfissional = {
        nome,
        telefone: telefone || null,
        foto_url: fotoUrl,
      };

      if (id) {
        const { error } = await supabaseClient
          .from("profissionais")
          .update(dadosProfissional)
          .eq("id", id)
          .eq("barbearia_id", lojaId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabaseClient.from("profissionais").insert({
          barbearia_id: lojaId,

          ativo: true,

          ...dadosProfissional,
        });

        if (error) {
          throw error;
        }
      }

      cancelarEdicaoBarbeiro();

      await carregarProfissionais();

      if (typeof carregarHorarios === "function") {
        await carregarHorarios();
      }

      if (typeof carregarDashboard === "function") {
        await carregarDashboard();
      }

      mostrarMensagem(
        "mensagem-barbeiro",
        id
          ? "Profissional atualizado com sucesso!"
          : "Profissional cadastrado com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro ao salvar profissional:", erro);

      let mensagem = "Não foi possível salvar o profissional.";

      if (erro?.message?.includes("Formato de imagem")) {
        mensagem = "Formato de imagem não permitido.";
      }

      if (erro?.message?.includes("5 MB")) {
        mensagem = "A imagem deve ter no máximo 5 MB.";
      }

      mostrarMensagem("mensagem-barbeiro", mensagem, "erro");
    } finally {
      if (btnSalvarBarbeiro) {
        btnSalvarBarbeiro.disabled = false;

        btnSalvarBarbeiro.textContent = campoBarbeiroId?.value
          ? "Salvar edição"
          : "+ Adicionar profissional";
      }
    }
  });
}

// EDITAR PROFISSIONAL

function editarBarbeiro(id) {
  if (!id) {
    return;
  }

  const profissional = profissionaisCache.find(
    (item) => String(item.id) === String(id),
  );

  if (!profissional) {
    mostrarMensagem(
      "mensagem-barbeiro",
      "Profissional não encontrado.",
      "erro",
    );

    return;
  }

  limparPreviewBarbeiroObjectUrl();

  if (campoBarbeiroId) {
    campoBarbeiroId.value = profissional.id;
  }

  if (campoBarbeiroNome) {
    campoBarbeiroNome.value = profissional.nome || "";
  }

  if (campoBarbeiroTelefone) {
    campoBarbeiroTelefone.value = profissional.telefone || "";
  }

  if (campoBarbeiroFotoAtual) {
    campoBarbeiroFotoAtual.value = profissional.foto_url || "";
  }

  if (inputFotoBarbeiro) {
    inputFotoBarbeiro.value = "";
  }

  restaurarPreviewBarbeiroAtual();

  if (btnSalvarBarbeiro) {
    btnSalvarBarbeiro.textContent = "Salvar edição";
  }

  if (btnCancelarBarbeiro) {
    btnCancelarBarbeiro.hidden = false;
  }

  formBarbeiro?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  campoBarbeiroNome?.focus();
}

// CANCELAR EDIÇÃO

function cancelarEdicaoBarbeiro() {
  if (!formBarbeiro) {
    return;
  }

  limparPreviewBarbeiroObjectUrl();

  formBarbeiro.reset();

  if (campoBarbeiroId) {
    campoBarbeiroId.value = "";
  }

  if (campoBarbeiroFotoAtual) {
    campoBarbeiroFotoAtual.value = "";
  }

  if (inputFotoBarbeiro) {
    inputFotoBarbeiro.value = "";
  }

  if (previewBarbeiroImg) {
    previewBarbeiroImg.src = "";
  }

  if (previewBarbeiro) {
    previewBarbeiro.hidden = true;
  }

  if (btnSalvarBarbeiro) {
    btnSalvarBarbeiro.disabled = false;

    btnSalvarBarbeiro.textContent = "+ Adicionar profissional";
  }

  if (btnCancelarBarbeiro) {
    btnCancelarBarbeiro.hidden = true;
  }
}

if (btnCancelarBarbeiro) {
  btnCancelarBarbeiro.addEventListener("click", cancelarEdicaoBarbeiro);
}

// EXCLUIR PROFISSIONAL

async function excluirBarbeiro(id) {
  if (!id || !lojaId) {
    return;
  }

  const profissional = profissionaisCache.find(
    (item) => String(item.id) === String(id),
  );

  if (!profissional) {
    mostrarMensagem(
      "mensagem-barbeiro",
      "Profissional não encontrado.",
      "erro",
    );

    return;
  }

  const nome = profissional.nome?.trim() || "este profissional";

  const confirmou = confirm(`Deseja realmente remover "${nome}"?`);

  if (!confirmou) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("profissionais")
      .delete()
      .eq("id", id)
      .eq("barbearia_id", lojaId);

    if (error) {
      if (error.code === "23503") {
        mostrarMensagem(
          "mensagem-barbeiro",
          "Este profissional possui agendamentos ou horários vinculados e não pode ser excluído.",
          "erro",
        );

        return;
      }

      throw error;
    }

    if (String(campoBarbeiroId?.value) === String(id)) {
      cancelarEdicaoBarbeiro();
    }

    await carregarProfissionais();

    if (typeof carregarHorarios === "function") {
      await carregarHorarios();
    }

    if (typeof carregarDashboard === "function") {
      await carregarDashboard();
    }

    mostrarMensagem(
      "mensagem-barbeiro",
      "Profissional removido com sucesso!",
      "sucesso",
    );
  } catch (erro) {
    console.error("Erro ao excluir profissional:", erro);

    mostrarMensagem(
      "mensagem-barbeiro",
      "Não foi possível remover o profissional.",
      "erro",
    );
  }
}

// 10. DASHBOARD / VISÃO GERAL

async function carregarDashboard() {
  if (!lojaId) {
    return false;
  }

  const inicioHoje = obterInicioDoDia();

  const fimHoje = obterFimDoDia();

  if (!inicioHoje || !fimHoje) {
    console.error("Não foi possível identificar o período de hoje.");

    return false;
  }

  try {
    const agora = new Date();

    const [
      respostaAgendamentosHoje,
      respostaProximosAgendamentos,
      respostaClientes,
      respostaProfissionais,
      respostaProdutos,
      respostaPedidosPendentes,
      respostaPedidosHoje,
    ] = await Promise.all([
      // AGENDAMENTOS DE HOJE

      supabaseClient
        .from("agendamentos")
        .select(
          `
              id,
              cliente_id,
              servico_id,
              profissional_id,
              data_hora,
              status,
              arquivado,
              cliente_nome,
              cliente_telefone,

              clientes:cliente_id (
                id,
                nome,
                telefone
              ),

              servicos:servico_id (
                id,
                nome,
                preco
              ),

              profissionais:profissional_id (
                id,
                nome
              )
            `,
        )
        .eq("barbearia_id", lojaId)
        .gte("data_hora", inicioHoje.toISOString())
        .lte("data_hora", fimHoje.toISOString())
        .order("data_hora", {
          ascending: true,
        }),

      // PRÓXIMOS AGENDAMENTOS

      supabaseClient
        .from("agendamentos")
        .select(
          `
              id,
              cliente_id,
              servico_id,
              profissional_id,
              data_hora,
              status,
              arquivado,
              cliente_nome,
              cliente_telefone,

              clientes:cliente_id (
                id,
                nome,
                telefone
              ),

              servicos:servico_id (
                id,
                nome,
                preco
              ),

              profissionais:profissional_id (
                id,
                nome
              )
            `,
        )
        .eq("barbearia_id", lojaId)
        .eq("arquivado", false)
        .gte("data_hora", agora.toISOString())
        .neq("status", "cancelado")
        .neq("status", "concluido")
        .order("data_hora", {
          ascending: true,
        })
        .limit(5),

      // TOTAL DE CLIENTES

      supabaseClient
        .from("clientes_barbearias")
        .select("cliente_id", {
          count: "exact",
          head: true,
        })
        .eq("barbearia_id", lojaId),

      // TOTAL DE PROFISSIONAIS

      supabaseClient
        .from("profissionais")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("barbearia_id", lojaId),

      // TOTAL DE PRODUTOS

      supabaseClient
        .from("produtos")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("barbearia_id", lojaId),

      // PEDIDOS PENDENTES

      supabaseClient
        .from("pedidos")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("barbearia_id", lojaId)
        .eq("status", "pendente")
        .eq("arquivado", false),

      // VENDAS DE PRODUTOS CONFIRMADAS HOJE

      supabaseClient
        .from("pedidos")
        .select(
          `
              id,
              quantidade,
              preco_unitario,
              status,
              confirmado_at,
              concluido_at,
              arquivado
            `,
        )
        .eq("barbearia_id", lojaId)
        .in("status", ["confirmado", "concluido"])
        .gte("confirmado_at", inicioHoje.toISOString())
        .lte("confirmado_at", fimHoje.toISOString()),
    ]);

    if (respostaAgendamentosHoje.error) {
      throw respostaAgendamentosHoje.error;
    }

    if (respostaProximosAgendamentos.error) {
      throw respostaProximosAgendamentos.error;
    }

    if (respostaClientes.error) {
      throw respostaClientes.error;
    }

    if (respostaProfissionais.error) {
      throw respostaProfissionais.error;
    }

    if (respostaProdutos.error) {
      throw respostaProdutos.error;
    }

    if (respostaPedidosPendentes.error) {
      throw respostaPedidosPendentes.error;
    }

    if (respostaPedidosHoje.error) {
      throw respostaPedidosHoje.error;
    }

    const agendamentosHoje = respostaAgendamentosHoje.data || [];

    const proximosAgendamentos = respostaProximosAgendamentos.data || [];

    const pedidosHoje = respostaPedidosHoje.data || [];

    const totalClientes = respostaClientes.count || 0;

    const totalProfissionais = respostaProfissionais.count || 0;

    const totalProdutos = respostaProdutos.count || 0;

    const totalPedidosPendentes = respostaPedidosPendentes.count || 0;

    // FATURAMENTO DOS SERVIÇOS

    const faturamentoServicosHoje = agendamentosHoje
      .filter((agendamento) => agendamento.status === "concluido")
      .reduce((total, agendamento) => {
        const preco = Number(agendamento.servicos?.preco);

        const precoSeguro = Number.isFinite(preco) ? preco : 0;

        return total + precoSeguro;
      }, 0);

    // FATURAMENTO DOS PRODUTOS

    const faturamentoProdutosHoje = pedidosHoje.reduce((total, pedido) => {
      const quantidade = Number(pedido.quantidade);

      const precoUnitario = Number(pedido.preco_unitario);

      const quantidadeSegura =
        Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0;

      const precoSeguro =
        Number.isFinite(precoUnitario) && precoUnitario >= 0
          ? precoUnitario
          : 0;

      return total + quantidadeSegura * precoSeguro;
    }, 0);

    const faturamentoHoje = faturamentoServicosHoje + faturamentoProdutosHoje;

    atualizarCardsDashboard({
      totalAgendamentos: agendamentosHoje.length,

      totalClientes,

      totalProfissionais,

      totalProdutos,

      totalPedidosPendentes,

      faturamentoHoje,
    });

    renderizarProximosAgendamentos(proximosAgendamentos);

    console.log("BarberHub — Dashboard:", {
      agendamentosHoje: agendamentosHoje.length,

      totalClientes,

      totalProfissionais,

      totalProdutos,

      totalPedidosPendentes,

      faturamentoServicosHoje,

      faturamentoProdutosHoje,

      faturamentoHoje,

      vendasProdutosHoje: pedidosHoje.length,
    });

    return true;
  } catch (erro) {
    console.error("Erro ao carregar dashboard:", erro);

    atualizarCardsDashboard({
      totalAgendamentos: 0,
      totalClientes: 0,
      totalProfissionais: 0,
      totalProdutos: 0,
      totalPedidosPendentes: 0,
      faturamentoHoje: 0,
    });

    return false;
  }
}

// 10.1 — ATUALIZAR CARDS

function atualizarCardsDashboard({
  totalAgendamentos = 0,
  totalClientes = 0,
  totalProfissionais = 0,
  totalProdutos = 0,
  totalPedidosPendentes = 0,
  faturamentoHoje = 0,
} = {}) {
  const elementoAgendamentos = document.getElementById(
    "total-agendamentos-hoje",
  );

  const elementoClientes = document.getElementById("total-clientes");

  const elementoProfissionais = document.getElementById("total-profissionais");

  const elementoProdutos = document.getElementById("total-produtos-dashboard");

  const elementoPedidosPendentes = document.getElementById(
    "total-pedidos-pendentes-dashboard",
  );

  const elementoFaturamento = document.getElementById("faturamento-hoje");

  if (elementoAgendamentos) {
    elementoAgendamentos.textContent = String(totalAgendamentos);
  }

  if (elementoClientes) {
    elementoClientes.textContent = String(totalClientes);
  }

  if (elementoProfissionais) {
    elementoProfissionais.textContent = String(totalProfissionais);
  }

  if (elementoProdutos) {
    elementoProdutos.textContent = String(totalProdutos);
  }

  if (elementoPedidosPendentes) {
    elementoPedidosPendentes.textContent = String(totalPedidosPendentes);
  }

  if (elementoFaturamento) {
    elementoFaturamento.textContent = formatarMoeda(faturamentoHoje);
  }
}

// 10.2 — RENDERIZAR PRÓXIMOS AGENDAMENTOS

function renderizarProximosAgendamentos(agendamentos) {
  const elemento = document.getElementById("lista-proximos-agendamentos");

  if (!elemento) {
    return;
  }

  const lista = Array.isArray(agendamentos) ? agendamentos : [];

  elemento.innerHTML = "";

  if (!lista.length) {
    elemento.innerHTML = `
      <p class="em-breve">
        Nenhum próximo agendamento.
      </p>
    `;

    return;
  }

  lista.forEach((agendamento) => {
    if (!agendamento.data_hora) {
      return;
    }

    const dataHora = new Date(agendamento.data_hora);

    if (Number.isNaN(dataHora.getTime())) {
      return;
    }

    const nomeCliente =
      agendamento.clientes?.nome || agendamento.cliente_nome || "Cliente";

    const telefoneCliente =
      agendamento.clientes?.telefone || agendamento.cliente_telefone || "";

    const nomeServico = agendamento.servicos?.nome || "Serviço";

    const nomeProfissional = agendamento.profissionais?.nome || "";

    const status = STATUS_LABEL[agendamento.status]
      ? agendamento.status
      : "pendente";

    const data = dataHora.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    const horario = dataHora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const item = document.createElement("div");

    item.classList.add("item-lista");

    item.innerHTML = `
        <div class="item-info">

          <h3>
            ${escaparHtml(nomeCliente)}
          </h3>

          ${
            telefoneCliente
              ? `
                <p>
                  ${escaparHtml(telefoneCliente)}
                </p>
              `
              : ""
          }

          <p>
            ${escaparHtml(nomeServico)}
            ·
            ${escaparHtml(data)}
            às
            ${escaparHtml(horario)}
          </p>

          ${
            nomeProfissional
              ? `
                <small>
                  Profissional:
                  ${escaparHtml(nomeProfissional)}
                </small>
              `
              : ""
          }

        </div>

        <div
          class="item-status"
        >
          ${escaparHtml(STATUS_LABEL[status])}
        </div>
      `;

    elemento.appendChild(item);
  });
}

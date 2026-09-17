// 7. AGENDAMENTOS

const formAgendamentoManual = document.getElementById(
  "form-agendamento-manual",
);

const btnSalvarAgendamentoManual = document.getElementById(
  "btn-salvar-agendamento-manual",
);

const listaAgendamentosEl = document.getElementById("lista-agendamentos");
const campoAgendamentoCliente = document.getElementById("agendamento-cliente");
const campoAgendamentoServico = document.getElementById("agendamento-servico");
const campoAgendamentoData = document.getElementById("agendamento-data");
const campoAgendamentoHorario = document.getElementById("agendamento-horario");

// PREENCHER CLIENTES NO SELECT

function preencherClientesAgendamento() {
  if (!campoAgendamentoCliente) {
    return;
  }

  const valorAtual = campoAgendamentoCliente.value;
  const clientes = Array.isArray(clientesCache) ? clientesCache : [];

  campoAgendamentoCliente.innerHTML = `
    <option value="">
      Selecione o cliente
    </option>

    ${clientes
      .map((cliente) => {
        const nome = cliente.nome || "Cliente";

        const telefone = cliente.telefone ? ` · ${cliente.telefone}` : "";

        return `
          <option
            value="${escaparHtml(cliente.id)}"
          >
            ${escaparHtml(nome)}
            ${escaparHtml(telefone)}
          </option>
        `;
      })
      .join("")}
  `;

  const clienteAindaExiste = clientes.some(
    (cliente) => String(cliente.id) === String(valorAtual),
  );

  if (valorAtual && clienteAindaExiste) {
    campoAgendamentoCliente.value = valorAtual;
  }
}

// PREENCHER SERVIÇOS NO SELECT

function preencherServicosAgendamento() {
  if (!campoAgendamentoServico) {
    return;
  }

  const valorAtual = campoAgendamentoServico.value;
  const servicos = Array.isArray(servicosCache) ? servicosCache : [];

  campoAgendamentoServico.innerHTML = `
    <option value="">
      Selecione o serviço
    </option>

    ${servicos
      .map((servico) => {
        const nome = servico.nome || "Serviço";

        return `
          <option
            value="${escaparHtml(servico.id)}"
          >
            ${escaparHtml(nome)}
            ·
            ${formatarMoeda(servico.preco)}
          </option>
        `;
      })
      .join("")}
  `;

  const servicoAindaExiste = servicos.some(
    (servico) => String(servico.id) === String(valorAtual),
  );

  if (valorAtual && servicoAindaExiste) {
    campoAgendamentoServico.value = valorAtual;
  }
}

// PREPARAR FORMULÁRIO

function prepararFormularioAgendamentoManual() {
  const hoje = obterDataLocalISO();

  if (campoAgendamentoData) {
    campoAgendamentoData.min = hoje;

    if (!campoAgendamentoData.value) {
      campoAgendamentoData.value = hoje;
    }
  }

  preencherClientesAgendamento();
  preencherServicosAgendamento();
}

prepararFormularioAgendamentoManual();

// CADASTRAR AGENDAMENTO MANUAL

if (formAgendamentoManual) {
  formAgendamentoManual.addEventListener("submit", async (event) => {
    event.preventDefault();

    const clienteId = campoAgendamentoCliente?.value?.trim() || "";
    const servicoId = campoAgendamentoServico?.value?.trim() || "";
    const data = campoAgendamentoData?.value?.trim() || "";
    const horario = campoAgendamentoHorario?.value?.trim() || "";

    if (!clienteId || !servicoId || !data || !horario) {
      mostrarMensagem(
        "mensagem-agendamento-manual",
        "Selecione o cliente, serviço, data e horário.",
        "erro",
      );

      return;
    }

    if (!lojaId) {
      mostrarMensagem(
        "mensagem-agendamento-manual",
        "Barbearia não identificada.",
        "erro",
      );

      return;
    }

    const cliente = clientesCache.find(
      (item) => String(item.id) === String(clienteId),
    );

    if (!cliente) {
      mostrarMensagem(
        "mensagem-agendamento-manual",
        "Cliente não encontrado.",
        "erro",
      );

      return;
    }

    const servico = servicosCache.find(
      (item) => String(item.id) === String(servicoId),
    );

    if (!servico) {
      mostrarMensagem(
        "mensagem-agendamento-manual",
        "Serviço não encontrado.",
        "erro",
      );

      return;
    }

    const dataHora = new Date(`${data}T${horario}:00`);

    if (Number.isNaN(dataHora.getTime())) {
      mostrarMensagem(
        "mensagem-agendamento-manual",
        "Data ou horário inválido.",
        "erro",
      );

      return;
    }

    if (dataHora.getTime() < Date.now()) {
      mostrarMensagem(
        "mensagem-agendamento-manual",
        "Não é possível cadastrar um agendamento em uma data ou horário que já passou.",
        "erro",
      );

      return;
    }

    if (btnSalvarAgendamentoManual) {
      btnSalvarAgendamentoManual.disabled = true;
      btnSalvarAgendamentoManual.textContent = "Cadastrando...";
    }

    try {
      const { error } = await supabaseClient.from("agendamentos").insert({
        barbearia_id: lojaId,
        cliente_id: cliente.id,
        servico_id: servico.id,
        data_hora: dataHora.toISOString(),
        status: "pendente",
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone || null,
      });

      if (error) {
        throw error;
      }

      formAgendamentoManual.reset();

      if (campoAgendamentoData) {
        campoAgendamentoData.value = obterDataLocalISO();
        campoAgendamentoData.min = obterDataLocalISO();
      }

      preencherClientesAgendamento();
      preencherServicosAgendamento();

      await carregarAgendamentos();

      if (typeof carregarDashboard === "function") {
        await carregarDashboard();
      }

      if (typeof carregarNotificacoes === "function") {
        await carregarNotificacoes();
      }

      mostrarMensagem(
        "mensagem-agendamento-manual",
        "Agendamento cadastrado com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro ao cadastrar agendamento manual:", erro);

      mostrarMensagem(
        "mensagem-agendamento-manual",
        "Não foi possível cadastrar o agendamento.",
        "erro",
      );
    } finally {
      if (btnSalvarAgendamentoManual) {
        btnSalvarAgendamentoManual.disabled = false;

        btnSalvarAgendamentoManual.textContent = "+ Cadastrar agendamento";
      }
    }
  });
}

// CARREGAR AGENDAMENTOS

async function carregarAgendamentos() {
  if (!listaAgendamentosEl || !lojaId) {
    return false;
  }

  listaAgendamentosEl.innerHTML = `
    <p class="em-breve">
      Carregando agendamentos...
    </p>
  `;

  try {
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
        arquivado,
        arquivado_at,
        cliente_nome,
        cliente_telefone,

        servicos (
          id,
          nome,
          preco,
          duracao
        ),

        clientes (
          id,
          nome,
          telefone,
          email
        ),

        profissionais (
          id,
          nome
        )
      `,
      )
      .eq("barbearia_id", lojaId)
      .eq("arquivado", false)
      .order("data_hora", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    agendamentosCache = data || [];

    const agendamentosFiltrados = filtrarAgendamentos(
      agendamentosCache,
      filtroAgendamentoAtual,
    );

    renderizarAgendamentos(agendamentosFiltrados);

    return true;
  } catch (erro) {
    console.error("Erro ao carregar agendamentos:", erro);

    agendamentosCache = [];

    listaAgendamentosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os agendamentos.
      </p>
    `;

    return false;
  }
}

// FILTRAR AGENDAMENTOS

function filtrarAgendamentos(agendamentos, filtro) {
  const lista = Array.isArray(agendamentos) ? agendamentos : [];

  if (filtro === "todos") {
    return [...lista];
  }

  const hoje = obterDataLocalISO();
  const amanhaData = new Date();
  amanhaData.setDate(amanhaData.getDate() + 1);
  const amanha = obterDataLocalISO(amanhaData);
  return lista.filter((agendamento) => {
    if (!agendamento.data_hora) {
      return false;
    }

    const dataAgendamento = new Date(agendamento.data_hora);

    if (Number.isNaN(dataAgendamento.getTime())) {
      return false;
    }

    const dataString = obterDataLocalISO(dataAgendamento);

    if (filtro === "hoje") {
      return dataString === hoje;
    }

    if (filtro === "amanha") {
      return dataString === amanha;
    }

    return true;
  });
}

// RENDERIZAR AGENDAMENTOS

function renderizarAgendamentos(agendamentos) {
  if (!listaAgendamentosEl) {
    return;
  }

  listaAgendamentosEl.innerHTML = "";

  const lista = Array.isArray(agendamentos) ? agendamentos : [];

  if (!lista.length) {
    listaAgendamentosEl.innerHTML = `
      <p class="em-breve">
        Nenhum agendamento encontrado.
      </p>
    `;

    return;
  }

  lista.forEach((agendamento) => {
    const dataHora = new Date(agendamento.data_hora);

    const nomeCliente =
      agendamento.clientes?.nome || agendamento.cliente_nome || "Cliente";
    const telefoneCliente =
      agendamento.clientes?.telefone || agendamento.cliente_telefone || "";
    const nomeServico = agendamento.servicos?.nome || "Serviço";
    const nomeProfissional = agendamento.profissionais?.nome || "";
    const status = STATUS_LABEL[agendamento.status]
      ? agendamento.status
      : "pendente";

    const dataFormatada = Number.isNaN(dataHora.getTime())
      ? "Data inválida"
      : dataHora.toLocaleDateString("pt-BR");

    const horaFormatada = Number.isNaN(dataHora.getTime())
      ? ""
      : dataHora.toLocaleTimeString("pt-BR", {
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
            ${escaparHtml(dataFormatada)}
            ${horaFormatada ? `às ${escaparHtml(horaFormatada)}` : ""}
          </p>

          ${
            nomeProfissional
              ? `
                <p>
                  Profissional:
                  ${escaparHtml(nomeProfissional)}
                </p>
              `
              : ""
          }

        </div>

        <div class="item-acoes">

  ${
    status !== "concluido" && status !== "cancelado"
      ? `
        <select
          class="select-status select-status--${escaparHtml(status)}"
          onchange="atualizarStatusAgendamento(
            '${escaparHtml(agendamento.id)}',
            this.value
          )"
        >

         ${Object.entries(STATUS_LABEL)
           .filter(([valor]) => {
             if (valor === status) {
               return true;
             }

             const transicoes = {
               pendente: ["confirmado", "cancelado"],

               confirmado: ["concluido", "cancelado"],

               concluido: [],

               cancelado: [],
             };

             return (transicoes[status] || []).includes(valor);
           })
           .map(
             ([valor, rotulo]) => `
      <option
        value="${escaparHtml(valor)}"
        ${status === valor ? "selected" : ""}
      >
        ${escaparHtml(rotulo)}
      </option>
    `,
           )
           .join("")}

        </select>
      `
      : `
        <span
          class="select-status select-status--${escaparHtml(status)}"
        >
          ${escaparHtml(STATUS_LABEL[status])}
        </span>

        <button
          type="button"
          title="Arquivar agendamento"
          aria-label="Arquivar agendamento"
          onclick="arquivarAgendamento('${escaparHtml(agendamento.id)}')"
        >
          🗄️
        </button>
      `
  }

</div>
      `;

    listaAgendamentosEl.appendChild(item);
  });
}

// ATUALIZAR STATUS

async function atualizarStatusAgendamento(id, novoStatus) {
  if (!id || !novoStatus || !lojaId) {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(STATUS_LABEL, novoStatus)) {
    console.error("Status de agendamento inválido:", novoStatus);

    return;
  }

  const agendamento = agendamentosCache.find(
    (item) => String(item.id) === String(id),
  );

  if (!agendamento) {
    mostrarMensagem(
      "mensagem-agendamento-manual",
      "Agendamento não encontrado.",
      "erro",
    );

    return;
  }

  if (agendamento.status === novoStatus) {
    return;
  }

  const transicoesPermitidas = {
    pendente: ["confirmado", "cancelado"],
    confirmado: ["concluido", "cancelado"],
    concluido: [],
    cancelado: [],
  };

  const permitidos = transicoesPermitidas[agendamento.status] || [];

  if (!permitidos.includes(novoStatus)) {
    mostrarMensagem(
      "mensagem-agendamento-manual",
      "Essa alteração de status não é permitida.",
      "erro",
    );

    await carregarAgendamentos();

    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("agendamentos")
      .update({
        status: novoStatus,
      })
      .eq("id", id)
      .eq("barbearia_id", lojaId)
      .select("id, status")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      mostrarMensagem(
        "mensagem-agendamento-manual",
        "O agendamento não foi encontrado ou não pôde ser atualizado.",
        "erro",
      );

      await carregarAgendamentos();

      return;
    }

    await carregarAgendamentos();

    if (typeof carregarDashboard === "function") {
      await carregarDashboard();
    }

    if (typeof carregarNotificacoes === "function") {
      await carregarNotificacoes();
    }
  } catch (erro) {
    console.error("Erro ao atualizar status do agendamento:", erro);

    mostrarMensagem(
      "mensagem-agendamento-manual",
      "Não foi possível atualizar o status do agendamento.",
      "erro",
    );

    await carregarAgendamentos();
  }
}

// ARQUIVAR AGENDAMENTO

async function arquivarAgendamento(id) {
  if (!id || !lojaId) {
    return;
  }

  const agendamento = agendamentosCache.find(
    (item) => String(item.id) === String(id),
  );

  if (!agendamento) {
    mostrarMensagem(
      "mensagem-agendamento-manual",
      "Agendamento não encontrado.",
      "erro",
    );

    return;
  }

  const podeArquivar =
    agendamento.status === "concluido" || agendamento.status === "cancelado";

  if (!podeArquivar) {
    mostrarMensagem(
      "mensagem-agendamento-manual",
      "Somente agendamentos concluídos ou cancelados podem ser arquivados.",
      "erro",
    );

    return;
  }

  const confirmou = confirm(
    "Arquivar este agendamento?\n\nEle será removido da agenda, mas continuará salvo no histórico.",
  );

  if (!confirmou) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("agendamentos")
      .update({
        arquivado: true,
        arquivado_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("barbearia_id", lojaId)
      .eq("arquivado", false)
      .in("status", ["concluido", "cancelado"])
      .select("id, status, arquivado")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      mostrarMensagem(
        "mensagem-agendamento-manual",
        "Este agendamento já foi alterado ou arquivado.",
        "erro",
      );

      await carregarAgendamentos();

      return;
    }

    mostrarMensagem(
      "mensagem-agendamento-manual",
      "Agendamento arquivado com sucesso!",
      "sucesso",
    );

    await carregarAgendamentos();

    if (typeof carregarDashboard === "function") {
      await carregarDashboard();
    }
  } catch (erro) {
    console.error("Erro ao arquivar agendamento:", erro);

    mostrarMensagem(
      "mensagem-agendamento-manual",
      "Não foi possível arquivar o agendamento.",
      "erro",
    );
  }
}

// FILTROS DA AGENDA

document.querySelectorAll(".filtro-agendamento").forEach((botao) => {
  botao.addEventListener("click", () => {
    document.querySelectorAll(".filtro-agendamento").forEach((item) => {
      item.classList.remove("filtro--ativo");
    });

    botao.classList.add("filtro--ativo");

    filtroAgendamentoAtual = botao.dataset.filtro || "hoje";

    renderizarAgendamentos(
      filtrarAgendamentos(agendamentosCache, filtroAgendamentoAtual),
    );
  });
});

// 8. CLIENTES

const listaClientesEl = document.getElementById("lista-clientes");

const formCliente = document.getElementById("form-cliente");

const btnSalvarCliente = document.getElementById("btn-salvar-cliente");

const btnCancelarCliente = document.getElementById("btn-cancelar-cliente");

const campoClienteId = document.getElementById("cliente-id");

const campoClienteNome = document.getElementById("cliente-nome");

const campoClienteTelefone = document.getElementById("cliente-telefone");

const campoClienteEmail = document.getElementById("cliente-email");

// SALVAR / EDITAR CLIENTE

if (formCliente) {
  formCliente.addEventListener("submit", async (event) => {
    event.preventDefault();

    const clienteId = campoClienteId?.value?.trim() || "";

    const nome = campoClienteNome?.value?.trim() || "";

    const telefone = campoClienteTelefone?.value?.trim() || "";

    const email = campoClienteEmail?.value?.trim()?.toLowerCase() || "";

    if (!nome) {
      mostrarMensagem("mensagem-cliente", "Informe o nome do cliente.", "erro");

      campoClienteNome?.focus();

      return;
    }

    if (!telefone) {
      mostrarMensagem(
        "mensagem-cliente",
        "Informe o telefone do cliente.",
        "erro",
      );

      campoClienteTelefone?.focus();

      return;
    }

    if (email && !email.includes("@")) {
      mostrarMensagem("mensagem-cliente", "Informe um e-mail válido.", "erro");

      campoClienteEmail?.focus();

      return;
    }

    if (!lojaId) {
      mostrarMensagem(
        "mensagem-cliente",
        "Barbearia não identificada.",
        "erro",
      );

      return;
    }

    if (btnSalvarCliente) {
      btnSalvarCliente.disabled = true;

      btnSalvarCliente.textContent = clienteId
        ? "Salvando..."
        : "Cadastrando...";
    }

    try {
      if (clienteId) {
        const { data: vinculo, error: erroVinculo } = await supabaseClient
          .from("clientes_barbearias")
          .select("cliente_id")
          .eq("cliente_id", clienteId)
          .eq("barbearia_id", lojaId)
          .maybeSingle();

        if (erroVinculo) {
          throw erroVinculo;
        }

        if (!vinculo) {
          mostrarMensagem(
            "mensagem-cliente",
            "Este cliente não pertence a esta barbearia.",
            "erro",
          );

          return;
        }

        const { error } = await supabaseClient
          .from("clientes")
          .update({
            nome,
            telefone,
            email: email || null,
          })
          .eq("id", clienteId);

        if (error) {
          throw error;
        }

        mostrarMensagem(
          "mensagem-cliente",
          "Cliente atualizado com sucesso!",
          "sucesso",
        );
      } else {
        const { data: novoClienteId, error } = await supabaseClient.rpc(
          "cadastrar_cliente_barbearia",
          {
            p_barbearia_id: lojaId,

            p_nome: nome,

            p_telefone: telefone,

            p_email: email || null,
          },
        );

        if (error) {
          throw error;
        }

        if (!novoClienteId) {
          throw new Error("O cliente não foi criado.");
        }

        mostrarMensagem(
          "mensagem-cliente",
          "Cliente cadastrado com sucesso!",
          "sucesso",
        );
      }

      cancelarEdicaoCliente();

      await carregarClientes();

      if (typeof carregarDashboard === "function") {
        await carregarDashboard();
      }
    } catch (erro) {
      console.error("Erro ao salvar cliente:", erro);

      let mensagem = "Não foi possível salvar o cliente.";

      if (erro?.message?.includes("O cliente não foi criado")) {
        mensagem = "O cliente não pôde ser criado.";
      }

      mostrarMensagem("mensagem-cliente", mensagem, "erro");
    } finally {
      if (btnSalvarCliente) {
        btnSalvarCliente.disabled = false;

        btnSalvarCliente.textContent = campoClienteId?.value
          ? "Salvar alterações"
          : "+ Cadastrar cliente";
      }
    }
  });
}

// CARREGAR CLIENTES

async function carregarClientes() {
  if (!lojaId) {
    clientesCache = [];

    renderizarClientes();

    preencherClientesAgendamento();

    atualizarCardClientes();

    return false;
  }

  if (listaClientesEl) {
    listaClientesEl.innerHTML = `
      <p class="em-breve">
        Carregando clientes...
      </p>
    `;
  }

  try {
    const { data, error } = await supabaseClient
      .from("clientes_barbearias")
      .select(
        `
            cliente_id,

            clientes:cliente_id (
              id,
              profile_id,
              nome,
              telefone,
              email,
              created_at
            )
          `,
      )
      .eq("barbearia_id", lojaId);

    if (error) {
      throw error;
    }

    clientesCache = (data || [])
      .map((vinculo) => vinculo.clientes)
      .filter(Boolean)
      .sort((a, b) => {
        const dataA = new Date(a.created_at || 0).getTime();

        const dataB = new Date(b.created_at || 0).getTime();

        return dataB - dataA;
      });

    renderizarClientes();

    preencherClientesAgendamento();

    atualizarCardClientes();

    return true;
  } catch (erro) {
    console.error("Erro ao carregar clientes:", erro);

    clientesCache = [];

    renderizarClientes();

    preencherClientesAgendamento();

    atualizarCardClientes();

    mostrarMensagem(
      "mensagem-cliente",
      "Não foi possível carregar os clientes.",
      "erro",
    );

    return false;
  }
}

// ATUALIZAR CARD DE CLIENTES

function atualizarCardClientes() {
  const elemento = document.getElementById("total-clientes");

  if (!elemento) {
    return;
  }

  const total = Array.isArray(clientesCache) ? clientesCache.length : 0;

  elemento.textContent = String(total);
}

// RENDERIZAR CLIENTES

function renderizarClientes() {
  if (!listaClientesEl) {
    return;
  }

  listaClientesEl.innerHTML = "";

  const clientes = Array.isArray(clientesCache) ? clientesCache : [];

  if (!clientes.length) {
    listaClientesEl.innerHTML = `
      <p class="em-breve">
        Nenhum cliente cadastrado.
      </p>
    `;

    return;
  }

  clientes.forEach((cliente) => {
    const item = document.createElement("div");

    item.classList.add("item-lista");

    const nome = cliente.nome?.trim() || "Cliente";

    const telefone = cliente.telefone?.trim() || "Telefone não informado";

    const email = cliente.email?.trim() || "";

    const possuiConta = Boolean(cliente.profile_id);

    item.innerHTML = `
      <div class="item-info">

        <h3>
          ${escaparHtml(nome)}
        </h3>

        <p>
          ${escaparHtml(telefone)}
        </p>

        ${
          email
            ? `
              <p>
                ${escaparHtml(email)}
              </p>
            `
            : ""
        }

        ${
          possuiConta
            ? `
              <p>
                👤 Cliente com conta
              </p>
            `
            : `
              <p>
                👥 Cliente cadastrado pela barbearia
              </p>
            `
        }

      </div>

      <div class="item-acoes">

        <button
          type="button"
          class="btn-secundario"
          title="Editar cliente"
          aria-label="Editar cliente"
          onclick="editarCliente('${escaparHtml(cliente.id)}')"
        >
          Editar
        </button>

        <button
          type="button"
          class="btn-perigo"
          title="Remover cliente"
          aria-label="Remover cliente"
          onclick="excluirCliente('${escaparHtml(cliente.id)}')"
        >
          Remover
        </button>

      </div>
    `;

    listaClientesEl.appendChild(item);
  });
}

// EDITAR CLIENTE

function editarCliente(id) {
  if (!id) {
    return;
  }

  const cliente = clientesCache.find((item) => String(item.id) === String(id));

  if (!cliente) {
    mostrarMensagem("mensagem-cliente", "Cliente não encontrado.", "erro");

    return;
  }

  if (campoClienteId) {
    campoClienteId.value = cliente.id;
  }

  if (campoClienteNome) {
    campoClienteNome.value = cliente.nome || "";
  }

  if (campoClienteTelefone) {
    campoClienteTelefone.value = cliente.telefone || "";
  }

  if (campoClienteEmail) {
    campoClienteEmail.value = cliente.email || "";
  }

  if (btnSalvarCliente) {
    btnSalvarCliente.textContent = "Salvar alterações";
  }

  if (btnCancelarCliente) {
    btnCancelarCliente.hidden = false;
  }

  formCliente?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  campoClienteNome?.focus();
}

// CANCELAR EDIÇÃO

function cancelarEdicaoCliente() {
  if (!formCliente) {
    return;
  }

  formCliente.reset();

  if (campoClienteId) {
    campoClienteId.value = "";
  }

  if (btnSalvarCliente) {
    btnSalvarCliente.disabled = false;

    btnSalvarCliente.textContent = "+ Cadastrar cliente";
  }

  if (btnCancelarCliente) {
    btnCancelarCliente.hidden = true;
  }
}

// REMOVER CLIENTE DA BARBEARIA

async function excluirCliente(id) {
  if (!id || !lojaId) {
    return;
  }

  const cliente = clientesCache.find((item) => String(item.id) === String(id));

  if (!cliente) {
    mostrarMensagem("mensagem-cliente", "Cliente não encontrado.", "erro");

    return;
  }

  const nomeCliente = cliente.nome?.trim() || "Cliente";

  const confirmou = confirm(
    `Remover "${nomeCliente}" desta barbearia?\n\nO histórico de agendamentos será preservado.`,
  );

  if (!confirmou) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("clientes_barbearias")
      .delete()
      .eq("cliente_id", id)
      .eq("barbearia_id", lojaId);

    if (error) {
      throw error;
    }

    if (String(campoClienteId?.value) === String(id)) {
      cancelarEdicaoCliente();
    }

    await carregarClientes();

    if (typeof carregarDashboard === "function") {
      await carregarDashboard();
    }

    mostrarMensagem(
      "mensagem-cliente",
      "Cliente removido da barbearia.",
      "sucesso",
    );
  } catch (erro) {
    console.error("Erro ao remover cliente:", erro);

    mostrarMensagem(
      "mensagem-cliente",
      "Não foi possível remover o cliente.",
      "erro",
    );
  }
}

// BOTÃO CANCELAR

if (btnCancelarCliente) {
  btnCancelarCliente.addEventListener("click", cancelarEdicaoCliente);

  btnCancelarCliente.hidden = true;
}

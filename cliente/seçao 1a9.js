// BARBERHUB — PAINEL DO CLIENTE

// 01. CONFIGURAÇÃO

const CONFIG = {
  LOGIN_URL: "../login/cliente.html",

  DIAS_SEMANA: [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ],

  INTERVALO_SLOTS_MINUTOS: 30,
  STATUS_BLOQUEIAM_HORARIO: ["pendente", "confirmado"],
};

// 02. ELEMENTOS PRINCIPAIS

const telaCarregamento = document.getElementById("tela-carregamento");
const nomeCliente = document.getElementById("nome-cliente");

// 03. ESTADO GLOBAL

let usuarioAtual = null;
let perfilAtual = null;
let clienteAtual = null;
let barbearias = [];
let servicos = [];
let profissionais = [];
let agendamentos = [];
let horariosFuncionamento = [];
let favoritosCliente = [];
let produtosCliente = [];
let avaliacoesCliente = [];
let notificacoesCliente = [];
let filtroAgendamentosAtual = "proximos";

// 04. HELPERS

function escapeHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 04.1 MOSTRAR MENSAGEM

function mostrarMensagem(elementoId, mensagem, tipo = "info") {
  const elemento = document.getElementById(elementoId);

  if (!elemento) {
    return;
  }

  elemento.textContent = mensagem || "";
  elemento.className = "mensagem";
  if (tipo) {
    elemento.classList.add(`mensagem-${tipo}`);
  }
}

// 04.2 LIMPAR MENSAGEM

function limparMensagem(elementoId) {
  const elemento = document.getElementById(elementoId);

  if (!elemento) {
    return;
  }

  elemento.textContent = "";
  elemento.className = "mensagem";
}

// 04.3 FORMATAR PREÇO

function formatarPreco(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// 04.4 FORMATAR DATA

function formatarData(data) {
  if (!data) {
    return "-";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  const dataObj = new Date(data);
  if (Number.isNaN(dataObj.getTime())) {
    return "-";
  }

  return dataObj.toLocaleDateString("pt-BR");
}

// 04.5 FORMATAR HORA

function formatarHora(data) {
  if (!data) {
    return "-";
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return "-";
  }

  return dataObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 04.6 FORMATAR DATA E HORA

function formatarDataHora(data) {
  if (!data) {
    return "-";
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return "-";
  }

  return dataObj.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// 04.7 DATA LOCAL YYYY-MM-DD

function obterDataLocalISO() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

// Mantemos este nome porque o restante
// do arquivo já utiliza a função.

function obterDataMinima() {
  return obterDataLocalISO();
}

// 04.8 ERRO NO CONSOLE

function mostrarErroConsole(contexto, erro) {
  console.error(`[BarberHub] ${contexto}:`, erro);
}

// 04.9 MINUTOS PARA HORA

function minutosParaHora(minutos) {
  const valor = Number(minutos);

  if (!Number.isFinite(valor)) {
    return "00:00";
  }

  const horas = Math.floor(valor / 60);
  const mins = valor % 60;
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// 04.10 HORA PARA MINUTOS

function horaParaMinutos(hora) {
  if (!hora) {
    return null;
  }

  const partes = String(hora).substring(0, 5).split(":");

  if (partes.length !== 2) {
    return null;
  }

  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);

  if (Number.isNaN(horas) || Number.isNaN(minutos)) {
    return null;
  }

  return horas * 60 + minutos;
}

// 04.11 CRIAR DATA LOCAL

function criarDataLocal(data, hora) {
  if (!data || !hora) {
    return null;
  }

  const dataHora = new Date(`${data}T${hora}:00`);

  if (Number.isNaN(dataHora.getTime())) {
    return null;
  }

  return dataHora;
}

// 04.12 TELEFONE PARA WHATSAPP

function formatarTelefoneWhatsApp(telefone) {
  if (!telefone) {
    return null;
  }

  let numero = String(telefone).replace(/\D/g, "");

  if (!numero) {
    return null;
  }

  if (!numero.startsWith("55")) {
    numero = `55${numero}`;
  }

  return numero;
}

// 04.13 ABRIR WHATSAPP

function abrirWhatsApp(telefone, mensagem) {
  const numero = formatarTelefoneWhatsApp(telefone);

  if (!numero) {
    console.warn("[BarberHub] Telefone não encontrado para abrir WhatsApp.");

    return false;
  }

  const texto = encodeURIComponent(mensagem || "");
  const url = `https://wa.me/${numero}?text=${texto}`;

  window.open(url, "_blank", "noopener,noreferrer");

  return true;
}

// 05. TELA DE CARREGAMENTO

function esconderTelaCarregamento() {
  if (!telaCarregamento) {
    return;
  }

  telaCarregamento.classList.add("tela-carregamento--oculta");
}

function mostrarTelaCarregamento() {
  if (!telaCarregamento) {
    return;
  }

  telaCarregamento.classList.remove("tela-carregamento--oculta");
}

// 06. SESSÃO / AUTENTICAÇÃO

async function verificarSessao() {
  try {
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session?.user) {
      window.location.href = CONFIG.LOGIN_URL;
      return false;
    }

    usuarioAtual = session.user;

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao verificar sessão", erro);

    usuarioAtual = null;
    window.location.href = CONFIG.LOGIN_URL;
    return false;
  }
}

// 07. PERFIL / IDENTIFICAÇÃO DO CLIENTE

async function carregarCliente() {
  if (!usuarioAtual?.id) {
    perfilAtual = null;
    clienteAtual = null;

    return false;
  }

  try {
    const [resultadoPerfil, resultadoCliente] = await Promise.all([
      supabaseClient
        .from("profiles")
        .select(
          `
          id,
          nome,
          telefone,
          tipo,
          created_at
        `,
        )
        .eq("id", usuarioAtual.id)
        .maybeSingle(),

      supabaseClient
        .from("clientes")
        .select(
          `
          id,
          profile_id,
          nome,
          telefone,
          email,
          created_at
        `,
        )
        .eq("profile_id", usuarioAtual.id)
        .maybeSingle(),
    ]);

    if (resultadoPerfil.error) {
      throw resultadoPerfil.error;
    }

    if (resultadoCliente.error) {
      throw resultadoCliente.error;
    }

    perfilAtual = resultadoPerfil.data || null;
    clienteAtual = resultadoCliente.data || null;

    const nome =
      clienteAtual?.nome ||
      perfilAtual?.nome ||
      usuarioAtual.email?.split("@")[0] ||
      "Cliente";

    if (nomeCliente) {
      nomeCliente.textContent = nome;
    }

    preencherFormularioPerfil();

    if (!clienteAtual) {
      console.warn(
        "[BarberHub] Usuário autenticado ainda não possui cadastro correspondente em clientes.",
      );
    }

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar cliente", erro);

    perfilAtual = null;
    clienteAtual = null;

    preencherFormularioPerfil();

    return false;
  }
}

// 07.1 PREENCHER FORMULÁRIO DO PERFIL

function preencherFormularioPerfil() {
  const campoNome = document.getElementById("perfil-nome");
  const campoTelefone = document.getElementById("perfil-telefone");
  const campoEmail = document.getElementById("perfil-email");
  const nome = clienteAtual?.nome || perfilAtual?.nome || "";
  const telefone = clienteAtual?.telefone || perfilAtual?.telefone || "";

  if (campoNome) {
    campoNome.value = nome;
  }

  if (campoTelefone) {
    campoTelefone.value = telefone;
  }

  if (campoEmail) {
    campoEmail.value = usuarioAtual?.email || "";
  }
}

// 07.2 GARANTIR CADASTRO EM CLIENTES

async function garantirClienteAtual() {
  if (!usuarioAtual?.id) {
    return null;
  }

  if (clienteAtual?.id) {
    return clienteAtual;
  }

  try {
    const { data, error } = await supabaseClient
      .from("clientes")
      .select(
        `
          id,
          profile_id,
          nome,
          telefone,
          email,
          created_at
        `,
      )
      .eq("profile_id", usuarioAtual.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      clienteAtual = data;

      return clienteAtual;
    }

    const nome =
      perfilAtual?.nome || usuarioAtual.email?.split("@")[0] || "Cliente";
    const telefone = perfilAtual?.telefone || null;
    const email = usuarioAtual.email || null;
    const { data: novoCliente, error: erroCriacao } = await supabaseClient
      .from("clientes")
      .insert({
        profile_id: usuarioAtual.id,
        nome,
        telefone,
        email,
      })
      .select(
        `
          id,
          profile_id,
          nome,
          telefone,
          email,
          created_at
        `,
      )
      .single();

    if (erroCriacao) {
      throw erroCriacao;
    }

    clienteAtual = novoCliente;
    preencherFormularioPerfil();

    return clienteAtual;
  } catch (erro) {
    mostrarErroConsole("Erro ao garantir cadastro do cliente", erro);
    return null;
  }
}

// 08. INÍCIO / DASHBOARD

async function carregarDashboard() {
  if (!usuarioAtual?.id) {
    return false;
  }

  try {
    await carregarAgendamentos();
    atualizarTotalFavoritos();

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar dashboard", erro);

    return false;
  }
}

// 08.1 ATUALIZAR RESUMO

function atualizarResumoDashboard() {
  const total = document.getElementById("total-agendamentos");
  const proximo = document.getElementById("proximo-agendamento");
  const agora = new Date();
  const validos = agendamentos.filter(
    (agendamento) => agendamento.status !== "cancelado",
  );

  if (total) {
    total.textContent = String(validos.length);
  }

  const proximos = agendamentos
    .filter((agendamento) => {
      const data = new Date(agendamento.data_hora);

      return (
        data > agora &&
        agendamento.status !== "cancelado" &&
        agendamento.status !== "concluido"
      );
    })
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  const proximoAgendamento = proximos[0] || null;

  if (proximo) {
    proximo.textContent = proximoAgendamento
      ? formatarDataHora(proximoAgendamento.data_hora)
      : "Nenhum";
  }

  renderizarProximoAgendamento(proximoAgendamento);
}

// 08.2 RENDERIZAR PRÓXIMO AGENDAMENTO

function renderizarProximoAgendamento(agendamento) {
  const card = document.getElementById("card-proximo-agendamento");

  if (!card) {
    return;
  }

  if (!agendamento) {
    card.innerHTML = `
      <div class="lista-vazia">
        <p>
          Você não possui próximos agendamentos.
        </p>

        <button
          type="button"
          class="btn-principal"
          onclick="mudarAba('agendamento')"
        >
          📅 Agendar horário
        </button>
      </div>
    `;

    return;
  }

  const barbearia = agendamento.barbearias;
  const servico = agendamento.servicos;
  const profissional = agendamento.profissionais;

  card.innerHTML = `
    <article class="item-agendamento">

      <div class="item-agendamento-topo">

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

      <div class="item-agendamento-detalhes">

        <p>
          📅
          ${formatarData(agendamento.data_hora)}
        </p>

        <p>
          🕐
          ${formatarHora(agendamento.data_hora)}
        </p>
        ${
          servico
            ? `
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
    </article>
  `;
}

// 09. AGENDAMENTO

// 09.1 CARREGAR BARBEARIAS

async function carregarBarbearias() {
  try {
    const { data, error } = await supabaseClient
      .from("barbearias")
      .select(
        `
          id,
          nome,
          cidade,
          endereco,
          telefone,
          logo_url,
          horario_abertura,
          horario_fechamento,
          dias_funcionamento
        `,
      )
      .order("nome", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    barbearias = data || [];

    preencherSelectBarbearias();

    return barbearias;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar barbearias", erro);

    barbearias = [];

    preencherSelectBarbearias();

    return [];
  }
}

// 09.2 PREENCHER SELECT DE BARBEARIAS

function preencherSelectBarbearias() {
  const select = document.getElementById("agendamento-barbearia");

  if (!select) {
    return;
  }

  const valorAtual = select.value;
  select.innerHTML = "";
  const opcaoInicial = document.createElement("option");
  opcaoInicial.value = "";
  opcaoInicial.textContent = "Selecione uma barbearia";

  select.appendChild(opcaoInicial);

  barbearias.forEach((barbearia) => {
    const option = document.createElement("option");

    option.value = barbearia.id;

    option.textContent = barbearia.cidade
      ? `${barbearia.nome} — ${barbearia.cidade}`
      : barbearia.nome;

    select.appendChild(option);
  });

  const aindaExiste = barbearias.some(
    (barbearia) => String(barbearia.id) === String(valorAtual),
  );

  if (valorAtual && aindaExiste) {
    select.value = valorAtual;
  }
}

// 09.3 CARREGAR SERVIÇOS

async function carregarServicos(barbeariaId) {
  const select = document.getElementById("agendamento-servico");
  servicos = [];

  if (!select) {
    return [];
  }

  select.disabled = true;

  if (!barbeariaId) {
    select.innerHTML = `
      <option value="">
        Selecione um serviço
      </option>
    `;

    return [];
  }

  select.innerHTML = `
    <option value="">
      Carregando serviços...
    </option>
  `;

  try {
    const { data, error } = await supabaseClient
      .from("servicos")
      .select(
        `
          id,
          nome,
          preco,
          duracao
        `,
      )
      .eq("barbearia_id", barbeariaId)
      .order("nome", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    servicos = data || [];

    select.innerHTML = `
      <option value="">
        Selecione um serviço
      </option>
    `;

    servicos.forEach((servico) => {
      const option = document.createElement("option");
      option.value = servico.id;
      const duracao = Number(servico.duracao) || 30;

      option.textContent =
        `${servico.nome} — ` +
        `${formatarPreco(servico.preco)} — ` +
        `${duracao} min`;

      select.appendChild(option);
    });

    return servicos;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar serviços", erro);

    select.innerHTML = `
      <option value="">
        Erro ao carregar serviços
      </option>
    `;

    return [];
  } finally {
    select.disabled = false;
  }
}

// 09.4 CARREGAR PROFISSIONAIS

async function carregarProfissionais(barbeariaId) {
  const select = document.getElementById("agendamento-profissional");

  profissionais = [];

  if (!select) {
    return [];
  }

  select.disabled = true;

  if (!barbeariaId) {
    select.innerHTML = `
      <option value="">
        Qualquer profissional
      </option>
    `;

    return [];
  }

  select.innerHTML = `
    <option value="">
      Carregando profissionais...
    </option>
  `;

  try {
    const { data, error } = await supabaseClient
      .from("profissionais")
      .select(
        `
    id,
    nome,
    telefone,
    foto_url,
    ativo
  `,
      )
      .eq("barbearia_id", barbeariaId)
      .eq("ativo", true)
      .order("nome", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    profissionais = data || [];

    select.innerHTML = `
      <option value="">
        Qualquer profissional
      </option>
    `;

    profissionais.forEach((profissional) => {
      const option = document.createElement("option");
      option.value = profissional.id;
      option.textContent = profissional.nome || "Profissional";

      select.appendChild(option);
    });

    return profissionais;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar profissionais", erro);

    select.innerHTML = `
      <option value="">
        Qualquer profissional
      </option>
    `;

    return [];
  } finally {
    select.disabled = false;
  }
}

// 09.5 CARREGAR HORÁRIOS DE FUNCIONAMENTO

async function carregarHorariosFuncionamento(barbeariaId) {
  horariosFuncionamento = [];

  if (!barbeariaId) {
    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from("horarios_funcionamento")
      .select(
        `
          id,
          barbearia_id,
          dia_semana,
          aberto,
          hora_abertura,
          hora_fechamento,
          intervalo_inicio,
          intervalo_fim
        `,
      )
      .eq("barbearia_id", barbeariaId)
      .order("dia_semana", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    horariosFuncionamento = data || [];

    return horariosFuncionamento;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar horários de funcionamento", erro);

    horariosFuncionamento = [];

    return [];
  }
}

// 09.6 HORÁRIO DO DIA

function obterHorarioDoDia(diaSemana) {
  return (
    horariosFuncionamento.find(
      (horario) => Number(horario.dia_semana) === Number(diaSemana),
    ) || null
  );
}

// 09.7 PREPARAR AGENDAMENTO

async function carregarDadosAgendamento() {
  const campoData = document.getElementById("agendamento-data");

  if (campoData) {
    campoData.min = obterDataMinima();

    if (!campoData.value) {
      campoData.value = obterDataMinima();
    }
  }

  if (!barbearias.length) {
    await carregarBarbearias();
  }

  preencherSelectBarbearias();

  const barbeariaId =
    document.getElementById("agendamento-barbearia")?.value || "";

  if (barbeariaId) {
    await Promise.all([
      carregarServicos(barbeariaId),
      carregarProfissionais(barbeariaId),
      carregarHorariosFuncionamento(barbeariaId),
    ]);
  }

  limparHorarios();
}

// 09.8 LIMPAR HORÁRIOS

function limparHorarios() {
  const select = document.getElementById("agendamento-horario");

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Selecione um horário
    </option>
  `;

  select.disabled = true;
}

// 09.9 CARREGANDO HORÁRIOS

function mostrarCarregandoHorarios() {
  const select = document.getElementById("agendamento-horario");

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Calculando horários...
    </option>
  `;

  select.disabled = true;
}

// 09.10 BUSCAR HORÁRIOS DISPONÍVEIS COM SEGURANÇA

async function buscarHorariosDisponiveisSeguro(
  barbeariaId,
  profissionalId,
  data,
  duracao,
) {
  if (!barbeariaId || !data) {
    return [];
  }

  const { data: horarios, error } = await supabaseClient.rpc(
    "buscar_horarios_disponiveis",
    {
      p_barbearia_id: barbeariaId,
      p_profissional_id: profissionalId || null,
      p_data: data,
      p_duracao: Number(duracao) || 30,
    },
  );

  if (error) {
    throw error;
  }

  return (horarios || []).map((item) => item?.hora).filter(Boolean);
}

// 09.11 CARREGAR HORÁRIOS DISPONÍVEIS

async function carregarHorariosDisponiveis() {
  const selectBarbearia = document.getElementById("agendamento-barbearia");

  const selectServico = document.getElementById("agendamento-servico");

  const selectProfissional = document.getElementById(
    "agendamento-profissional",
  );

  const campoData = document.getElementById("agendamento-data");

  const selectHorario = document.getElementById("agendamento-horario");

  if (
    !selectBarbearia ||
    !selectServico ||
    !selectProfissional ||
    !campoData ||
    !selectHorario
  ) {
    return;
  }

  limparMensagem("mensagem-agendamento");

  limparHorarios();

  const barbeariaId = selectBarbearia.value;

  const servicoId = selectServico.value;

  const profissionalId = selectProfissional.value || null;

  const data = campoData.value;

  if (!barbeariaId || !servicoId || !data) {
    selectHorario.disabled = true;

    return;
  }

  const servico = servicos.find(
    (item) => String(item.id) === String(servicoId),
  );

  if (!servico) {
    selectHorario.disabled = true;

    return;
  }

  const duracao = Number(servico.duracao) || 30;

  try {
    mostrarCarregandoHorarios();

    await carregarHorariosFuncionamento(barbeariaId);

    const dataSelecionada = criarDataLocal(data, "12:00");

    if (!dataSelecionada) {
      throw new Error("Data inválida.");
    }

    const diaSemana = dataSelecionada.getDay();

    const horarioFuncionamento = obterHorarioDoDia(diaSemana);

    if (!horarioFuncionamento || !horarioFuncionamento.aberto) {
      limparHorarios();

      mostrarMensagem(
        "mensagem-agendamento",
        `A barbearia está fechada na ${CONFIG.DIAS_SEMANA[diaSemana]}.`,
        "info",
      );

      return;
    }

    const horarios = await buscarHorariosDisponiveisSeguro(
      barbeariaId,
      profissionalId,
      data,
      duracao,
    );

    limparHorarios();

    if (!horarios.length) {
      selectHorario.disabled = true;

      mostrarMensagem(
        "mensagem-agendamento",
        "Não existem horários disponíveis para essa data.",
        "info",
      );

      return;
    }

    horarios.forEach((hora) => {
      const option = document.createElement("option");

      option.value = hora;
      option.textContent = hora;

      selectHorario.appendChild(option);
    });

    selectHorario.disabled = false;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar horários disponíveis", erro);

    limparHorarios();

    selectHorario.disabled = true;

    mostrarMensagem(
      "mensagem-agendamento",
      "Não foi possível carregar os horários disponíveis.",
      "erro",
    );
  }
}

// 09.12 VERIFICAÇÃO FINAL

async function verificarHorarioDisponivel(
  barbeariaId,
  profissionalId,
  dataHora,
  duracao,
) {
  try {
    if (!(dataHora instanceof Date) || Number.isNaN(dataHora.getTime())) {
      return {
        disponivel: false,
        mensagem: "Data ou horário inválido.",
      };
    }

    const ano = dataHora.getFullYear();
    const mes = String(dataHora.getMonth() + 1).padStart(2, "0");
    const dia = String(dataHora.getDate()).padStart(2, "0");
    const data = `${ano}-${mes}-${dia}`;

    const hora = `${String(dataHora.getHours()).padStart(2, "0")}:${String(
      dataHora.getMinutes(),
    ).padStart(2, "0")}`;

    const horarios = await buscarHorariosDisponiveisSeguro(
      barbeariaId,
      profissionalId,
      data,
      duracao,
    );

    if (!horarios.includes(hora)) {
      return {
        disponivel: false,

        mensagem: "Esse horário não está mais disponível. Escolha outro.",
      };
    }

    return {
      disponivel: true,
      mensagem: "",
    };
  } catch (erro) {
    mostrarErroConsole("Erro ao verificar disponibilidade", erro);

    return {
      disponivel: false,

      mensagem: "Não foi possível confirmar a disponibilidade.",
    };
  }
}
// 09.16 MENSAGEM DO WHATSAPP

function montarMensagemWhatsApp({
  cliente,
  barbearia,
  profissional,
  servico,
  data,
  horario,
}) {
  const nomeProfissional = profissional?.nome || "Qualquer profissional";

  return `Olá! 👋

Tenho um novo agendamento pelo BarberHub.

👤 Cliente: ${cliente}
💈 Barbearia: ${barbearia.nome}
✂️ Serviço: ${servico.nome}
💰 Valor: ${formatarPreco(servico.preco)}
⏱️ Duração: ${Number(servico.duracao) || 30} minutos
💇 Profissional: ${nomeProfissional}
📅 Data: ${formatarData(data)}
🕐 Horário: ${horario}
Status: Pendente

Agendamento realizado pelo BarberHub.`;
}

// 09.17 NOTIFICAR WHATSAPP

function notificarAgendamentoWhatsApp({
  barbearia,
  profissional,
  servico,
  data,
  horario,
}) {
  const nome =
    clienteAtual?.nome || perfilAtual?.nome || usuarioAtual?.email || "Cliente";

  const mensagem = montarMensagemWhatsApp({
    cliente: nome,
    barbearia,
    profissional,
    servico,
    data,
    horario,
  });

  if (profissional?.telefone) {
    return abrirWhatsApp(profissional.telefone, mensagem);
  }

  if (barbearia?.telefone) {
    return abrirWhatsApp(barbearia.telefone, mensagem);
  }

  return false;
}

// 09.18 VINCULAR CLIENTE À BARBEARIA

async function vincularClienteBarbearia(barbeariaId) {
  if (!clienteAtual?.id || !barbeariaId) {
    return false;
  }

  try {
    const { error } = await supabaseClient.from("clientes_barbearias").upsert(
      {
        cliente_id: clienteAtual.id,

        barbearia_id: barbeariaId,
      },
      {
        onConflict: "cliente_id,barbearia_id",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      throw error;
    }

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao vincular cliente à barbearia", erro);

    return false;
  }
}

// 09.19 CONFIRMAR AGENDAMENTO

async function confirmarAgendamento() {
  if (!usuarioAtual?.id) {
    mostrarMensagem(
      "mensagem-agendamento",
      "Sua sessão expirou. Faça login novamente.",
      "erro",
    );

    return;
  }

  limparMensagem("mensagem-agendamento");

  const selectBarbearia = document.getElementById("agendamento-barbearia");
  const selectServico = document.getElementById("agendamento-servico");

  const selectProfissional = document.getElementById(
    "agendamento-profissional",
  );

  const campoData = document.getElementById("agendamento-data");
  const selectHorario = document.getElementById("agendamento-horario");
  const botao = document.getElementById("btn-confirmar-agendamento");

  if (
    !selectBarbearia ||
    !selectServico ||
    !selectProfissional ||
    !campoData ||
    !selectHorario
  ) {
    return;
  }

  const barbeariaId = selectBarbearia.value;
  const servicoId = selectServico.value;
  const profissionalId = selectProfissional.value || null;
  const data = campoData.value;
  const horario = selectHorario.value;

  if (!barbeariaId) {
    mostrarMensagem("mensagem-agendamento", "Selecione uma barbearia.", "erro");

    return;
  }

  if (!servicoId) {
    mostrarMensagem("mensagem-agendamento", "Selecione um serviço.", "erro");

    return;
  }

  if (!data) {
    mostrarMensagem("mensagem-agendamento", "Selecione uma data.", "erro");

    return;
  }

  if (!horario) {
    mostrarMensagem("mensagem-agendamento", "Selecione um horário.", "erro");

    return;
  }

  const barbearia = barbearias.find(
    (item) => String(item.id) === String(barbeariaId),
  );

  const servico = servicos.find(
    (item) => String(item.id) === String(servicoId),
  );

  const profissional = profissionalId
    ? profissionais.find((item) => String(item.id) === String(profissionalId))
    : null;

  if (!barbearia) {
    mostrarMensagem(
      "mensagem-agendamento",
      "Barbearia não encontrada.",
      "erro",
    );

    return;
  }

  if (!servico) {
    mostrarMensagem("mensagem-agendamento", "Serviço não encontrado.", "erro");

    return;
  }

  const duracao = Number(servico.duracao) || 30;
  const dataHora = criarDataLocal(data, horario);

  if (!dataHora) {
    mostrarMensagem(
      "mensagem-agendamento",
      "Data ou horário inválido.",
      "erro",
    );

    return;
  }

  if (dataHora <= new Date()) {
    mostrarMensagem(
      "mensagem-agendamento",
      "Não é possível agendar um horário que já passou.",
      "erro",
    );

    return;
  }

  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Agendando...";
    }

    mostrarMensagem(
      "mensagem-agendamento",
      "Preparando seu agendamento...",
      "info",
    );

    const cliente = await garantirClienteAtual();

    if (!cliente?.id) {
      mostrarMensagem(
        "mensagem-agendamento",
        "Não foi possível identificar seu cadastro de cliente.",
        "erro",
      );

      return;
    }

    const disponibilidade = await verificarHorarioDisponivel(
      barbeariaId,
      profissionalId,
      dataHora,
      duracao,
    );

    if (!disponibilidade.disponivel) {
      mostrarMensagem("mensagem-agendamento", disponibilidade.mensagem, "erro");

      await carregarHorariosDisponiveis();

      return;
    }

    mostrarMensagem(
      "mensagem-agendamento",
      "Salvando seu agendamento...",
      "info",
    );

    const novoAgendamento = {
      barbearia_id: barbeariaId,
      cliente_id: cliente.id,
      servico_id: servicoId,
      profissional_id: profissionalId,
      data_hora: dataHora.toISOString(),
      status: "pendente",
      arquivado: false,
      cliente_nome: cliente.nome || perfilAtual?.nome || "Cliente",
      cliente_telefone: cliente.telefone || perfilAtual?.telefone || null,
    };

    const { data: agendamentoCriado, error } = await supabaseClient
      .from("agendamentos")
      .insert(novoAgendamento)
      .select(
        `
          id,
          barbearia_id,
          cliente_id,
          servico_id,
          profissional_id,
          data_hora,
          status,
          cliente_nome,
          cliente_telefone
        `,
      )
      .single();

    if (error) {
      throw error;
    }

    console.log("[BarberHub] Agendamento criado:", agendamentoCriado);

    const vinculado = await vincularClienteBarbearia(barbeariaId);

    if (!vinculado) {
      console.warn(
        "[BarberHub] O agendamento foi criado, mas o vínculo cliente/barbearia não pôde ser criado.",
      );
    }

    mostrarMensagem(
      "mensagem-agendamento",
      "Agendamento realizado com sucesso! 🎉",
      "sucesso",
    );

    notificarAgendamentoWhatsApp({
      barbearia,
      profissional,
      servico,
      data,
      horario,
    });

    selectServico.value = "";
    selectProfissional.value = "";
    campoData.value = obterDataMinima();

    limparHorarios();
    await carregarAgendamentos();

    atualizarResumoDashboard();
  } catch (erro) {
    mostrarErroConsole("Erro ao confirmar agendamento", erro);

    mostrarMensagem(
      "mensagem-agendamento",
      "Não foi possível realizar o agendamento. Tente novamente.",
      "erro",
    );
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "📅 Confirmar agendamento";
    }
  }
}

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
let barbearias = [];
let servicos = [];
let profissionais = [];
let agendamentos = [];
let horariosFuncionamento = [];
let filtroAgendamentosAtual = "proximos";

// 04. HELPERS e ESCAPAR HTML

function escapeHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 4.1 MOSTRAR MENSAGEM

function mostrarMensagem(elementoId, mensagem, tipo = "info") {
  const elemento = document.getElementById(elementoId);

  if (!elemento) {
    return;
  }

  elemento.textContent = mensagem;
  elemento.className = `mensagem mensagem-${tipo}`;
}

// 4.2 LIMPAR MENSAGEM

function limparMensagem(elementoId) {
  const elemento = document.getElementById(elementoId);

  if (!elemento) {
    return;
  }

  elemento.textContent = "";
  elemento.className = "mensagem";
}

// 4.3 FORMATAR PREÇO

function formatarPreco(valor) {
  const numero = Number(valor) || 0;

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// 4.4 FORMATAR DATA

function formatarData(data) {
  if (!data) {
    return "-";
  }

  // Evita problemas de fuso horário em YYYY-MM-DD
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

// 4.5 FORMATAR HORA

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

// 4.6 FORMATAR DATA E HORA

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

// 4.7 OBTER DATA MÍNIMA

function obterDataMinima() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

// 4.8 MOSTRAR ERRO NO CONSOLE

function mostrarErroConsole(contexto, erro) {
  console.error(`[BarberHub] ${contexto}:`, erro);
}

// 4.9 MINUTOS → HORA

function minutosParaHora(minutos) {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// 4.10 HORA → MINUTOS

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

// 4.11 CRIAR DATA LOCAL

function criarDataLocal(data, hora) {
  return new Date(`${data}T${hora}:00`);
}

// 4.12 FORMATAR TELEFONE PARA WHATSAPP

function formatarTelefoneWhatsApp(telefone) {
  if (!telefone) {
    return null;
  }

  let numero = String(telefone).replace(/\D/g, "");

  if (!numero) {
    return null;
  }

  // Brasil
  if (!numero.startsWith("55")) {
    numero = `55${numero}`;
  }

  return numero;
}

// 4.13 ABRIR WHATSAPP

function abrirWhatsApp(telefone, mensagem) {
  const numero = formatarTelefoneWhatsApp(telefone);

  if (!numero) {
    console.warn("[BarberHub] Telefone não encontrado para abrir WhatsApp.");

    return false;
  }

  const texto = encodeURIComponent(mensagem);
  const url = `https://wa.me/${numero}?text=${texto}`;
  window.open(url, "_blank");

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

    // 06.1 NÃO ESTÁ LOGADO

    if (!session) {
      window.location.href = CONFIG.LOGIN_URL;

      return false;
    }

    // 06.2 USUÁRIO LOGADO

    usuarioAtual = session.user;

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao verificar sessão", erro);

    window.location.href = CONFIG.LOGIN_URL;

    return false;
  }
}

// 07. PERFIL / IDENTIFICAÇÃO DO CLIENTE

async function carregarCliente() {
  if (!usuarioAtual) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
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
      .maybeSingle();

    if (error) {
      throw error;
    }

    // 07.1 GUARDAR PERFIL

    perfilAtual = data;

    // 07.2 NOME PARA A SAUDAÇÃO

    const nome = data?.nome || usuarioAtual.email?.split("@")[0] || "Cliente";

    if (nomeCliente) {
      nomeCliente.textContent = nome;
    }

    // 07.3 CAMPOS DO PERFIL

    const campoNome = document.getElementById("perfil-nome");
    const campoTelefone = document.getElementById("perfil-telefone");
    const campoEmail = document.getElementById("perfil-email");

    // Nome
    if (campoNome) {
      campoNome.value = data?.nome || "";
    }

    // Telefone
    if (campoTelefone) {
      campoTelefone.value = data?.telefone || "";
    }

    // E-mail
    if (campoEmail) {
      campoEmail.value = usuarioAtual.email || "";
    }
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar cliente", erro);
  }
}

// 08. INÍCIO / DASHBOARD

// 08.1 CARREGAR DASHBOARD

async function carregarDashboard() {
  if (!usuarioAtual) {
    return;
  }

  try {
    // Carrega os agendamentos do cliente
    await carregarAgendamentos();
    // Atualiza total de favoritos
    atualizarTotalFavoritos();
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar dashboard", erro);
  }
}
// 08.2 ATUALIZAR RESUMO DO DASHBOARD

function atualizarResumoDashboard() {
  const total = document.getElementById("total-agendamentos");
  const proximo = document.getElementById("proximo-agendamento");

  const agora = new Date();
  // 08.3 AGENDAMENTOS VÁLIDOS
  const validos = agendamentos.filter(
    (agendamento) => agendamento.status !== "cancelado",
  );
  // 08.4 TOTAL DE AGENDAMENTOS

  if (total) {
    total.textContent = validos.length;
  }

  // 08.5 PRÓXIMOS AGENDAMENTOS

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

  // 08.6 PRIMEIRO PRÓXIMO AGENDAMENTO

  const proximoAgendamento = proximos[0];
  if (proximo) {
    if (proximoAgendamento) {
      proximo.textContent = formatarDataHora(proximoAgendamento.data_hora);
    } else {
      proximo.textContent = "Nenhum";
    }
  }
  // 08.7 RENDERIZAR CARD
  renderizarProximoAgendamento(proximoAgendamento);
}
// 08.8 RENDERIZAR PRÓXIMO AGENDAMENTO

function renderizarProximoAgendamento(agendamento) {
  const card = document.getElementById("card-proximo-agendamento");
  if (!card) {
    return;
  }

  // 08.9 SEM AGENDAMENTO

  if (!agendamento) {
    card.innerHTML = `
      <div class="lista-vazia">
        <p>
          Você não possui próximos agendamentos.
        </p>
      </div>
    `;
    return;
  }
  // 08.10 DADOS RELACIONADOS

  const barbearia = agendamento.barbearias;
  const servico = agendamento.servicos;
  const profissional = agendamento.profissionais;

  // 08.11 CARD

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

        <p>
          💰
          ${formatarPreco(servico?.preco)}
        </p>

        ${
          profissional
            ? `
              <p>
                💇
                ${escapeHTML(profissional.nome)}
              </p>
            `
            : ""
        }

      </div>

    </article>
  `;
}

// 09. AGENDAMENTO

// 9.1 — CARREGAR BARBEARIAS
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

    return [];
  }
}

// 9.2 — PREENCHER SELECT DE BARBEARIAS

function preencherSelectBarbearias() {
  const select = document.getElementById("agendamento-barbearia");

  if (!select) {
    return;
  }

  select.innerHTML = '<option value="">Selecione uma barbearia</option>';

  barbearias.forEach((barbearia) => {
    const option = document.createElement("option");

    option.value = barbearia.id;

    option.textContent = barbearia.cidade
      ? `${barbearia.nome} — ${barbearia.cidade}`
      : barbearia.nome;

    select.appendChild(option);
  });
}

// 9.3 — CARREGAR SERVIÇOS

async function carregarServicos(barbeariaId) {
  const select = document.getElementById("agendamento-servico");

  servicos = [];

  if (!select) {
    return;
  }

  select.innerHTML = '<option value="">Carregando serviços...</option>';

  select.disabled = true;

  // Nenhuma barbearia selecionada
  if (!barbeariaId) {
    select.innerHTML = '<option value="">Selecione um serviço</option>';

    select.disabled = false;

    return;
  }

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

    select.innerHTML = '<option value="">Selecione um serviço</option>';

    servicos.forEach((servico) => {
      const option = document.createElement("option");

      option.value = servico.id;

      const duracao = Number(servico.duracao) || 30;

      option.textContent = `${servico.nome} — ${formatarPreco(
        servico.preco,
      )} — ${duracao} min`;

      select.appendChild(option);
    });
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar serviços", erro);

    select.innerHTML = '<option value="">Erro ao carregar serviços</option>';
  } finally {
    select.disabled = false;
  }
}

// 9.4 — CARREGAR PROFISSIONAIS

async function carregarProfissionais(barbeariaId) {
  const select = document.getElementById("agendamento-profissional");

  profissionais = [];

  if (!select) {
    return;
  }

  select.innerHTML = '<option value="">Carregando profissionais...</option>';

  select.disabled = true;

  // Nenhuma barbearia selecionada
  if (!barbeariaId) {
    select.innerHTML = '<option value="">Qualquer profissional</option>';

    select.disabled = false;

    return;
  }

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

    select.innerHTML = '<option value="">Qualquer profissional</option>';

    profissionais.forEach((profissional) => {
      const option = document.createElement("option");

      option.value = profissional.id;

      option.textContent = profissional.nome;

      select.appendChild(option);
    });
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar profissionais", erro);

    select.innerHTML = '<option value="">Qualquer profissional</option>';
  } finally {
    select.disabled = false;
  }
}

// 9.5 CARREGAR HORÁRIOS DE FUNCIONAMENTO

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

    return [];
  }
}

// 9.6 OBTER HORÁRIO DE UM DIA

function obterHorarioDoDia(diaSemana) {
  return (
    horariosFuncionamento.find(
      (horario) => Number(horario.dia_semana) === Number(diaSemana),
    ) || null
  );
}

// 9.7 PREPARAR DADOS DO AGENDAMENTO

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

  await carregarHorariosDisponiveis();
}

// 9.8 HORÁRIOS DISPONÍVEIS

function limparHorarios() {
  const select = document.getElementById("agendamento-horario");

  if (!select) {
    return;
  }

  select.innerHTML = '<option value="">Selecione um horário</option>';
}

// 9.9 MOSTRAR CARREGAMENTO

function mostrarCarregandoHorarios() {
  const select = document.getElementById("agendamento-horario");

  if (!select) {
    return;
  }

  select.innerHTML = '<option value="">Calculando horários...</option>';

  select.disabled = true;
}

// 9.10 BUSCAR AGENDAMENTOS DO DIA

async function buscarAgendamentosDoDia(barbeariaId, profissionalId, data) {
  const inicioDia = criarDataLocal(data, "00:00").toISOString();

  const fimDia = criarDataLocal(data, "23:59").toISOString();

  let consulta = supabaseClient
    .from("agendamentos")
    .select(
      `
          id,
          data_hora,
          status,
          servico_id,
          profissional_id,
          servicos (
            id,
            nome,
            duracao
          )
        `,
    )
    .eq("barbearia_id", barbeariaId)
    .in("status", CONFIG.STATUS_BLOQUEIAM_HORARIO)
    .gte("data_hora", inicioDia)
    .lte("data_hora", fimDia);

  // Se um profissional foi escolhido,
  // verifica apenas os horários dele.
  if (profissionalId) {
    consulta = consulta.eq("profissional_id", profissionalId);
  }

  const { data: dados, error } = await consulta.order("data_hora", {
    ascending: true,
  });

  if (error) {
    throw error;
  }

  return dados || [];
}

// 9.11 VERIFICAR SOBREPOSIÇÃO

function horariosSeSobrepoem(inicioA, fimA, inicioB, fimB) {
  return inicioA < fimB && fimA > inicioB;
}

// 9.12 VERIFICAR INTERVALO

function horarioDentroDoIntervalo(inicio, fim, intervaloInicio, intervaloFim) {
  if (intervaloInicio === null || intervaloFim === null) {
    return false;
  }

  return horariosSeSobrepoem(inicio, fim, intervaloInicio, intervaloFim);
}

// 9.13 VERIFICAR SE SLOT ESTÁ OCUPADO

function slotEstaOcupado(inicioSlot, fimSlot, agendamentosExistentes) {
  return agendamentosExistentes.some((agendamento) => {
    const inicioExistente = new Date(agendamento.data_hora);

    const duracaoExistente = Number(agendamento.servicos?.duracao) || 30;

    const fimExistente = new Date(
      inicioExistente.getTime() + duracaoExistente * 60 * 1000,
    );

    return horariosSeSobrepoem(
      inicioSlot,
      fimSlot,
      inicioExistente,
      fimExistente,
    );
  });
}

// 9.14 CALCULAR HORÁRIOS DISPONÍVEIS

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

  const barbeariaId = selectBarbearia.value;

  const servicoId = selectServico.value;

  const profissionalId = selectProfissional.value || null;

  const data = campoData.value;

  limparHorarios();

  if (!barbeariaId || !servicoId || !data) {
    return;
  }

  const servico = servicos.find(
    (item) => String(item.id) === String(servicoId),
  );

  if (!servico) {
    return;
  }

  const duracao = Number(servico.duracao) || 30;

  try {
    mostrarCarregandoHorarios();

    if (!horariosFuncionamento.length) {
      await carregarHorariosFuncionamento(barbeariaId);
    }

    const dataSelecionada = criarDataLocal(data, "12:00");

    const diaSemana = dataSelecionada.getDay();

    const horarioFuncionamento = obterHorarioDoDia(diaSemana);

    // 9.14 BARBEARIA FECHADA

    if (!horarioFuncionamento || !horarioFuncionamento.aberto) {
      limparHorarios();

      mostrarMensagem(
        "mensagem-agendamento",
        `A barbearia está fechada na ${CONFIG.DIAS_SEMANA[diaSemana]}.`,
        "info",
      );

      return;
    }

    // 9.15 ABERTURA E FECHAMENTO

    const abertura = horaParaMinutos(horarioFuncionamento.hora_abertura);

    const fechamento = horaParaMinutos(horarioFuncionamento.hora_fechamento);

    if (abertura === null || fechamento === null) {
      throw new Error("Horário de funcionamento inválido.");
    }

    // 9.16 INTERVALO

    let intervaloInicio = null;
    let intervaloFim = null;

    if (
      horarioFuncionamento.intervalo_inicio &&
      horarioFuncionamento.intervalo_fim
    ) {
      intervaloInicio = horaParaMinutos(horarioFuncionamento.intervalo_inicio);

      intervaloFim = horaParaMinutos(horarioFuncionamento.intervalo_fim);
    }

    // 9.18 AGENDAMENTOS EXISTENTES

    const agendamentosExistentes = await buscarAgendamentosDoDia(
      barbeariaId,
      profissionalId,
      data,
    );

    const agora = new Date();

    const opcoes = [];

    // 9.19 GERAR SLOTS

    for (
      let inicio = abertura;
      inicio + duracao <= fechamento;
      inicio += CONFIG.INTERVALO_SLOTS_MINUTOS
    ) {
      const fim = inicio + duracao;

      // Intervalo da barbearia
      if (
        horarioDentroDoIntervalo(inicio, fim, intervaloInicio, intervaloFim)
      ) {
        continue;
      }

      const hora = minutosParaHora(inicio);

      const dataHora = criarDataLocal(data, hora);

      // Horário já passou
      if (dataHora <= agora) {
        continue;
      }

      const fimDataHora = new Date(dataHora.getTime() + duracao * 60 * 1000);

      // Conflito com outro agendamento
      if (slotEstaOcupado(dataHora, fimDataHora, agendamentosExistentes)) {
        continue;
      }

      opcoes.push({
        hora,
        dataHora,
      });
    }

    // 9.20 NENHUM HORÁRIO

    limparHorarios();

    if (!opcoes.length) {
      mostrarMensagem(
        "mensagem-agendamento",
        "Não existem horários disponíveis para essa data.",
        "info",
      );

      return;
    }

    // 9.21 MOSTRAR HORÁRIOS

    opcoes.forEach((opcao) => {
      const option = document.createElement("option");

      option.value = opcao.hora;
      option.textContent = opcao.hora;

      selectHorario.appendChild(option);
    });
  } catch (erro) {
    mostrarErroConsole("Erro ao calcular horários", erro);

    limparHorarios();

    mostrarMensagem(
      "mensagem-agendamento",
      "Não foi possível carregar os horários disponíveis.",
      "erro",
    );
  } finally {
    selectHorario.disabled = false;
  }
}

// 9.22 — VERIFICAÇÃO FINAL DO HORÁRIO

async function verificarHorarioDisponivel(
  barbeariaId,
  profissionalId,
  dataHora,
  duracao,
) {
  try {
    const data = `${dataHora.getFullYear()}-${String(
      dataHora.getMonth() + 1,
    ).padStart(2, "0")}-${String(dataHora.getDate()).padStart(2, "0")}`;

    if (!horariosFuncionamento.length) {
      await carregarHorariosFuncionamento(barbeariaId);
    }

    const horario = obterHorarioDoDia(dataHora.getDay());

    // 9.23 BARBEARIA FECHADA

    if (!horario || !horario.aberto) {
      return {
        disponivel: false,
        mensagem: "A barbearia está fechada neste dia.",
      };
    }

    // 9.24 HORÁRIOS

    const inicioMin = dataHora.getHours() * 60 + dataHora.getMinutes();

    const fimMin = inicioMin + duracao;

    const abertura = horaParaMinutos(horario.hora_abertura);

    const fechamento = horaParaMinutos(horario.hora_fechamento);

    if (inicioMin < abertura || fimMin > fechamento) {
      return {
        disponivel: false,
        mensagem: "Esse horário está fora do funcionamento da barbearia.",
      };
    }

    // 9.25 INTERVALO

    // 9.25 INTERVALO

    const intervaloInicio = horaParaMinutos(horario.intervalo_inicio);

    const intervaloFim = horaParaMinutos(horario.intervalo_fim);

    if (
      horarioDentroDoIntervalo(inicioMin, fimMin, intervaloInicio, intervaloFim)
    ) {
      return {
        disponivel: false,
        mensagem: "Esse horário está dentro do intervalo da barbearia.",
      };
    }

    // 9.26 AGENDAMENTOS EXISTENTES

    const existentes = await buscarAgendamentosDoDia(
      barbeariaId,
      profissionalId,
      data,
    );

    const fimDataHora = new Date(dataHora.getTime() + duracao * 60 * 1000);

    const ocupado = slotEstaOcupado(dataHora, fimDataHora, existentes);

    if (ocupado) {
      return {
        disponivel: false,
        mensagem: "Esse horário acabou de ser ocupado. Escolha outro.",
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

// 9.27 — WHATSAPP DO AGENDAMENTO

// 9.28 MONTAR MENSAGEM

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

// 9.29 NOTIFICAR PELO WHATSAPP

async function notificarAgendamentoWhatsApp({
  barbearia,
  profissional,
  servico,
  data,
  horario,
}) {
  const nomeCliente = perfilAtual?.nome || usuarioAtual?.email || "Cliente";

  // Se escolheu profissional,
  // manda para o WhatsApp dele.
  if (profissional && profissional.telefone) {
    const mensagem = montarMensagemWhatsApp({
      cliente: nomeCliente,
      barbearia,
      profissional,
      servico,
      data,
      horario,
    });

    return abrirWhatsApp(profissional.telefone, mensagem);
  }

  // Caso contrário,
  // manda para a barbearia.
  if (barbearia.telefone) {
    const mensagem = montarMensagemWhatsApp({
      cliente: nomeCliente,
      barbearia,
      profissional: null,
      servico,
      data,
      horario,
    });

    return abrirWhatsApp(barbearia.telefone, mensagem);
  }

  return false;
}

// 9.30 CONFIRMAR AGENDAMENTO

async function confirmarAgendamento() {
  if (!usuarioAtual) {
    mostrarMensagem(
      "mensagem-agendamento",
      "Sua sessão expirou. Faça login novamente.",
      "erro",
    );

    return;
  }

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

  // 9.31 VALIDAÇÕES

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

  // 9.32 LOCALIZAR DADOS

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

  // 9.33  DATA E DURAÇÃO

  const duracao = Number(servico.duracao) || 30;
  const dataHora = criarDataLocal(data, horario);

  if (Number.isNaN(dataHora.getTime())) {
    mostrarMensagem(
      "mensagem-agendamento",
      "Data ou horário inválido.",
      "erro",
    );

    return;
  }

  // Não permite horário passado
  if (dataHora <= new Date()) {
    mostrarMensagem(
      "mensagem-agendamento",
      "Não é possível agendar um horário que já passou.",
      "erro",
    );

    return;
  }

  try {
    // 9.34 BLOQUEAR BOTÃO

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Agendando...";
    }

    mostrarMensagem(
      "mensagem-agendamento",
      "Verificando disponibilidade...",
      "info",
    );

    // 9.35 SEGUNDA VERIFICAÇÃO

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

    // 9.36  SALVAR AGENDAMENTO

    mostrarMensagem(
      "mensagem-agendamento",
      "Salvando seu agendamento...",
      "info",
    );

    const novoAgendamento = {
      barbearia_id: barbeariaId,
      cliente_id: usuarioAtual.id,
      servico_id: servicoId,
      profissional_id: profissionalId,
      data_hora: dataHora.toISOString(),

      status: "pendente",
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
            status
          `,
      )
      .single();

    if (error) {
      throw error;
    }

    console.log("Agendamento criado:", agendamentoCriado);

    // 9.37 SUCESSO

    mostrarMensagem(
      "mensagem-agendamento",
      "Agendamento realizado com sucesso! 🎉",
      "sucesso",
    );

    // 9.38 WHATSAPP

    const whatsappAberto = await notificarAgendamentoWhatsApp({
      barbearia,
      profissional,
      servico,
      data,
      horario,
    });

    if (!whatsappAberto) {
      console.warn(
        "[BarberHub] Não foi possível abrir o WhatsApp. Verifique o telefone.",
      );
    }

    // 9.39 LIMPAR FORMULÁRIO

    selectServico.value = "";
    selectProfissional.value = "";
    campoData.value = "";

    limparHorarios();

    // 9.40 ATUALIZAR DADOS

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

// 10. MEUS AGENDAMENTOS

// 10.1 — CARREGAR AGENDAMENTOS

async function carregarAgendamentos() {
  if (!usuarioAtual) {
    return [];
  }

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
      .eq("cliente_id", usuarioAtual.id)
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

    return [];
  }
}

// 10.2 — STATUS DO AGENDAMENTO

function textoStatus(status) {
  const statusMap = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  return statusMap[status] || status || "Indefinido";
}

// 10.3 — RENDERIZAR AGENDAMENTOS

function renderizarAgendamentos() {
  const lista = document.getElementById("lista-meus-agendamentos");

  if (!lista) {
    return;
  }

  const agora = new Date();

  let listaFiltrada = [...agendamentos];

  // FILTRO — PRÓXIMOS

  if (filtroAgendamentosAtual === "proximos") {
    listaFiltrada = listaFiltrada.filter((agendamento) => {
      const data = new Date(agendamento.data_hora);

      return (
        data >= agora &&
        agendamento.status !== "cancelado" &&
        agendamento.status !== "concluido"
      );
    });

    listaFiltrada.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
  }

  // FILTRO — TODOS

  if (filtroAgendamentosAtual === "todos") {
    listaFiltrada.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
  }

  // FILTRO — CANCELADOS

  if (filtroAgendamentosAtual === "cancelados") {
    listaFiltrada = listaFiltrada.filter(
      (agendamento) => agendamento.status === "cancelado",
    );

    listaFiltrada.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
  }

  // LISTA VAZIA

  if (!listaFiltrada.length) {
    lista.innerHTML = `
      <div class="lista-vazia">
        <p>
          Nenhum agendamento encontrado.
        </p>
      </div>
    `;

    return;
  }

  // RENDERIZAR

  lista.innerHTML = listaFiltrada
    .map((agendamento) => {
      const barbearia = agendamento.barbearias;
      const servico = agendamento.servicos;
      const profissional = agendamento.profissionais;
      const data = new Date(agendamento.data_hora);

      // PODE CANCELAR?

      const podeCancelar =
        (agendamento.status === "pendente" ||
          agendamento.status === "confirmado") &&
        data > new Date();

      // CARD

      return `
            <article class="item-agendamento">

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

                <p>
                  ⏱️
                  ${Number(servico?.duracao) || 30}
                  minutos
                </p>

                <p>
                  💰
                  ${formatarPreco(servico?.preco)}
                </p>

                ${
                  profissional
                    ? `
                      <p>
                        💇
                        ${escapeHTML(profissional.nome)}
                      </p>
                    `
                    : ""
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

// 10.4 — CANCELAR AGENDAMENTO

async function cancelarAgendamento(id) {
  if (!id) {
    return;
  }

  // LOCALIZAR AGENDAMENTO

  const agendamento = agendamentos.find(
    (item) => String(item.id) === String(id),
  );

  if (!agendamento) {
    return;
  }

  // VALIDAR STATUS

  if (!["pendente", "confirmado"].includes(agendamento.status)) {
    mostrarMensagem(
      "mensagem-agendamento",
      "Esse agendamento não pode mais ser cancelado.",
      "erro",
    );

    return;
  }

  // VALIDAR DATA

  const data = new Date(agendamento.data_hora);

  if (data <= new Date()) {
    alert("Não é possível cancelar um horário que já passou.");

    return;
  }

  // CONFIRMAR CANCELAMENTO

  const confirmou = confirm(
    "Tem certeza que deseja cancelar este agendamento?",
  );

  if (!confirmou) {
    return;
  }

  try {
    mostrarMensagem(
      "mensagem-agendamento",
      "Cancelando agendamento...",
      "info",
    );

    // ATUALIZAR STATUS

    const { error } = await supabaseClient
      .from("agendamentos")
      .update({
        status: "cancelado",
      })
      .eq("id", id)
      .eq("cliente_id", usuarioAtual.id);

    if (error) {
      throw error;
    }

    // RECARREGAR

    await carregarAgendamentos();

    // SUCESSO

    mostrarMensagem(
      "mensagem-agendamento",
      "Agendamento cancelado com sucesso! ✅",
      "sucesso",
    );
  } catch (erro) {
    mostrarErroConsole("Erro ao cancelar agendamento", erro);

    mostrarMensagem(
      "mensagem-agendamento",
      "Não foi possível cancelar o agendamento.",
      "erro",
    );
  }
}

// 11. NOTIFICAÇÕES

// Estado local das notificações
let notificacoesCliente = [];

// 11.1 — CHAVE DAS NOTIFICAÇÕES

function obterChaveNotificacoes() {
  if (!usuarioAtual) {
    return null;
  }

  return `barberhub_notificacoes_${usuarioAtual.id}`;
}

// 11.2 — OBTER NOTIFICAÇÕES LIDAS

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

// 11.3 — SALVAR NOTIFICAÇÕES LIDAS

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

// 11.4 — VERIFICAR SE ESTÁ LIDA

function notificacaoEstaLida(notificacaoId) {
  const lidas = obterNotificacoesLidas();

  return lidas.includes(notificacaoId);
}

// 11.5 — MARCAR COMO LIDA

function marcarNotificacaoComoLida(notificacaoId) {
  if (!notificacaoId) {
    return;
  }

  let lidas = obterNotificacoesLidas();

  if (!lidas.includes(notificacaoId)) {
    lidas.push(notificacaoId);
  }

  salvarNotificacoesLidas(lidas);

  renderizarNotificacoesCliente();
}

// 11.6 — MARCAR TODAS COMO LIDAS

function marcarTodasNotificacoesComoLidas() {
  const ids = notificacoesCliente.map((notificacao) => notificacao.id);

  salvarNotificacoesLidas(ids);

  renderizarNotificacoesCliente();
}

// 11.7 — CARREGAR NOTIFICAÇÕES

async function carregarNotificacoesCliente() {
  if (!usuarioAtual) {
    return [];
  }

  try {
    // Atualiza os agendamentos antes
    // de montar as notificações.
    await carregarAgendamentos();

    const notificacoes = [];

    agendamentos.forEach((agendamento) => {
      const barbearia = agendamento.barbearias;

      const servico = agendamento.servicos;

      const profissional = agendamento.profissionais;

      const data = new Date(agendamento.data_hora);

      // SEGURANÇA DA DATA

      if (Number.isNaN(data.getTime())) {
        return;
      }

      const nomeBarbearia = barbearia?.nome || "Barbearia";

      const nomeServico = servico?.nome || "Serviço";

      const dataFormatada = formatarData(data);

      const horaFormatada = formatarHora(data);

      // PENDENTE

      if (agendamento.status === "pendente") {
        notificacoes.push({
          id: `agendamento-${agendamento.id}-pendente`,

          tipo: "pendente",

          icone: "📅",

          titulo: "Agendamento realizado",

          mensagem: `Seu agendamento de ${nomeServico} na ${nomeBarbearia} está aguardando confirmação.`,

          detalhes: `${dataFormatada} às ${horaFormatada}`,

          timestamp: agendamento.created_at || agendamento.data_hora,

          agendamentoId: agendamento.id,
        });
      }

      // CONFIRMADO

      if (agendamento.status === "confirmado") {
        notificacoes.push({
          id: `agendamento-${agendamento.id}-confirmado`,

          tipo: "confirmado",

          icone: "✅",

          titulo: "Agendamento confirmado",

          mensagem: `Seu horário na ${nomeBarbearia} foi confirmado.`,

          detalhes: `${nomeServico} · ${dataFormatada} às ${horaFormatada}`,

          timestamp: agendamento.data_hora,

          agendamentoId: agendamento.id,
        });
      }

      // CANCELADO

      if (agendamento.status === "cancelado") {
        notificacoes.push({
          id: `agendamento-${agendamento.id}-cancelado`,

          tipo: "cancelado",

          icone: "❌",

          titulo: "Agendamento cancelado",

          mensagem: `Seu agendamento na ${nomeBarbearia} foi cancelado.`,

          detalhes: `${nomeServico} · ${dataFormatada} às ${horaFormatada}`,

          timestamp: agendamento.data_hora,

          agendamentoId: agendamento.id,
        });
      }

      // CONCLUÍDO

      if (agendamento.status === "concluido") {
        notificacoes.push({
          id: `agendamento-${agendamento.id}-concluido`,

          tipo: "concluido",

          icone: "🎉",

          titulo: "Atendimento concluído",

          mensagem: `Seu atendimento na ${nomeBarbearia} foi concluído.`,

          detalhes: `${nomeServico} · ${dataFormatada} às ${horaFormatada}`,

          timestamp: agendamento.data_hora,

          agendamentoId: agendamento.id,
        });
      }

      // PRÓXIMO AGENDAMENTO

      if (
        data > new Date() &&
        (agendamento.status === "pendente" ||
          agendamento.status === "confirmado")
      ) {
        notificacoes.push({
          id: `proximo-${agendamento.id}`,

          tipo: "proximo",

          icone: "⏰",

          titulo: "Você tem um horário marcado",

          mensagem: `Seu próximo atendimento será na ${nomeBarbearia}.`,

          detalhes: `${nomeServico} · ${dataFormatada} às ${horaFormatada}`,

          timestamp: agendamento.data_hora,

          agendamentoId: agendamento.id,
        });
      }
    });

    // REMOVER DUPLICADAS

    const mapa = new Map();

    notificacoes.forEach((notificacao) => {
      mapa.set(notificacao.id, notificacao);
    });

    notificacoesCliente = Array.from(mapa.values());

    // ORDENAR

    notificacoesCliente.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );

    // RENDERIZAR

    renderizarNotificacoesCliente();

    return notificacoesCliente;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar notificações", erro);

    notificacoesCliente = [];

    renderizarNotificacoesCliente();

    return [];
  }
}

// 11.8 — TEXTO DO TIPO DE NOTIFICAÇÃO

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

// 11.9 — RENDERIZAR NOTIFICAÇÕES

function renderizarNotificacoesCliente() {
  const lista = document.getElementById("lista-notificacoes-cliente");

  if (!lista) {
    return;
  }

  // NENHUMA NOTIFICAÇÃO

  if (!notificacoesCliente.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          🔔 Você não possui notificações.
        </p>

        <small>
          Quando houver novidades ou atualizações dos seus
          agendamentos, elas aparecerão aqui.
        </small>

      </div>
    `;

    return;
  }

  // CONTADOR DE NÃO LIDAS

  const totalNaoLidas = notificacoesCliente.filter(
    (notificacao) => !notificacaoEstaLida(notificacao.id),
  ).length;

  // BOTÃO MARCAR TODAS

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

  // LISTA

  const itens = notificacoesCliente
    .map((notificacao) => {
      const lida = notificacaoEstaLida(notificacao.id);

      return `
            <article
              class="item-notificacao ${
                lida ? "item-notificacao--lida" : "item-notificacao--nao-lida"
              } ${classeNotificacao(notificacao.tipo)}"
            >

              <div
                class="item-notificacao-icone"
              >
                ${notificacao.icone}
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
                        class="btn-secundario btn-marcar-notificacao"
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

  // MARCAR TODAS

  const btnTodas = document.getElementById("btn-marcar-todas-notificacoes");

  if (btnTodas) {
    btnTodas.addEventListener("click", marcarTodasNotificacoesComoLidas);
  }
}

// 11.10 — EVENTO DE MARCAR COMO LIDA

function configurarEventosNotificacoes() {
  const lista = document.getElementById("lista-notificacoes-cliente");

  if (!lista) {
    return;
  }

  // Evita registrar o mesmo evento várias vezes
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

// ============================================================
// 12. PRODUTOS
// ============================================================

// Estado dos produtos exibidos ao cliente
let produtosCliente = [];

// ============================================================
// 12.1 — CARREGAR PRODUTOS
// ============================================================

async function carregarProdutosCliente() {
  const lista = document.getElementById("lista-produtos-cliente");

  if (!lista) {
    return [];
  }

  lista.innerHTML = `
    <div class="lista-vazia">
      <p>🛍️ Carregando produtos...</p>
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
    mostrarErroConsole("Erro ao carregar produtos do cliente", erro);

    produtosCliente = [];

    lista.innerHTML = `
      <div class="lista-vazia">
        <p>
          Não foi possível carregar os produtos.
        </p>
      </div>
    `;

    return [];
  }
}

// ============================================================
// 12.2 — AGRUPAR PRODUTOS POR BARBEARIA
// ============================================================

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

// ============================================================
// 12.3 — CRIAR PEDIDO DO PRODUTO
// ============================================================

async function comprarProdutoCliente(produtoId) {
  // ----------------------------------------------------------
  // VERIFICAR USUÁRIO
  // ----------------------------------------------------------

  if (!usuarioAtual) {
    alert("Sua sessão expirou. Faça login novamente.");

    return;
  }

  // ----------------------------------------------------------
  // VALIDAR PRODUTO
  // ----------------------------------------------------------

  if (!produtoId) {
    return;
  }

  const produto = produtosCliente.find(
    (item) => String(item.id) === String(produtoId),
  );

  if (!produto) {
    alert("Produto não encontrado.");

    return;
  }

  // ----------------------------------------------------------
  // VERIFICAR ESTOQUE
  // ----------------------------------------------------------

  const estoque = Number(produto.estoque) || 0;

  if (estoque <= 0) {
    alert("Este produto está esgotado.");

    return;
  }

  // ----------------------------------------------------------
  // VERIFICAR BARBEARIA
  // ----------------------------------------------------------

  const barbearia = produto.barbearias;

  if (!barbearia) {
    alert("Barbearia do produto não encontrada.");

    return;
  }

  if (!produto.barbearia_id) {
    alert("O produto não está vinculado a uma barbearia.");

    return;
  }

  if (!barbearia.telefone) {
    alert("Esta barbearia não possui telefone cadastrado.");

    return;
  }

  try {
    // --------------------------------------------------------
    // CRIAR PEDIDO
    // --------------------------------------------------------

    const { data: pedido, error } = await supabaseClient
      .from("pedidos")
      .insert({
        cliente_id: usuarioAtual.id,

        barbearia_id: produto.barbearia_id,

        produto_id: produto.id,

        quantidade: 1,

        preco_unitario: produto.preco,

        status: "pendente",
      })
      .select(
        `
          id,
          cliente_id,
          barbearia_id,
          produto_id,
          quantidade,
          preco_unitario,
          status,
          created_at
        `,
      )
      .single();

    if (error) {
      throw error;
    }

    console.log("[BarberHub] Pedido criado:", pedido);

    // --------------------------------------------------------
    // NOME DO CLIENTE
    // --------------------------------------------------------

    const nomeClienteAtual =
      perfilAtual?.nome || usuarioAtual.email || "Cliente";

    // --------------------------------------------------------
    // MONTAR MENSAGEM
    // --------------------------------------------------------

    const mensagem = `Olá! 👋

Tenho um novo pedido pelo BarberHub.

🆔 Pedido: ${pedido.id}

👤 Cliente: ${nomeClienteAtual}

💈 Barbearia: ${barbearia.nome}

🛍️ Produto: ${produto.nome}

📦 Quantidade: 1

💰 Valor unitário: ${formatarPreco(produto.preco)}

💰 Total: ${formatarPreco(Number(produto.preco) || 0)}

📌 Status: Pendente

Gostaria de confirmar a compra e saber como realizar o pagamento.

Pedido iniciado pelo BarberHub.`;

    // --------------------------------------------------------
    // ABRIR WHATSAPP
    // --------------------------------------------------------

    const abriu = abrirWhatsApp(barbearia.telefone, mensagem);

    if (!abriu) {
      // O pedido foi criado,
      // mesmo que o WhatsApp não abra.
      mostrarMensagem(
        "mensagem-produto",
        "Pedido criado, mas não foi possível abrir o WhatsApp.",
        "erro",
      );

      return;
    }

    // --------------------------------------------------------
    // MENSAGEM DE SUCESSO
    // --------------------------------------------------------

    mostrarMensagem(
      "mensagem-produto",
      "Pedido criado com sucesso! A barbearia receberá sua solicitação. ✅",
      "sucesso",
    );
  } catch (erro) {
    mostrarErroConsole("Erro ao criar pedido", erro);

    // --------------------------------------------------------
    // ERRO DE RLS
    // --------------------------------------------------------

    if (erro?.code === "42501") {
      mostrarMensagem(
        "mensagem-produto",
        "Você não tem permissão para criar este pedido.",
        "erro",
      );

      return;
    }

    mostrarMensagem(
      "mensagem-produto",
      "Não foi possível registrar seu pedido.",
      "erro",
    );
  }
}

// ============================================================
// 12.4 — RENDERIZAR PRODUTOS
// ============================================================

function renderizarProdutosCliente() {
  const lista = document.getElementById("lista-produtos-cliente");

  if (!lista) {
    return;
  }

  // ----------------------------------------------------------
  // SOMENTE PRODUTOS DISPONÍVEIS
  // ----------------------------------------------------------

  const produtosDisponiveis = produtosCliente.filter(
    (produto) => Number(produto.estoque) > 0,
  );

  // ----------------------------------------------------------
  // NENHUM PRODUTO
  // ----------------------------------------------------------

  if (!produtosDisponiveis.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          🛍️ Nenhum produto disponível no momento.
        </p>

        <small>
          As barbearias ainda não possuem produtos disponíveis
          para venda.
        </small>

      </div>
    `;

    return;
  }

  // ----------------------------------------------------------
  // AGRUPAR
  // ----------------------------------------------------------

  const grupos = agruparProdutosPorBarbearia(produtosDisponiveis);

  // ----------------------------------------------------------
  // RENDERIZAR
  // ----------------------------------------------------------

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
                          class="btn-principal btn-comprar-produto"
                          onclick="comprarProdutoCliente('${escapeHTML(
                            produto.id,
                          )}')"
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

// ============================================================
// 12.5 — ATUALIZAR PRODUTOS
// ============================================================

async function atualizarProdutosCliente() {
  await carregarProdutosCliente();
}

// 13. AVALIAÇÕES

// Estado das avaliações do cliente
let avaliacoesCliente = [];

// 13.1 — CARREGAR AVALIAÇÕES DO CLIENTE

async function carregarAvaliacoesCliente() {
  if (!usuarioAtual) {
    return [];
  }

  try {
    // CARREGAR AGENDAMENTOS

    await carregarAgendamentos();

    // BUSCAR AVALIAÇÕES

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

    // RENDERIZAR

    renderizarAvaliacoesPendentes();

    renderizarMeusComentarios();

    return avaliacoesCliente;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar avaliações do cliente", erro);

    avaliacoesCliente = [];

    renderizarAvaliacoesPendentes();

    renderizarMeusComentarios();

    return [];
  }
}

// 13.2 — VERIFICAR SE AGENDAMENTO JÁ FOI AVALIADO

function agendamentoFoiAvaliado(agendamentoId) {
  return avaliacoesCliente.some(
    (avaliacao) => String(avaliacao.agendamento_id) === String(agendamentoId),
  );
}

// 13.3 — OBTER AGENDAMENTOS PENDENTES DE AVALIAÇÃO

function obterAgendamentosPendentesAvaliacao() {
  return agendamentos.filter(
    (agendamento) =>
      agendamento.status === "concluido" &&
      !agendamentoFoiAvaliado(agendamento.id),
  );
}

// 13.4 — RENDERIZAR AVALIAÇÕES PENDENTES

function renderizarAvaliacoesPendentes() {
  const lista = document.getElementById("lista-avaliacoes-pendentes");

  if (!lista) {
    return;
  }

  const pendentes = obterAgendamentosPendentesAvaliacao();

  // NENHUMA PENDENTE

  if (!pendentes.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          ⭐ Você não possui atendimentos pendentes de avaliação.
        </p>

        <small>
          Os atendimentos concluídos aparecerão aqui até
          serem avaliados.
        </small>

      </div>
    `;

    return;
  }

  // RENDERIZAR

  lista.innerHTML = pendentes
    .map((agendamento) => {
      const barbearia = agendamento.barbearias;

      const servico = agendamento.servicos;

      const profissional = agendamento.profissionais;

      return `
            <article
              class="item-avaliacao"
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

              </div>

              <div
                class="avaliacao-formulario"
              >

                <div class="form-campo">

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

                <div class="form-campo">

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

                </div>

                <div
                  class="form-item-botoes"
                >

                  <button
                    type="button"
                    class="btn-principal btn-enviar-avaliacao"
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

// 13.5 — RENDERIZAR MEUS COMENTÁRIOS

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

      </div>
    `;

    return;
  }

  lista.innerHTML = avaliacoesCliente
    .map((avaliacao) => {
      const barbearia = avaliacao.barbearias;

      const nota = Number(avaliacao.nota) || 0;

      const notaLimitada = Math.max(0, Math.min(5, nota));

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

                  <span>
                    ${estrelas}
                  </span>

                </div>

                <small>
                  ${formatarData(avaliacao.created_at)}
                </small>

              </div>

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

// 13.6 — ENVIAR AVALIAÇÃO

async function enviarAvaliacao(agendamentoId) {
  if (!usuarioAtual) {
    mostrarMensagem(
      "mensagem-avaliacao",
      "Sua sessão expirou. Faça login novamente.",
      "erro",
    );

    return;
  }

  if (!agendamentoId) {
    return;
  }

  // LOCALIZAR AGENDAMENTO

  const agendamento = agendamentos.find(
    (item) => String(item.id) === String(agendamentoId),
  );

  if (!agendamento) {
    mostrarMensagem(
      "mensagem-avaliacao",
      "Atendimento não encontrado.",
      "erro",
    );

    return;
  }

  // VERIFICAR STATUS

  if (agendamento.status !== "concluido") {
    mostrarMensagem(
      "mensagem-avaliacao",
      "Você só pode avaliar atendimentos concluídos.",
      "erro",
    );

    return;
  }

  // VERIFICAR DUPLICIDADE

  if (agendamentoFoiAvaliado(agendamentoId)) {
    mostrarMensagem(
      "mensagem-avaliacao",
      "Esse atendimento já foi avaliado.",
      "erro",
    );

    return;
  }

  // CAMPOS

  const campoNota = document.getElementById(`nota-${agendamentoId}`);

  const campoComentario = document.getElementById(
    `comentario-${agendamentoId}`,
  );

  const nota = Number(campoNota?.value);

  const comentario = campoComentario?.value.trim() || null;

  // VALIDAR NOTA

  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    mostrarMensagem(
      "mensagem-avaliacao",
      "Selecione uma nota de 1 a 5 estrelas.",
      "erro",
    );

    campoNota?.focus();

    return;
  }

  try {
    // --------------------------------------------------------
    // BOTÃO
    // --------------------------------------------------------

    const botao = document.querySelector(
      `.btn-enviar-avaliacao[data-agendamento-id="${agendamentoId}"]`,
    );

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Enviando...";
    }

    // --------------------------------------------------------
    // INSERIR AVALIAÇÃO
    // --------------------------------------------------------

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

    console.log("Avaliação criada:", data);

    // --------------------------------------------------------
    // SUCESSO
    // --------------------------------------------------------

    mostrarMensagem(
      "mensagem-avaliacao",
      "Avaliação enviada com sucesso! ⭐",
      "sucesso",
    );

    // --------------------------------------------------------
    // ATUALIZAR TELA
    // --------------------------------------------------------

    await carregarAvaliacoesCliente();
  } catch (erro) {
    mostrarErroConsole("Erro ao enviar avaliação", erro);

    // Mensagem específica para duplicidade
    if (erro?.code === "23505") {
      mostrarMensagem(
        "mensagem-avaliacao",
        "Esse atendimento já possui uma avaliação.",
        "erro",
      );

      await carregarAvaliacoesCliente();

      return;
    }

    mostrarMensagem(
      "mensagem-avaliacao",
      "Não foi possível enviar sua avaliação.",
      "erro",
    );
  } finally {
    const botao = document.querySelector(
      `.btn-enviar-avaliacao[data-agendamento-id="${agendamentoId}"]`,
    );

    if (botao) {
      botao.disabled = false;
      botao.textContent = "⭐ Enviar avaliação";
    }
  }
}

// 13.7 — EVENTOS DAS AVALIAÇÕES

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

// 14. FAVORITOS

// 14.1 — VERIFICAR SE É FAVORITO

function ehFavorito(barbeariaId) {
  if (!barbeariaId) {
    return false;
  }

  return favoritosCliente.some((id) => String(id) === String(barbeariaId));
}

// 14.2 — CARREGAR FAVORITOS

async function carregarFavoritos() {
  if (!usuarioAtual) {
    favoritosCliente = [];

    atualizarTotalFavoritos();

    renderizarBarbearias(barbearias);

    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from("favoritos")
      .select("barbearia_id")
      .eq("cliente_id", usuarioAtual.id);

    if (error) {
      throw error;
    }

    favoritosCliente = (data || [])
      .map((item) => item.barbearia_id)
      .filter(Boolean);

    atualizarTotalFavoritos();

    renderizarBarbearias(barbearias);

    return favoritosCliente;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar favoritos", erro);

    favoritosCliente = [];

    atualizarTotalFavoritos();

    renderizarBarbearias(barbearias);

    return [];
  }
}

// 14.3 — ATUALIZAR CONTADOR

function atualizarTotalFavoritos() {
  const elemento = document.getElementById("total-favoritos");

  if (!elemento) {
    return;
  }

  elemento.textContent = favoritosCliente.length;
}

// 14.4 — ADICIONAR FAVORITO

async function adicionarFavorito(barbeariaId) {
  if (!usuarioAtual) {
    mostrarMensagem(
      "mensagem-agendamento",
      "Sua sessão expirou. Faça login novamente.",
      "erro",
    );

    return false;
  }

  if (!barbeariaId) {
    return false;
  }

  // Já é favorito
  if (ehFavorito(barbeariaId)) {
    return true;
  }

  try {
    const { data, error } = await supabaseClient
      .from("favoritos")
      .insert({
        cliente_id: usuarioAtual.id,

        barbearia_id: barbeariaId,
      })
      .select("barbearia_id");

    if (error) {
      throw error;
    }

    console.log("Favorito adicionado:", data);

    favoritosCliente.push(barbeariaId);

    atualizarTotalFavoritos();

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao adicionar favorito", erro);

    return false;
  }
}

// 14.5 — REMOVER FAVORITO

async function removerFavorito(barbeariaId) {
  if (!usuarioAtual) {
    return false;
  }

  if (!barbeariaId) {
    return false;
  }

  try {
    const { error } = await supabaseClient
      .from("favoritos")
      .delete()
      .eq("cliente_id", usuarioAtual.id)
      .eq("barbearia_id", barbeariaId);

    if (error) {
      throw error;
    }

    favoritosCliente = favoritosCliente.filter(
      (id) => String(id) !== String(barbeariaId),
    );

    atualizarTotalFavoritos();

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao remover favorito", erro);

    return false;
  }
}

// 14.6 — ALTERNAR FAVORITO

async function alternarFavorito(barbeariaId) {
  if (!barbeariaId) {
    return;
  }

  const favoritoAtual = ehFavorito(barbeariaId);

  // REMOVER

  if (favoritoAtual) {
    const sucesso = await removerFavorito(barbeariaId);

    if (!sucesso) {
      alert("Não foi possível remover esta barbearia dos favoritos.");

      return;
    }
  }

  // ADICIONAR
  else {
    const sucesso = await adicionarFavorito(barbeariaId);

    if (!sucesso) {
      alert("Não foi possível adicionar esta barbearia aos favoritos.");

      return;
    }
  }

  // ATUALIZAR TELA

  atualizarTotalFavoritos();

  renderizarBarbearias(barbearias);
}

// 14.7 — RENDERIZAR BARBEARIAS FAVORITAS

function renderizarBarbearias(listaBarbearias, elementoLista = null) {
  const lista = elementoLista || document.getElementById("lista-favoritos");

  if (!lista) {
    return;
  }

  // SOMENTE FAVORITOS

  const favoritas = listaBarbearias.filter((barbearia) =>
    ehFavorito(barbearia.id),
  );

  // NENHUM FAVORITO

  if (!favoritas.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          ❤️ Você ainda não possui barbearias favoritas.
        </p>

        <small>
          Adicione uma barbearia aos favoritos para encontrá-la
          rapidamente aqui.
        </small>

      </div>
    `;

    return;
  }

  // RENDERIZAR

  lista.innerHTML = favoritas
    .map((barbearia) => {
      const logo = barbearia.logo_url || "../assets/barber.png";

      return `
            <article
              class="item-barbearia"
            >

              <div
                class="item-barbearia-imagem"
              >

                <img
                  src="${escapeHTML(logo)}"
                  alt="Logo ${escapeHTML(barbearia.nome || "Barbearia")}"
                  onerror="this.src='../assets/barber.png'"
                />

              </div>


              <div
                class="item-barbearia-conteudo"
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


                ${
                  barbearia.endereco
                    ? `
                      <p>
                        🏠
                        ${escapeHTML(barbearia.endereco)}
                      </p>
                    `
                    : ""
                }


                ${
                  barbearia.telefone
                    ? `
                      <p>
                        📱
                        ${escapeHTML(barbearia.telefone)}
                      </p>
                    `
                    : ""
                }


                <div
                  class="item-barbearia-acoes"
                >

                  <button
                    type="button"
                    class="btn-principal"
                    onclick="selecionarBarbeariaParaAgendamento('${escapeHTML(
                      barbearia.id,
                    )}')"
                  >
                    📅 Agendar
                  </button>


                  <button
                    type="button"
                    class="btn-secundario"
                    onclick="alternarFavorito('${escapeHTML(barbearia.id)}')"
                  >
                    ❤️ Remover
                  </button>

                </div>

              </div>

            </article>
          `;
    })
    .join("");
}

// 14.8 — SELECIONAR BARBEARIA PARA AGENDAMENTO

async function selecionarBarbeariaParaAgendamento(barbeariaId) {
  if (!barbeariaId) {
    return;
  }

  mudarAba("agendamento");

  const select = document.getElementById("agendamento-barbearia");

  if (!select) {
    return;
  }

  // SELECIONAR BARBEARIA

  select.value = barbeariaId;

  // CARREGAR SERVIÇOS

  await carregarServicos(barbeariaId);

  // CARREGAR PROFISSIONAIS

  await carregarProfissionais(barbeariaId);

  // CARREGAR HORÁRIOS

  await carregarHorariosFuncionamento(barbeariaId);

  // CALCULAR HORÁRIOS

  await carregarHorariosDisponiveis();
}

// 14.9 — BUSCAR DENTRO DOS FAVORITOS

function configurarBuscaBarbearia() {
  const campo = document.getElementById("busca-barbearia");

  if (!campo) {
    return;
  }

  campo.addEventListener("input", () => {
    const termo = campo.value.trim().toLowerCase();

    // PRIMEIRO: SOMENTE FAVORITOS

    const listaFavoritos = barbearias.filter((barbearia) =>
      ehFavorito(barbearia.id),
    );

    // SEGUNDO: FILTRAR PELO TEXTO

    const filtradas = listaFavoritos.filter((barbearia) => {
      const texto = [barbearia.nome, barbearia.cidade, barbearia.endereco]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });

    renderizarBarbearias(filtradas);
  });
}

// 15. MEU PERFIL

// 15.1 — SALVAR DADOS DO PERFIL

async function salvarPerfil() {
  if (!usuarioAtual) {
    mostrarMensagem(
      "mensagem-perfil",
      "Sua sessão expirou. Faça login novamente.",
      "erro",
    );

    return;
  }

  const campoNome = document.getElementById("perfil-nome");

  const campoTelefone = document.getElementById("perfil-telefone");

  const nome = campoNome?.value.trim();

  const telefone = campoTelefone?.value.trim();

  // VALIDAR NOME

  if (!nome) {
    mostrarMensagem("mensagem-perfil", "Informe seu nome.", "erro");

    campoNome?.focus();

    return;
  }

  const botao = document.getElementById("btn-salvar-perfil");

  try {
    // BLOQUEAR BOTÃO

    if (botao) {
      botao.disabled = true;
      botao.textContent = "Salvando...";
    }

    // ATUALIZAR PROFILE

    const { data, error } = await supabaseClient
      .from("profiles")
      .update({
        nome,
        telefone: telefone || null,
      })
      .eq("id", usuarioAtual.id)
      .select(
        `
          id,
          nome,
          telefone,
          tipo,
          created_at
        `,
      )
      .single();

    if (error) {
      throw error;
    }

    // ATUALIZAR ESTADO LOCAL

    perfilAtual = data;

    // ATUALIZAR NOME DA TELA INICIAL

    if (nomeCliente) {
      nomeCliente.textContent = nome;
    }

    // MENSAGEM

    mostrarMensagem(
      "mensagem-perfil",
      "Dados atualizados com sucesso! ✅",
      "sucesso",
    );
  } catch (erro) {
    mostrarErroConsole("Erro ao salvar perfil", erro);

    mostrarMensagem(
      "mensagem-perfil",
      "Não foi possível atualizar seus dados.",
      "erro",
    );
  } finally {
    // RESTAURAR BOTÃO

    if (botao) {
      botao.disabled = false;
      botao.textContent = "Salvar dados";
    }
  }
}

// 15.2 — ALTERAR SENHA

async function alterarSenha() {
  if (!usuarioAtual) {
    mostrarMensagem(
      "mensagem-perfil",
      "Sua sessão expirou. Faça login novamente.",
      "erro",
    );

    return;
  }

  // NOVA SENHA

  const novaSenha = prompt("Digite sua nova senha:");

  if (novaSenha === null) {
    return;
  }

  // VALIDAR TAMANHO

  if (novaSenha.length < 6) {
    alert("A senha precisa ter pelo menos 6 caracteres.");

    return;
  }

  // CONFIRMAR SENHA

  const confirmar = prompt("Digite novamente a nova senha:");

  if (confirmar === null) {
    return;
  }

  if (confirmar !== novaSenha) {
    alert("As senhas não são iguais.");

    return;
  }

  try {
    // ATUALIZAR SENHA NO SUPABASE AUTH

    const { error } = await supabaseClient.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      throw error;
    }

    // SUCESSO

    mostrarMensagem(
      "mensagem-perfil",
      "Senha alterada com sucesso! 🔐",
      "sucesso",
    );
  } catch (erro) {
    mostrarErroConsole("Erro ao alterar senha", erro);

    mostrarMensagem(
      "mensagem-perfil",
      "Não foi possível alterar sua senha.",
      "erro",
    );
  }
}

// 16. NAVEGAÇÃO

// 16.1 — MUDAR ABA

function mudarAba(aba) {
  // VALIDAR ABA

  if (!aba) {
    return;
  }

  // ESCONDER TODAS AS SESSÕES

  const conteudos = document.querySelectorAll(".painel-conteudo");

  conteudos.forEach((conteudo) => {
    conteudo.classList.add("oculto");
  });

  // MOSTRAR SESSÃO SELECIONADA

  const conteudoAtivo = document.getElementById(`conteudo-${aba}`);

  if (conteudoAtivo) {
    conteudoAtivo.classList.remove("oculto");
  }

  // ATUALIZAR MENU DESKTOP

  document.querySelectorAll(".menu-item[data-aba]").forEach((item) => {
    item.classList.toggle("ativo", item.dataset.aba === aba);
  });

  // ATUALIZAR MENU MOBILE INFERIOR

  document.querySelectorAll(".mobile-bottom-item[data-aba]").forEach((item) => {
    item.classList.toggle("ativo", item.dataset.aba === aba);

    item.classList.toggle(
      "mobile-bottom-item--ativo",
      item.dataset.aba === aba,
    );
  });

  // TÍTULO E DESCRIÇÃO

  const titulo = document.getElementById("titulo-painel");

  const descricao = document.getElementById("descricao-painel");

  const dadosAbas = {
    inicio: {
      titulo: "Início",
      descricao: "Acompanhe sua conta e seus próximos horários.",
    },

    agendamento: {
      titulo: "Agendar horário",
      descricao: "Escolha a barbearia, serviço, profissional e horário.",
    },

    agendamentos: {
      titulo: "Meus agendamentos",
      descricao: "Consulte seus horários marcados no BarberHub.",
    },

    notificacoes: {
      titulo: "Notificações",
      descricao:
        "Acompanhe novidades, confirmações e atualizações dos seus agendamentos.",
    },

    produtos: {
      titulo: "Ver produtos",
      descricao: "Veja os produtos disponíveis nas suas barbearias.",
    },

    avaliacoes: {
      titulo: "Avaliações",
      descricao: "Avalie seus atendimentos e acompanhe seus comentários.",
    },

    favoritos: {
      titulo: "Favoritos",
      descricao: "Encontre rapidamente suas barbearias favoritas.",
    },

    perfil: {
      titulo: "Meu perfil",
      descricao: "Consulte e altere seus dados pessoais.",
    },
  };

  const dados = dadosAbas[aba];

  if (dados) {
    if (titulo) {
      titulo.textContent = dados.titulo;
    }

    if (descricao) {
      descricao.textContent = dados.descricao;
    }
  }

  // CARREGAR DADOS DA SESSÃO

  switch (aba) {
    // INÍCIO

    case "inicio":
      carregarDashboard();
      break;

    // AGENDAMENTO

    case "agendamento":
      carregarDadosAgendamento();
      break;

    // MEUS AGENDAMENTOS

    case "agendamentos":
      carregarAgendamentos();
      break;

    // NOTIFICAÇÕES

    case "notificacoes":
      carregarNotificacoesCliente();
      break;

    // PRODUTOS

    case "produtos":
      carregarProdutosCliente();
      break;

    // AVALIAÇÕES

    case "avaliacoes":
      carregarAvaliacoesCliente();
      break;

    // FAVORITOS

    case "favoritos":
      carregarFavoritos();
      break;

    // PERFIL

    case "perfil":
      carregarCliente();
      break;

    default:
      console.warn(`[BarberHub] Aba não reconhecida: ${aba}`);
      break;
  }

  // FECHAR MENU MOBILE

  fecharMenuMobile();
}

// 17. MENU MOBILE

// 17.1 — ABRIR MENU MOBILE

function abrirMenuMobile() {
  const menu = document.getElementById("menu-mobile");

  const botao = document.getElementById("btn-menu-mobile");

  if (menu) {
    menu.classList.add("aberto");
  }

  if (botao) {
    botao.setAttribute("aria-expanded", "true");
  }
}

// 17.2 — FECHAR MENU MOBILE

function fecharMenuMobile() {
  const menu = document.getElementById("menu-mobile");

  const botao = document.getElementById("btn-menu-mobile");

  if (menu) {
    menu.classList.remove("aberto");
  }

  if (botao) {
    botao.setAttribute("aria-expanded", "false");
  }
}

// 17.3 — ALTERNAR MENU MOBILE

function alternarMenuMobile() {
  const menu = document.getElementById("menu-mobile");

  if (!menu) {
    return;
  }

  if (menu.classList.contains("aberto")) {
    fecharMenuMobile();
  } else {
    abrirMenuMobile();
  }
}

// 18. EVENTOS

// 18.1 — CONFIGURAR EVENTOS

function configurarEventos() {
  // 18.2 — MENU MOBILE

  const btnMenuMobile = document.getElementById("btn-menu-mobile");

  if (btnMenuMobile) {
    btnMenuMobile.addEventListener("click", alternarMenuMobile);
  }

  const btnMenuBottom = document.getElementById("btn-menu-bottom");

  if (btnMenuBottom) {
    btnMenuBottom.addEventListener("click", alternarMenuMobile);
  }

  const btnFecharMenu = document.getElementById("btn-fechar-menu");

  if (btnFecharMenu) {
    btnFecharMenu.addEventListener("click", fecharMenuMobile);
  }

  // 18.3 — FECHAR MENU AO CLICAR FORA

  document.addEventListener("click", (evento) => {
    const menu = document.getElementById("menu-mobile");

    const botao = document.getElementById("btn-menu-mobile");

    if (!menu) {
      return;
    }

    if (
      menu.classList.contains("aberto") &&
      !menu.contains(evento.target) &&
      !botao?.contains(evento.target)
    ) {
      fecharMenuMobile();
    }
  });

  // 18.4 — SELECIONAR BARBEARIA

  const selectBarbearia = document.getElementById("agendamento-barbearia");

  if (selectBarbearia) {
    selectBarbearia.addEventListener("change", async () => {
      const barbeariaId = selectBarbearia.value;

      const selectServico = document.getElementById("agendamento-servico");

      const selectProfissional = document.getElementById(
        "agendamento-profissional",
      );

      const selectHorario = document.getElementById("agendamento-horario");

      // LIMPAR SERVIÇO

      if (selectServico) {
        selectServico.value = "";
      }

      // LIMPAR PROFISSIONAL

      if (selectProfissional) {
        selectProfissional.value = "";
      }

      // LIMPAR HORÁRIO

      if (selectHorario) {
        limparHorarios();

        selectHorario.disabled = true;
      }

      // NENHUMA BARBEARIA

      if (!barbeariaId) {
        return;
      }

      try {
        // SERVIÇOS

        await carregarServicos(barbeariaId);

        // PROFISSIONAIS

        await carregarProfissionais(barbeariaId);

        // HORÁRIOS

        await carregarHorariosFuncionamento(barbeariaId);

        // LIMPAR MENSAGEM

        limparMensagem("mensagem-agendamento");
      } catch (erro) {
        mostrarErroConsole("Erro ao atualizar dados da barbearia", erro);

        mostrarMensagem(
          "mensagem-agendamento",
          "Não foi possível carregar os dados desta barbearia.",
          "erro",
        );
      }
    });
  }

  // 18.5 — SELECIONAR SERVIÇO

  const selectServico = document.getElementById("agendamento-servico");

  if (selectServico) {
    selectServico.addEventListener("change", carregarHorariosDisponiveis);
  }

  // 18.6 — SELECIONAR PROFISSIONAL

  const selectProfissional = document.getElementById(
    "agendamento-profissional",
  );

  if (selectProfissional) {
    selectProfissional.addEventListener("change", carregarHorariosDisponiveis);
  }

  // 18.7 — SELECIONAR DATA

  const campoData = document.getElementById("agendamento-data");

  if (campoData) {
    campoData.addEventListener("change", carregarHorariosDisponiveis);
  }

  // 18.8 — CONFIRMAR AGENDAMENTO

  const botaoAgendamento = document.getElementById("btn-confirmar-agendamento");

  if (botaoAgendamento) {
    botaoAgendamento.addEventListener("click", confirmarAgendamento);
  }

  // 18.9 — CANCELAR AGENDAMENTO

  const listaAgendamentos = document.getElementById("lista-meus-agendamentos");

  if (listaAgendamentos) {
    listaAgendamentos.addEventListener("click", (evento) => {
      const botao = evento.target.closest(".btn-cancelar-agendamento");

      if (!botao) {
        return;
      }

      const id = botao.dataset.id;

      cancelarAgendamento(id);
    });
  }

  // 18.10 — FILTROS DE AGENDAMENTOS

  document
    .querySelectorAll("#conteudo-agendamentos [data-filtro]")
    .forEach((botao) => {
      botao.addEventListener("click", () => {
        const filtro = botao.dataset.filtro;

        if (!filtro) {
          return;
        }

        filtroAgendamentosAtual = filtro;

        // REMOVER ATIVO DOS FILTROS

        document
          .querySelectorAll("#conteudo-agendamentos [data-filtro]")
          .forEach((item) => {
            item.classList.remove("ativo");
          });

        // ATIVAR FILTRO CLICADO

        botao.classList.add("ativo");

        // RENDERIZAR

        renderizarAgendamentos();
      });
    });

  // 18.11 — NOTIFICAÇÕES

  configurarEventosNotificacoes();

  // 18.12 — AVALIAÇÕES

  configurarEventosAvaliacoes();

  // 18.13 — FORMULÁRIO DE PERFIL

  const formularioPerfil = document.getElementById("form-perfil");

  if (formularioPerfil) {
    formularioPerfil.addEventListener("submit", (evento) => {
      evento.preventDefault();

      salvarPerfil();
    });
  }

  // 18.14 — ALTERAR SENHA

  const botaoSenha = document.getElementById("btn-alterar-senha");

  if (botaoSenha) {
    botaoSenha.addEventListener("click", alterarSenha);
  }

  // 18.15 — BUSCA DE FAVORITOS

  configurarBuscaBarbearia();
}

// 19. SAIR

// 19.1 — ENCERRAR SESSÃO

async function sair() {
  try {
    mostrarTelaCarregamento();

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }
  } catch (erro) {
    mostrarErroConsole("Erro ao sair", erro);
  } finally {
    window.location.href = CONFIG.LOGIN_URL;
  }
}

// 20. INICIALIZAÇÃO

// 20.1 — INICIAR PÁGINA

async function iniciarPagina() {
  try {
    // MOSTRAR CARREGAMENTO

    mostrarTelaCarregamento();

    // VERIFICAR SESSÃO

    const sessao = await verificarSessao();

    if (!sessao) {
      return;
    }

    // CARREGAR PERFIL

    await carregarCliente();

    // CARREGAR BARBEARIAS

    await carregarBarbearias();

    // CARREGAR FAVORITOS

    await carregarFavoritos();

    // CONFIGURAR EVENTOS

    configurarEventos();

    // CONFIGURAR DATA MÍNIMA

    const campoData = document.getElementById("agendamento-data");

    if (campoData) {
      campoData.min = obterDataMinima();
    }

    // GARANTIR FILTRO PADRÃO

    filtroAgendamentosAtual = "proximos";

    // ABRIR INÍCIO

    mudarAba("inicio");

    // ATUALIZAR CONTADOR DE FAVORITOS

    atualizarTotalFavoritos();
  } catch (erro) {
    mostrarErroConsole("Erro ao iniciar painel do cliente", erro);

    mostrarMensagem(
      "mensagem-agendamento",
      "Ocorreu um erro ao carregar o painel.",
      "erro",
    );
  } finally {
    // ESCONDER CARREGAMENTO

    esconderTelaCarregamento();
  }
}

// 20.2 — INICIAR QUANDO O HTML ESTIVER PRONTO

document.addEventListener("DOMContentLoaded", iniciarPagina);

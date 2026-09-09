// BARBERHUB — PAINEL DO CLIENTE

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

// ELEMENTOS

const telaCarregamento = document.getElementById("tela-carregamento");
const nomeCliente = document.getElementById("nome-cliente");

// ESTADO

let usuarioAtual = null;
let perfilAtual = null;

let barbearias = [];
let servicos = [];
let profissionais = [];
let agendamentos = [];
let horariosFuncionamento = [];

let filtroAgendamentosAtual = "proximos";

// HELPERS

function escapeHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mostrarMensagem(elementoId, mensagem, tipo = "info") {
  const elemento = document.getElementById(elementoId);

  if (!elemento) return;

  elemento.textContent = mensagem;
  elemento.className = `mensagem mensagem-${tipo}`;
}

function limparMensagem(elementoId) {
  const elemento = document.getElementById(elementoId);

  if (!elemento) return;

  elemento.textContent = "";
  elemento.className = "mensagem";
}

function formatarPreco(valor) {
  const numero = Number(valor) || 0;

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data) {
  if (!data) return "-";

  // Evita problemas de fuso horário para YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) return "-";

  return dataObj.toLocaleDateString("pt-BR");
}

function formatarHora(data) {
  if (!data) return "-";

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) return "-";

  return dataObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDataHora(data) {
  if (!data) return "-";

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) return "-";

  return dataObj.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function obterDataMinima() {
  const agora = new Date();

  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function mostrarErroConsole(contexto, erro) {
  console.error(`[BarberHub] ${contexto}:`, erro);
}

function minutosParaHora(minutos) {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function horaParaMinutos(hora) {
  if (!hora) return null;

  const partes = String(hora).substring(0, 5).split(":");

  if (partes.length !== 2) return null;

  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);

  if (Number.isNaN(horas) || Number.isNaN(minutos)) {
    return null;
  }

  return horas * 60 + minutos;
}

function criarDataLocal(data, hora) {
  return new Date(`${data}T${hora}:00`);
}

function formatarTelefoneWhatsApp(telefone) {
  if (!telefone) return null;

  let numero = String(telefone).replace(/\D/g, "");

  if (!numero) return null;

  // Brasil
  if (!numero.startsWith("55")) {
    numero = `55${numero}`;
  }

  return numero;
}

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

// TELA DE CARREGAMENTO

function esconderTelaCarregamento() {
  if (!telaCarregamento) return;

  telaCarregamento.classList.add("tela-carregamento--oculta");
}

function mostrarTelaCarregamento() {
  if (!telaCarregamento) return;

  telaCarregamento.classList.remove("tela-carregamento--oculta");
}

// SESSÃO

async function verificarSessao() {
  try {
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session) {
      window.location.href = CONFIG.LOGIN_URL;
      return false;
    }

    usuarioAtual = session.user;

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao verificar sessão", erro);

    window.location.href = CONFIG.LOGIN_URL;

    return false;
  }
}

// CLIENTE / PERFIL

async function carregarCliente() {
  if (!usuarioAtual) return;

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

    perfilAtual = data;

    const nome = data?.nome || usuarioAtual.email?.split("@")[0] || "Cliente";

    if (nomeCliente) {
      nomeCliente.textContent = nome;
    }

    const campoNome = document.getElementById("perfil-nome");

    const campoTelefone = document.getElementById("perfil-telefone");

    const campoEmail = document.getElementById("perfil-email");

    if (campoNome) {
      campoNome.value = data?.nome || "";
    }

    if (campoTelefone) {
      campoTelefone.value = data?.telefone || "";
    }

    if (campoEmail) {
      campoEmail.value = usuarioAtual.email || "";
    }
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar cliente", erro);
  }
}

// NAVEGAÇÃO

function mudarAba(aba) {
  const conteudos = document.querySelectorAll(".painel-conteudo");

  conteudos.forEach((conteudo) => {
    conteudo.classList.add("oculto");
  });

  const conteudoAtivo = document.getElementById(`conteudo-${aba}`);

  if (conteudoAtivo) {
    conteudoAtivo.classList.remove("oculto");
  }

  document
    .querySelectorAll(".menu-item[data-aba], .mobile-bottom-item[data-aba]")
    .forEach((item) => {
      item.classList.toggle("ativo", item.dataset.aba === aba);

      item.classList.toggle(
        "mobile-bottom-item--ativo",
        item.dataset.aba === aba,
      );
    });

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

  fecharMenuMobile();

  // Carregamento da aba
  if (aba === "inicio") {
    carregarDashboard();
  }

  if (aba === "agendamento") {
    carregarDadosAgendamento();
  }

  if (aba === "agendamentos") {
    carregarAgendamentos();
  }

  if (aba === "favoritos") {
    carregarFavoritos();
  }

  if (aba === "perfil") {
    carregarCliente();
  }
}

// MENU MOBILE

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

function alternarMenuMobile() {
  const menu = document.getElementById("menu-mobile");

  if (!menu) return;

  if (menu.classList.contains("aberto")) {
    fecharMenuMobile();
  } else {
    abrirMenuMobile();
  }
}

// BARBEARIAS

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

function preencherSelectBarbearias() {
  const select = document.getElementById("agendamento-barbearia");

  if (!select) return;

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

// SERVIÇOS

async function carregarServicos(barbeariaId) {
  const select = document.getElementById("agendamento-servico");

  servicos = [];

  if (!select) return;

  select.innerHTML = '<option value="">Carregando serviços...</option>';

  select.disabled = true;

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
        duracao_minutos
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

      const duracao = Number(servico.duracao_minutos) || 30;

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

// PROFISSIONAIS

async function carregarProfissionais(barbeariaId) {
  const select = document.getElementById("agendamento-profissional");

  profissionais = [];

  if (!select) return;

  select.innerHTML = '<option value="">Carregando profissionais...</option>';

  select.disabled = true;

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

// HORÁRIOS DE FUNCIONAMENTO

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

function obterHorarioDoDia(diaSemana) {
  return (
    horariosFuncionamento.find(
      (horario) => Number(horario.dia_semana) === Number(diaSemana),
    ) || null
  );
}

// AGENDAMENTO

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

function limparHorarios() {
  const select = document.getElementById("agendamento-horario");

  if (!select) return;

  select.innerHTML = '<option value="">Selecione um horário</option>';
}

function mostrarCarregandoHorarios() {
  const select = document.getElementById("agendamento-horario");

  if (!select) return;

  select.innerHTML = '<option value="">Calculando horários...</option>';

  select.disabled = true;
}

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
        duracao_minutos
      )
    `,
    )
    .eq("barbearia_id", barbeariaId)
    .in("status", CONFIG.STATUS_BLOQUEIAM_HORARIO)
    .gte("data_hora", inicioDia)
    .lte("data_hora", fimDia);

  // Se o cliente escolheu um profissional,
  // verifica apenas os horários daquele profissional.
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

function horariosSeSobrepoem(inicioA, fimA, inicioB, fimB) {
  return inicioA < fimB && fimA > inicioB;
}

function horarioDentroDoIntervalo(inicio, fim, intervaloInicio, intervaloFim) {
  if (intervaloInicio === null || intervaloFim === null) {
    return false;
  }

  return horariosSeSobrepoem(inicio, fim, intervaloInicio, intervaloFim);
}

function slotEstaOcupado(inicioSlot, fimSlot, agendamentosExistentes) {
  return agendamentosExistentes.some((agendamento) => {
    const inicioExistente = new Date(agendamento.data_hora);

    const duracaoExistente =
      Number(agendamento.servicos?.duracao_minutos) || 30;

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

  const duracao = Number(servico.duracao_minutos) || 30;

  try {
    mostrarCarregandoHorarios();

    if (!horariosFuncionamento.length) {
      await carregarHorariosFuncionamento(barbeariaId);
    }

    const dataSelecionada = criarDataLocal(data, "12:00");

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

    const abertura = horaParaMinutos(horarioFuncionamento.hora_abertura);

    const fechamento = horaParaMinutos(horarioFuncionamento.hora_fechamento);

    if (abertura === null || fechamento === null) {
      throw new Error("Horário de funcionamento inválido.");
    }

    let intervaloInicio = null;
    let intervaloFim = null;

    if (
      horarioFuncionamento.intervalo_inicio &&
      horarioFuncionamento.intervalo_fim
    ) {
      intervaloInicio = horaParaMinutos(horarioFuncionamento.intervalo_inicio);

      intervaloFim = horaParaMinutos(horarioFuncionamento.intervalo_fim);
    }

    const agendamentosExistentes = await buscarAgendamentosDoDia(
      barbeariaId,
      profissionalId,
      data,
    );

    const agora = new Date();

    const opcoes = [];

    for (
      let inicio = abertura;
      inicio + duracao <= fechamento;
      inicio += CONFIG.INTERVALO_SLOTS_MINUTOS
    ) {
      const fim = inicio + duracao;

      // Não permite marcar durante o intervalo
      if (
        horarioDentroDoIntervalo(inicio, fim, intervaloInicio, intervaloFim)
      ) {
        continue;
      }

      const hora = minutosParaHora(inicio);

      const dataHora = criarDataLocal(data, hora);

      // Não permite horários no passado
      if (dataHora <= agora) {
        continue;
      }

      const fimDataHora = new Date(dataHora.getTime() + duracao * 60 * 1000);

      // Não permite conflito
      if (slotEstaOcupado(dataHora, fimDataHora, agendamentosExistentes)) {
        continue;
      }

      opcoes.push({
        hora,
        dataHora,
      });
    }

    limparHorarios();

    if (!opcoes.length) {
      mostrarMensagem(
        "mensagem-agendamento",
        "Não existem horários disponíveis para essa data.",
        "info",
      );

      return;
    }

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

// VERIFICAÇÃO FINAL DO HORÁRIO

async function verificarHorarioDisponivel(
  barbeariaId,
  profissionalId,
  dataHora,
  duracaoMinutos,
) {
  try {
    const data = `${dataHora.getFullYear()}-${String(
      dataHora.getMonth() + 1,
    ).padStart(2, "0")}-${String(dataHora.getDate()).padStart(2, "0")}`;

    if (!horariosFuncionamento.length) {
      await carregarHorariosFuncionamento(barbeariaId);
    }

    const horario = obterHorarioDoDia(dataHora.getDay());

    if (!horario || !horario.aberto) {
      return {
        disponivel: false,
        mensagem: "A barbearia está fechada neste dia.",
      };
    }

    const inicioMin = dataHora.getHours() * 60 + dataHora.getMinutes();

    const fimMin = inicioMin + duracaoMinutos;

    const abertura = horaParaMinutos(horario.hora_abertura);

    const fechamento = horaParaMinutos(horario.hora_fechamento);

    if (inicioMin < abertura || fimMin > fechamento) {
      return {
        disponivel: false,
        mensagem: "Esse horário está fora do funcionamento da barbearia.",
      };
    }

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

    const existentes = await buscarAgendamentosDoDia(
      barbeariaId,
      profissionalId,
      data,
    );

    const fimDataHora = new Date(
      dataHora.getTime() + duracaoMinutos * 60 * 1000,
    );

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

// WHATSAPP DO AGENDAMENTO

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
⏱️ Duração: ${Number(servico.duracao_minutos) || 30} minutos
💇 Profissional: ${nomeProfissional}
📅 Data: ${formatarData(data)}
🕐 Horário: ${horario}

Status: Pendente

Agendamento realizado pelo BarberHub.`;
}

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
  // manda para o dono/barbearia.
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

// CONFIRMAR AGENDAMENTO

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

  const duracao = Number(servico.duracao_minutos) || 30;

  const dataHora = criarDataLocal(data, horario);

  if (Number.isNaN(dataHora.getTime())) {
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
      "Verificando disponibilidade...",
      "info",
    );

    // Segunda verificação imediatamente antes
    // de salvar no banco.
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

    mostrarMensagem(
      "mensagem-agendamento",
      "Agendamento realizado com sucesso! 🎉",
      "sucesso",
    );

    // WHATSAPP

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

    // Limpa formulário
    selectServico.value = "";
    selectProfissional.value = "";
    campoData.value = "";
    limparHorarios();

    // Atualiza dados
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

// MEUS AGENDAMENTOS

async function carregarAgendamentos() {
  if (!usuarioAtual) return [];

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
            duracao_minutos
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

// STATUS

function textoStatus(status) {
  const statusMap = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  return statusMap[status] || status || "Indefinido";
}

// RENDER AGENDAMENTOS

function renderizarAgendamentos() {
  const lista = document.getElementById("lista-meus-agendamentos");

  if (!lista) return;

  const agora = new Date();

  let listaFiltrada = [...agendamentos];

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

  if (filtroAgendamentosAtual === "cancelados") {
    listaFiltrada = listaFiltrada.filter(
      (agendamento) => agendamento.status === "cancelado",
    );
  }

  if (!listaFiltrada.length) {
    lista.innerHTML = `
      <div class="lista-vazia">
        <p>Nenhum agendamento encontrado.</p>
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

      const podeCancelar =
        (agendamento.status === "pendente" ||
          agendamento.status === "confirmado") &&
        data > new Date();

      return `
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

              <span class="status status-${escapeHTML(agendamento.status)}">
                ${escapeHTML(textoStatus(agendamento.status))}
              </span>

            </div>

            <div class="item-agendamento-detalhes">

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
                ${Number(servico?.duracao_minutos) || 30}
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
                  <div class="item-agendamento-acoes">

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

// CANCELAR AGENDAMENTO

async function cancelarAgendamento(id) {
  if (!id) return;

  const agendamento = agendamentos.find(
    (item) => String(item.id) === String(id),
  );

  if (!agendamento) {
    return;
  }

  if (!["pendente", "confirmado"].includes(agendamento.status)) {
    mostrarMensagem(
      "mensagem-agendamento",
      "Esse agendamento não pode mais ser cancelado.",
      "erro",
    );

    return;
  }

  const data = new Date(agendamento.data_hora);

  if (data <= new Date()) {
    alert("Não é possível cancelar um horário que já passou.");

    return;
  }

  const confirmou = confirm(
    "Tem certeza que deseja cancelar este agendamento?",
  );

  if (!confirmou) return;

  try {
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

    await carregarAgendamentos();

    alert("Agendamento cancelado com sucesso.");
  } catch (erro) {
    mostrarErroConsole("Erro ao cancelar agendamento", erro);

    alert("Não foi possível cancelar o agendamento.");
  }
}

// DASHBOARD

async function carregarDashboard() {
  if (!usuarioAtual) return;

  await carregarAgendamentos();

  atualizarTotalFavoritos();
}

function atualizarResumoDashboard() {
  const total = document.getElementById("total-agendamentos");

  const proximo = document.getElementById("proximo-agendamento");

  const agora = new Date();

  const validos = agendamentos.filter(
    (agendamento) => agendamento.status !== "cancelado",
  );

  if (total) {
    total.textContent = validos.length;
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

  const proximoAgendamento = proximos[0];

  if (proximo) {
    if (proximoAgendamento) {
      proximo.textContent = formatarDataHora(proximoAgendamento.data_hora);
    } else {
      proximo.textContent = "Nenhum";
    }
  }

  renderizarProximoAgendamento(proximoAgendamento);
}

function renderizarProximoAgendamento(agendamento) {
  const card = document.getElementById("card-proximo-agendamento");

  if (!card) return;

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

        <span class="status status-${escapeHTML(agendamento.status)}">
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

// FAVORITOS

function obterChaveFavoritos() {
  if (!usuarioAtual) {
    return null;
  }

  return `barberhub_favoritos_${usuarioAtual.id}`;
}

function obterFavoritosLocal() {
  const chave = obterChaveFavoritos();

  if (!chave) return [];

  try {
    const favoritos = localStorage.getItem(chave);

    if (!favoritos) {
      return [];
    }

    const lista = JSON.parse(favoritos);

    return Array.isArray(lista) ? lista : [];
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar favoritos", erro);

    return [];
  }
}

function salvarFavoritosLocal(favoritos) {
  const chave = obterChaveFavoritos();

  if (!chave) return;

  try {
    localStorage.setItem(chave, JSON.stringify(favoritos));
  } catch (erro) {
    mostrarErroConsole("Erro ao salvar favoritos", erro);
  }
}

function ehFavorito(barbeariaId) {
  const favoritos = obterFavoritosLocal();

  return favoritos.some((id) => String(id) === String(barbeariaId));
}

function alternarFavorito(barbeariaId) {
  let favoritos = obterFavoritosLocal();

  const existe = favoritos.some((id) => String(id) === String(barbeariaId));

  if (existe) {
    favoritos = favoritos.filter((id) => String(id) !== String(barbeariaId));
  } else {
    favoritos.push(barbeariaId);
  }

  salvarFavoritosLocal(favoritos);

  atualizarTotalFavoritos();

  renderizarBarbearias(barbearias);
}

function atualizarTotalFavoritos() {
  const elemento = document.getElementById("total-favoritos");

  if (!elemento) return;

  elemento.textContent = obterFavoritosLocal().length;
}

async function carregarFavoritos() {
  if (!barbearias.length) {
    await carregarBarbearias();
  }

  renderizarBarbearias(barbearias);

  atualizarTotalFavoritos();
}

// RENDER BARBEARIAS

function renderizarBarbearias(listaBarbearias, elementoLista = null) {
  const lista = elementoLista || document.getElementById("lista-favoritos");

  if (!lista) return;

  const favoritos = obterFavoritosLocal();

  const favoritas = listaBarbearias.filter((barbearia) =>
    favoritos.some((id) => String(id) === String(barbearia.id)),
  );

  if (!favoritas.length) {
    lista.innerHTML = `
      <div class="lista-vazia">
        <p>
          Você ainda não possui barbearias favoritas.
        </p>

        <p>
          Use a busca para encontrar uma barbearia.
        </p>
      </div>
    `;

    return;
  }

  lista.innerHTML = favoritas
    .map((barbearia) => {
      const logo = barbearia.logo_url || "../assets/barber.png";

      return `
          <article class="item-barbearia">

            <div class="item-barbearia-imagem">

              <img
                src="${escapeHTML(logo)}"
                alt="Logo ${escapeHTML(barbearia.nome)}"
                onerror="this.src='../assets/barber.png'"
              />

            </div>

            <div class="item-barbearia-conteudo">

              <h3>
                ${escapeHTML(barbearia.nome)}
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

              <div class="item-barbearia-acoes">

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

// SELECIONAR BARBEARIA PELOS FAVORITOS

async function selecionarBarbeariaParaAgendamento(barbeariaId) {
  mudarAba("agendamento");

  const select = document.getElementById("agendamento-barbearia");

  if (!select) return;

  select.value = barbeariaId;

  await carregarServicos(barbeariaId);

  await carregarProfissionais(barbeariaId);

  await carregarHorariosFuncionamento(barbeariaId);

  await carregarHorariosDisponiveis();
}

// BUSCA DE BARBEARIAS

function configurarBuscaBarbearia() {
  const campo = document.getElementById("busca-barbearia");

  if (!campo) return;

  campo.addEventListener("input", () => {
    const termo = campo.value.trim().toLowerCase();

    const favoritos = obterFavoritosLocal();

    const listaFavoritos = barbearias.filter((barbearia) =>
      favoritos.some((id) => String(id) === String(barbearia.id)),
    );

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

// PERFIL

async function salvarPerfil() {
  if (!usuarioAtual) return;

  const nome = document.getElementById("perfil-nome")?.value.trim();

  const telefone = document.getElementById("perfil-telefone")?.value.trim();

  if (!nome) {
    mostrarMensagem("mensagem-perfil", "Informe seu nome.", "erro");

    return;
  }

  const botao = document.getElementById("btn-salvar-perfil");

  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Salvando...";
    }

    const { data, error } = await supabaseClient
      .from("profiles")
      .update({
        nome,
        telefone,
      })
      .eq("id", usuarioAtual.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    perfilAtual = data;

    if (nomeCliente) {
      nomeCliente.textContent = nome;
    }

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
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Salvar dados";
    }
  }
}

// ALTERAR SENHA

async function alterarSenha() {
  const novaSenha = prompt("Digite sua nova senha:");

  if (novaSenha === null) {
    return;
  }

  if (novaSenha.length < 6) {
    alert("A senha precisa ter pelo menos 6 caracteres.");

    return;
  }

  const confirmar = prompt("Digite novamente a nova senha:");

  if (confirmar !== novaSenha) {
    alert("As senhas não são iguais.");

    return;
  }

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      throw error;
    }

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

// SAIR

async function sair() {
  try {
    await supabaseClient.auth.signOut();
  } catch (erro) {
    mostrarErroConsole("Erro ao sair", erro);
  } finally {
    window.location.href = CONFIG.LOGIN_URL;
  }
}

// EVENTOS

function configurarEventos() {
  // ----------------------------------------------
  // MENU MOBILE
  // ----------------------------------------------

  const btnMenuMobile = document.getElementById("btn-menu-mobile");

  if (btnMenuMobile) {
    btnMenuMobile.addEventListener("click", alternarMenuMobile);
  }

  const btnMenuBottom = document.getElementById("btn-menu-bottom");

  if (btnMenuBottom) {
    btnMenuBottom.addEventListener("click", alternarMenuMobile);
  }

  document.addEventListener("click", (evento) => {
    const menu = document.getElementById("menu-mobile");

    const botao = document.getElementById("btn-menu-mobile");

    if (!menu) return;

    if (
      menu.classList.contains("aberto") &&
      !menu.contains(evento.target) &&
      !botao?.contains(evento.target)
    ) {
      fecharMenuMobile();
    }
  });

  // ----------------------------------------------
  // BARBEARIA
  // ----------------------------------------------

  const selectBarbearia = document.getElementById("agendamento-barbearia");

  if (selectBarbearia) {
    selectBarbearia.addEventListener("change", async () => {
      const barbeariaId = selectBarbearia.value;

      const selectServico = document.getElementById("agendamento-servico");

      const selectProfissional = document.getElementById(
        "agendamento-profissional",
      );

      const selectHorario = document.getElementById("agendamento-horario");

      if (selectServico) {
        selectServico.value = "";
      }

      if (selectProfissional) {
        selectProfissional.value = "";
      }

      if (selectHorario) {
        limparHorarios();
      }

      if (!barbeariaId) {
        return;
      }

      await carregarServicos(barbeariaId);

      await carregarProfissionais(barbeariaId);

      await carregarHorariosFuncionamento(barbeariaId);
    });
  }

  // ----------------------------------------------
  // SERVIÇO
  // ----------------------------------------------

  const selectServico = document.getElementById("agendamento-servico");

  if (selectServico) {
    selectServico.addEventListener("change", carregarHorariosDisponiveis);
  }

  // ----------------------------------------------
  // PROFISSIONAL
  // ----------------------------------------------

  const selectProfissional = document.getElementById(
    "agendamento-profissional",
  );

  if (selectProfissional) {
    selectProfissional.addEventListener("change", carregarHorariosDisponiveis);
  }

  // ----------------------------------------------
  // DATA
  // ----------------------------------------------

  const campoData = document.getElementById("agendamento-data");

  if (campoData) {
    campoData.addEventListener("change", carregarHorariosDisponiveis);
  }

  // ----------------------------------------------
  // CONFIRMAR AGENDAMENTO
  // ----------------------------------------------

  const botaoAgendamento = document.getElementById("btn-confirmar-agendamento");

  if (botaoAgendamento) {
    botaoAgendamento.addEventListener("click", confirmarAgendamento);
  }

  // ----------------------------------------------
  // CANCELAR AGENDAMENTO
  // ----------------------------------------------

  const listaAgendamentos = document.getElementById("lista-meus-agendamentos");

  if (listaAgendamentos) {
    listaAgendamentos.addEventListener("click", (evento) => {
      const botao = evento.target.closest(".btn-cancelar-agendamento");

      if (!botao) return;

      const id = botao.dataset.id;

      cancelarAgendamento(id);
    });
  }

  // ----------------------------------------------
  // FILTROS
  // ----------------------------------------------

  document.querySelectorAll("[data-filtro]").forEach((botao) => {
  botao.addEventListener("click", () => {
    filtroAgendamentosAtual = botao.dataset.filtro;

    document.querySelectorAll("[data-filtro]").forEach((item) => {
      item.classList.remove("ativo");
    });

    botao.classList.add("ativo");

    renderizarAgendamentos();
  });
});

  // ----------------------------------------------
  // PERFIL
  // ----------------------------------------------

  const formularioPerfil = document.getElementById("form-perfil");

  if (formularioPerfil) {
    formularioPerfil.addEventListener("submit", (evento) => {
      evento.preventDefault();

      salvarPerfil();
    });
  }

  // ----------------------------------------------
  // SENHA
  // ----------------------------------------------

  const botaoSenha = document.getElementById("btn-alterar-senha");

  if (botaoSenha) {
    botaoSenha.addEventListener("click", alterarSenha);
  }

  // ----------------------------------------------
  // BUSCA
  // ----------------------------------------------

  configurarBuscaBarbearia();
}

// INICIALIZAÇÃO

async function iniciarPagina() {
  try {
    mostrarTelaCarregamento();

    const sessao = await verificarSessao();

    if (!sessao) {
      return;
    }

    await carregarCliente();

    await carregarBarbearias();

    configurarEventos();

    const campoData = document.getElementById("agendamento-data");

    if (campoData) {
      campoData.min = obterDataMinima();
    }

    // Inicia na aba Início.
    // O próprio mudarAba carrega o dashboard.
    mudarAba("inicio");

    atualizarTotalFavoritos();
  } catch (erro) {
    mostrarErroConsole("Erro ao iniciar painel do cliente", erro);

    mostrarMensagem(
      "mensagem-agendamento",
      "Ocorreu um erro ao carregar o painel.",
      "erro",
    );
  } finally {
    esconderTelaCarregamento();
  }
}

// INICIAR

document.addEventListener("DOMContentLoaded", iniciarPagina);

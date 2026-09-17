// 1. CONFIGURAÇÃO E IDENTIFICAÇÃO

const parametros = new URLSearchParams(window.location.search);

const lojaId = parametros.get("id")?.trim() || null;

// ESTADO PRINCIPAL

let sessaoAtual = null;
let lojaAtual = null;

// ELEMENTOS PRINCIPAIS DO HTML

const telaCarregamento = document.getElementById("tela-carregamento");

const painelHeader = document.getElementById("painel-header");

const btnMenuMobile = document.getElementById("btn-menu-mobile");

const btnMenuBottom = document.getElementById("btn-menu-bottom");

const menuMobile = document.getElementById("menu-mobile");

// CACHES GLOBAIS

let servicosCache = [];
let produtosCache = [];
let agendamentosCache = [];
let profissionaisCache = [];
let clientesCache = [];
let gastosCache = [];
let horariosCache = [];
let horariosProfissionaisCache = [];
let avaliacoesCache = [];
let notificacoesCache = [];

// ESTADO DO PAINEL

let filtroAgendamentoAtual = "hoje";

let tipoRelatorioSelecionado = "geral";

// STATUS DOS AGENDAMENTOS

const STATUS_LABEL = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

// FUNÇÕES AUXILIARES

function formatarMoeda(valor) {
  const numero = Number(valor);

  const valorSeguro = Number.isFinite(numero) ? numero : 0;

  return valorSeguro.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data) {
  if (!data) {
    return "";
  }

  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return "";
  }

  return dataObj.toLocaleDateString("pt-BR");
}

function formatarDataHora(data) {
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

function obterDataLocalISO(data = new Date()) {
  const dataObj = data instanceof Date ? new Date(data) : new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return "";
  }

  const ano = dataObj.getFullYear();

  const mes = String(dataObj.getMonth() + 1).padStart(2, "0");

  const dia = String(dataObj.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function obterInicioDoDia(data = new Date()) {
  const inicio = new Date(data);

  if (Number.isNaN(inicio.getTime())) {
    return null;
  }

  inicio.setHours(0, 0, 0, 0);

  return inicio;
}

function obterFimDoDia(data = new Date()) {
  const fim = new Date(data);

  if (Number.isNaN(fim.getTime())) {
    return null;
  }

  fim.setHours(23, 59, 59, 999);

  return fim;
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const timeoutsMensagens = new Map();

function mostrarMensagem(id, mensagem, tipo = "sucesso") {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return;
  }

  const timeoutAnterior = timeoutsMensagens.get(id);

  if (timeoutAnterior) {
    clearTimeout(timeoutAnterior);
  }

  elemento.textContent = String(mensagem ?? "");

  elemento.className = `mensagem mensagem--${tipo}`;

  elemento.hidden = false;

  const novoTimeout = setTimeout(() => {
    elemento.hidden = true;

    timeoutsMensagens.delete(id);
  }, 4000);

  timeoutsMensagens.set(id, novoTimeout);
}

// 2. NAVEGAÇÃO - CONTA E BARBEARIA

async function sair() {
  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Erro ao sair:", error);
    }
  } catch (erro) {
    console.error("Erro inesperado ao sair:", erro);
  }

  window.location.href = "../login/index.html";
}

function trocarBarbearia() {
  window.location.href = "../barbearia/index.html";
}

function adicionarBarbearia() {
  window.location.href = "../cadastro/index.html?modo=nova-barbearia";
}

async function voltar() {
  await sair();
}

function obterAbaDoBotao(botao) {
  if (!botao) {
    return null;
  }

  const abaData = botao.dataset?.aba?.trim();

  if (abaData) {
    return abaData;
  }

  const onclick = botao.getAttribute?.("onclick") || "";

  const correspondencia = onclick.match(/mudarAba\(\s*['"]([^'"]+)['"]\s*\)/);

  return correspondencia?.[1] || null;
}

function atualizarEstadoMenuMobile(aberto) {
  const valor = aberto ? "true" : "false";

  btnMenuMobile?.setAttribute("aria-expanded", valor);

  btnMenuBottom?.setAttribute("aria-expanded", valor);
}

function alternarMenuMobile() {
  if (!menuMobile) {
    return;
  }

  const aberto = menuMobile.classList.toggle("mobile-menu--aberto");

  atualizarEstadoMenuMobile(aberto);
}

function fecharMenuMobile() {
  if (!menuMobile) {
    return;
  }

  menuMobile.classList.remove("mobile-menu--aberto");

  atualizarEstadoMenuMobile(false);
}

if (btnMenuMobile) {
  btnMenuMobile.addEventListener("click", alternarMenuMobile);
}

if (btnMenuBottom) {
  btnMenuBottom.addEventListener("click", alternarMenuMobile);
}

document.addEventListener("click", (event) => {
  if (!menuMobile?.classList.contains("mobile-menu--aberto")) {
    return;
  }

  const alvo = event.target;

  if (!(alvo instanceof Node)) {
    return;
  }

  const clicouNoMenu = menuMobile.contains(alvo);

  const clicouNoTopo = btnMenuMobile?.contains(alvo);

  const clicouNoRodape = btnMenuBottom?.contains(alvo);

  if (!clicouNoMenu && !clicouNoTopo && !clicouNoRodape) {
    fecharMenuMobile();
  }
});

async function carregarDadosDaAba(aba) {
  try {
    const carregamentos = {
      "visao-geral": carregarDashboard,

      servicos: carregarServicos,

      produtos: carregarProdutos,

      pedidos: carregarPedidos,

      agendamentos: carregarAgendamentos,

      clientes: carregarClientes,

      profissionais: carregarProfissionais,

      horarios: carregarHorarios,

      financeiro: carregarFinanceiro,

      avaliacoes: carregarAvaliacoes,

      configuracoes: carregarConfiguracoes,
    };

    const carregar = carregamentos[aba];

    if (typeof carregar === "function") {
      await carregar();
    }
  } catch (erro) {
    console.error(`Erro ao carregar a aba "${aba}":`, erro);
  }
}

async function mudarAba(aba) {
  if (!aba) {
    return;
  }

  const conteudoAlvo = document.getElementById(`conteudo-${aba}`);

  if (!conteudoAlvo) {
    console.warn(`Aba não encontrada: ${aba}`);

    return;
  }

  document.querySelectorAll(".menu-item").forEach((botao) => {
    const ativo = obterAbaDoBotao(botao) === aba;

    botao.classList.toggle("menu-item--ativo", ativo);

    if (ativo) {
      botao.setAttribute("aria-current", "page");
    } else {
      botao.removeAttribute("aria-current");
    }
  });

  document.querySelectorAll(".painel-conteudo").forEach((conteudo) => {
    conteudo.hidden = conteudo !== conteudoAlvo;
  });

  document.querySelectorAll(".mobile-menu-item").forEach((botao) => {
    const ativo = obterAbaDoBotao(botao) === aba;

    botao.classList.toggle("mobile-menu-item--ativo", ativo);

    if (ativo) {
      botao.setAttribute("aria-current", "page");
    } else {
      botao.removeAttribute("aria-current");
    }
  });

  document.querySelectorAll(".mobile-bottom-item").forEach((botao) => {
    const ativo = obterAbaDoBotao(botao) === aba;

    botao.classList.toggle("mobile-bottom-item--ativo", ativo);

    if (ativo) {
      botao.setAttribute("aria-current", "page");
    } else {
      botao.removeAttribute("aria-current");
    }
  });

  fecharMenuMobile();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  await carregarDadosDaAba(aba);
}

// LOADING - ESCONDER TELA DE CARREGAMENTO

function esconderTelaCarregamento() {
  if (!telaCarregamento) {
    return;
  }

  telaCarregamento.classList.add("tela-carregamento--oculta");
}

// ERRO DURANTE O CARREGAMENTO

function mostrarErroCarregamento(mensagem) {
  if (!telaCarregamento) {
    return;
  }

  telaCarregamento.innerHTML = `
    <div class="carregamento-conteudo">

      <div class="carregamento-logo">
        <img
          src="../assets/barber.png"
          alt="BarberHub"
        >
      </div>

      <h2>
        BarberHub
      </h2>

      <p>
        ${escaparHtml(mensagem)}
      </p>

      <button
        type="button"
        onclick="window.location.reload()"
      >
        Tentar novamente
      </button>

    </div>
  `;
}

// 3. CARREGAR BARBEARIA

async function carregarLoja() {
  if (!lojaId) {
    mostrarErroCarregamento("Nenhuma barbearia foi identificada.");

    return false;
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
      console.error("Erro ao verificar sessão:", sessionError);

      mostrarErroCarregamento("Não foi possível verificar sua sessão.");

      return false;
    }

    if (!session?.user?.id) {
      window.location.href = "../login/index.html";

      return false;
    }

    sessaoAtual = session;

    const { data: loja, error } = await supabaseClient
      .from("barbearias")
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
      .eq("id", lojaId)
      .eq("dono_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar barbearia:", error);

      mostrarErroCarregamento("Não foi possível carregar a barbearia.");

      return false;
    }

    if (!loja) {
      mostrarErroCarregamento(
        "Você não tem acesso a esta barbearia ou ela não existe.",
      );

      return false;
    }

    lojaAtual = loja;

    atualizarCabecalhoLoja();

    return true;
  } catch (erro) {
    console.error("Erro inesperado ao carregar barbearia:", erro);

    mostrarErroCarregamento("Ocorreu um erro ao carregar a barbearia.");

    return false;
  }
}

// CABEÇALHO DA BARBEARIA

function atualizarCabecalhoLoja() {
  if (!painelHeader || !lojaAtual) {
    return;
  }

  const nome = lojaAtual.nome?.trim() || "Minha barbearia";

  const cidade = lojaAtual.cidade?.trim() || "Painel de gestão";

  const logo = lojaAtual.logo_url?.trim() || "";

  const endereco = lojaAtual.endereco?.trim() || "";

  painelHeader.innerHTML = `
    <div class="painel-header-info">

      <div class="painel-header-logo">

        ${
          logo
            ? `
              <img
                src="${escaparHtml(logo)}"
                alt="Logo de ${escaparHtml(nome)}"
                onerror="this.style.display='none'"
              >
            `
            : `
              <div class="painel-header-logo-vazio">
                💈
              </div>
            `
        }

      </div>

      <div class="painel-header-textos">

        <h1>
          ${escaparHtml(nome)}
        </h1>

        <p>
          ${
            endereco
              ? `${escaparHtml(cidade)} · ${escaparHtml(endereco)}`
              : escaparHtml(cidade)
          }
        </p>

      </div>

    </div>

    <div class="painel-header-acoes">

      <button
        type="button"
        class="btn-header"
        onclick="trocarBarbearia()"
        aria-label="Trocar de barbearia"
      >
        🔄 Trocar barbearia
      </button>

    </div>
  `;
}

// 4. SERVIÇOS

const formServico = document.getElementById("form-servico");

const listaServicosEl = document.getElementById("lista-servicos");

const btnSalvarServico = document.getElementById("btn-salvar-servico");

const btnCancelarServico = document.getElementById("btn-cancelar-servico");

const campoServicoId = document.getElementById("servico-id");

const campoServicoNome = document.getElementById("servico-nome");

const campoServicoPreco = document.getElementById("servico-preco");

const campoServicoDuracao = document.getElementById("servico-duracao");

// CARREGAR SERVIÇOS

async function carregarServicos() {
  if (!listaServicosEl || !lojaId) {
    return false;
  }

  listaServicosEl.innerHTML = `
    <p class="em-breve">
      Carregando serviços...
    </p>
  `;

  try {
    const { data, error } = await supabaseClient
      .from("servicos")
      .select(
        `
            id,
            barbearia_id,
            nome,
            preco,
            duracao,
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

    servicosCache = Array.isArray(data) ? data : [];

    renderizarServicos(servicosCache);

    if (typeof preencherServicosAgendamento === "function") {
      preencherServicosAgendamento();
    }

    return true;
  } catch (erro) {
    console.error("Erro ao carregar serviços:", erro);

    servicosCache = [];

    listaServicosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os serviços.
      </p>
    `;

    return false;
  }
}

// RENDERIZAR SERVIÇOS

function renderizarServicos(servicos) {
  if (!listaServicosEl) {
    return;
  }

  listaServicosEl.innerHTML = "";

  const lista = Array.isArray(servicos) ? servicos : [];

  if (!lista.length) {
    listaServicosEl.innerHTML = `
      <p class="em-breve">
        Nenhum serviço cadastrado.
      </p>
    `;

    return;
  }

  lista.forEach((servico) => {
    const item = document.createElement("div");

    item.classList.add("item-lista");

    const nome = servico.nome?.trim() || "Serviço";

    const preco = Number(servico.preco);

    const duracao = Number.parseInt(servico.duracao, 10);

    const precoSeguro = Number.isFinite(preco) ? preco : 0;

    const duracaoSegura =
      Number.isInteger(duracao) && duracao > 0 ? duracao : 0;

    item.innerHTML = `
      <div class="item-info">

        <h3>
          ${escaparHtml(nome)}
        </h3>

        <p>
          ${formatarMoeda(precoSeguro)}
          ·
          ${duracaoSegura} min
        </p>

      </div>

      <div class="item-acoes">

        <button
          type="button"
          title="Editar serviço"
          aria-label="Editar serviço"
          onclick="editarServico('${escaparHtml(servico.id)}')"
        >
          ✏️
        </button>

        <button
          type="button"
          title="Excluir serviço"
          aria-label="Excluir serviço"
          onclick="excluirServico('${escaparHtml(servico.id)}')"
        >
          🗑️
        </button>

      </div>
    `;

    listaServicosEl.appendChild(item);
  });
}

// SALVAR / EDITAR SERVIÇO

if (formServico) {
  formServico.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = campoServicoId?.value?.trim() || "";

    const nome = campoServicoNome?.value?.trim() || "";

    const preco = Number(campoServicoPreco?.value);

    const duracao = Number.parseInt(campoServicoDuracao?.value, 10);

    if (!lojaId) {
      mostrarMensagem(
        "mensagem-servico",
        "Barbearia não identificada.",
        "erro",
      );

      return;
    }

    if (
      !nome ||
      !Number.isFinite(preco) ||
      preco < 0 ||
      !Number.isInteger(duracao) ||
      duracao <= 0
    ) {
      mostrarMensagem(
        "mensagem-servico",
        "Preencha os dados do serviço corretamente.",
        "erro",
      );

      return;
    }

    if (btnSalvarServico) {
      btnSalvarServico.disabled = true;

      btnSalvarServico.textContent = "Salvando...";
    }

    try {
      let error = null;

      const dadosServico = {
        nome,
        preco,
        duracao,
      };

      if (id) {
        const resposta = await supabaseClient
          .from("servicos")
          .update(dadosServico)
          .eq("id", id)
          .eq("barbearia_id", lojaId);

        error = resposta.error;
      } else {
        const resposta = await supabaseClient.from("servicos").insert({
          barbearia_id: lojaId,

          ...dadosServico,
        });

        error = resposta.error;
      }

      if (error) {
        throw error;
      }

      cancelarEdicaoServico();

      await carregarServicos();

      if (typeof carregarDashboard === "function") {
        await carregarDashboard();
      }

      mostrarMensagem(
        "mensagem-servico",
        id
          ? "Serviço atualizado com sucesso!"
          : "Serviço cadastrado com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro ao salvar serviço:", erro);

      mostrarMensagem(
        "mensagem-servico",
        "Não foi possível salvar o serviço.",
        "erro",
      );
    } finally {
      if (btnSalvarServico) {
        btnSalvarServico.disabled = false;

        btnSalvarServico.textContent = campoServicoId?.value
          ? "Salvar edição"
          : "+ Adicionar serviço";
      }
    }
  });
}

// EDITAR SERVIÇO

function editarServico(id) {
  if (!id) {
    return;
  }

  const servico = servicosCache.find((item) => String(item.id) === String(id));

  if (!servico) {
    mostrarMensagem("mensagem-servico", "Serviço não encontrado.", "erro");

    return;
  }

  if (campoServicoId) {
    campoServicoId.value = servico.id;
  }

  if (campoServicoNome) {
    campoServicoNome.value = servico.nome || "";
  }

  if (campoServicoPreco) {
    campoServicoPreco.value = servico.preco ?? "";
  }

  if (campoServicoDuracao) {
    campoServicoDuracao.value = servico.duracao ?? "";
  }

  if (btnSalvarServico) {
    btnSalvarServico.textContent = "Salvar edição";
  }

  if (btnCancelarServico) {
    btnCancelarServico.hidden = false;
  }

  formServico?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  campoServicoNome?.focus();
}

// CANCELAR EDIÇÃO

function cancelarEdicaoServico() {
  if (!formServico) {
    return;
  }

  formServico.reset();

  if (campoServicoId) {
    campoServicoId.value = "";
  }

  if (btnSalvarServico) {
    btnSalvarServico.disabled = false;

    btnSalvarServico.textContent = "+ Adicionar serviço";
  }

  if (btnCancelarServico) {
    btnCancelarServico.hidden = true;
  }
}

if (btnCancelarServico) {
  btnCancelarServico.addEventListener("click", cancelarEdicaoServico);
}

// EXCLUIR SERVIÇO

async function excluirServico(id) {
  if (!id || !lojaId) {
    return;
  }

  const servico = servicosCache.find((item) => String(item.id) === String(id));

  const nomeServico = servico?.nome?.trim() || "este serviço";

  const confirmar = confirm(`Deseja realmente remover "${nomeServico}"?`);

  if (!confirmar) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("servicos")
      .delete()
      .eq("id", id)
      .eq("barbearia_id", lojaId);

    if (error) {
      if (error.code === "23503") {
        mostrarMensagem(
          "mensagem-servico",
          "Este serviço possui agendamentos vinculados e não pode ser excluído.",
          "erro",
        );

        return;
      }

      throw error;
    }

    if (String(campoServicoId?.value) === String(id)) {
      cancelarEdicaoServico();
    }

    await carregarServicos();

    if (typeof carregarDashboard === "function") {
      await carregarDashboard();
    }

    mostrarMensagem(
      "mensagem-servico",
      "Serviço removido com sucesso!",
      "sucesso",
    );
  } catch (erro) {
    console.error("Erro ao excluir serviço:", erro);

    mostrarMensagem(
      "mensagem-servico",
      "Não foi possível remover o serviço.",
      "erro",
    );
  }
}

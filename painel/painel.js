// BARBERHUB - PAINEL DA BARBEARIA
// VARIÁVEIS GLOBAIS

const parametros = new URLSearchParams(window.location.search);
const lojaId = parametros.get("id");

let sessaoAtual = null;
let lojaAtual = null;

// ELEMENTOS PRINCIPAIS

const telaCarregamento = document.getElementById("tela-carregamento");
const painelHeader = document.getElementById("painel-header");

const btnMenuMobile = document.getElementById("btn-menu-mobile");
const btnMenuBottom = document.getElementById("btn-menu-bottom");
const menuMobile = document.getElementById("menu-mobile");

// CACHE DOS DADOS

let servicosCache = [];
let produtosCache = [];
let agendamentosCache = [];
let profissionaisCache = [];
let gastosCache = [];
let horariosCache = [];

// Filtro atual dos agendamentos
let filtroAgendamentoAtual = "hoje";

// Tipo de relatório
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
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data) {
  if (!data) {
    return "-";
  }

  // Evita problemas de fuso horário com YYYY-MM-DD
  if (typeof data === "string" && data.length === 10) {
    const partes = data.split("-");

    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return "-";
  }

  return dataObj.toLocaleDateString("pt-BR");
}

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

function obterDataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function obterInicioDoDia(data = new Date()) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function obterFimDoDia(data = new Date()) {
  const fim = new Date(data);
  fim.setHours(23, 59, 59, 999);
  return fim;
}

function escaparHtml(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mostrarMensagem(elementoId, mensagem, tipo = "erro") {
  const elemento = document.getElementById(elementoId);

  if (!elemento) {
    return;
  }

  elemento.textContent = mensagem;
  elemento.className = `mensagem mensagem--${tipo}`;
  elemento.hidden = false;
}

// NAVEGAÇÃO

async function voltar() {
  try {
    await supabaseClient.auth.signOut();
  } catch (erro) {
    console.error("Erro ao sair:", erro);
  }

  window.location.href = "../barbearia/index.html";
}

// MENU MOBILE

function alternarMenuMobile() {
  if (!menuMobile) {
    return;
  }

  const aberto = menuMobile.classList.toggle("mobile-menu--aberto");

  if (btnMenuMobile) {
    btnMenuMobile.setAttribute("aria-expanded", aberto ? "true" : "false");
  }
}

function fecharMenuMobile() {
  if (!menuMobile) {
    return;
  }

  menuMobile.classList.remove("mobile-menu--aberto");

  if (btnMenuMobile) {
    btnMenuMobile.setAttribute("aria-expanded", "false");
  }
}

if (btnMenuMobile) {
  btnMenuMobile.addEventListener("click", alternarMenuMobile);
}

if (btnMenuBottom) {
  btnMenuBottom.addEventListener("click", alternarMenuMobile);
}

// MUDAR ABA

function mudarAba(aba) {
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.toggle("menu-item--ativo", item.dataset.aba === aba);
  });

  document.querySelectorAll(".painel-conteudo").forEach((secao) => {
    secao.hidden = secao.id !== `conteudo-${aba}`;
  });

  document.querySelectorAll(".mobile-bottom-item").forEach((item) => {
    const acao = item.getAttribute("onclick");

    if (!acao) {
      return;
    }

    item.classList.toggle(
      "mobile-bottom-item--ativo",
      acao.includes(`'${aba}'`),
    );
  });

  fecharMenuMobile();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  // Carregamentos específicos

  if (aba === "clientes") {
    carregarClientes();
  }

  if (aba === "profissionais") {
    carregarProfissionais();
  }

  if (aba === "financeiro") {
    carregarFinanceiro();
  }

  if (aba === "horarios") {
    carregarHorarios();
  }

  if (aba === "configuracoes") {
    carregarConfiguracoes();
  }

  if (aba === "visao-geral") {
    carregarDashboard();
  }
}

// TELA DE CARREGAMENTO

function esconderTelaCarregamento() {
  if (!telaCarregamento) {
    return;
  }

  telaCarregamento.classList.add("tela-carregamento--oculta");
}

// ERRO NO CARREGAMENTO

function mostrarErroCarregamento(mensagem) {
  if (!telaCarregamento) {
    return;
  }

  telaCarregamento.classList.remove("tela-carregamento--oculta");

  telaCarregamento.innerHTML = `
    <div class="carregamento-conteudo">

      <div class="carregamento-logo">
        ⚠️
      </div>

      <h2>
        Não foi possível carregar
      </h2>

      <p>
        ${escaparHtml(mensagem)}
      </p>

      <button
        type="button"
        class="btn-principal"
        onclick="window.location.reload()"
      >
        Tentar novamente
      </button>

    </div>
  `;
}

// CARREGAR LOJA

async function carregarLoja() {
  if (!lojaId) {
    console.error("Nenhum ID de loja foi encontrado na URL.");

    mostrarErroCarregamento("Nenhuma barbearia foi identificada.");

    return false;
  }

  const {
    data: { session },
    error: erroSessao,
  } = await supabaseClient.auth.getSession();

  if (erroSessao) {
    console.error("Erro ao verificar sessão:", erroSessao);

    mostrarErroCarregamento("Não foi possível verificar sua sessão.");

    return false;
  }

  if (!session) {
    window.location.href = "../login/index.html";
    return false;
  }

  sessaoAtual = session;

  const { data: loja, error } = await supabaseClient
    .from("barbearias")
    .select("*")
    .eq("id", lojaId)
    .eq("dono_id", session.user.id)
    .single();

  if (error || !loja) {
    console.error("Erro ao carregar loja:", error);

    mostrarErroCarregamento(
      "A loja não foi encontrada ou você não tem acesso a ela.",
    );

    return false;
  }

  lojaAtual = loja;

  const logo = loja.logo_url;

  if (painelHeader) {
    painelHeader.innerHTML = `
      ${
        logo
          ? `
            <img
              src="${escaparHtml(logo)}"
              alt="Logo ${escaparHtml(loja.nome || "Barbearia")}"
              class="painel-logo"
            >
          `
          : `
            <div class="painel-logo-vazio">
              💈
            </div>
          `
      }

      <div>
        <h1>
          ${escaparHtml(loja.nome || "Barbearia")}
        </h1>

        <p>
          📍 ${escaparHtml(loja.cidade || "Cidade não informada")}
        </p>
      </div>
    `;
  }

  return true;
}

// SERVIÇOS

const formServico = document.getElementById("form-servico");
const listaServicosEl = document.getElementById("lista-servicos");
const btnSalvarServico = document.getElementById("btn-salvar-servico");
const btnCancelarServico = document.getElementById("btn-cancelar-servico");

// CARREGAR SERVIÇOS

async function carregarServicos() {
  if (!listaServicosEl) {
    return false;
  }

  const { data, error } = await supabaseClient
    .from("servicos")
    .select("*")
    .eq("barbearia_id", lojaId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error("Erro ao buscar serviços:", error);

    listaServicosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os serviços.
      </p>
    `;

    return false;
  }

  servicosCache = data || [];

  renderizarServicos(servicosCache);

  return true;
}

// RENDERIZAR SERVIÇOS

function renderizarServicos(servicos) {
  if (!listaServicosEl) {
    return;
  }

  listaServicosEl.innerHTML = "";

  if (!servicos.length) {
    listaServicosEl.innerHTML = `
      <p class="em-breve">
        Nenhum serviço cadastrado ainda.
      </p>
    `;

    return;
  }

  servicos.forEach((servico) => {
    const item = document.createElement("div");

    item.classList.add("item-lista");

    item.innerHTML = `
      <div class="item-info">

        <h3>
          ${escaparHtml(servico.nome)}
        </h3>

        <p>
          ${formatarMoeda(servico.preco)}
          ·
          ${servico.duracao_minutos || 0} min
        </p>

      </div>

      <div class="item-acoes">

        <button
          type="button"
          title="Editar"
          onclick="editarServico('${servico.id}')"
        >
          ✏️
        </button>

        <button
          type="button"
          title="Excluir"
          onclick="excluirServico('${servico.id}')"
        >
          🗑️
        </button>

      </div>
    `;

    listaServicosEl.appendChild(item);
  });
}

// SALVAR SERVIÇO

if (formServico) {
  formServico.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = document.getElementById("servico-id")?.value;

    const nome = document.getElementById("servico-nome")?.value.trim();

    const preco = parseFloat(document.getElementById("servico-preco")?.value);

    const duracao = parseInt(
      document.getElementById("servico-duracao")?.value,
      10,
    );

    if (!nome || Number.isNaN(preco) || Number.isNaN(duracao)) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    if (preco < 0 || duracao <= 0) {
      alert("Informe um preço e uma duração válidos.");
      return;
    }

    let erro = null;

    if (id) {
      const resposta = await supabaseClient
        .from("servicos")
        .update({
          nome,
          preco,
          duracao_minutos: duracao,
        })
        .eq("id", id)
        .eq("barbearia_id", lojaId);

      erro = resposta.error;
    } else {
      const resposta = await supabaseClient.from("servicos").insert({
        barbearia_id: lojaId,
        nome,
        preco,
        duracao_minutos: duracao,
      });

      erro = resposta.error;
    }

    if (erro) {
      console.error("Erro ao salvar serviço:", erro);

      alert("Não foi possível salvar o serviço.");

      return;
    }

    cancelarEdicaoServico();

    await carregarServicos();
  });
}

// EDITAR SERVIÇO

function editarServico(id) {
  const servico = servicosCache.find((item) => String(item.id) === String(id));

  if (!servico) {
    alert("Serviço não encontrado.");
    return;
  }

  document.getElementById("servico-id").value = servico.id;

  document.getElementById("servico-nome").value = servico.nome || "";

  document.getElementById("servico-preco").value = servico.preco || 0;

  document.getElementById("servico-duracao").value =
    servico.duracao_minutos || 30;

  btnSalvarServico.textContent = "Salvar edição";

  btnCancelarServico.hidden = false;

  formServico.scrollIntoView({
    behavior: "smooth",
  });
}

// CANCELAR EDIÇÃO DE SERVIÇO

function cancelarEdicaoServico() {
  if (!formServico) {
    return;
  }

  formServico.reset();

  document.getElementById("servico-id").value = "";

  document.getElementById("servico-duracao").value = 30;

  btnSalvarServico.textContent = "+ Adicionar serviço";

  btnCancelarServico.hidden = true;
}

// EXCLUIR SERVIÇO

async function excluirServico(id) {
  if (!confirm("Remover esse serviço?")) {
    return;
  }

  const { error } = await supabaseClient
    .from("servicos")
    .delete()
    .eq("id", id)
    .eq("barbearia_id", lojaId);

  if (error) {
    console.error("Erro ao excluir serviço:", error);

    alert("Não foi possível remover o serviço.");

    return;
  }

  await carregarServicos();
}

// PRODUTOS

const formProduto = document.getElementById("form-produto");
const listaProdutosEl = document.getElementById("lista-produtos");

const btnSalvarProduto = document.getElementById("btn-salvar-produto");

const btnCancelarProduto = document.getElementById("btn-cancelar-produto");

// CARREGAR PRODUTOS

async function carregarProdutos() {
  if (!listaProdutosEl) {
    return false;
  }

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .eq("barbearia_id", lojaId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error("Erro ao buscar produtos:", error);

    listaProdutosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os produtos.
      </p>
    `;

    return false;
  }

  produtosCache = data || [];

  renderizarProdutos(produtosCache);

  return true;
}

// RENDERIZAR PRODUTOS

function renderizarProdutos(produtos) {
  if (!listaProdutosEl) {
    return;
  }

  listaProdutosEl.innerHTML = "";

  if (!produtos.length) {
    listaProdutosEl.innerHTML = `
      <p class="em-breve">
        Nenhum produto cadastrado ainda.
      </p>
    `;

    return;
  }

  produtos.forEach((produto) => {
    const item = document.createElement("div");

    item.classList.add("item-lista");

    item.innerHTML = `
      <div class="item-info item-info--com-foto">

        ${
          produto.foto_url
            ? `
              <img
                src="${escaparHtml(produto.foto_url)}"
                alt="${escaparHtml(produto.nome)}"
                class="produto-thumb"
              >
            `
            : `
              <div class="produto-thumb produto-thumb--vazia">
                🛍️
              </div>
            `
        }

        <div>

          <h3>
            ${escaparHtml(produto.nome)}
          </h3>

          <p>
            ${formatarMoeda(produto.preco)}
            ·
            ${produto.estoque || 0} em estoque
          </p>

        </div>

      </div>

      <div class="item-acoes">

        <button
          type="button"
          title="Editar"
          onclick="editarProduto('${produto.id}')"
        >
          ✏️
        </button>

        <button
          type="button"
          title="Excluir"
          onclick="excluirProduto('${produto.id}')"
        >
          🗑️
        </button>

      </div>
    `;

    listaProdutosEl.appendChild(item);
  });
}

// UPLOAD STORAGE

async function enviarArquivoStorage(arquivo, pasta) {
  if (!arquivo || !sessaoAtual) {
    return null;
  }

  const extensao = arquivo.name.split(".").pop().toLowerCase();

  const nomeArquivo = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}.${extensao}`;

  const caminhoArquivo = `${sessaoAtual.user.id}/${pasta}/${nomeArquivo}`;

  const { error: erroUpload } = await supabaseClient.storage
    .from("barbearias")
    .upload(caminhoArquivo, arquivo);

  if (erroUpload) {
    console.error("Erro no upload:", erroUpload);

    return null;
  }

  const { data: urlPublica } = supabaseClient.storage
    .from("barbearias")
    .getPublicUrl(caminhoArquivo);

  return urlPublica?.publicUrl || null;
}

// PREVIEW PRODUTO

const inputFotoProduto = document.getElementById("produto-foto");

const previewProduto = document.getElementById("preview-produto");

const previewProdutoImg = document.getElementById("preview-produto-img");

if (inputFotoProduto) {
  inputFotoProduto.addEventListener("change", () => {
    const arquivo = inputFotoProduto.files?.[0];

    if (!arquivo) {
      if (previewProduto) {
        previewProduto.hidden = true;
      }

      return;
    }

    const url = URL.createObjectURL(arquivo);

    if (previewProdutoImg) {
      previewProdutoImg.src = url;
    }

    if (previewProduto) {
      previewProduto.hidden = false;
    }
  });
}

// SALVAR PRODUTO

if (formProduto) {
  formProduto.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = document.getElementById("produto-id")?.value;

    const nome = document.getElementById("produto-nome")?.value.trim();

    const preco = parseFloat(document.getElementById("produto-preco")?.value);

    const estoque = parseInt(
      document.getElementById("produto-estoque")?.value,
      10,
    );

    const arquivoFoto = document.getElementById("produto-foto")?.files?.[0];

    const fotoAtual = document.getElementById("produto-foto-atual")?.value;

    if (!nome || Number.isNaN(preco) || Number.isNaN(estoque)) {
      alert("Preencha os dados do produto corretamente.");

      return;
    }

    if (preco < 0 || estoque < 0) {
      alert("Preço e estoque não podem ser negativos.");

      return;
    }

    let fotoUrl = fotoAtual || null;

    if (arquivoFoto) {
      const novaFoto = await enviarArquivoStorage(arquivoFoto, "produtos");

      if (novaFoto) {
        fotoUrl = novaFoto;
      }
    }

    let erro = null;

    if (id) {
      const resposta = await supabaseClient
        .from("produtos")
        .update({
          nome,
          preco,
          estoque,
          foto_url: fotoUrl,
        })
        .eq("id", id)
        .eq("barbearia_id", lojaId);

      erro = resposta.error;
    } else {
      const resposta = await supabaseClient.from("produtos").insert({
        barbearia_id: lojaId,
        nome,
        preco,
        estoque,
        foto_url: fotoUrl,
      });

      erro = resposta.error;
    }

    if (erro) {
      console.error("Erro ao salvar produto:", erro);

      alert("Não foi possível salvar o produto.");

      return;
    }

    cancelarEdicaoProduto();

    await carregarProdutos();
  });
}

// EDITAR PRODUTO

function editarProduto(id) {
  const produto = produtosCache.find((item) => String(item.id) === String(id));

  if (!produto) {
    alert("Produto não encontrado.");
    return;
  }

  document.getElementById("produto-id").value = produto.id;

  document.getElementById("produto-nome").value = produto.nome || "";

  document.getElementById("produto-preco").value = produto.preco || 0;

  document.getElementById("produto-estoque").value = produto.estoque || 0;

  document.getElementById("produto-foto-atual").value = produto.foto_url || "";

  document.getElementById("produto-foto").value = "";

  btnSalvarProduto.textContent = "Salvar edição";

  btnCancelarProduto.hidden = false;

  formProduto.scrollIntoView({
    behavior: "smooth",
  });
}

// CANCELAR PRODUTO

function cancelarEdicaoProduto() {
  if (!formProduto) {
    return;
  }

  formProduto.reset();

  document.getElementById("produto-id").value = "";

  document.getElementById("produto-foto-atual").value = "";

  document.getElementById("produto-estoque").value = 0;

  if (previewProduto) {
    previewProduto.hidden = true;
  }

  btnSalvarProduto.textContent = "+ Adicionar produto";

  btnCancelarProduto.hidden = true;
}

// EXCLUIR PRODUTO

async function excluirProduto(id) {
  if (!confirm("Remover esse produto?")) {
    return;
  }

  const { error } = await supabaseClient
    .from("produtos")
    .delete()
    .eq("id", id)
    .eq("barbearia_id", lojaId);

  if (error) {
    console.error("Erro ao excluir produto:", error);

    alert("Não foi possível remover o produto.");

    return;
  }

  await carregarProdutos();
}

// AGENDAMENTOS

const listaAgendamentosEl = document.getElementById("lista-agendamentos");

// CARREGAR AGENDAMENTOS

async function carregarAgendamentos() {
  if (!listaAgendamentosEl) {
    return false;
  }

  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select(
      `
        *,
        servicos(
          nome,
          preco
        ),
        profiles(
          id,
          nome,
          telefone
        )
      `,
    )
    .eq("barbearia_id", lojaId)
    .order("data_hora", {
      ascending: true,
    });

  if (error) {
    console.error("Erro ao buscar agendamentos:", error);

    listaAgendamentosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os agendamentos.
      </p>
    `;

    return false;
  }

  agendamentosCache = data || [];

  renderizarAgendamentos(
    filtrarAgendamentos(agendamentosCache, filtroAgendamentoAtual),
  );

  return true;
}

// FILTRAR AGENDAMENTOS

function filtrarAgendamentos(agendamentos, filtro) {
  if (filtro === "todos") {
    return [...agendamentos];
  }

  const hoje = obterDataLocalISO();

  const amanhaData = new Date();

  amanhaData.setDate(amanhaData.getDate() + 1);

  const amanha = obterDataLocalISO(amanhaData);

  return agendamentos.filter((agendamento) => {
    if (!agendamento.data_hora) {
      return false;
    }

    const dataAgendamento = new Date(agendamento.data_hora);

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

  if (!agendamentos.length) {
    listaAgendamentosEl.innerHTML = `
      <p class="em-breve">
        Nenhum agendamento encontrado.
      </p>
    `;

    return;
  }

  agendamentos.forEach((agendamento) => {
    const dataHora = new Date(agendamento.data_hora);

    const nomeCliente = agendamento.profiles?.nome || "Cliente";

    const nomeServico = agendamento.servicos?.nome || "Serviço";

    const status = agendamento.status || "pendente";

    const item = document.createElement("div");

    item.classList.add("item-lista");

    item.innerHTML = `
      <div class="item-info">

        <h3>
          ${escaparHtml(nomeCliente)}
        </h3>

        <p>
          ${escaparHtml(nomeServico)}
          ·
          ${dataHora.toLocaleDateString("pt-BR")}
          às
          ${dataHora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

      </div>

      <div class="item-acoes">

        <select
          class="select-status select-status--${escaparHtml(status)}"
          onchange="atualizarStatusAgendamento('${agendamento.id}', this.value)"
        >

          ${Object.entries(STATUS_LABEL)
            .map(
              ([valor, rotulo]) => `
                <option
                  value="${valor}"
                  ${status === valor ? "selected" : ""}
                >
                  ${rotulo}
                </option>
              `,
            )
            .join("")}

        </select>

      </div>
    `;

    listaAgendamentosEl.appendChild(item);
  });
}

// ATUALIZAR STATUS

async function atualizarStatusAgendamento(id, novoStatus) {
  const { error } = await supabaseClient
    .from("agendamentos")
    .update({
      status: novoStatus,
    })
    .eq("id", id)
    .eq("barbearia_id", lojaId);

  if (error) {
    console.error("Erro ao atualizar status:", error);

    alert("Não foi possível atualizar o status.");

    return;
  }

  await carregarAgendamentos();
  await carregarDashboard();
}

// FILTROS

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

// CLIENTES

const listaClientesEl = document.getElementById("lista-clientes");

// CARREGAR CLIENTES

async function carregarClientes() {
  if (!listaClientesEl) {
    return false;
  }

  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select(
      `
        cliente_id,
        profiles(
          id,
          nome,
          telefone
        )
      `,
    )
    .eq("barbearia_id", lojaId);

  if (error) {
    console.error("Erro ao carregar clientes:", error);

    listaClientesEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os clientes.
      </p>
    `;

    return false;
  }

  const mapaClientes = new Map();

  (data || []).forEach((agendamento) => {
    const cliente = agendamento.profiles;

    if (!cliente) {
      return;
    }

    const chave = cliente.id || agendamento.cliente_id;

    if (!chave) {
      return;
    }

    if (!mapaClientes.has(chave)) {
      mapaClientes.set(chave, cliente);
    }
  });

  renderizarClientes(Array.from(mapaClientes.values()));

  return true;
}

// RENDERIZAR CLIENTES

function renderizarClientes(clientes) {
  if (!listaClientesEl) {
    return;
  }

  listaClientesEl.innerHTML = "";

  if (!clientes.length) {
    listaClientesEl.innerHTML = `
      <p class="em-breve">
        Nenhum cliente encontrado.
      </p>
    `;

    return;
  }

  clientes.forEach((cliente) => {
    const item = document.createElement("div");

    item.classList.add("item-lista");

    item.innerHTML = `
      <div class="item-info">

        <h3>
          ${escaparHtml(cliente.nome || "Cliente")}
        </h3>

        <p>
          ${escaparHtml(cliente.telefone || "Telefone não informado")}
        </p>

      </div>
    `;

    listaClientesEl.appendChild(item);
  });
}

// PROFISSIONAIS

const formBarbeiro = document.getElementById("form-barbeiro");

const listaProfissionaisEl = document.getElementById("lista-profissionais");

const btnSalvarBarbeiro = document.getElementById("btn-salvar-barbeiro");

const btnCancelarBarbeiro = document.getElementById("btn-cancelar-barbeiro");

// CARREGAR PROFISSIONAIS

async function carregarProfissionais() {
  if (!listaProfissionaisEl) {
    return false;
  }

  const { data, error } = await supabaseClient
    .from("profissionais")
    .select("*")
    .eq("barbearia_id", lojaId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error("Erro ao carregar profissionais:", error);

    listaProfissionaisEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os profissionais.
      </p>
    `;

    return false;
  }

  profissionaisCache = data || [];

  renderizarProfissionais(profissionaisCache);

  atualizarCardProfissionais();

  return true;
}

// ATUALIZAR CARD PROFISSIONAIS

function atualizarCardProfissionais() {
  const elemento = document.getElementById("total-profissionais");

  if (elemento) {
    elemento.textContent = profissionaisCache.length;
  }
}

// RENDERIZAR PROFISSIONAIS

function renderizarProfissionais(profissionais) {
  if (!listaProfissionaisEl) {
    return;
  }

  listaProfissionaisEl.innerHTML = "";

  if (!profissionais.length) {
    listaProfissionaisEl.innerHTML = `
      <p class="em-breve">
        Nenhum profissional cadastrado.
      </p>
    `;

    return;
  }

  profissionais.forEach((profissional) => {
    const item = document.createElement("div");

    item.classList.add("item-lista");

    item.innerHTML = `
      <div class="item-info item-info--com-foto">

        ${
          profissional.foto_url
            ? `
              <img
                src="${escaparHtml(profissional.foto_url)}"
                alt="${escaparHtml(profissional.nome)}"
                class="produto-thumb"
              >
            `
            : `
              <div class="produto-thumb produto-thumb--vazia">
                💈
              </div>
            `
        }

        <div>

          <h3>
            ${escaparHtml(profissional.nome)}
          </h3>

          <p>
            ${escaparHtml(profissional.telefone || "Telefone não informado")}
          </p>

        </div>

      </div>

      <div class="item-acoes">

        <button
          type="button"
          title="Editar"
          onclick="editarBarbeiro('${profissional.id}')"
        >
          ✏️
        </button>

        <button
          type="button"
          title="Excluir"
          onclick="excluirBarbeiro('${profissional.id}')"
        >
          🗑️
        </button>

      </div>
    `;

    listaProfissionaisEl.appendChild(item);
  });
}

// PREVIEW BARBEIRO

const inputFotoBarbeiro = document.getElementById("barbeiro-foto");

const previewBarbeiro = document.getElementById("preview-barbeiro");

const previewBarbeiroImg = document.getElementById("preview-barbeiro-img");

if (inputFotoBarbeiro) {
  inputFotoBarbeiro.addEventListener("change", () => {
    const arquivo = inputFotoBarbeiro.files?.[0];

    if (!arquivo) {
      if (previewBarbeiro) {
        previewBarbeiro.hidden = true;
      }

      return;
    }

    if (previewBarbeiroImg) {
      previewBarbeiroImg.src = URL.createObjectURL(arquivo);
    }

    if (previewBarbeiro) {
      previewBarbeiro.hidden = false;
    }
  });
}

// SALVAR BARBEIRO

if (formBarbeiro) {
  formBarbeiro.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = document.getElementById("barbeiro-id")?.value;

    const nome = document.getElementById("barbeiro-nome")?.value.trim();

    const telefone = document.getElementById("barbeiro-tel")?.value.trim();

    const arquivoFoto = document.getElementById("barbeiro-foto")?.files?.[0];

    const fotoAtual = document.getElementById("barbeiro-foto-atual")?.value;

    if (!nome) {
      alert("Digite o nome do profissional.");

      return;
    }

    let fotoUrl = fotoAtual || null;

    if (arquivoFoto) {
      const novaFoto = await enviarArquivoStorage(arquivoFoto, "profissionais");

      if (novaFoto) {
        fotoUrl = novaFoto;
      }
    }

    let erro = null;

    if (id) {
      const resposta = await supabaseClient
        .from("profissionais")
        .update({
          nome,
          telefone,
          foto_url: fotoUrl,
        })
        .eq("id", id)
        .eq("barbearia_id", lojaId);

      erro = resposta.error;
    } else {
      const resposta = await supabaseClient.from("profissionais").insert({
        barbearia_id: lojaId,
        nome,
        telefone,
        foto_url: fotoUrl,
      });

      erro = resposta.error;
    }

    if (erro) {
      console.error("Erro ao salvar profissional:", erro);

      alert("Não foi possível salvar o profissional.");

      return;
    }

    cancelarEdicaoBarbeiro();

    await carregarProfissionais();
    await carregarDashboard();
  });
}

// EDITAR BARBEIRO

function editarBarbeiro(id) {
  const barbeiro = profissionaisCache.find(
    (item) => String(item.id) === String(id),
  );

  if (!barbeiro) {
    alert("Profissional não encontrado.");

    return;
  }

  document.getElementById("barbeiro-id").value = barbeiro.id;

  document.getElementById("barbeiro-nome").value = barbeiro.nome || "";

  document.getElementById("barbeiro-tel").value = barbeiro.telefone || "";

  document.getElementById("barbeiro-foto-atual").value =
    barbeiro.foto_url || "";

  document.getElementById("barbeiro-foto").value = "";

  btnSalvarBarbeiro.textContent = "Salvar edição";

  btnCancelarBarbeiro.hidden = false;

  formBarbeiro.scrollIntoView({
    behavior: "smooth",
  });
}

// CANCELAR BARBEIRO

function cancelarEdicaoBarbeiro() {
  if (!formBarbeiro) {
    return;
  }

  formBarbeiro.reset();

  document.getElementById("barbeiro-id").value = "";

  document.getElementById("barbeiro-foto-atual").value = "";

  btnSalvarBarbeiro.textContent = "+ Adicionar profissional";

  btnCancelarBarbeiro.hidden = true;

  if (previewBarbeiro) {
    previewBarbeiro.hidden = true;
  }
}

// EXCLUIR BARBEIRO

async function excluirBarbeiro(id) {
  if (!confirm("Remover esse profissional?")) {
    return;
  }

  const { error } = await supabaseClient
    .from("profissionais")
    .delete()
    .eq("id", id)
    .eq("barbearia_id", lojaId);

  if (error) {
    console.error("Erro ao excluir profissional:", error);

    alert("Não foi possível remover o profissional.");

    return;
  }

  await carregarProfissionais();
  await carregarDashboard();
}

// DASHBOARD

async function carregarDashboard() {
  if (!lojaId) {
    return;
  }

  const hoje = obterInicioDoDia();

  const fimHoje = obterFimDoDia();

  // AGENDAMENTOS DE HOJE

  const { data: agendamentosHoje, error: erroAgendamentos } =
    await supabaseClient
      .from("agendamentos")
      .select(
        `
      *,
      servicos(
        nome,
        preco
      ),
      profiles(
        nome
      )
    `,
      )
      .eq("barbearia_id", lojaId)
      .gte("data_hora", hoje.toISOString())
      .lte("data_hora", fimHoje.toISOString())
      .order("data_hora", {
        ascending: true,
      });

  if (erroAgendamentos) {
    console.error("Erro no dashboard:", erroAgendamentos);

    return;
  }

  // TOTAL DE CLIENTES

  const { data: clientes } = await supabaseClient
    .from("agendamentos")
    .select("cliente_id")
    .eq("barbearia_id", lojaId);

  const clientesUnicos = new Set(
    (clientes || []).map((item) => item.cliente_id).filter(Boolean),
  );

  // TOTAL DE PROFISSIONAIS

  const { count: totalProfissionais } = await supabaseClient
    .from("profissionais")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("barbearia_id", lojaId);

  // FATURAMENTO DO DIA

  const faturamento = (agendamentosHoje || [])
    .filter((item) => item.status === "concluido")
    .reduce((total, item) => total + Number(item.servicos?.preco || 0), 0);

  // ATUALIZAR CARDS

  const elementoAgendamentos = document.getElementById(
    "total-agendamentos-hoje",
  );

  const elementoClientes = document.getElementById("total-clientes");

  const elementoProfissionais = document.getElementById("total-profissionais");

  const elementoFaturamento = document.getElementById("faturamento-hoje");

  if (elementoAgendamentos) {
    elementoAgendamentos.textContent = agendamentosHoje?.length || 0;
  }

  if (elementoClientes) {
    elementoClientes.textContent = clientesUnicos.size;
  }

  if (elementoProfissionais) {
    elementoProfissionais.textContent = totalProfissionais || 0;
  }

  if (elementoFaturamento) {
    elementoFaturamento.textContent = formatarMoeda(faturamento);
  }

  renderizarProximosAgendamentos(agendamentosHoje || []);
}

// PRÓXIMOS AGENDAMENTOS

function renderizarProximosAgendamentos(agendamentos) {
  const elemento = document.getElementById("lista-proximos-agendamentos");

  if (!elemento) {
    return;
  }

  const agora = new Date();

  const proximos = agendamentos
    .filter(
      (item) =>
        new Date(item.data_hora) >= agora && item.status !== "cancelado",
    )
    .slice(0, 5);

  elemento.innerHTML = "";

  if (!proximos.length) {
    elemento.innerHTML = `
      <p class="em-breve">
        Nenhum próximo agendamento.
      </p>
    `;

    return;
  }

  proximos.forEach((agendamento) => {
    const dataHora = new Date(agendamento.data_hora);

    const item = document.createElement("div");

    item.classList.add("item-lista");

    item.innerHTML = `
        <div class="item-info">

          <h3>
            ${escaparHtml(agendamento.profiles?.nome || "Cliente")}
          </h3>

          <p>
            ${escaparHtml(agendamento.servicos?.nome || "Serviço")}
            ·
            ${dataHora.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

        </div>

        <div class="item-status">
          ${STATUS_LABEL[agendamento.status] || "Pendente"}
        </div>
      `;

    elemento.appendChild(item);
  });
}

// HORÁRIOS DE FUNCIONAMENTO

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const listaHorariosEl = document.getElementById("lista-horarios");
const formHorarios = document.getElementById("form-horarios");
const btnSalvarHorarios = document.getElementById("btn-salvar-horarios");

// CARREGAR HORÁRIOS

async function carregarHorarios() {
  if (!listaHorariosEl || !lojaId) {
    return false;
  }

  const { data, error } = await supabaseClient
    .from("horarios_funcionamento")
    .select("*")
    .eq("barbearia_id", lojaId)
    .order("dia_semana", {
      ascending: true,
    });

  if (error) {
    console.error("Erro ao carregar horários:", error);

    mostrarMensagem(
      "mensagem-horarios",
      "Não foi possível carregar os horários.",
      "erro",
    );

    return false;
  }

  horariosCache = data || [];

  renderizarHorarios(horariosCache);

  return true;
}

// RENDERIZAR HORÁRIOS

function renderizarHorarios(horarios) {
  if (!listaHorariosEl) {
    return;
  }

  listaHorariosEl.innerHTML = "";

  DIAS_SEMANA.forEach((nomeDia, indice) => {
    const horario = horarios.find((item) => Number(item.dia_semana) === indice);

    const aberto = horario ? horario.aberto : false;

    const horaAbertura = horario?.hora_abertura
      ? horario.hora_abertura.substring(0, 5)
      : "08:00";

    const horaFechamento = horario?.hora_fechamento
      ? horario.hora_fechamento.substring(0, 5)
      : "23:00";

    const intervaloInicio = horario?.intervalo_inicio
      ? horario.intervalo_inicio.substring(0, 5)
      : "";

    const intervaloFim = horario?.intervalo_fim
      ? horario.intervalo_fim.substring(0, 5)
      : "";

    const item = document.createElement("div");

    item.classList.add("horario-item");

    item.innerHTML = `
      <div class="horario-cabecalho">

        <span class="horario-dia">
          ${escaparHtml(nomeDia)}
        </span>

        <label class="horario-toggle">

          <input
            type="checkbox"
            id="horario-aberto-${indice}"
            ${aberto ? "checked" : ""}
            onchange="alternarHorario(${indice})"
          >

          <span>
            ${aberto ? "Aberto" : "Fechado"}
          </span>

        </label>

      </div>

      <div class="horario-campos">

        <div class="horario-campo">

          <label for="horario-abertura-${indice}">
            Abertura
          </label>

          <input
            type="time"
            id="horario-abertura-${indice}"
            value="${horaAbertura}"
            ${!aberto ? "disabled" : ""}
          >

        </div>

        <div class="horario-campo">

          <label for="horario-fechamento-${indice}">
            Fechamento
          </label>

          <input
            type="time"
            id="horario-fechamento-${indice}"
            value="${horaFechamento}"
            ${!aberto ? "disabled" : ""}
          >

        </div>

        <div class="horario-campo">

          <label for="horario-intervalo-inicio-${indice}">
            Início intervalo
          </label>

          <input
            type="time"
            id="horario-intervalo-inicio-${indice}"
            value="${intervaloInicio}"
            ${!aberto ? "disabled" : ""}
          >

        </div>

        <div class="horario-campo">

          <label for="horario-intervalo-fim-${indice}">
            Fim intervalo
          </label>

          <input
            type="time"
            id="horario-intervalo-fim-${indice}"
            value="${intervaloFim}"
            ${!aberto ? "disabled" : ""}
          >

        </div>

      </div>
    `;

    listaHorariosEl.appendChild(item);
  });
}

// ATIVAR / DESATIVAR DIA

function alternarHorario(dia) {
  const checkbox = document.getElementById(`horario-aberto-${dia}`);

  if (!checkbox) {
    return;
  }

  const campos = [
    `horario-abertura-${dia}`,
    `horario-fechamento-${dia}`,
    `horario-intervalo-inicio-${dia}`,
    `horario-intervalo-fim-${dia}`,
  ];

  campos.forEach((id) => {
    const campo = document.getElementById(id);

    if (campo) {
      campo.disabled = !checkbox.checked;
    }
  });

  const texto = checkbox.closest(".horario-toggle")?.querySelector("span");

  if (texto) {
    texto.textContent = checkbox.checked ? "Aberto" : "Fechado";
  }
}

// VALIDAR HORÁRIO

function validarHorarioDia(dia) {
  const checkbox = document.getElementById(`horario-aberto-${dia}`);

  if (!checkbox) {
    return {
      valido: false,
      mensagem: "Dia inválido.",
    };
  }

  // Dia fechado não precisa validar horários
  if (!checkbox.checked) {
    return {
      valido: true,
    };
  }

  const abertura = document.getElementById(`horario-abertura-${dia}`)?.value;

  const fechamento = document.getElementById(
    `horario-fechamento-${dia}`,
  )?.value;

  const intervaloInicio = document.getElementById(
    `horario-intervalo-inicio-${dia}`,
  )?.value;

  const intervaloFim = document.getElementById(
    `horario-intervalo-fim-${dia}`,
  )?.value;

  if (!abertura || !fechamento) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: informe abertura e fechamento.`,
    };
  }

  if (abertura >= fechamento) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: a abertura precisa ser antes do fechamento.`,
    };
  }

  // Se apenas um campo do intervalo foi preenchido
  if (
    (intervaloInicio && !intervaloFim) ||
    (!intervaloInicio && intervaloFim)
  ) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: preencha os dois horários do intervalo.`,
    };
  }

  // Se existe intervalo
  if (intervaloInicio && intervaloFim) {
    if (intervaloInicio >= intervaloFim) {
      return {
        valido: false,
        mensagem: `${DIAS_SEMANA[dia]}: o início do intervalo precisa ser antes do fim.`,
      };
    }

    if (intervaloInicio <= abertura || intervaloFim >= fechamento) {
      return {
        valido: false,
        mensagem: `${DIAS_SEMANA[dia]}: o intervalo precisa estar dentro do horário de funcionamento.`,
      };
    }
  }

  return {
    valido: true,
  };
}

// SALVAR HORÁRIOS

if (formHorarios) {
  formHorarios.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!lojaId) {
      mostrarMensagem(
        "mensagem-horarios",
        "Barbearia não identificada.",
        "erro",
      );

      return;
    }

    if (btnSalvarHorarios) {
      btnSalvarHorarios.disabled = true;
      btnSalvarHorarios.textContent = "Salvando...";
    }

    // VALIDAR TODOS OS DIAS

    for (let dia = 0; dia <= 6; dia++) {
      const validacao = validarHorarioDia(dia);

      if (!validacao.valido) {
        mostrarMensagem("mensagem-horarios", validacao.mensagem, "erro");

        if (btnSalvarHorarios) {
          btnSalvarHorarios.disabled = false;
          btnSalvarHorarios.textContent = "💾 Salvar horários";
        }

        return;
      }
    }

    // MONTAR DADOS

    const dados = [];

    for (let dia = 0; dia <= 6; dia++) {
      const checkbox = document.getElementById(`horario-aberto-${dia}`);

      const aberto = checkbox?.checked || false;

      const abertura = aberto
        ? document.getElementById(`horario-abertura-${dia}`)?.value || null
        : null;

      const fechamento = aberto
        ? document.getElementById(`horario-fechamento-${dia}`)?.value || null
        : null;

      const intervaloInicio = aberto
        ? document.getElementById(`horario-intervalo-inicio-${dia}`)?.value ||
          null
        : null;

      const intervaloFim = aberto
        ? document.getElementById(`horario-intervalo-fim-${dia}`)?.value || null
        : null;

      dados.push({
        dia_semana: dia,
        aberto,
        hora_abertura: abertura,
        hora_fechamento: fechamento,
        intervalo_inicio: intervaloInicio,
        intervalo_fim: intervaloFim,
      });
    }

    // SALVAR

    let erroGeral = null;

    for (const horario of dados) {
      const horarioExistente = horariosCache.find(
        (item) => Number(item.dia_semana) === horario.dia_semana,
      );

      if (horarioExistente) {
        const { error } = await supabaseClient
          .from("horarios_funcionamento")
          .update({
            aberto: horario.aberto,
            hora_abertura: horario.hora_abertura,
            hora_fechamento: horario.hora_fechamento,
            intervalo_inicio: horario.intervalo_inicio,
            intervalo_fim: horario.intervalo_fim,
          })
          .eq("id", horarioExistente.id)
          .eq("barbearia_id", lojaId);

        if (error) {
          erroGeral = error;
          break;
        }
      } else {
        const { error } = await supabaseClient
          .from("horarios_funcionamento")
          .insert({
            barbearia_id: lojaId,
            dia_semana: horario.dia_semana,
            aberto: horario.aberto,
            hora_abertura: horario.hora_abertura,
            hora_fechamento: horario.hora_fechamento,
            intervalo_inicio: horario.intervalo_inicio,
            intervalo_fim: horario.intervalo_fim,
          });

        if (error) {
          erroGeral = error;
          break;
        }
      }
    }

    // RESULTADO

    if (erroGeral) {
      console.error("Erro ao salvar horários:", erroGeral);

      mostrarMensagem(
        "mensagem-horarios",
        "Não foi possível salvar os horários.",
        "erro",
      );

      if (btnSalvarHorarios) {
        btnSalvarHorarios.disabled = false;
        btnSalvarHorarios.textContent = "💾 Salvar horários";
      }

      return;
    }

    await carregarHorarios();

    mostrarMensagem(
      "mensagem-horarios",
      "Horários salvos com sucesso!",
      "sucesso",
    );

    if (btnSalvarHorarios) {
      btnSalvarHorarios.disabled = false;
      btnSalvarHorarios.textContent = "💾 Salvar horários";
    }
  });
}

// FINANCEIRO

const listaFinanceiroEl = document.getElementById("lista-financeiro");
const formGasto = document.getElementById("form-gasto");
const btnSalvarGasto = document.getElementById("btn-salvar-gasto");
const btnCancelarGasto = document.getElementById("btn-cancelar-gasto");

// CARREGAR FINANCEIRO

async function carregarFinanceiro() {
  if (!lojaId) {
    return false;
  }

  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth();

  // Primeiro dia do mês
  const inicioMes = obterDataLocalISO(new Date(ano, mes, 1));

  // Primeiro dia do próximo mês
  const inicioProximoMes = obterDataLocalISO(new Date(ano, mes + 1, 1));

  // CARREGAR GASTOS

  const { data: gastos, error: erroGastos } = await supabaseClient
    .from("gastos")
    .select("*")
    .eq("barbearia_id", lojaId)
    .gte("data_gasto", inicioMes)
    .lt("data_gasto", inicioProximoMes)
    .order("data_gasto", {
      ascending: false,
    });

  if (erroGastos) {
    console.error("Erro ao carregar gastos:", erroGastos);

    gastosCache = [];

    if (listaFinanceiroEl) {
      listaFinanceiroEl.innerHTML = `
        <p class="em-breve">
          Não foi possível carregar os gastos.
        </p>
      `;
    }

    return false;
  }

  gastosCache = gastos || [];

  // CARREGAR ENTRADAS

  const inicioMesDate = new Date(ano, mes, 1, 0, 0, 0, 0);

  const inicioProximoMesDate = new Date(ano, mes + 1, 1, 0, 0, 0, 0);

  const { data: agendamentos, error: erroAgendamentos } = await supabaseClient
    .from("agendamentos")
    .select(
      `
        *,
        servicos(
          preco
        )
      `,
    )
    .eq("barbearia_id", lojaId)
    .gte("data_hora", inicioMesDate.toISOString())
    .lt("data_hora", inicioProximoMesDate.toISOString())
    .neq("status", "cancelado");

  if (erroAgendamentos) {
    console.error("Erro ao carregar entradas:", erroAgendamentos);

    return false;
  }

  // Apenas agendamentos concluídos entram no faturamento
  const entradas = (agendamentos || [])
    .filter((item) => item.status === "concluido")
    .reduce((total, item) => total + Number(item.servicos?.preco || 0), 0);

  // SAÍDAS

  const saidas = gastosCache.reduce(
    (total, item) => total + Number(item.valor || 0),
    0,
  );

  // LUCRO

  const lucro = entradas - saidas;

  // ATUALIZAR CARDS

  const elementoEntradas = document.getElementById("financeiro-entradas");

  const elementoSaidas = document.getElementById("financeiro-saidas");

  const elementoLucro = document.getElementById("financeiro-lucro");

  if (elementoEntradas) {
    elementoEntradas.textContent = formatarMoeda(entradas);
  }

  if (elementoSaidas) {
    elementoSaidas.textContent = formatarMoeda(saidas);
  }

  if (elementoLucro) {
    elementoLucro.textContent = formatarMoeda(lucro);
  }

  renderizarGastos(gastosCache);

  return true;
}

// RENDERIZAR GASTOS

function renderizarGastos(gastos) {
  if (!listaFinanceiroEl) {
    return;
  }

  listaFinanceiroEl.innerHTML = "";

  if (!gastos.length) {
    listaFinanceiroEl.innerHTML = `
      <p class="em-breve">
        Nenhum gasto cadastrado neste mês.
      </p>
    `;

    return;
  }

  gastos.forEach((gasto) => {
    const item = document.createElement("div");

    item.classList.add("item-lista");

    item.innerHTML = `
      <div class="item-info">

        <h3>
          ${escaparHtml(gasto.descricao || "Gasto")}
        </h3>

        <p>
          ${escaparHtml(gasto.categoria || "Sem categoria")}

          ·

          ${formatarData(gasto.data_gasto)}
        </p>

      </div>

      <div class="item-acoes">

        <strong>
          - ${formatarMoeda(gasto.valor)}
        </strong>

        <button
          type="button"
          title="Excluir"
          onclick="excluirGasto('${gasto.id}')"
        >
          🗑️
        </button>

      </div>
    `;

    listaFinanceiroEl.appendChild(item);
  });
}


// SALVAR GASTO


if (formGasto) {
  formGasto.addEventListener("submit", async (event) => {
    event.preventDefault();

    const descricao = document.getElementById("gasto-descricao")?.value.trim();

    const valor = parseFloat(document.getElementById("gasto-valor")?.value);

    const categoria = document.getElementById("gasto-categoria")?.value.trim();

    const dataGasto = document.getElementById("gasto-data")?.value;

    if (!descricao || Number.isNaN(valor) || valor < 0 || !dataGasto) {
      alert("Preencha os dados do gasto corretamente.");

      return;
    }

    const id = document.getElementById("gasto-id")?.value;

    let erro = null;

    if (id) {
      const resposta = await supabaseClient
        .from("gastos")
        .update({
          descricao,
          valor,
          categoria: categoria || null,
          data_gasto: dataGasto,
        })
        .eq("id", id)
        .eq("barbearia_id", lojaId);

      erro = resposta.error;
    } else {
      const resposta = await supabaseClient.from("gastos").insert({
        barbearia_id: lojaId,
        descricao,
        valor,
        categoria: categoria || null,
        data_gasto: dataGasto,
      });

      erro = resposta.error;
    }

    if (erro) {
      console.error("Erro ao salvar gasto:", erro);

      alert("Não foi possível salvar o gasto.");

      return;
    }

    cancelarEdicaoGasto();

    await carregarFinanceiro();
  });
}


// EDITAR GASTO


function editarGasto(id) {
  const gasto = gastosCache.find((item) => String(item.id) === String(id));

  if (!gasto) {
    alert("Gasto não encontrado.");

    return;
  }

  document.getElementById("gasto-id").value = gasto.id;

  document.getElementById("gasto-descricao").value = gasto.descricao || "";

  document.getElementById("gasto-valor").value = gasto.valor || 0;

  document.getElementById("gasto-categoria").value = gasto.categoria || "";

  document.getElementById("gasto-data").value = gasto.data_gasto || "";

  if (btnSalvarGasto) {
    btnSalvarGasto.textContent = "Salvar edição";
  }

  if (btnCancelarGasto) {
    btnCancelarGasto.hidden = false;
  }

  formGasto?.scrollIntoView({
    behavior: "smooth",
  });
}


// CANCELAR EDIÇÃO


function cancelarEdicaoGasto() {
  if (!formGasto) {
    return;
  }

  formGasto.reset();

  const campoId = document.getElementById("gasto-id");

  if (campoId) {
    campoId.value = "";
  }

  const campoData = document.getElementById("gasto-data");

  if (campoData) {
    campoData.value = obterDataLocalISO();
  }

  if (btnSalvarGasto) {
    btnSalvarGasto.textContent = "+ Adicionar gasto";
  }

  if (btnCancelarGasto) {
    btnCancelarGasto.hidden = true;
  }
}


// EXCLUIR GASTO


async function excluirGasto(id) {
  if (!confirm("Remover este gasto?")) {
    return;
  }

  const { error } = await supabaseClient
    .from("gastos")
    .delete()
    .eq("id", id)
    .eq("barbearia_id", lojaId);

  if (error) {
    console.error("Erro ao excluir gasto:", error);

    alert("Não foi possível remover o gasto.");

    return;
  }

  await carregarFinanceiro();
}

// CONFIGURAÇÕES

async function carregarConfiguracoes() {
  if (!lojaAtual || !sessaoAtual) {
    return;
  }

  const configNome = document.getElementById("config-nome");

  const configTelefone = document.getElementById("config-telefone");

  const configCidade = document.getElementById("config-cidade");

  const configEndereco = document.getElementById("config-endereco");

  const usuarioNome = document.getElementById("config-usuario-nome");

  const usuarioTelefone = document.getElementById("config-usuario-telefone");

  const usuarioEmail = document.getElementById("config-usuario-email");

  if (configNome) {
    configNome.value = lojaAtual.nome || "";
  }

  if (configTelefone) {
    configTelefone.value = lojaAtual.telefone || "";
  }

  if (configCidade) {
    configCidade.value = lojaAtual.cidade || "";
  }

  if (configEndereco) {
    configEndereco.value = lojaAtual.endereco || "";
  }

  const { data: perfil, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", sessaoAtual.user.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar perfil:", error);
  }

  if (usuarioNome) {
    usuarioNome.value = perfil?.nome || "";
  }

  if (usuarioTelefone) {
    usuarioTelefone.value = perfil?.telefone || "";
  }

  if (usuarioEmail) {
    usuarioEmail.value = sessaoAtual.user.email || "";
  }
}

// FORMULÁRIO DA BARBEARIA

const formConfiguracaoBarbearia = document.getElementById(
  "form-configuracao-barbearia",
);

if (formConfiguracaoBarbearia) {
  formConfiguracaoBarbearia.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("config-nome")?.value.trim();

    const telefone = document.getElementById("config-telefone")?.value.trim();

    const cidade = document.getElementById("config-cidade")?.value.trim();

    const endereco = document.getElementById("config-endereco")?.value.trim();

    if (!nome) {
      alert("O nome da barbearia é obrigatório.");

      return;
    }

    const { error } = await supabaseClient
      .from("barbearias")
      .update({
        nome,
        telefone,
        cidade,
        endereco,
      })
      .eq("id", lojaId)
      .eq("dono_id", sessaoAtual.user.id);

    if (error) {
      console.error("Erro ao atualizar barbearia:", error);

      alert("Não foi possível salvar as alterações.");

      return;
    }

    lojaAtual = {
      ...lojaAtual,
      nome,
      telefone,
      cidade,
      endereco,
    };

    await carregarLoja();

    alert("Dados da barbearia atualizados!");
  });
}

// FORMULÁRIO DO USUÁRIO

const formConfiguracaoUsuario = document.getElementById(
  "form-configuracao-usuario",
);

if (formConfiguracaoUsuario) {
  formConfiguracaoUsuario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("config-usuario-nome")?.value.trim();

    const telefone = document
      .getElementById("config-usuario-telefone")
      ?.value.trim();

    if (!nome) {
      alert("Informe seu nome.");

      return;
    }

    const { error } = await supabaseClient
      .from("profiles")
      .update({
        nome,
        telefone,
      })
      .eq("id", sessaoAtual.user.id);

    if (error) {
      console.error("Erro ao atualizar usuário:", error);

      alert("Não foi possível salvar seus dados.");

      return;
    }

    alert("Seus dados foram atualizados!");
  });
}

// ALTERAR SENHA

const btnAlterarSenha = document.getElementById("btn-alterar-senha");

if (btnAlterarSenha) {
  btnAlterarSenha.addEventListener("click", async () => {
    const novaSenha = prompt("Digite sua nova senha:");

    if (!novaSenha) {
      return;
    }

    if (novaSenha.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");

      return;
    }

    const confirmacao = prompt("Digite novamente a nova senha:");

    if (novaSenha !== confirmacao) {
      alert("As senhas não são iguais.");

      return;
    }

    const { error } = await supabaseClient.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      console.error("Erro ao alterar senha:", error);

      alert("Não foi possível alterar a senha.");

      return;
    }

    alert("Senha alterada com sucesso!");
  });
}

// EXCLUIR BARBEARIA

const btnExcluirBarbearia = document.getElementById("btn-excluir-barbearia");

if (btnExcluirBarbearia) {
  btnExcluirBarbearia.addEventListener("click", async () => {
    if (!lojaAtual) {
      return;
    }

    const confirmacao = prompt(
      `Digite "${lojaAtual.nome}" para confirmar a exclusão:`,
    );

    if (confirmacao !== lojaAtual.nome) {
      alert("Exclusão cancelada.");

      return;
    }

    const segundaConfirmacao = confirm(
      "ATENÇÃO: essa ação pode remover a barbearia definitivamente. Deseja continuar?",
    );

    if (!segundaConfirmacao) {
      return;
    }

    const { error } = await supabaseClient
      .from("barbearias")
      .delete()
      .eq("id", lojaId)
      .eq("dono_id", sessaoAtual.user.id);

    if (error) {
      console.error("Erro ao excluir barbearia:", error);

      alert(
        "Não foi possível excluir a barbearia. Verifique se existem registros vinculados a ela.",
      );

      return;
    }

    alert("Barbearia excluída com sucesso.");

    await supabaseClient.auth.signOut();

    window.location.href = "../barbearia/index.html";
  });
}

// RELATÓRIOS

document.querySelectorAll(".btn-relatorio").forEach((botao) => {
  botao.addEventListener("click", () => {
    document.querySelectorAll(".btn-relatorio").forEach((item) => {
      item.classList.remove("btn-relatorio--ativo");
    });

    botao.classList.add("btn-relatorio--ativo");

    tipoRelatorioSelecionado = botao.dataset.relatorio || "geral";
  });
});

// DATAS PADRÃO DOS RELATÓRIOS

const campoDataInicial = document.getElementById("relatorio-data-inicial");

const campoDataFinal = document.getElementById("relatorio-data-final");

if (campoDataInicial && campoDataFinal) {
  const hoje = new Date();

  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  campoDataInicial.value = obterDataLocalISO(primeiroDia);

  campoDataFinal.value = obterDataLocalISO(hoje);
}

// GERAR RELATÓRIO

const btnGerarRelatorio = document.getElementById("btn-gerar-relatorio");

if (btnGerarRelatorio) {
  btnGerarRelatorio.addEventListener("click", gerarRelatorio);
}

async function gerarRelatorio() {
  const dataInicial = document.getElementById("relatorio-data-inicial")?.value;

  const dataFinal = document.getElementById("relatorio-data-final")?.value;

  if (!dataInicial || !dataFinal) {
    alert("Informe a data inicial e a data final.");

    return;
  }

  if (dataInicial > dataFinal) {
    alert("A data inicial não pode ser maior que a data final.");

    return;
  }

  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select(
      `
        *,
        servicos(
          nome,
          preco
        ),
        profiles(
          nome
        )
      `,
    )
    .eq("barbearia_id", lojaId)
    .gte("data_hora", `${dataInicial}T00:00:00`)
    .lte("data_hora", `${dataFinal}T23:59:59`)
    .order("data_hora", {
      ascending: true,
    });

  if (error) {
    console.error("Erro ao gerar relatório:", error);

    alert("Não foi possível gerar o relatório.");

    return;
  }

  const agendamentos = data || [];

  const total = agendamentos.length;

  const concluidos = agendamentos.filter((item) => item.status === "concluido");

  const faturamento = concluidos.reduce(
    (soma, item) => soma + Number(item.servicos?.preco || 0),
    0,
  );

  const janela = window.open("", "_blank");

  if (!janela) {
    alert("Permita pop-ups no navegador para gerar o relatório.");

    return;
  }

  const nomeLoja = escaparHtml(lojaAtual?.nome || "BarberHub");

  const linhas = agendamentos
    .map(
      (item) => `
          <tr>

            <td>
              ${escaparHtml(item.profiles?.nome || "Cliente")}
            </td>

            <td>
              ${escaparHtml(item.servicos?.nome || "Serviço")}
            </td>

            <td>
              ${formatarDataHora(item.data_hora)}
            </td>

            <td>
              ${STATUS_LABEL[item.status] || "Pendente"}
            </td>

          </tr>
        `,
    )
    .join("");

  janela.document.write(`
    <!DOCTYPE html>

    <html lang="pt-BR">

    <head>

      <meta charset="UTF-8">

      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      >

      <title>
        Relatório - ${nomeLoja}
      </title>

      <style>

        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #222;
          background: #fff;
        }

        h1 {
          margin-bottom: 5px;
        }

        .resumo {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 15px;
          margin: 30px 0;
        }

        .card {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 10px;
        }

        .card strong {
          display: block;
          font-size: 28px;
          margin-top: 8px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 30px;
        }

        th,
        td {
          padding: 12px;
          border-bottom:
            1px solid #ddd;
          text-align: left;
        }

        .botao {
          padding: 10px 18px;
          margin-top: 20px;
          cursor: pointer;
        }

        @media print {
          .botao {
            display: none;
          }

          body {
            padding: 0;
          }
        }

      </style>

    </head>

    <body>

      <h1>
        ${nomeLoja}
      </h1>

      <p>
        Relatório:
        ${escaparHtml(tipoRelatorioSelecionado)}
      </p>

      <p>
        Período:
        ${formatarData(dataInicial)}
        até
        ${formatarData(dataFinal)}
      </p>

      <div class="resumo">

        <div class="card">

          Agendamentos

          <strong>
            ${total}
          </strong>

        </div>

        <div class="card">

          Concluídos

          <strong>
            ${concluidos.length}
          </strong>

        </div>

        <div class="card">

          Faturamento

          <strong>
            ${formatarMoeda(faturamento)}
          </strong>

        </div>

      </div>

      <table>

        <thead>

          <tr>
            <th>Cliente</th>
            <th>Serviço</th>
            <th>Data</th>
            <th>Status</th>
          </tr>

        </thead>

        <tbody>

          ${
            linhas ||
            `
              <tr>
                <td colspan="4">
                  Nenhum agendamento encontrado.
                </td>
              </tr>
            `
          }

        </tbody>

      </table>

      <button
        class="botao"
        onclick="window.print()"
      >
        Imprimir / Salvar PDF
      </button>

    </body>

    </html>
  `);

  janela.document.close();
}


// WHATSAPP


const btnEnviarWhatsapp =
  document.getElementById(
    "btn-enviar-whatsapp"
  );

if (btnEnviarWhatsapp) {
  btnEnviarWhatsapp.addEventListener(
    "click",
    () => {
      const dataInicial =
        document.getElementById(
          "relatorio-data-inicial"
        )?.value;

      const dataFinal =
        document.getElementById(
          "relatorio-data-final"
        )?.value;

      if (!dataInicial || !dataFinal) {
        alert(
          "Informe o período do relatório."
        );

        return;
      }

      if (dataInicial > dataFinal) {
        alert(
          "A data inicial não pode ser maior que a data final."
        );

        return;
      }

      const mensagem = `
${lojaAtual?.nome || "Barbearia"}

Relatório: ${tipoRelatorioSelecionado}

Período:
${formatarData(dataInicial)} até ${formatarData(dataFinal)}

Relatório gerado pelo BarberHub.
      `.trim();

      const url =
        `https://wa.me/?text=${encodeURIComponent(
          mensagem
        )}`;

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  );
}

// INICIAR PAINEL

async function iniciarPainel() {
  try {
    // 1. CARREGAR LOJA

    const lojaCarregada = await carregarLoja();

    if (!lojaCarregada) {
      return;
    }

    // 2. CARREGAR DADOS PRINCIPAIS

    await Promise.all([
      carregarServicos(),
      carregarProdutos(),
      carregarAgendamentos(),
      carregarProfissionais(),
      carregarFinanceiro(),
      carregarHorarios(),
    ]);

    // 3. CARREGAR DASHBOARD

    await carregarDashboard();

    // 4. CONFIGURAÇÕES

    await carregarConfiguracoes();

    // 5. ABRIR VISÃO GERAL

    mudarAba("visao-geral");

    // 6. ESCONDER LOADING

    esconderTelaCarregamento();
  } catch (erro) {
    console.error("Erro inesperado ao iniciar painel:", erro);

    mostrarErroCarregamento("Ocorreu um erro inesperado ao carregar o painel.");
  }
}

// INICIAR SISTEMA
(carregarHorarios(), iniciarPainel());

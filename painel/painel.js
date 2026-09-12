// 1. CONFIGURAÇÃO E IDENTIFICAÇÃO

const parametros = new URLSearchParams(window.location.search);
const lojaId = parametros.get("id");

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
// NOTIFICAÇÕES

let quantidadeNotificacoesAnterior = 0;

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
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mostrarMensagem(id, mensagem, tipo = "sucesso") {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return;
  }

  elemento.textContent = mensagem;
  elemento.className = `mensagem mensagem--${tipo}`;
  elemento.hidden = false;

  setTimeout(() => {
    elemento.hidden = true;
  }, 4000);
}

// 2. NAVEGAÇÃO - CONTA E BARBEARIA

async function sair() {
  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  } catch (erro) {
    console.error("Erro ao sair:", erro);
  }

  window.location.href = "../login/index.html";
}

function trocarBarbearia() {
  window.location.href = "../barbearias/index.html";
}

function adicionarBarbearia() {
  window.location.href = "../cadastro/index.html";
}

async function voltar() {
  await sair();
}

// MENU MOBILE

function alternarMenuMobile() {
  if (!menuMobile) {
    return;
  }

  menuMobile.classList.toggle("mobile-menu--aberto");
}

function fecharMenuMobile() {
  if (!menuMobile) {
    return;
  }

  menuMobile.classList.remove("mobile-menu--aberto");
}

if (btnMenuMobile) {
  btnMenuMobile.addEventListener("click", alternarMenuMobile);
}

if (btnMenuBottom) {
  btnMenuBottom.addEventListener("click", alternarMenuMobile);
}

// TROCA DE ABA

function mudarAba(aba) {
  const botoes = document.querySelectorAll(".menu-item");

  const conteudos = document.querySelectorAll(".painel-conteudo");

  // MENU PRINCIPAL

  botoes.forEach((botao) => {
    botao.classList.toggle("menu-item--ativo", botao.dataset.aba === aba);
  });

  // CONTEÚDO DAS ABAS

  conteudos.forEach((conteudo) => {
    conteudo.hidden = conteudo.id !== `conteudo-${aba}`;
  });

  // NAVEGAÇÃO INFERIOR MOBILE

  document.querySelectorAll(".mobile-bottom-item").forEach((botao) => {
    botao.classList.toggle(
      "mobile-bottom-item--ativo",
      botao.dataset.aba === aba,
    );
  });

  // FECHA MENU MOBILE

  fecharMenuMobile();

  // VOLTA PARA O TOPO

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  // CARREGAMENTOS ESPECÍFICOS

  if (aba === "visao-geral") {
    carregarDashboard();
  }

  if (aba === "agendamentos") {
    carregarAgendamentos();
  }

  if (aba === "clientes") {
    carregarClientes();
  }

  if (aba === "profissionais") {
    carregarProfissionais();
  }

  if (aba === "horarios") {
    carregarHorarios();
  }

  if (aba === "financeiro") {
    carregarFinanceiro();
  }

  if (aba === "configuracoes") {
    carregarConfiguracoes();
  }
}

// EVENTOS DO MENU PRINCIPAL

document.querySelectorAll(".menu-item").forEach((botao) => {
  botao.addEventListener("click", () => {
    const aba = botao.dataset.aba;

    if (aba) {
      mudarAba(aba);
    }
  });
});

// EVENTOS DA NAVEGAÇÃO MOBILE

document.querySelectorAll(".mobile-bottom-item").forEach((botao) => {
  botao.addEventListener("click", () => {
    const aba = botao.dataset.aba;

    if (aba) {
      mudarAba(aba);
    }
  });
});

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

      <img
        src="../assets/barber.png"
        alt="BarberHub"
        class="carregamento-logo"
      >

      <h2>BarberHub</h2>

      <p>${escaparHtml(mensagem)}</p>

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
  // VERIFICAR ID DA BARBEARIA
  if (!lojaId) {
    mostrarErroCarregamento("Nenhuma barbearia foi identificada.");

    return false;
  }

  // VERIFICAR SESSÃO
  const {
    data: { session },
    error: sessionError,
  } = await supabaseClient.auth.getSession();

  if (sessionError) {
    console.error("Erro ao verificar sessão:", sessionError);

    mostrarErroCarregamento("Não foi possível verificar sua sessão.");

    return false;
  }

  // USUÁRIO NÃO ESTÁ LOGADO
  if (!session) {
    window.location.href = "../login/index.html";

    return false;
  }

  sessaoAtual = session;

  // BUSCAR BARBEARIA

  const { data: loja, error } = await supabaseClient
    .from("barbearias")
    .select("*")
    .eq("id", lojaId)
    .eq("dono_id", session.user.id)
    .single();

  // VALIDAR ACESSO

  if (error || !loja) {
    console.error("Erro ao carregar barbearia:", error);

    mostrarErroCarregamento(
      "Você não tem acesso a esta barbearia ou ela não existe.",
    );

    return false;
  }

  // GUARDAR BARBEARIA ATUAL

  lojaAtual = loja;

  // Atualiza o cabeçalho com os dados da barbearia.
  atualizarCabecalhoLoja();

  return true;
}

// CABEÇALHO DA BARBEARIA

function atualizarCabecalhoLoja() {
  if (!painelHeader || !lojaAtual) {
    return;
  }

  // LOGO

  const logo = lojaAtual.logo_url;

  // HTML DO CABEÇALHO

  painelHeader.innerHTML = `
    <div class="painel-header-info">

      <div class="painel-header-logo">

        ${
          logo
            ? `
              <img
                src="${escaparHtml(logo)}"
                alt="${escaparHtml(lojaAtual.nome || "Barbearia")}"
              >
            `
            : `
              <div class="painel-header-logo-vazio">
                💈
              </div>
            `
        }

      </div>

      <div>

        <h1>
          ${escaparHtml(lojaAtual.nome || "Minha barbearia")}
        </h1>

        <p>
          ${escaparHtml(lojaAtual.cidade || "Painel de gestão")}
        </p>

      </div>

    </div>

    <div class="painel-header-acoes">

      <button
        type="button"
        class="btn-header"
        onclick="trocarBarbearia()"
      >
        🔄 Trocar barbearia
      </button>

    </div>
  `;
}

// 4 .SERVIÇOS e ELEMENTOS DO HTML

const formServico = document.getElementById("form-servico");
const listaServicosEl = document.getElementById("lista-servicos");
const btnSalvarServico = document.getElementById("btn-salvar-servico");
const btnCancelarServico = document.getElementById("btn-cancelar-servico");

// CARREGAR SERVIÇOS

async function carregarServicos() {
  if (!listaServicosEl || !lojaId) {
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
    console.error("Erro ao carregar serviços:", error);

    listaServicosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os serviços.
      </p>
    `;

    return false;
  }

  servicosCache = data || [];

  renderizarServicos(servicosCache);

  // 🔄 Atualiza o select de serviço do agendamento
  preencherServicosAgendamento();

  return true;
}

// RENDERIZAR SERVIÇOS

function renderizarServicos(servicos) {
  if (!listaServicosEl) {
    return;
  }

  listaServicosEl.innerHTML = "";

  // Nenhum serviço cadastrado
  if (!servicos.length) {
    listaServicosEl.innerHTML = `
      <p class="em-breve">
        Nenhum serviço cadastrado.
      </p>
    `;

    return;
  }

  // Criar cada serviço na tela
  servicos.forEach((servico) => {
    const item = document.createElement("div");

    item.classList.add("item-lista");

    item.innerHTML = `
      <div class="item-info">

        <h3>
          ${escaparHtml(servico.nome || "Serviço")}
        </h3>

        <p>
          ${formatarMoeda(servico.preco)}
          ·
          ${Number(servico.duracao || 0)} min
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

// SALVAR / EDITAR SERVIÇO

if (formServico) {
  formServico.addEventListener("submit", async (event) => {
    event.preventDefault();

    // PEGAR DADOS DO FORMULÁRIO

    const id = document.getElementById("servico-id")?.value;

    const nome = document.getElementById("servico-nome")?.value.trim();

    const preco = parseFloat(document.getElementById("servico-preco")?.value);

    const duracao = parseInt(
      document.getElementById("servico-duracao")?.value,
      10,
    );

    // VALIDAR DADOS

    if (
      !nome ||
      Number.isNaN(preco) ||
      preco < 0 ||
      Number.isNaN(duracao) ||
      duracao <= 0
    ) {
      mostrarMensagem(
        "mensagem-servico",
        "Preencha os dados do serviço corretamente.",
        "erro",
      );

      return;
    }

    // BLOQUEAR BOTÃO

    if (btnSalvarServico) {
      btnSalvarServico.disabled = true;
      btnSalvarServico.textContent = "Salvando...";
    }

    // SALVAR OU ATUALIZAR

    let erro = null;

    // EDIÇÃO
    if (id) {
      const resposta = await supabaseClient
        .from("servicos")
        .update({
          nome,
          preco,
          duracao,
        })
        .eq("id", id)
        .eq("barbearia_id", lojaId);

      erro = resposta.error;
    }

    // NOVO SERVIÇO
    else {
      const resposta = await supabaseClient.from("servicos").insert({
        barbearia_id: lojaId,
        nome,
        preco,
        duracao,
      });

      erro = resposta.error;
    }

    // TRATAR ERRO

    if (erro) {
      console.error("Erro ao salvar serviço:", erro);

      mostrarMensagem(
        "mensagem-servico",
        "Não foi possível salvar o serviço.",
        "erro",
      );

      if (btnSalvarServico) {
        btnSalvarServico.disabled = false;

        btnSalvarServico.textContent = id
          ? "Salvar edição"
          : "+ Adicionar serviço";
      }

      return;
    }

    // ATUALIZAR INTERFACE

    cancelarEdicaoServico();

    await carregarServicos();

    await carregarDashboard();

    mostrarMensagem(
      "mensagem-servico",
      "Serviço salvo com sucesso!",
      "sucesso",
    );
  });
}

// EDITAR SERVIÇO

function editarServico(id) {
  const servico = servicosCache.find((item) => String(item.id) === String(id));

  if (!servico) {
    alert("Serviço não encontrado.");

    return;
  }

  // Preencher formulário
  document.getElementById("servico-id").value = servico.id;

  document.getElementById("servico-nome").value = servico.nome || "";

  document.getElementById("servico-preco").value = servico.preco ?? "";

  document.getElementById("servico-duracao").value = servico.duracao ?? "";

  // Alterar botão
  if (btnSalvarServico) {
    btnSalvarServico.textContent = "Salvar edição";
  }

  // Mostrar botão cancelar
  if (btnCancelarServico) {
    btnCancelarServico.hidden = false;
  }

  // Levar usuário até o formulário
  formServico?.scrollIntoView({
    behavior: "smooth",
  });
}

// CANCELAR EDIÇÃO

function cancelarEdicaoServico() {
  if (!formServico) {
    return;
  }

  formServico.reset();

  const campoId = document.getElementById("servico-id");

  if (campoId) {
    campoId.value = "";
  }

  if (btnSalvarServico) {
    btnSalvarServico.textContent = "+ Adicionar serviço";

    btnSalvarServico.disabled = false;
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
  if (!confirm("Remover este serviço?")) {
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

  await carregarDashboard();
}

// 7. PRODUTOS E ESTOQUE

// 7.1 — Elementos da seção

const formProduto = document.getElementById("form-produto");
const listaProdutosEl = document.getElementById("lista-produtos");
const btnSalvarProduto = document.getElementById("btn-salvar-produto");
const btnCancelarProduto = document.getElementById("btn-cancelar-produto");
const inputFotoProduto = document.getElementById("produto-foto");
const previewProduto = document.getElementById("preview-produto");
const previewProdutoImg = document.getElementById("preview-produto-img");

// 7.2 — Storage: envio de arquivos

async function enviarArquivoStorage(arquivo, pasta) {
  if (!arquivo || !sessaoAtual?.user?.id) {
    return null;
  }
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";

  const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`;

  const caminho = `${sessaoAtual.user.id}/${pasta}/${nomeArquivo}`;

  const { error } = await supabaseClient.storage
    .from("barbearias")
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Erro ao enviar arquivo:", error);

    alert("Não foi possível enviar a imagem.");

    return null;
  }

  const { data } = supabaseClient.storage
    .from("barbearias")
    .getPublicUrl(caminho);

  return data?.publicUrl || null;
}
// 7.3 — Carregar produtos

async function carregarProdutos() {
  if (!listaProdutosEl || !lojaId) {
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
    console.error("Erro ao carregar produtos:", error);

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

// 7.4 — Renderizar produtos

function renderizarProdutos(produtos) {
  if (!listaProdutosEl) {
    return;
  }

  listaProdutosEl.innerHTML = "";

  if (!produtos.length) {
    listaProdutosEl.innerHTML = `
            <p class="em-breve">
                Nenhum produto cadastrado.
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
                                🧴
                            </div>
                        `
                }
                <div>

                    <h3>
                        ${escaparHtml(produto.nome || "Produto")}
                    </h3>

                    <p>
                        ${formatarMoeda(produto.preco)}
                        ·
                        Estoque: ${Number(produto.estoque || 0)}
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

// 7.5 — Pré-visualização da foto

if (inputFotoProduto) {
  inputFotoProduto.addEventListener("change", () => {
    const arquivo = inputFotoProduto.files?.[0];

    if (!arquivo) {
      if (previewProduto) {
        previewProduto.hidden = true;
      }

      return;
    }

    if (previewProdutoImg) {
      previewProdutoImg.src = URL.createObjectURL(arquivo);
    }

    if (previewProduto) {
      previewProduto.hidden = false;
    }
  });
}

// 7.6 — Salvar produto

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

    // Validação

    if (
      !nome ||
      Number.isNaN(preco) ||
      preco < 0 ||
      Number.isNaN(estoque) ||
      estoque < 0
    ) {
      mostrarMensagem(
        "mensagem-produto",
        "Preencha os dados do produto corretamente.",
        "erro",
      );

      return;
    }

    // Estado do botão

    if (btnSalvarProduto) {
      btnSalvarProduto.disabled = true;
      btnSalvarProduto.textContent = "Salvando...";
    }

    // Foto

    let fotoUrl = fotoAtual || null;

    if (arquivoFoto) {
      const novaFoto = await enviarArquivoStorage(arquivoFoto, "produtos");

      if (novaFoto) {
        fotoUrl = novaFoto;
      }
    }

    // Dados do produto

    const dadosProduto = {
      nome,
      preco,
      estoque,
      foto_url: fotoUrl,
    };

    // Atualizar produto existente

    let erro = null;

    if (id) {
      const resposta = await supabaseClient
        .from("produtos")
        .update(dadosProduto)
        .eq("id", id)
        .eq("barbearia_id", lojaId);

      erro = resposta.error;
    }

    // Criar novo produto
    else {
      const resposta = await supabaseClient.from("produtos").insert({
        barbearia_id: lojaId,
        ...dadosProduto,
      });

      erro = resposta.error;
    }

    // Tratamento de erro

    if (erro) {
      console.error("Erro ao salvar produto:", erro);

      mostrarMensagem(
        "mensagem-produto",
        "Não foi possível salvar o produto.",
        "erro",
      );

      if (btnSalvarProduto) {
        btnSalvarProduto.disabled = false;

        btnSalvarProduto.textContent = id
          ? "Salvar edição"
          : "+ Adicionar produto";
      }

      return;
    }

    // Finalização

    cancelarEdicaoProduto();

    await carregarProdutos();

    mostrarMensagem(
      "mensagem-produto",
      "Produto salvo com sucesso!",
      "sucesso",
    );
  });
}

// 7.7 — Editar produto

function editarProduto(id) {
  const produto = produtosCache.find((item) => String(item.id) === String(id));

  if (!produto) {
    alert("Produto não encontrado.");

    return;
  }

  document.getElementById("produto-id").value = produto.id;

  document.getElementById("produto-nome").value = produto.nome || "";

  document.getElementById("produto-preco").value = produto.preco ?? "";

  document.getElementById("produto-estoque").value = produto.estoque ?? 0;

  document.getElementById("produto-foto-atual").value = produto.foto_url || "";

  document.getElementById("produto-foto").value = "";

  if (produto.foto_url && previewProdutoImg) {
    previewProdutoImg.src = produto.foto_url;

    if (previewProduto) {
      previewProduto.hidden = false;
    }
  }

  if (btnSalvarProduto) {
    btnSalvarProduto.textContent = "Salvar edição";
  }

  if (btnCancelarProduto) {
    btnCancelarProduto.hidden = false;
  }

  formProduto?.scrollIntoView({
    behavior: "smooth",
  });
}

// 7.8 — Cancelar edição

function cancelarEdicaoProduto() {
  if (!formProduto) {
    return;
  }

  formProduto.reset();

  const campoId = document.getElementById("produto-id");

  const campoFotoAtual = document.getElementById("produto-foto-atual");

  if (campoId) {
    campoId.value = "";
  }

  if (campoFotoAtual) {
    campoFotoAtual.value = "";
  }

  if (previewProduto) {
    previewProduto.hidden = true;
  }

  if (previewProdutoImg) {
    previewProdutoImg.src = "";
  }

  if (btnSalvarProduto) {
    btnSalvarProduto.textContent = "+ Adicionar produto";

    btnSalvarProduto.disabled = false;
  }

  if (btnCancelarProduto) {
    btnCancelarProduto.hidden = true;
  }
}

// 7.9 — Botão cancelar

if (btnCancelarProduto) {
  btnCancelarProduto.addEventListener("click", cancelarEdicaoProduto);
}

// 7.10 — Excluir produto

async function excluirProduto(id) {
  if (!confirm("Remover este produto?")) {
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

// 8. AGENDAMENTOS

// 8.1 — Elementos da seção

const formAgendamentoManual = document.getElementById(
  "form-agendamento-manual",
);

const btnSalvarAgendamentoManual = document.getElementById(
  "btn-salvar-agendamento-manual",
);

const listaAgendamentosEl = document.getElementById("lista-agendamentos");

// 8.2 — Preencher clientes no agendamento

function preencherClientesAgendamento() {
  const select = document.getElementById("agendamento-cliente");

  if (!select) {
    return;
  }

  const valorAtual = select.value;

  select.innerHTML = `
        <option value="">
            Selecione o cliente
        </option>

        ${clientesCache
          .map(
            (cliente) => `
                    <option value="${escaparHtml(cliente.id)}">
                        ${escaparHtml(cliente.nome || "Cliente")}
                        ${
                          cliente.telefone
                            ? ` · ${escaparHtml(cliente.telefone)}`
                            : ""
                        }
                    </option>
                `,
          )
          .join("")}
    `;

  if (
    valorAtual &&
    clientesCache.some((cliente) => String(cliente.id) === String(valorAtual))
  ) {
    select.value = valorAtual;
  }
}

// 8.3 — Preencher serviços no agendamento

function preencherServicosAgendamento() {
  const select = document.getElementById("agendamento-servico");

  if (!select) {
    return;
  }

  const valorAtual = select.value;

  select.innerHTML = `
        <option value="">
            Selecione o serviço
        </option>

        ${servicosCache
          .map(
            (servico) => `
                    <option value="${escaparHtml(servico.id)}">
                        ${escaparHtml(servico.nome || "Serviço")}
                        ·
                        ${formatarMoeda(servico.preco)}
                    </option>
                `,
          )
          .join("")}
    `;

  if (
    valorAtual &&
    servicosCache.some((servico) => String(servico.id) === String(valorAtual))
  ) {
    select.value = valorAtual;
  }
}

// 8.4 — Preparar formulário de agendamento

function prepararFormularioAgendamentoManual() {
  const campoData = document.getElementById("agendamento-data");

  if (campoData && !campoData.value) {
    campoData.value = obterDataLocalISO();
  }

  preencherClientesAgendamento();

  preencherServicosAgendamento();
}
prepararFormularioAgendamentoManual();

// 8.5 — Salvar agendamento manual

if (formAgendamentoManual) {
  formAgendamentoManual.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Dados do formulário

    const clienteId = document.getElementById("agendamento-cliente")?.value;
    const servicoId = document.getElementById("agendamento-servico")?.value;
    const data = document.getElementById("agendamento-data")?.value;
    const horario = document.getElementById("agendamento-horario")?.value;

    // Validação

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

    // Cliente selecionado

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

    // Serviço selecionado

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

    // Estado do botão

    if (btnSalvarAgendamentoManual) {
      btnSalvarAgendamentoManual.disabled = true;
      btnSalvarAgendamentoManual.textContent = "Cadastrando...";
    }

    // Criar agendamento

    const { error } = await supabaseClient.from("agendamentos").insert({
      barbearia_id: lojaId,
      cliente_id: cliente.id,
      servico_id: servico.id,
      data_hora: new Date(`${data}T${horario}:00`).toISOString(),
      status: "pendente",
      cliente_nome: cliente.nome,
      cliente_telefone: cliente.telefone || null,
    });

    // Tratamento de erro

    if (error) {
      console.error("Erro ao cadastrar atendimento manual:", error);

      mostrarMensagem(
        "mensagem-agendamento-manual",
        "Não foi possível cadastrar o atendimento.",
        "erro",
      );

      if (btnSalvarAgendamentoManual) {
        btnSalvarAgendamentoManual.disabled = false;

        btnSalvarAgendamentoManual.textContent = "+ Cadastrar atendimento";
      }

      return;
    }

    // Limpar formulário

    formAgendamentoManual.reset();

    const campoData = document.getElementById("agendamento-data");

    if (campoData) {
      campoData.value = obterDataLocalISO();
    }

    preencherClientesAgendamento();
    preencherServicosAgendamento();

    // Atualizar sistema

    await carregarAgendamentos();
    await carregarDashboard();

    // Só chamamos se essa função existir.
    if (typeof carregarNotificacoes === "function") {
      await carregarNotificacoes();
    }

    // Mensagem de sucesso

    mostrarMensagem(
      "mensagem-agendamento-manual",
      "Atendimento cadastrado com sucesso!",
      "sucesso",
    );

    // Restaurar botão

    if (btnSalvarAgendamentoManual) {
      btnSalvarAgendamentoManual.disabled = false;

      btnSalvarAgendamentoManual.textContent = "+ Cadastrar atendimento";
    }
  });
}

// 8.6 — Carregar agendamentos

async function carregarAgendamentos() {
  if (!listaAgendamentosEl || !lojaId) {
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
    console.error("Erro ao carregar agendamentos:", error);

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

// 8.7 — Filtrar agendamentos

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

// 8.8 — Renderizar agendamentos
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

    const nomeCliente =
      agendamento.profiles?.nome || agendamento.cliente_nome || "Cliente";

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
                        class="select-status select-status--${escaparHtml(
                          status,
                        )}"
                        onchange="atualizarStatusAgendamento(
                            '${agendamento.id}',
                            this.value
                        )"
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

// 8.9 — Atualizar status

async function atualizarStatusAgendamento(id, novoStatus) {
  if (!id || !novoStatus) {
    return;
  }

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

// 8.10 — Filtros da agenda

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

// 9. CLIENTES

// 9.1 — Elementos da seção

const listaClientesEl = document.getElementById("lista-clientes");

const formCliente = document.getElementById("form-cliente");

const btnSalvarCliente = document.getElementById("btn-salvar-cliente");

const btnCancelarCliente = document.getElementById("btn-cancelar-cliente");

const campoClienteId = document.getElementById("cliente-id");

// 9.2 — Cadastrar / Editar cliente

if (formCliente) {
  formCliente.addEventListener("submit", async (event) => {
    event.preventDefault();

    const clienteId = campoClienteId?.value.trim();

    const nome = document.getElementById("cliente-nome")?.value.trim();

    const telefone = document.getElementById("cliente-telefone")?.value.trim();

    // VALIDAR NOME

    if (!nome) {
      mostrarMensagem("mensagem-cliente", "Informe o nome do cliente.", "erro");

      return;
    }

    // VALIDAR BARBEARIA

    if (!lojaId) {
      mostrarMensagem(
        "mensagem-cliente",
        "Barbearia não identificada.",
        "erro",
      );

      return;
    }

    // BLOQUEAR BOTÃO

    if (btnSalvarCliente) {
      btnSalvarCliente.disabled = true;

      btnSalvarCliente.textContent = clienteId
        ? "Salvando..."
        : "Cadastrando...";
    }

    try {
      // ========================================================
      // EDIÇÃO
      // ========================================================

      if (clienteId) {
        console.log("Tentando editar cliente:", {
          clienteId,
          lojaId,
          nome,
          telefone,
        });

        const { data, error } = await supabaseClient
          .from("profiles")
          .update({
            nome,
            telefone: telefone || null,
          })
          .eq("id", clienteId)
          .select("id, nome, telefone");

        console.log("Resultado da edição:", {
          data,
          error,
        });

        // ------------------------------------------------------
        // TRATAR ERRO
        // ------------------------------------------------------

        if (error) {
          console.error("Erro ao editar cliente:", error);

          mostrarMensagem(
            "mensagem-cliente",
            `Não foi possível editar o cliente. ${error.message}`,
            "erro",
          );

          return;
        }

        // ------------------------------------------------------
        // NENHUMA LINHA ATUALIZADA
        // ------------------------------------------------------

        if (!data || !data.length) {
          console.error("Nenhum cliente foi atualizado.");

          mostrarMensagem(
            "mensagem-cliente",
            "O cliente não foi atualizado. Verifique se ele ainda pertence a esta barbearia.",
            "erro",
          );

          return;
        }

        // ------------------------------------------------------
        // LIMPAR FORMULÁRIO
        // ------------------------------------------------------

        cancelarEdicaoCliente();

        // ------------------------------------------------------
        // ATUALIZAR LISTA
        // ------------------------------------------------------

        await carregarClientes();

        await carregarDashboard();

        mostrarMensagem(
          "mensagem-cliente",
          "Cliente atualizado com sucesso!",
          "sucesso",
        );

        return;
      }

      // ========================================================
      // NOVO CLIENTE
      // ========================================================

      const { data: sessionData } = await supabaseClient.auth.getSession();

      const session = sessionData?.session;

      if (!session) {
        mostrarMensagem(
          "mensagem-cliente",
          "Sua sessão expirou. Faça login novamente.",
          "erro",
        );

        return;
      }

      // --------------------------------------------------------
      // CADASTRAR CLIENTE
      // --------------------------------------------------------

      const resposta = await supabaseClient.functions.invoke(
        "cadastrar-cliente",
        {
          body: {
            nome,
            telefone: telefone || null,
            barbearia_id: lojaId,
          },
        },
      );

      // --------------------------------------------------------
      // ERRO DA EDGE FUNCTION
      // --------------------------------------------------------

      if (resposta.error) {
        console.error("Erro ao cadastrar cliente:", resposta.error);

        mostrarMensagem(
          "mensagem-cliente",
          "Não foi possível cadastrar o cliente.",
          "erro",
        );

        return;
      }

      // --------------------------------------------------------
      // ERRO RETORNADO PELA EDGE FUNCTION
      // --------------------------------------------------------

      if (resposta.data?.error) {
        mostrarMensagem("mensagem-cliente", resposta.data.error, "erro");

        return;
      }

      // --------------------------------------------------------
      // LIMPAR FORMULÁRIO
      // --------------------------------------------------------

      cancelarEdicaoCliente();

      // --------------------------------------------------------
      // ATUALIZAR CLIENTES
      // --------------------------------------------------------

      await carregarClientes();

      // --------------------------------------------------------
      // ATUALIZAR DASHBOARD
      // --------------------------------------------------------

      await carregarDashboard();

      // --------------------------------------------------------
      // MENSAGEM
      // --------------------------------------------------------

      mostrarMensagem(
        "mensagem-cliente",
        "Cliente cadastrado com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro inesperado ao salvar cliente:", erro);

      mostrarMensagem(
        "mensagem-cliente",
        "Ocorreu um erro ao salvar o cliente.",
        "erro",
      );
    } finally {
      // --------------------------------------------------------
      // RESTAURAR BOTÃO
      // --------------------------------------------------------

      if (btnSalvarCliente) {
        const aindaEditando = campoClienteId?.value;

        btnSalvarCliente.disabled = false;

        btnSalvarCliente.textContent = aindaEditando
          ? "Salvar edição"
          : "+ Cadastrar cliente";
      }
    }
  });
}

// 9.3 — Carregar clientes

async function carregarClientes() {
  if (!listaClientesEl || !lojaId) {
    return false;
  }

  const mapaClientes = new Map();

  // ==========================================================
  // CLIENTES VINCULADOS DIRETAMENTE À BARBEARIA
  // ==========================================================

  const { data: clientesBarbearia, error: erroClientesBarbearia } =
    await supabaseClient
      .from("clientes_barbearias")
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

  if (erroClientesBarbearia) {
    console.error(
      "Erro ao carregar clientes da barbearia:",
      erroClientesBarbearia,
    );
  } else {
    (clientesBarbearia || []).forEach((registro) => {
      const cliente = registro.profiles;

      if (!cliente?.id) {
        return;
      }

      mapaClientes.set(cliente.id, cliente);
    });
  }

  // ==========================================================
  // ATUALIZAR CACHE
  // ==========================================================

  clientesCache = Array.from(mapaClientes.values());

  // ==========================================================
  // RENDERIZAR CLIENTES
  // ==========================================================

  renderizarClientes(clientesCache);

  // ==========================================================
  // ATUALIZAR CLIENTES NO AGENDAMENTO
  // ==========================================================

  preencherClientesAgendamento();

  return true;
}

// 9.4 — Renderizar clientes

function renderizarClientes(clientes) {
  if (!listaClientesEl) {
    return;
  }

  listaClientesEl.innerHTML = "";

  // NENHUM CLIENTE

  if (!clientes.length) {
    listaClientesEl.innerHTML = `
      <p class="em-breve">
        Nenhum cliente encontrado.
      </p>
    `;

    return;
  }

  // RENDERIZAR CADA CLIENTE

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

      <div class="item-acoes">

        <button
          type="button"
          title="Editar cliente"
          onclick="editarCliente('${cliente.id}')"
        >
          ✏️
        </button>

        <button
          type="button"
          title="Excluir cliente"
          onclick="excluirCliente('${cliente.id}')"
        >
          🗑️
        </button>

      </div>
    `;

    listaClientesEl.appendChild(item);
  });
}

// 9.5 — Editar cliente

function editarCliente(clienteId) {
  if (!clienteId) {
    return;
  }

  const cliente = clientesCache.find(
    (item) => String(item.id) === String(clienteId),
  );

  if (!cliente) {
    alert("Cliente não encontrado.");

    return;
  }

  // PREENCHER FORMULÁRIO

  if (campoClienteId) {
    campoClienteId.value = cliente.id;
  }

  const campoNome = document.getElementById("cliente-nome");

  const campoTelefone = document.getElementById("cliente-telefone");

  if (campoNome) {
    campoNome.value = cliente.nome || "";
  }

  if (campoTelefone) {
    campoTelefone.value = cliente.telefone || "";
  }

  // ALTERAR BOTÃO

  if (btnSalvarCliente) {
    btnSalvarCliente.disabled = false;

    btnSalvarCliente.textContent = "Salvar edição";
  }

  // MOSTRAR CANCELAR

  if (btnCancelarCliente) {
    btnCancelarCliente.hidden = false;
  }

  // LEVAR ATÉ O FORMULÁRIO

  formCliente?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  // FOCAR NOME

  campoNome?.focus();
}

// 9.6 — Cancelar edição

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

// 9.7 — Botão cancelar

if (btnCancelarCliente) {
  btnCancelarCliente.addEventListener("click", cancelarEdicaoCliente);
}

// 9.8 — Excluir cliente

async function excluirCliente(clienteId) {
  if (!clienteId) {
    return;
  }

  const cliente = clientesCache.find(
    (item) => String(item.id) === String(clienteId),
  );

  if (!cliente) {
    alert("Cliente não encontrado.");

    return;
  }

  // CONFIRMAR

  const confirmar = confirm(
    `Deseja excluir o cliente "${cliente.nome || "Cliente"}" da barbearia?`,
  );

  if (!confirmar) {
    return;
  }

  // LOG

  console.log("Tentando excluir cliente:", {
    clienteId,
    lojaId,
  });

  // EXCLUIR VÍNCULO

  const { data, error } = await supabaseClient
    .from("clientes_barbearias")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("barbearia_id", lojaId)
    .select();

  console.log("Resultado da exclusão:", {
    data,
    error,
  });

  // TRATAR ERRO

  if (error) {
    console.error("Erro ao excluir cliente:", error);

    alert(`Não foi possível excluir o cliente.\n\n${error.message}`);

    return;
  }

  // NENHUMA LINHA EXCLUÍDA

  if (!data || !data.length) {
    console.error("Nenhuma linha foi excluída.");

    alert(
      "O cliente não foi removido. Verifique se ele ainda está vinculado a esta barbearia.",
    );

    return;
  }

  // SUCESSO

  console.log("Cliente excluído com sucesso:", data);

  // ATUALIZAR

  await carregarClientes();

  await carregarDashboard();

  mostrarMensagem(
    "mensagem-cliente",
    "Cliente removido da barbearia com sucesso!",
    "sucesso",
  );
}

// 10. PROFISSIONAIS / BARBEIROS

// 10.1 — Elementos da seção

const formBarbeiro = document.getElementById("form-barbeiro");

const listaProfissionaisEl = document.getElementById("lista-profissionais");

const btnSalvarBarbeiro = document.getElementById("btn-salvar-barbeiro");

const btnCancelarBarbeiro = document.getElementById("btn-cancelar-barbeiro");

const inputFotoBarbeiro = document.getElementById("barbeiro-foto");

const previewBarbeiro = document.getElementById("preview-barbeiro");

const previewBarbeiroImg = document.getElementById("preview-barbeiro-img");

// 10.2 — Carregar profissionais

async function carregarProfissionais() {
  if (!listaProfissionaisEl || !lojaId) {
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

// 10.3 — Atualizar card de profissionais

function atualizarCardProfissionais() {
  const elemento = document.getElementById("total-profissionais");

  if (elemento) {
    elemento.textContent = profissionaisCache.length;
  }
}

// 10.4 — Renderizar profissionais

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

    const foto = profissional.foto_url
      ? `
          <img
            src="${escaparHtml(profissional.foto_url)}"
            alt="${escaparHtml(profissional.nome || "Profissional")}"
            class="produto-thumb"
          >
        `
      : `
          <div
            class="produto-thumb produto-thumb--vazia"
          >
            💈
          </div>
        `;

    item.innerHTML = `
      <div class="item-info item-info--com-foto">

        ${foto}

        <div>
          <h3>
            ${escaparHtml(profissional.nome || "Profissional")}
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

// 10.5 — Preview da foto

if (inputFotoBarbeiro) {
  inputFotoBarbeiro.addEventListener("change", () => {
    const arquivo = inputFotoBarbeiro.files?.[0];

    if (!arquivo) {
      if (previewBarbeiro) {
        previewBarbeiro.hidden = true;
      }

      if (previewBarbeiroImg) {
        previewBarbeiroImg.src = "";
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

// 10.6 — Salvar profissional

if (formBarbeiro) {
  formBarbeiro.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = document.getElementById("barbeiro-id")?.value;

    const nome = document.getElementById("barbeiro-nome")?.value.trim();

    const telefone = document.getElementById("barbeiro-tel")?.value.trim();

    const arquivoFoto = document.getElementById("barbeiro-foto")?.files?.[0];

    const fotoAtual = document.getElementById("barbeiro-foto-atual")?.value;

    // Validação

    if (!nome) {
      mostrarMensagem(
        "mensagem-barbeiro",
        "Digite o nome do profissional.",
        "erro",
      );

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

    // Estado do botão

    if (btnSalvarBarbeiro) {
      btnSalvarBarbeiro.disabled = true;
      btnSalvarBarbeiro.textContent = "Salvando...";
    }

    try {
      // Foto

      let fotoUrl = fotoAtual || null;

      if (arquivoFoto) {
        const novaFoto = await enviarArquivoStorage(
          arquivoFoto,
          "profissionais",
        );

        if (novaFoto) {
          fotoUrl = novaFoto;
        }
      }

      // Dados do profissional

      const dadosProfissional = {
        nome,
        telefone: telefone || null,
        foto_url: fotoUrl,
      };

      // Atualizar profissional

      if (id) {
        const { error } = await supabaseClient
          .from("profissionais")
          .update(dadosProfissional)
          .eq("id", id)
          .eq("barbearia_id", lojaId);

        if (error) {
          throw error;
        }
      }

      // Criar profissional
      else {
        const { error } = await supabaseClient.from("profissionais").insert({
          barbearia_id: lojaId,
          ...dadosProfissional,
        });

        if (error) {
          throw error;
        }
      }

      // Finalização

      cancelarEdicaoBarbeiro();

      await carregarProfissionais();

      await carregarDashboard();

      mostrarMensagem(
        "mensagem-barbeiro",
        "Profissional salvo com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro ao salvar profissional:", erro);

      mostrarMensagem(
        "mensagem-barbeiro",
        "Não foi possível salvar o profissional.",
        "erro",
      );
    } finally {
      if (btnSalvarBarbeiro) {
        btnSalvarBarbeiro.disabled = false;

        btnSalvarBarbeiro.textContent = id
          ? "Salvar edição"
          : "+ Adicionar profissional";
      }
    }
  });
}

// 10.7 — Editar profissional

function editarBarbeiro(id) {
  const barbeiro = profissionaisCache.find(
    (item) => String(item.id) === String(id),
  );

  if (!barbeiro) {
    alert("Profissional não encontrado.");
    return;
  }

  const campoId = document.getElementById("barbeiro-id");

  const campoNome = document.getElementById("barbeiro-nome");

  const campoTelefone = document.getElementById("barbeiro-tel");

  const campoFotoAtual = document.getElementById("barbeiro-foto-atual");

  const campoFoto = document.getElementById("barbeiro-foto");

  if (campoId) {
    campoId.value = barbeiro.id;
  }

  if (campoNome) {
    campoNome.value = barbeiro.nome || "";
  }

  if (campoTelefone) {
    campoTelefone.value = barbeiro.telefone || "";
  }

  if (campoFotoAtual) {
    campoFotoAtual.value = barbeiro.foto_url || "";
  }

  if (campoFoto) {
    campoFoto.value = "";
  }

  // Preview da foto existente

  if (barbeiro.foto_url && previewBarbeiroImg) {
    previewBarbeiroImg.src = barbeiro.foto_url;

    if (previewBarbeiro) {
      previewBarbeiro.hidden = false;
    }
  } else {
    if (previewBarbeiroImg) {
      previewBarbeiroImg.src = "";
    }

    if (previewBarbeiro) {
      previewBarbeiro.hidden = true;
    }
  }

  // Estado de edição

  if (btnSalvarBarbeiro) {
    btnSalvarBarbeiro.textContent = "Salvar edição";
  }

  if (btnCancelarBarbeiro) {
    btnCancelarBarbeiro.hidden = false;
  }

  formBarbeiro?.scrollIntoView({
    behavior: "smooth",
  });
}

// 10.8 — Cancelar edição

function cancelarEdicaoBarbeiro() {
  if (!formBarbeiro) {
    return;
  }

  formBarbeiro.reset();

  const campoId = document.getElementById("barbeiro-id");

  const campoFotoAtual = document.getElementById("barbeiro-foto-atual");

  if (campoId) {
    campoId.value = "";
  }

  if (campoFotoAtual) {
    campoFotoAtual.value = "";
  }

  if (btnSalvarBarbeiro) {
    btnSalvarBarbeiro.textContent = "+ Adicionar profissional";

    btnSalvarBarbeiro.disabled = false;
  }

  if (btnCancelarBarbeiro) {
    btnCancelarBarbeiro.hidden = true;
  }

  if (previewBarbeiro) {
    previewBarbeiro.hidden = true;
  }

  if (previewBarbeiroImg) {
    previewBarbeiroImg.src = "";
  }
}

// 10.9 — Botão cancelar

if (btnCancelarBarbeiro) {
  btnCancelarBarbeiro.addEventListener("click", cancelarEdicaoBarbeiro);
}

// 10.10 — Excluir profissional

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

// 11. DASHBOARD / VISÃO GERAL

async function carregarDashboard() {
  if (!lojaId) {
    return false;
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
        id,
        nome,
        telefone
      ),
      profissionais(
        id,
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
    console.error(
      "Erro ao carregar agendamentos do dashboard:",
      erroAgendamentos,
    );

    return false;
  }

  // TOTAL DE CLIENTES

  const totalClientes = Array.isArray(clientesCache) ? clientesCache.length : 0;

  // TOTAL DE PROFISSIONAIS

  const totalProfissionais = Array.isArray(profissionaisCache)
    ? profissionaisCache.length
    : 0;

  // FATURAMENTO DO DIA

  const faturamento = (agendamentosHoje || [])
    .filter((agendamento) => agendamento.status === "concluido")
    .reduce(
      (total, agendamento) => total + Number(agendamento.servicos?.preco || 0),
      0,
    );

  // ATUALIZAR CARDS DO DASHBOARD

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
    elementoClientes.textContent = totalClientes;
  }

  if (elementoProfissionais) {
    elementoProfissionais.textContent = totalProfissionais;
  }

  if (elementoFaturamento) {
    elementoFaturamento.textContent = formatarMoeda(faturamento);
  }

  // PRÓXIMOS AGENDAMENTOS

  renderizarProximosAgendamentos(agendamentosHoje || []);

  return true;
}

// 11.1 — Renderizar próximos agendamentos

function renderizarProximosAgendamentos(agendamentos) {
  const elemento = document.getElementById("lista-proximos-agendamentos");

  if (!elemento) {
    return;
  }

  const agora = new Date();

  const proximos = (agendamentos || [])
    .filter((agendamento) => {
      const dataHora = new Date(agendamento.data_hora);

      return dataHora >= agora && agendamento.status !== "cancelado";
    })
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
    const nomeCliente =
      agendamento.profiles?.nome || agendamento.cliente_nome || "Cliente";
    const nomeServico = agendamento.servicos?.nome || "Serviço";
    const nomeProfissional = agendamento.profissionais?.nome || "";
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
          ${dataHora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        ${
          nomeProfissional
            ? `
              <small>
                Barbeiro:
                ${escaparHtml(nomeProfissional)}
              </small>
            `
            : ""
        }

      </div>

      <div class="item-status">
        ${STATUS_LABEL[agendamento.status] || "Pendente"}
      </div>
    `;

    elemento.appendChild(item);
  });
}

// 12. HORÁRIOS DE FUNCIONAMENTO

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

// 12.1 — Elementos da seção

const listaHorariosEl = document.getElementById("lista-horarios");
const formHorarios = document.getElementById("form-horarios");
const btnSalvarHorarios = document.getElementById("btn-salvar-horarios");

// 12.2 — Carregar horários

async function carregarHorarios() {
  if (!listaHorariosEl || !lojaId) {
    return false;
  }

  // Horários gerais da barbearia

  const { data: horarios, error: erroHorarios } = await supabaseClient
    .from("horarios_funcionamento")
    .select("*")
    .eq("barbearia_id", lojaId)
    .order("dia_semana", {
      ascending: true,
    });

  if (erroHorarios) {
    console.error("Erro ao carregar horários da barbearia:", erroHorarios);

    mostrarMensagem(
      "mensagem-horarios",
      "Não foi possível carregar os horários da barbearia.",
      "erro",
    );

    return false;
  }

  horariosCache = horarios || [];

  // Horários dos profissionais

  const profissionaisAtuais = Array.isArray(profissionaisCache)
    ? profissionaisCache
    : [];

  if (profissionaisAtuais.length) {
    const idsProfissionais = profissionaisAtuais.map(
      (profissional) => profissional.id,
    );

    const { data: horariosProfissionais, error: erroHorariosProfissionais } =
      await supabaseClient
        .from("horarios_profissionais")
        .select("*")
        .in("profissional_id", idsProfissionais)
        .order("dia_semana", {
          ascending: true,
        });

    if (erroHorariosProfissionais) {
      console.error(
        "Erro ao carregar horários dos profissionais:",
        erroHorariosProfissionais,
      );

      mostrarMensagem(
        "mensagem-horarios",
        "Não foi possível carregar os horários dos barbeiros.",
        "erro",
      );

      return false;
    }

    horariosProfissionaisCache = horariosProfissionais || [];
  } else {
    horariosProfissionaisCache = [];
  }

  // Renderizar

  renderizarHorarios(
    horariosCache,
    horariosProfissionaisCache,
    profissionaisAtuais,
  );

  return true;
}

// 12.3 — Renderizar horários

function renderizarHorarios(horarios, horariosProfissionais, profissionais) {
  if (!listaHorariosEl) {
    return;
  }

  listaHorariosEl.innerHTML = "";

  // HORÁRIO GERAL DA BARBEARIA

  const tituloGeral = document.createElement("div");

  tituloGeral.classList.add("horarios-secao-titulo");

  tituloGeral.innerHTML = `
    <h3>🏪 Horário da barbearia</h3>

    <p>
      Defina os dias e horários em que a barbearia funciona.
    </p>
  `;

  listaHorariosEl.appendChild(tituloGeral);

  const containerGeral = document.createElement("div");

  containerGeral.classList.add("horarios-gerais");

  DIAS_SEMANA.forEach((nomeDia, indice) => {
    const horario = horarios.find((item) => Number(item.dia_semana) === indice);

    const aberto = horario ? horario.aberto : false;

    const horaAbertura = horario?.hora_abertura
      ? horario.hora_abertura.substring(0, 5)
      : "08:00";

    const horaFechamento = horario?.hora_fechamento
      ? horario.hora_fechamento.substring(0, 5)
      : "18:00";

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

          <label
            for="horario-abertura-${indice}"
          >
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

          <label
            for="horario-fechamento-${indice}"
          >
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

          <label
            for="horario-intervalo-inicio-${indice}"
          >
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

          <label
            for="horario-intervalo-fim-${indice}"
          >
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

    containerGeral.appendChild(item);
  });

  listaHorariosEl.appendChild(containerGeral);

  // HORÁRIOS DOS PROFISSIONAIS

  const tituloProfissionais = document.createElement("div");

  tituloProfissionais.classList.add("horarios-secao-titulo");

  tituloProfissionais.innerHTML = `
    <h3>💈 Horários dos barbeiros</h3>

    <p>
      Configure o horário de trabalho de cada profissional.
    </p>
  `;

  listaHorariosEl.appendChild(tituloProfissionais);

  if (!profissionais.length) {
    const vazio = document.createElement("p");

    vazio.classList.add("em-breve");

    vazio.textContent =
      "Cadastre pelo menos um barbeiro para configurar os horários individuais.";

    listaHorariosEl.appendChild(vazio);

    return;
  }

  profissionais.forEach((profissional) => {
    const card = document.createElement("div");

    card.classList.add("horario-profissional");

    const cabecalho = document.createElement("div");

    cabecalho.classList.add("horario-profissional-cabecalho");

    cabecalho.innerHTML = `
      <h4>
        💈 ${escaparHtml(profissional.nome)}
      </h4>

      <small>
        Horário individual
      </small>
    `;

    card.appendChild(cabecalho);

    const diasContainer = document.createElement("div");

    diasContainer.classList.add("horario-profissional-dias");

    DIAS_SEMANA.forEach((nomeDia, dia) => {
      const horario = horariosProfissionais.find(
        (item) =>
          item.profissional_id === profissional.id &&
          Number(item.dia_semana) === dia,
      );

      const aberto = horario ? horario.aberto : false;

      const horaInicio = horario?.hora_inicio
        ? horario.hora_inicio.substring(0, 5)
        : "08:00";

      const horaFim = horario?.hora_fim
        ? horario.hora_fim.substring(0, 5)
        : "18:00";

      const intervaloInicio = horario?.intervalo_inicio
        ? horario.intervalo_inicio.substring(0, 5)
        : "";

      const intervaloFim = horario?.intervalo_fim
        ? horario.intervalo_fim.substring(0, 5)
        : "";

      const item = document.createElement("div");

      item.classList.add("horario-item", "horario-item-profissional");

      const prefixo = `prof-${profissional.id}-${dia}`;

      item.innerHTML = `
        <div class="horario-cabecalho">

          <span class="horario-dia">
            ${escaparHtml(nomeDia)}
          </span>

          <label class="horario-toggle">

            <input
              type="checkbox"
              id="${prefixo}-aberto"
              ${aberto ? "checked" : ""}
              onchange="alternarHorarioProfissional(
                '${profissional.id}',
                ${dia}
              )"
            >

            <span>
              ${aberto ? "Aberto" : "Fechado"}
            </span>

          </label>

        </div>

        <div class="horario-campos">

          <div class="horario-campo">

            <label for="${prefixo}-inicio">
              Entrada
            </label>

            <input
              type="time"
              id="${prefixo}-inicio"
              value="${horaInicio}"
              ${!aberto ? "disabled" : ""}
            >

          </div>

          <div class="horario-campo">

            <label for="${prefixo}-fim">
              Saída
            </label>

            <input
              type="time"
              id="${prefixo}-fim"
              value="${horaFim}"
              ${!aberto ? "disabled" : ""}
            >

          </div>

          <div class="horario-campo">

            <label
              for="${prefixo}-intervalo-inicio"
            >
              Início intervalo
            </label>

            <input
              type="time"
              id="${prefixo}-intervalo-inicio"
              value="${intervaloInicio}"
              ${!aberto ? "disabled" : ""}
            >

          </div>


          <div class="horario-campo">

            <label
              for="${prefixo}-intervalo-fim"
            >
              Fim intervalo
            </label>

            <input
              type="time"
              id="${prefixo}-intervalo-fim"
              value="${intervaloFim}"
              ${!aberto ? "disabled" : ""}
            >

          </div>

        </div>
      `;

      diasContainer.appendChild(item);
    });

    card.appendChild(diasContainer);

    listaHorariosEl.appendChild(card);
  });
}

// 12.4 — Ativar / desativar dia da barbearia

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

// 12.5 — Ativar / desativar horário profissional

function alternarHorarioProfissional(profissionalId, dia) {
  const prefixo = `prof-${profissionalId}-${dia}`;

  const checkbox = document.getElementById(`${prefixo}-aberto`);

  if (!checkbox) {
    return;
  }

  const campos = [
    `${prefixo}-inicio`,
    `${prefixo}-fim`,
    `${prefixo}-intervalo-inicio`,
    `${prefixo}-intervalo-fim`,
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

// 12.6 — Validar horário da barbearia

function validarHorarioDia(dia) {
  const checkbox = document.getElementById(`horario-aberto-${dia}`);

  if (!checkbox) {
    return {
      valido: false,
      mensagem: "Dia inválido.",
    };
  }

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

  if (
    (intervaloInicio && !intervaloFim) ||
    (!intervaloInicio && intervaloFim)
  ) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: preencha os dois horários do intervalo.`,
    };
  }

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

// 12.7 — Validar horário do profissional

function validarHorarioProfissional(profissionalId, dia) {
  const prefixo = `prof-${profissionalId}-${dia}`;

  const checkbox = document.getElementById(`${prefixo}-aberto`);

  if (!checkbox) {
    return {
      valido: false,
      mensagem: "Horário do profissional inválido.",
    };
  }

  if (!checkbox.checked) {
    return {
      valido: true,
    };
  }

  const inicio = document.getElementById(`${prefixo}-inicio`)?.value;

  const fim = document.getElementById(`${prefixo}-fim`)?.value;

  const intervaloInicio = document.getElementById(
    `${prefixo}-intervalo-inicio`,
  )?.value;

  const intervaloFim = document.getElementById(
    `${prefixo}-intervalo-fim`,
  )?.value;

  if (!inicio || !fim) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: informe entrada e saída do profissional.`,
    };
  }

  if (inicio >= fim) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: a entrada precisa ser antes da saída.`,
    };
  }

  if (
    (intervaloInicio && !intervaloFim) ||
    (!intervaloInicio && intervaloFim)
  ) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: preencha os dois horários do intervalo.`,
    };
  }

  if (intervaloInicio && intervaloFim) {
    if (intervaloInicio >= intervaloFim) {
      return {
        valido: false,
        mensagem: `${DIAS_SEMANA[dia]}: o início do intervalo precisa ser antes do fim.`,
      };
    }

    if (intervaloInicio <= inicio || intervaloFim >= fim) {
      return {
        valido: false,
        mensagem: `${DIAS_SEMANA[dia]}: o intervalo precisa estar dentro do horário do profissional.`,
      };
    }
  }

  return {
    valido: true,
  };
}

// 12.8 — Salvar horários

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

    // Validar horários gerais

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

    // Validar horários dos profissionais

    const profissionaisAtuais = Array.isArray(profissionaisCache)
      ? profissionaisCache
      : [];

    for (const profissional of profissionaisAtuais) {
      for (let dia = 0; dia <= 6; dia++) {
        const validacao = validarHorarioProfissional(profissional.id, dia);

        if (!validacao.valido) {
          mostrarMensagem(
            "mensagem-horarios",
            `${profissional.nome}: ${validacao.mensagem}`,
            "erro",
          );

          if (btnSalvarHorarios) {
            btnSalvarHorarios.disabled = false;
            btnSalvarHorarios.textContent = "💾 Salvar horários";
          }

          return;
        }
      }
    }

    // Salvar horários gerais da barbearia

    let erroGeral = null;

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

      const horarioExistente = horariosCache.find(
        (item) => Number(item.dia_semana) === dia,
      );

      const dadosHorario = {
        aberto,
        hora_abertura: abertura,
        hora_fechamento: fechamento,
        intervalo_inicio: intervaloInicio,
        intervalo_fim: intervaloFim,
      };

      if (horarioExistente) {
        const { error } = await supabaseClient
          .from("horarios_funcionamento")
          .update(dadosHorario)
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
            dia_semana: dia,
            ...dadosHorario,
          });

        if (error) {
          erroGeral = error;
          break;
        }
      }
    }

    // Erro nos horários gerais

    if (erroGeral) {
      console.error("Erro ao salvar horários da barbearia:", erroGeral);

      mostrarMensagem(
        "mensagem-horarios",
        "Não foi possível salvar os horários da barbearia.",
        "erro",
      );

      if (btnSalvarHorarios) {
        btnSalvarHorarios.disabled = false;
        btnSalvarHorarios.textContent = "💾 Salvar horários";
      }

      return;
    }

    // Salvar horários dos profissionais

    for (const profissional of profissionaisAtuais) {
      for (let dia = 0; dia <= 6; dia++) {
        const prefixo = `prof-${profissional.id}-${dia}`;

        const checkbox = document.getElementById(`${prefixo}-aberto`);

        const aberto = checkbox?.checked || false;

        const inicio = aberto
          ? document.getElementById(`${prefixo}-inicio`)?.value || null
          : null;

        const fim = aberto
          ? document.getElementById(`${prefixo}-fim`)?.value || null
          : null;

        const intervaloInicio = aberto
          ? document.getElementById(`${prefixo}-intervalo-inicio`)?.value ||
            null
          : null;

        const intervaloFim = aberto
          ? document.getElementById(`${prefixo}-intervalo-fim`)?.value || null
          : null;

        const horarioExistente = horariosProfissionaisCache.find(
          (item) =>
            item.profissional_id === profissional.id &&
            Number(item.dia_semana) === dia,
        );

        const dadosHorario = {
          aberto,
          hora_inicio: inicio,
          hora_fim: fim,
          intervalo_inicio: intervaloInicio,
          intervalo_fim: intervaloFim,
        };

        if (horarioExistente) {
          const { error } = await supabaseClient
            .from("horarios_profissionais")
            .update(dadosHorario)
            .eq("id", horarioExistente.id)
            .eq("profissional_id", profissional.id);

          if (error) {
            erroGeral = error;
            break;
          }
        } else {
          const { error } = await supabaseClient
            .from("horarios_profissionais")
            .insert({
              profissional_id: profissional.id,
              dia_semana: dia,
              ...dadosHorario,
            });

          if (error) {
            erroGeral = error;
            break;
          }
        }
      }

      if (erroGeral) {
        break;
      }
    }

    // Erro nos horários profissionais

    if (erroGeral) {
      console.error("Erro ao salvar horários dos profissionais:", erroGeral);

      mostrarMensagem(
        "mensagem-horarios",
        "Os horários da barbearia foram salvos, mas houve um erro nos horários dos barbeiros.",
        "erro",
      );

      if (btnSalvarHorarios) {
        btnSalvarHorarios.disabled = false;
        btnSalvarHorarios.textContent = "💾 Salvar horários";
      }

      return;
    }

    // Recarregar

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

// 13. AVALIAÇÕES

const avaliacaoMediaEl = document.getElementById("avaliacao-media");

const avaliacaoMediaPaginaEl = document.getElementById(
  "avaliacao-media-pagina",
);

const totalAvaliacoesEl = document.getElementById("total-avaliacoes");

const listaComentariosEl = document.getElementById("lista-comentarios");

// CARREGAR AVALIAÇÕES

async function carregarAvaliacoes() {
  try {
    if (!lojaId) {
      console.warn("Barbearia não identificada para carregar avaliações.");
      return false;
    }

    const { data, error } = await supabaseClient
      .from("avaliacoes")
      .select(
        `
        id,
        nota,
        comentario,
        created_at,
        cliente_id,
        agendamento_id,
        profiles(
          id,
          nome,
          telefone
        )
      `,
      )
      .eq("barbearia_id", lojaId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Erro ao carregar avaliações:", error);
      return false;
    }

    avaliacoesCache = data || [];

    renderizarAvaliacoes(avaliacoesCache);

    return true;
  } catch (erro) {
    console.error("Erro inesperado ao carregar avaliações:", erro);

    return false;
  }
}

// CALCULAR MÉDIA

function calcularMediaAvaliacoes(avaliacoes) {
  if (!Array.isArray(avaliacoes) || !avaliacoes.length) {
    return 0;
  }

  const soma = avaliacoes.reduce((total, avaliacao) => {
    return total + Number(avaliacao.nota || 0);
  }, 0);

  return soma / avaliacoes.length;
}

// GERAR ESTRELAS

function gerarEstrelas(nota) {
  const notaNumerica = Number(nota) || 0;

  let estrelas = "";

  for (let i = 1; i <= 5; i++) {
    estrelas += i <= notaNumerica ? "★" : "☆";
  }

  return estrelas;
}

// RENDERIZAR AVALIAÇÕES

function renderizarAvaliacoes(avaliacoes) {
  const lista = Array.isArray(avaliacoes) ? avaliacoes : [];

  const media = calcularMediaAvaliacoes(lista);

  // MÉDIA

  if (avaliacaoMediaEl) {
    avaliacaoMediaEl.textContent = media.toFixed(1);
  }

  if (avaliacaoMediaPaginaEl) {
    avaliacaoMediaPaginaEl.textContent = media.toFixed(1);
  }

  // TOTAL

  if (totalAvaliacoesEl) {
    totalAvaliacoesEl.textContent = lista.length;
  }

  // LISTA

  if (!listaComentariosEl) {
    return;
  }

  if (!lista.length) {
    listaComentariosEl.innerHTML = `
      <div class="item-vazio">
        <p>⭐ Ainda não existem avaliações.</p>
      </div>
    `;

    return;
  }

  listaComentariosEl.innerHTML = lista
    .map((avaliacao) => {
      const clienteNome = avaliacao.profiles?.nome || "Cliente";

      const comentario =
        avaliacao.comentario?.trim() || "Cliente não deixou comentário.";

      const dataFormatada = avaliacao.created_at
        ? new Date(avaliacao.created_at).toLocaleDateString("pt-BR")
        : "";

      return `
        <div class="item-lista avaliacao-item">

          <div class="avaliacao-cabecalho">

            <div>
              <strong>
                ${escaparHtml(clienteNome)}
              </strong>

              <div class="avaliacao-estrelas">
                ${gerarEstrelas(avaliacao.nota)}
              </div>
            </div>

            <span class="avaliacao-data">
              ${escaparHtml(dataFormatada)}
            </span>

          </div>

          <p class="avaliacao-comentario">
            ${escaparHtml(comentario)}
          </p>

        </div>
      `;
    })
    .join("");
}

// ATUALIZAR RESUMO DAS AVALIAÇÕES

function atualizarResumoAvaliacoes() {
  const lista = Array.isArray(avaliacoesCache) ? avaliacoesCache : [];

  const media = calcularMediaAvaliacoes(lista);

  if (avaliacaoMediaEl) {
    avaliacaoMediaEl.textContent = media.toFixed(1);
  }

  if (avaliacaoMediaPaginaEl) {
    avaliacaoMediaPaginaEl.textContent = media.toFixed(1);
  }

  if (totalAvaliacoesEl) {
    totalAvaliacoesEl.textContent = lista.length;
  }
}

// 14. NOTIFICAÇÕES

const totalNotificacoesEl = document.getElementById("total-notificacoes");
const listaNotificacoesEl = document.getElementById("lista-notificacoes");

// SOM DE NOVA NOTIFICAÇÃO

const somNotificacao = new Audio("../assets/notificacao.mp3");

somNotificacao.volume = 0.6;

function tocarSomNotificacao() {
  somNotificacao.currentTime = 0;

  somNotificacao.play().catch((erro) => {
    console.warn("O navegador bloqueou o som da notificação:", erro);
  });
}

// CARREGAR NOTIFICAÇÕES

async function carregarNotificacoes() {
  try {
    if (!lojaId) {
      console.warn("Barbearia não identificada para carregar notificações.");

      return false;
    }

    const { data, error } = await supabaseClient
      .from("notificacoes")
      .select(
        `
        id,
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
      });

    if (error) {
      console.error("Erro ao carregar notificações:", error);

      return false;
    }

    const novasNotificacoes = data || [];

    // TOCAR SOM SOMENTE QUANDO APARECER
    // UMA NOVA NOTIFICAÇÃO DEPOIS DA PRIMEIRA CARGA

    if (
      quantidadeNotificacoesAnterior > 0 &&
      novasNotificacoes.length > quantidadeNotificacoesAnterior
    ) {
      tocarSomNotificacao();
    }

    notificacoesCache = novasNotificacoes;

    quantidadeNotificacoesAnterior = novasNotificacoes.length;

    renderizarNotificacoes(notificacoesCache);

    return true;
  } catch (erro) {
    console.error("Erro inesperado ao carregar notificações:", erro);

    return false;
  }
}

// RENDERIZAR NOTIFICAÇÕES

function renderizarNotificacoes(notificacoes) {
  if (!listaNotificacoesEl) {
    return;
  }

  const lista = Array.isArray(notificacoes) ? notificacoes : [];
  const naoLidas = lista.filter((notificacao) => !notificacao.lida);

  // CONTADOR

  if (totalNotificacoesEl) {
    totalNotificacoesEl.textContent = naoLidas.length;
  }

  // LISTA VAZIA

  if (!lista.length) {
    listaNotificacoesEl.innerHTML = `
      <div class="item-vazio">
        <p>🔔 Nenhuma notificação.</p>
      </div>
    `;

    return;
  }

  // LISTA DE NOTIFICAÇÕES

  listaNotificacoesEl.innerHTML = lista
    .map((notificacao) => {
      const dataFormatada = notificacao.created_at
        ? new Date(notificacao.created_at).toLocaleString("pt-BR")
        : "";

      const classeEstado = notificacao.lida ? "lida" : "nao-lida";
      const titulo = notificacao.titulo || "Notificação";
      const mensagem = notificacao.mensagem || "";

      return `
        <div
          class="item-lista notificacao-item ${classeEstado}"
          data-notificacao-id="${escaparHtml(String(notificacao.id))}"
        >

          <div class="notificacao-cabecalho">

            <strong>
              ${escaparHtml(titulo)}
            </strong>

            <span>
              ${escaparHtml(dataFormatada)}
            </span>

          </div>

          <p>
            ${escaparHtml(mensagem)}
          </p>

          ${
            !notificacao.lida
              ? `
                <button
                  type="button"
                  onclick="marcarNotificacaoComoLida('${String(
                    notificacao.id,
                  )}')"
                >
                  Marcar como lida
                </button>
              `
              : ""
          }

        </div>
      `;
    })
    .join("");
}

// MARCAR COMO LIDA

async function marcarNotificacaoComoLida(id) {
  try {
    if (!id || !lojaId) {
      return false;
    }

    const { error } = await supabaseClient
      .from("notificacoes")
      .update({
        lida: true,
      })
      .eq("id", id)
      .eq("barbearia_id", lojaId);

    if (error) {
      console.error("Erro ao marcar notificação como lida:", error);

      return false;
    }

    await carregarNotificacoes();

    return true;
  } catch (erro) {
    console.error("Erro inesperado ao marcar notificação como lida:", erro);

    return false;
  }
}

// MARCAR TODAS COMO LIDAS

async function marcarTodasNotificacoesComoLidas() {
  try {
    if (!lojaId) {
      return false;
    }

    const { error } = await supabaseClient
      .from("notificacoes")
      .update({
        lida: true,
      })
      .eq("barbearia_id", lojaId)
      .eq("lida", false);

    if (error) {
      console.error("Erro ao marcar notificações como lidas:", error);

      return false;
    }

    await carregarNotificacoes();

    return true;
  } catch (erro) {
    console.error("Erro inesperado ao marcar todas as notificações:", erro);

    return false;
  }
}

// CRIAR NOTIFICAÇÃO

async function criarNotificacao({
  tipo,
  titulo,
  mensagem,
  referenciaId = null,
}) {
  try {
    if (!lojaId) {
      console.warn("Não foi possível criar notificação: lojaId ausente.");

      return null;
    }

    const { data, error } = await supabaseClient
      .from("notificacoes")
      .insert({
        barbearia_id: lojaId,
        tipo,
        titulo,
        mensagem,
        referencia_id: referenciaId,
        lida: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar notificação:", error);

      return null;
    }

    return data;
  } catch (erro) {
    console.error("Erro inesperado ao criar notificação:", erro);

    return null;
  }
}

// MENSAGEM DE ALTERAÇÃO DE STATUS DO AGENDAMENTO

function obterMensagemStatusAgendamento(
  statusAnterior,
  novoStatus,
  agendamento,
) {
  const clienteNome =
    agendamento?.profiles?.nome || agendamento?.cliente_nome || "Cliente";

  const servicoNome = agendamento?.servicos?.nome || "serviço";

  const mensagens = {
    confirmado: {
      titulo: "Agendamento confirmado",

      mensagem:
        `${clienteNome}, seu agendamento de ` +
        `${servicoNome} foi confirmado.`,
    },

    cancelado: {
      titulo: "Agendamento cancelado",

      mensagem:
        `${clienteNome}, seu agendamento de ` + `${servicoNome} foi cancelado.`,
    },

    concluido: {
      titulo: "Atendimento concluído",

      mensagem:
        `${clienteNome}, seu atendimento de ` + `${servicoNome} foi concluído.`,
    },
  };

  return mensagens[novoStatus] || null;
}

// NOTIFICAR ALTERAÇÃO DE STATUS

async function notificarAlteracaoStatusAgendamento(
  agendamento,
  statusAnterior,
  novoStatus,
) {
  if (!agendamento) {
    return;
  }

  // NÃO FAZ NADA SE O STATUS NÃO MUDOU

  if (statusAnterior === novoStatus) {
    return;
  }

  // STATUS QUE GERAM NOTIFICAÇÃO

  const statusQueNotificam = ["confirmado", "cancelado", "concluido"];

  if (!statusQueNotificam.includes(novoStatus)) {
    return;
  }

  const dadosMensagem = obterMensagemStatusAgendamento(
    statusAnterior,
    novoStatus,
    agendamento,
  );

  if (!dadosMensagem) {
    return;
  }

  await criarNotificacao({
    tipo: `agendamento_${novoStatus}`,
    titulo: dadosMensagem.titulo,
    mensagem: dadosMensagem.mensagem,
    referenciaId: agendamento.id,
  });

  // ATUALIZAR PAINEL

  await carregarNotificacoes();
}

// ATUALIZAR CONTADOR DE NOTIFICAÇÕES

function atualizarContadorNotificacoes() {
  if (!totalNotificacoesEl) {
    return;
  }

  const lista = Array.isArray(notificacoesCache) ? notificacoesCache : [];

  const quantidadeNaoLidas = lista.filter(
    (notificacao) => !notificacao.lida,
  ).length;

  totalNotificacoesEl.textContent = quantidadeNaoLidas;
}

// 15. FINANCEIRO

const listaFinanceiroEl = document.getElementById("lista-financeiro");
const formGasto = document.getElementById("form-gasto");
const btnSalvarGasto = document.getElementById("btn-salvar-gasto");
const btnCancelarGasto = document.getElementById("btn-cancelar-gasto");

// CARREGAR FINANCEIRO

async function carregarFinanceiro() {
  try {
    if (!lojaId) {
      return false;
    }

    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const inicioMesDate = new Date(ano, mes, 1, 0, 0, 0, 0);
    const inicioProximoMesDate = new Date(ano, mes + 1, 1, 0, 0, 0, 0);
    const inicioMes = obterDataLocalISO(inicioMesDate);
    const inicioProximoMes = obterDataLocalISO(inicioProximoMesDate);

    // GASTOS

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

    gastosCache = Array.isArray(gastos) ? gastos : [];

    //
    // ENTRADAS
    //

    const { data: agendamentosFinanceiros, error: erroAgendamentos } =
      await supabaseClient
        .from("agendamentos")
        .select(
          `
        id,
        status,
        data_hora,
        servicos(
          nome,
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

    const entradas = (agendamentosFinanceiros || [])
      .filter((agendamento) => agendamento.status === "concluido")
      .reduce((total, agendamento) => {
        return total + Number(agendamento.servicos?.preco || 0);
      }, 0);

    //
    // SAÍDAS
    //

    const saidas = gastosCache.reduce((total, gasto) => {
      return total + Number(gasto.valor || 0);
    }, 0);

    //
    // LUCRO
    //

    const lucro = entradas - saidas;

    //
    // CARDS
    //

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

    //
    // LISTA DE GASTOS
    //

    renderizarGastos(gastosCache);

    return true;
  } catch (erro) {
    console.error("Erro inesperado ao carregar financeiro:", erro);

    return false;
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
          - ${formatarMoeda(gasto.valor)}
        </strong>

        <button
          type="button"
          title="Editar"
          onclick="editarGasto('${String(gasto.id)}')"
        >
          ✏️
        </button>

        <button
          type="button"
          title="Excluir"
          onclick="excluirGasto('${String(gasto.id)}')"
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

    // CAMPOS

    const descricao = document.getElementById("gasto-descricao")?.value.trim();
    const valor = parseFloat(document.getElementById("gasto-valor")?.value);
    const categoria = document.getElementById("gasto-categoria")?.value.trim();
    const dataGasto = document.getElementById("gasto-data")?.value;
    const pagamento = document.getElementById("gasto-pagamento")?.value;
    const observacao = document
      .getElementById("gasto-observacao")
      ?.value.trim();

    // ID DA EDIÇÃO

    const campoId = document.getElementById("gasto-id");

    const id = campoId?.value?.trim() || "";

    // VALIDAÇÃO

    if (!descricao || Number.isNaN(valor) || valor <= 0 || !dataGasto) {
      mostrarMensagem(
        "mensagem-gasto",
        "Preencha os dados do gasto corretamente.",
        "erro",
      );

      return;
    }

    if (!lojaId) {
      mostrarMensagem("mensagem-gasto", "Barbearia não identificada.", "erro");

      return;
    }

    // BOTÃO

    if (btnSalvarGasto) {
      btnSalvarGasto.disabled = true;

      btnSalvarGasto.textContent = "Salvando...";
    }

    // DADOS

    const dadosGasto = {
      descricao,
      valor,
      categoria: categoria || null,
      data_gasto: dataGasto,
      pagamento: pagamento || null,
      observacao: observacao || null,
    };

    try {
      let erro = null;

      // EDITAR

      if (id) {
        const resposta = await supabaseClient
          .from("gastos")
          .update(dadosGasto)
          .eq("id", id)
          .eq("barbearia_id", lojaId);

        erro = resposta.error;
      }

      // NOVO GASTO
      else {
        const resposta = await supabaseClient.from("gastos").insert({
          barbearia_id: lojaId,
          ...dadosGasto,
        });

        erro = resposta.error;
      }

      // ERRO

      if (erro) {
        console.error("Erro ao salvar gasto:", erro);

        mostrarMensagem(
          "mensagem-gasto",
          "Não foi possível salvar o gasto.",
          "erro",
        );

        return;
      }

      // SUCESSO

      cancelarEdicaoGasto();

      await carregarFinanceiro();

      mostrarMensagem("mensagem-gasto", "Gasto salvo com sucesso!", "sucesso");
    } catch (erro) {
      console.error("Erro inesperado ao salvar gasto:", erro);

      mostrarMensagem(
        "mensagem-gasto",
        "Ocorreu um erro ao salvar o gasto.",
        "erro",
      );
    } finally {
      if (btnSalvarGasto) {
        btnSalvarGasto.disabled = false;

        btnSalvarGasto.textContent = document.getElementById("gasto-id")?.value
          ? "Salvar edição"
          : "+ Adicionar gasto";
      }
    }
  });
}

// EDITAR GASTO

function editarGasto(id) {
  const gasto = gastosCache.find((item) => String(item.id) === String(id));

  if (!gasto) {
    alert("Gasto não encontrado.");
    return;
  }

  const campoId = document.getElementById("gasto-id");
  const campoDescricao = document.getElementById("gasto-descricao");
  const campoValor = document.getElementById("gasto-valor");
  const campoCategoria = document.getElementById("gasto-categoria");
  const campoData = document.getElementById("gasto-data");
  const campoPagamento = document.getElementById("gasto-pagamento");
  const campoObservacao = document.getElementById("gasto-observacao");

  if (campoId) {
    campoId.value = gasto.id;
  }

  if (campoDescricao) {
    campoDescricao.value = gasto.descricao || "";
  }

  if (campoValor) {
    campoValor.value = gasto.valor || 0;
  }

  if (campoCategoria) {
    campoCategoria.value = gasto.categoria || "";
  }

  if (campoData) {
    campoData.value = gasto.data_gasto || "";
  }

  if (campoPagamento) {
    campoPagamento.value = gasto.pagamento || "";
  }

  if (campoObservacao) {
    campoObservacao.value = gasto.observacao || "";
  }

  if (btnSalvarGasto) {
    btnSalvarGasto.textContent = "Salvar edição";
  }

  if (btnCancelarGasto) {
    btnCancelarGasto.hidden = false;
  }

  formGasto?.scrollIntoView({
    behavior: "smooth",
    block: "center",
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

    btnSalvarGasto.disabled = false;
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
  if (!lojaId) {
    return;
  }

  if (!confirm("Remover este gasto?")) {
    return;
  }

  try {
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
  } catch (erro) {
    console.error("Erro inesperado ao excluir gasto:", erro);

    alert("Ocorreu um erro ao remover o gasto.");
  }
}

// 16. CONFIGURAÇÕES

// CARREGAR CONFIGURAÇÕES

async function carregarConfiguracoes() {
  try {
    if (!lojaAtual || !sessaoAtual) {
      return false;
    }

    //
    // DADOS DA BARBEARIA
    //

    const configNome = document.getElementById("config-nome");
    const configTelefone = document.getElementById("config-telefone");
    const configCidade = document.getElementById("config-cidade");
    const configEndereco = document.getElementById("config-endereco");

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

    //
    // DADOS DO USUÁRIO
    //
    const usuarioNome = document.getElementById("config-usuario-nome");
    const usuarioTelefone = document.getElementById("config-usuario-telefone");
    const usuarioEmail = document.getElementById("config-usuario-email");
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

    return true;
  } catch (erro) {
    console.error("Erro inesperado ao carregar configurações:", erro);

    return false;
  }
}

// FORMULÁRIO DA BARBEARIA

const formConfiguracaoBarbearia = document.getElementById(
  "form-configuracao-barbearia",
);

if (formConfiguracaoBarbearia) {
  formConfiguracaoBarbearia.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!lojaId || !sessaoAtual) {
      return;
    }

    const nome = document.getElementById("config-nome")?.value.trim();
    const telefone = document.getElementById("config-telefone")?.value.trim();
    const cidade = document.getElementById("config-cidade")?.value.trim();
    const endereco = document.getElementById("config-endereco")?.value.trim();

    // VALIDAÇÃO

    if (!nome) {
      alert("O nome da barbearia é obrigatório.");

      return;
    }

    if (!cidade) {
      alert("A cidade da barbearia é obrigatória.");

      return;
    }

    // ATUALIZAR

    const { error } = await supabaseClient
      .from("barbearias")
      .update({
        nome,
        telefone: telefone || null,
        cidade,
        endereco: endereco || null,
      })
      .eq("id", lojaId)
      .eq("dono_id", sessaoAtual.user.id);

    if (error) {
      console.error("Erro ao atualizar barbearia:", error);

      alert("Não foi possível salvar as alterações.");

      return;
    }

    // ATUALIZAR CACHE

    lojaAtual = {
      ...lojaAtual,
      nome,
      telefone: telefone || null,
      cidade,
      endereco: endereco || null,
    };

    atualizarCabecalhoLoja();

    await carregarConfiguracoes();

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

    if (!sessaoAtual) {
      return;
    }

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
        telefone: telefone || null,
      })
      .eq("id", sessaoAtual.user.id);

    if (error) {
      console.error("Erro ao atualizar usuário:", error);

      alert("Não foi possível salvar seus dados.");

      return;
    }

    // Atualiza o cache local do perfil.

    sessaoAtual = {
      ...sessaoAtual,
      user: {
        ...sessaoAtual.user,
      },
    };

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
    if (!lojaAtual || !lojaId || !sessaoAtual) {
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
        "Não foi possível excluir a barbearia. Existem registros vinculados a ela ou a exclusão não é permitida.",
      );

      return;
    }

    alert("Barbearia excluída com sucesso.");

    window.location.href = "../barbearias/index.html";
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

  if (!lojaId) {
    alert("Não foi possível identificar a barbearia.");

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
        id,
        nome,
        telefone
      ),
      profissionais(
        id,
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
    .map((item) => {
      const cliente = item.profiles?.nome || item.cliente_nome || "Cliente";

      const profissional = item.profissionais?.nome || "Não informado";

      const servico = item.servicos?.nome || "Serviço";

      const status = STATUS_LABEL[item.status] || "Pendente";

      return `
          <tr>

            <td>
              ${escaparHtml(cliente)}
            </td>

            <td>
              ${escaparHtml(servico)}
            </td>

            <td>
              ${escaparHtml(profissional)}
            </td>

            <td>
              ${formatarDataHora(item.data_hora)}
            </td>

            <td>
              ${escaparHtml(status)}
            </td>

          </tr>
        `;
    })
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
          border-bottom: 1px solid #ddd;
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

            <th>
              Cliente
            </th>

            <th>
              Serviço
            </th>

            <th>
              Barbeiro
            </th>

            <th>
              Data
            </th>

            <th>
              Status
            </th>

          </tr>

        </thead>


        <tbody>

          ${
            linhas ||
            `
              <tr>

                <td colspan="5">
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

// WHATSAPP — ENVIAR RELATÓRIO

const btnEnviarWhatsapp = document.getElementById("btn-enviar-whatsapp");

if (btnEnviarWhatsapp) {
  btnEnviarWhatsapp.addEventListener("click", async () => {
    const dataInicial = document.getElementById(
      "relatorio-data-inicial",
    )?.value;

    const dataFinal = document.getElementById("relatorio-data-final")?.value;

    if (!dataInicial || !dataFinal) {
      alert("Informe o período do relatório.");

      return;
    }

    if (dataInicial > dataFinal) {
      alert("A data inicial não pode ser maior que a data final.");

      return;
    }

    if (!lojaAtual || !lojaId) {
      alert("Não foi possível identificar a barbearia.");

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
            id,
            nome,
            telefone
          ),
          profissionais(
            id,
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
      console.error("Erro ao buscar relatório:", error);

      alert("Não foi possível carregar os dados do relatório.");

      return;
    }

    const agendamentos = data || [];

    const total = agendamentos.length;

    const concluidos = agendamentos.filter(
      (item) => item.status === "concluido",
    );

    const faturamento = concluidos.reduce(
      (soma, item) => soma + Number(item.servicos?.preco || 0),
      0,
    );

    // DETALHES

    let detalhes = "";

    if (agendamentos.length > 0) {
      detalhes = agendamentos
        .map((item, indice) => {
          const cliente = item.profiles?.nome || item.cliente_nome || "Cliente";

          const profissional = item.profissionais?.nome || "Não informado";

          const servico = item.servicos?.nome || "Serviço";

          const dataHora = formatarDataHora(item.data_hora);

          const status = STATUS_LABEL[item.status] || "Pendente";

          return (
            `${indice + 1}. ${cliente}\n` +
            `💈 Barbeiro: ${profissional}\n` +
            `✂️ Serviço: ${servico}\n` +
            `📅 ${dataHora}\n` +
            `📌 ${status}`
          );
        })
        .join("\n\n");
    } else {
      detalhes = "Nenhum agendamento encontrado no período.";
    }

    // MENSAGEM

    const nomeBarbearia = lojaAtual.nome || "BarberHub";

    const tipoRelatorio = tipoRelatorioSelecionado || "geral";

    const mensagem = `
💈 ${nomeBarbearia}

📊 RELATÓRIO ${tipoRelatorio.toUpperCase()}

📅 Período:
${formatarData(dataInicial)} até ${formatarData(dataFinal)}

━━━━━━━━━━━━━━━━━━

📌 RESUMO

📅 Agendamentos: ${total}

✅ Concluídos: ${concluidos.length}

💰 Faturamento: ${formatarMoeda(faturamento)}

━━━━━━━━━━━━━━━━━━

📋 AGENDAMENTOS

${detalhes}

━━━━━━━━━━━━━━━━━━

📋 Relatório gerado pelo BarberHub.
`;

    // TELEFONE

    let telefone =
      lojaAtual.telefone || lojaAtual.whatsapp || lojaAtual.celular || "";

    telefone = telefone.replace(/\D/g, "");

    if (!telefone) {
      alert("Cadastre o número de WhatsApp da barbearia em Configurações.");

      return;
    }

    // Adicionar código do Brasil

    if (!telefone.startsWith("55")) {
      telefone = "55" + telefone;
    }

    // URL DO WHATSAPP

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(
      mensagem,
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  });
}

// DATA PADRÃO DO FORMULÁRIO DE GASTO

const campoDataGasto = document.getElementById("gasto-data");

if (campoDataGasto && !campoDataGasto.value) {
  campoDataGasto.value = obterDataLocalISO();
}

// INICIALIZAÇÃO DO PAINEL

async function iniciarPainel() {
  try {
    // 1. VERIFICAR SUPABASE

    if (!supabaseClient) {
      mostrarErroCarregamento("Supabase não foi configurado corretamente.");

      return;
    }

    // 2. CARREGAR BARBEARIA

    const lojaCarregada = await carregarLoja();

    if (!lojaCarregada) {
      return;
    }

    // 3. CARREGAR DADOS PRINCIPAIS

    // Profissionais precisam vir antes
    // dos horários individuais.

    await carregarServicos();

    await carregarProdutos();

    await carregarProfissionais();

    await carregarClientes();

    await carregarAgendamentos();

    await carregarHorarios();

    await carregarAvaliacoes();

    await carregarNotificacoes();

    await carregarFinanceiro();

    // 4. DASHBOARD

    await carregarDashboard();

    // 5. CONFIGURAÇÕES

    await carregarConfiguracoes();

    // 6. ABRIR VISÃO GERAL

    mudarAba("visao-geral");

    // 7. ESCONDER LOADING

    esconderTelaCarregamento();

    console.log("BarberHub: painel carregado com sucesso.");
  } catch (erro) {
    console.error("Erro inesperado ao iniciar painel:", erro);

    mostrarErroCarregamento("Ocorreu um erro inesperado ao carregar o painel.");
  }
}

// INICIAR SISTEMA

iniciarPainel();

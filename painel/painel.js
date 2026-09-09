// BARBERHUB — PAINEL DA BARBEARIA

// IDENTIFICAÇÃO DA BARBEARIA

const parametros = new URLSearchParams(window.location.search);
const lojaId = parametros.get("id");

let sessaoAtual = null;
let lojaAtual = null;

const telaCarregamento = document.getElementById("tela-carregamento");
const painelHeader = document.getElementById("painel-header");

const btnMenuMobile = document.getElementById("btn-menu-mobile");
const btnMenuBottom = document.getElementById("btn-menu-bottom");
const menuMobile = document.getElementById("menu-mobile");

let servicosCache = [];
let produtosCache = [];
let agendamentosCache = [];
let profissionaisCache = [];
let gastosCache = [];
let horariosCache = [];

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

// NAVEGAÇÃO

// Sair completamente da conta
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

// Trocar somente de barbearia
function trocarBarbearia() {
  window.location.href = "../barbearias/index.html";
}

// Adicionar nova barbearia
function adicionarBarbearia() {
  window.location.href = "../cadastro/index.html";
}

// Mantém compatibilidade com o HTML antigo,
// caso ainda exista onclick="voltar()".
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

  botoes.forEach((botao) => {
    botao.classList.toggle("menu-item--ativo", botao.dataset.aba === aba);
  });

  conteudos.forEach((conteudo) => {
    conteudo.hidden = conteudo.id !== `conteudo-${aba}`;
  });

  // Botões da navegação inferior
  document.querySelectorAll(".mobile-bottom-item").forEach((botao) => {
    botao.classList.toggle(
      "mobile-bottom-item--ativo",
      botao.dataset.aba === aba,
    );
  });

  fecharMenuMobile();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  // Carregamentos específicos
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

document.querySelectorAll(".menu-item").forEach((botao) => {
  botao.addEventListener("click", () => {
    const aba = botao.dataset.aba;

    if (aba) {
      mudarAba(aba);
    }
  });
});

document.querySelectorAll(".mobile-bottom-item").forEach((botao) => {
  botao.addEventListener("click", () => {
    const aba = botao.dataset.aba;

    if (aba) {
      mudarAba(aba);
    }
  });
});

// LOADING

function esconderTelaCarregamento() {
  if (!telaCarregamento) {
    return;
  }

  telaCarregamento.classList.add("tela-carregamento--oculta");
}

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

// CARREGAR BARBEARIA

async function carregarLoja() {
  if (!lojaId) {
    mostrarErroCarregamento("Nenhuma barbearia foi identificada.");

    return false;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabaseClient.auth.getSession();

  if (sessionError) {
    console.error("Erro ao verificar sessão:", sessionError);

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
    console.error("Erro ao carregar barbearia:", error);

    mostrarErroCarregamento(
      "Você não tem acesso a esta barbearia ou ela não existe.",
    );

    return false;
  }

  lojaAtual = loja;

  atualizarCabecalhoLoja();

  return true;
}

// CABEÇALHO DA BARBEARIA

function atualizarCabecalhoLoja() {
  if (!painelHeader || !lojaAtual) {
    return;
  }

  const logo = lojaAtual.logo_url || lojaAtual.foto_url;

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

// SERVIÇOS

const formServico = document.getElementById("form-servico");
const listaServicosEl = document.getElementById("lista-servicos");
const btnSalvarServico = document.getElementById("btn-salvar-servico");
const btnCancelarServico = document.getElementById("btn-cancelar-servico");

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

  return true;
}

function renderizarServicos(servicos) {
  if (!listaServicosEl) {
    return;
  }

  listaServicosEl.innerHTML = "";

  if (!servicos.length) {
    listaServicosEl.innerHTML = `
      <p class="em-breve">
        Nenhum serviço cadastrado.
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

    if (btnSalvarServico) {
      btnSalvarServico.disabled = true;
      btnSalvarServico.textContent = "Salvando...";
    }

    let erro = null;

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
    } else {
      const resposta = await supabaseClient.from("servicos").insert({
        barbearia_id: lojaId,
        nome,
        preco,
        duracao,
      });

      erro = resposta.error;
    }

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

function editarServico(id) {
  const servico = servicosCache.find((item) => String(item.id) === String(id));

  if (!servico) {
    alert("Serviço não encontrado.");
    return;
  }

  document.getElementById("servico-id").value = servico.id;
  document.getElementById("servico-nome").value = servico.nome || "";
  document.getElementById("servico-preco").value = servico.preco ?? "";
  document.getElementById("servico-duracao").value = servico.duracao ?? "";

  if (btnSalvarServico) {
    btnSalvarServico.textContent = "Salvar edição";
  }

  if (btnCancelarServico) {
    btnCancelarServico.hidden = false;
  }

  formServico?.scrollIntoView({
    behavior: "smooth",
  });
}

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

// STORAGE

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

// PRODUTOS

const formProduto = document.getElementById("form-produto");
const listaProdutosEl = document.getElementById("lista-produtos");
const btnSalvarProduto = document.getElementById("btn-salvar-produto");
const btnCancelarProduto = document.getElementById("btn-cancelar-produto");

const inputFotoProduto = document.getElementById("produto-foto");
const previewProduto = document.getElementById("preview-produto");
const previewProdutoImg = document.getElementById("preview-produto-img");

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

    if (btnSalvarProduto) {
      btnSalvarProduto.disabled = true;
      btnSalvarProduto.textContent = "Salvando...";
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

    cancelarEdicaoProduto();

    await carregarProdutos();

    mostrarMensagem(
      "mensagem-produto",
      "Produto salvo com sucesso!",
      "sucesso",
    );
  });
}

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

if (btnCancelarProduto) {
  btnCancelarProduto.addEventListener("click", cancelarEdicaoProduto);
}

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

// AGENDAMENTOS

const listaAgendamentosEl = document.getElementById("lista-agendamentos");

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

// CLIENTES

const listaClientesEl = document.getElementById("lista-clientes");

async function carregarClientes() {
  if (!listaClientesEl || !lojaId) {
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

function atualizarCardProfissionais() {
  const elemento = document.getElementById("total-profissionais");

  if (elemento) {
    elemento.textContent = profissionaisCache.length;
  }
}

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

// PREVIEW FOTO BARBEIRO

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
      mostrarMensagem(
        "mensagem-barbeiro",
        "Digite o nome do profissional.",
        "erro",
      );

      return;
    }

    if (btnSalvarBarbeiro) {
      btnSalvarBarbeiro.disabled = true;
      btnSalvarBarbeiro.textContent = "Salvando...";
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

      mostrarMensagem(
        "mensagem-barbeiro",
        "Não foi possível salvar o profissional.",
        "erro",
      );

      if (btnSalvarBarbeiro) {
        btnSalvarBarbeiro.disabled = false;
        btnSalvarBarbeiro.textContent = id
          ? "Salvar edição"
          : "+ Adicionar profissional";
      }

      return;
    }

    cancelarEdicaoBarbeiro();

    await carregarProfissionais();
    await carregarDashboard();

    mostrarMensagem(
      "mensagem-barbeiro",
      "Profissional salvo com sucesso!",
      "sucesso",
    );
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

  if (barbeiro.foto_url && previewBarbeiroImg) {
    previewBarbeiroImg.src = barbeiro.foto_url;

    if (previewBarbeiro) {
      previewBarbeiro.hidden = false;
    }
  }

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

// CANCELAR BARBEIRO

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

if (btnCancelarBarbeiro) {
  btnCancelarBarbeiro.addEventListener("click", cancelarEdicaoBarbeiro);
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
    return false;
  }

  const hoje = obterInicioDoDia();

  const fimHoje = obterFimDoDia();

  // ----------------------------------------------------------
  // AGENDAMENTOS DE HOJE
  // ----------------------------------------------------------

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

    return false;
  }

  // ----------------------------------------------------------
  // TOTAL DE CLIENTES
  // ----------------------------------------------------------

  const { data: clientes } = await supabaseClient
    .from("agendamentos")
    .select("cliente_id")
    .eq("barbearia_id", lojaId);

  const clientesUnicos = new Set(
    (clientes || []).map((item) => item.cliente_id).filter(Boolean),
  );

  // ----------------------------------------------------------
  // TOTAL DE PROFISSIONAIS
  // ----------------------------------------------------------

  const { count: totalProfissionais } = await supabaseClient
    .from("profissionais")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("barbearia_id", lojaId);

  // ----------------------------------------------------------
  // FATURAMENTO DO DIA
  // ----------------------------------------------------------

  const faturamento = (agendamentosHoje || [])
    .filter((item) => item.status === "concluido")
    .reduce((total, item) => total + Number(item.servicos?.preco || 0), 0);

  // ----------------------------------------------------------
  // ATUALIZAR CARDS
  // ----------------------------------------------------------

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

  return true;
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

// HORÁRIOS

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

    // Validar todos
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

  const inicioMes = obterDataLocalISO(new Date(ano, mes, 1));

  const inicioProximoMes = obterDataLocalISO(new Date(ano, mes + 1, 1));

  // ----------------------------------------------------------
  // GASTOS
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // ENTRADAS
  // ----------------------------------------------------------

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

  const entradas = (agendamentos || [])
    .filter((item) => item.status === "concluido")
    .reduce((total, item) => total + Number(item.servicos?.preco || 0), 0);

  // ----------------------------------------------------------
  // SAÍDAS
  // ----------------------------------------------------------

  const saidas = gastosCache.reduce(
    (total, item) => total + Number(item.valor || 0),
    0,
  );

  // ----------------------------------------------------------
  // LUCRO
  // ----------------------------------------------------------

  const lucro = entradas - saidas;

  // ----------------------------------------------------------
  // CARDS
  // ----------------------------------------------------------

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
          title="Editar"
          onclick="editarGasto('${gasto.id}')"
        >
          ✏️
        </button>

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

    const pagamento = document.getElementById("gasto-pagamento")?.value;

    const observacao = document
      .getElementById("gasto-observacao")
      ?.value.trim();

    const id = document.getElementById("gasto-id")?.value;

    if (!descricao || Number.isNaN(valor) || valor <= 0 || !dataGasto) {
      mostrarMensagem(
        "mensagem-gasto",
        "Preencha os dados do gasto corretamente.",
        "erro",
      );

      return;
    }

    if (btnSalvarGasto) {
      btnSalvarGasto.disabled = true;

      btnSalvarGasto.textContent = "Salvando...";
    }

    const dadosGasto = {
      descricao,
      valor,
      categoria: categoria || null,
      data_gasto: dataGasto,
      pagamento: pagamento || null,
      observacao: observacao || null,
    };

    let erro = null;

    if (id) {
      const resposta = await supabaseClient
        .from("gastos")
        .update(dadosGasto)
        .eq("id", id)
        .eq("barbearia_id", lojaId);

      erro = resposta.error;
    } else {
      const resposta = await supabaseClient.from("gastos").insert({
        barbearia_id: lojaId,
        ...dadosGasto,
      });

      erro = resposta.error;
    }

    if (erro) {
      console.error("Erro ao salvar gasto:", erro);

      mostrarMensagem(
        "mensagem-gasto",
        "Não foi possível salvar o gasto.",
        "erro",
      );

      if (btnSalvarGasto) {
        btnSalvarGasto.disabled = false;

        btnSalvarGasto.textContent = id ? "Salvar edição" : "+ Adicionar gasto";
      }

      return;
    }

    cancelarEdicaoGasto();

    await carregarFinanceiro();

    mostrarMensagem("mensagem-gasto", "Gasto salvo com sucesso!", "sucesso");
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

  const pagamento = document.getElementById("gasto-pagamento");

  if (pagamento) {
    pagamento.value = gasto.pagamento || "";
  }

  const observacao = document.getElementById("gasto-observacao");

  if (observacao) {
    observacao.value = gasto.observacao || "";
  }

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

// CANCELAR GASTO

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

// FORMULÁRIO BARBEARIA

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

    atualizarCabecalhoLoja();

    await carregarConfiguracoes();

    alert("Dados da barbearia atualizados!");
  });
}

// FORMULÁRIO USUÁRIO

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
// ==================================================
// WHATSAPP — ENVIAR RELATÓRIO
// ==================================================

const btnEnviarWhatsapp = document.getElementById("btn-enviar-whatsapp");

if (btnEnviarWhatsapp) {
  btnEnviarWhatsapp.addEventListener("click", async () => {
    // ==================================================
    // PEGAR DATAS
    // ==================================================

    const dataInicial = document.getElementById(
      "relatorio-data-inicial",
    )?.value;

    const dataFinal = document.getElementById("relatorio-data-final")?.value;

    // ==================================================
    // VALIDAR DATAS
    // ==================================================

    if (!dataInicial || !dataFinal) {
      alert("Informe o período do relatório.");
      return;
    }

    if (dataInicial > dataFinal) {
      alert("A data inicial não pode ser maior que a data final.");
      return;
    }

    // ==================================================
    // VERIFICAR BARBEARIA
    // ==================================================

    if (!lojaAtual) {
      alert("Não foi possível identificar a barbearia.");
      return;
    }

    // ==================================================
    // BUSCAR AGENDAMENTOS
    // ==================================================

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

    // ==================================================
    // VERIFICAR ERRO
    // ==================================================

    if (error) {
      console.error("Erro ao buscar relatório:", error);

      alert("Não foi possível carregar os dados do relatório.");

      return;
    }

    // ==================================================
    // DADOS DO RELATÓRIO
    // ==================================================

    const agendamentos = data || [];

    const total = agendamentos.length;

    const concluidos = agendamentos.filter(
      (item) => item.status === "concluido",
    );

    const faturamento = concluidos.reduce(
      (soma, item) => soma + Number(item.servicos?.preco || 0),
      0,
    );

    // ==================================================
    // MONTAR DETALHES
    // ==================================================

    let detalhes = "";

    if (agendamentos.length > 0) {
      detalhes = agendamentos
        .map((item, indice) => {
          const cliente = item.profiles?.nome || "Cliente";

          const servico = item.servicos?.nome || "Serviço";

          const dataHora = formatarDataHora(item.data_hora);

          const status = STATUS_LABEL[item.status] || "Pendente";

          return (
            `${indice + 1}. ` +
            `${cliente} - ` +
            `${servico}\n` +
            `📅 ${dataHora}\n` +
            `📌 ${status}`
          );
        })
        .join("\n\n");
    } else {
      detalhes = "Nenhum agendamento encontrado no período.";
    }

    // ==================================================
    // NOME DA BARBEARIA
    // ==================================================

    const nomeBarbearia = lojaAtual.nome || "BarberHub";

    // ==================================================
    // TIPO DO RELATÓRIO
    // ==================================================

    const tipoRelatorio = tipoRelatorioSelecionado || "geral";

    // ==================================================
    // MENSAGEM DO WHATSAPP
    // ==================================================

    const mensagem = `💈 ${nomeBarbearia}

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

    // ==================================================
    // PEGAR TELEFONE DA BARBEARIA
    // ==================================================

    let telefone =
      lojaAtual.telefone || lojaAtual.whatsapp || lojaAtual.celular || "";

    // ==================================================
    // REMOVER CARACTERES
    // ==================================================

    telefone = telefone.replace(/\D/g, "");

    // ==================================================
    // VERIFICAR TELEFONE
    // ==================================================

    if (!telefone) {
      alert("Cadastre o número de WhatsApp da barbearia em Configurações.");

      return;
    }

    // ==================================================
    // ADICIONAR CÓDIGO DO BRASIL
    // ==================================================

    if (!telefone.startsWith("55")) {
      telefone = "55" + telefone;
    }

    // ==================================================
    // ABRIR WHATSAPP
    // ==================================================

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

// INICIAR PAINEL

async function iniciarPainel() {
  try {
    // 1. Verificar Supabase
    if (!supabaseClient) {
      mostrarErroCarregamento("Supabase não foi configurado corretamente.");

      return;
    }

    // 2. Carregar barbearia
    const lojaCarregada = await carregarLoja();

    if (!lojaCarregada) {
      return;
    }

    // 3. Carregar dados principais
    await Promise.all([
      carregarServicos(),
      carregarProdutos(),
      carregarAgendamentos(),
      carregarProfissionais(),
      carregarFinanceiro(),
      carregarHorarios(),
    ]);

    // 4. Dashboard
    await carregarDashboard();

    // 5. Configurações
    await carregarConfiguracoes();

    // 6. Abrir visão geral
    mudarAba("visao-geral");

    // 7. Esconder loading
    esconderTelaCarregamento();

    console.log("BarberHub: painel carregado com sucesso.");
  } catch (erro) {
    console.error("Erro inesperado ao iniciar painel:", erro);

    mostrarErroCarregamento("Ocorreu um erro inesperado ao carregar o painel.");
  }
}

// INICIAR SISTEMA

iniciarPainel();

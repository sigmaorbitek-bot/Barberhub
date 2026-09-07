// ==================================================
// NAVEGAÇÃO
// ==================================================

function voltar() {
  window.location.href = "../barbearia/index.html";
}

// ==================================================
// PEGAR O ID DA LOJA PELA URL
// ==================================================

const parametros = new URLSearchParams(window.location.search);
const lojaId = parametros.get("id");

const painelHeader = document.getElementById("painel-header");

// Guardamos a sessão aqui para reaproveitar
// em outras partes do painel.
let sessaoAtual = null;

// ==================================================
// TELA DE CARREGAMENTO
// ==================================================

const telaCarregamento =
  document.getElementById("tela-carregamento");

// ==================================================
// ESCONDER TELA DE CARREGAMENTO
// ==================================================

function esconderTelaCarregamento() {
  if (!telaCarregamento) {
    return;
  }

  telaCarregamento.classList.add(
    "tela-carregamento--oculta"
  );
}

// ==================================================
// ERRO NO CARREGAMENTO
// ==================================================

function mostrarErroCarregamento(mensagem) {
  if (!telaCarregamento) {
    return;
  }

  telaCarregamento.classList.remove(
    "tela-carregamento--oculta"
  );

  telaCarregamento.innerHTML = `
    <div class="carregamento-conteudo">

      <div class="carregamento-logo">
        ⚠️
      </div>

      <h2>Não foi possível carregar</h2>

      <p>
        ${mensagem}
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

// ==================================================
// ELEMENTOS DA NAVEGAÇÃO MOBILE
// ==================================================

const btnMenuMobile =
  document.getElementById("btn-menu-mobile");

const btnMenuBottom =
  document.getElementById("btn-menu-bottom");

const menuMobile =
  document.getElementById("menu-mobile");

// ==================================================
// ABRIR / FECHAR MENU MOBILE
// ==================================================

function alternarMenuMobile() {
  if (!menuMobile) {
    return;
  }

  const aberto =
    menuMobile.classList.toggle(
      "mobile-menu--aberto"
    );

  if (btnMenuMobile) {
    btnMenuMobile.setAttribute(
      "aria-expanded",
      aberto ? "true" : "false"
    );
  }
}

// ==================================================
// FECHAR MENU MOBILE
// ==================================================

function fecharMenuMobile() {
  if (!menuMobile) {
    return;
  }

  menuMobile.classList.remove(
    "mobile-menu--aberto"
  );

  if (btnMenuMobile) {
    btnMenuMobile.setAttribute(
      "aria-expanded",
      "false"
    );
  }
}

// ==================================================
// EVENTOS DO MENU MOBILE
// ==================================================

if (btnMenuMobile) {
  btnMenuMobile.addEventListener(
    "click",
    alternarMenuMobile
  );
}

if (btnMenuBottom) {
  btnMenuBottom.addEventListener(
    "click",
    alternarMenuMobile
  );
}

// ==================================================
// CARREGAR DADOS DA LOJA
// ==================================================

async function carregarLoja() {

  if (!lojaId) {

    console.error(
      "Nenhum id de loja na URL."
    );

    mostrarErroCarregamento(
      "Nenhuma loja foi identificada."
    );

    return false;
  }

  const {
    data: { session },
    error: erroSessao,
  } = await supabaseClient.auth.getSession();

  if (erroSessao) {

    console.error(
      "Erro ao verificar sessão:",
      erroSessao
    );

    mostrarErroCarregamento(
      "Não foi possível verificar sua sessão."
    );

    return false;
  }

  if (!session) {

    window.location.href =
      "../login/index.html";

    return false;
  }

  sessaoAtual = session;

  const {
    data: loja,
    error,
  } = await supabaseClient
    .from("barbearias")
    .select("*")
    .eq("id", lojaId)
    .eq("dono_id", session.user.id)
    .single();

  if (error || !loja) {

    console.error(
      "Erro ao carregar loja:",
      error
    );

    mostrarErroCarregamento(
      "A loja não foi encontrada ou você não tem acesso a ela."
    );

    return false;
  }

  const logo = loja.logo_url;

  painelHeader.innerHTML = `
    ${
      logo
        ? `
          <img
            src="${logo}"
            alt="Logo ${loja.nome}"
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
        ${loja.nome}
      </h1>

      <p>
        📍 ${loja.cidade}
      </p>

    </div>
  `;

  return true;
}

// ==================================================
// NAVEGAÇÃO DO PAINEL
// ==================================================

function mudarAba(aba) {

  document
    .querySelectorAll(".menu-item")
    .forEach((item) => {

      item.classList.toggle(
        "menu-item--ativo",
        item.dataset.aba === aba
      );

    });

  document
    .querySelectorAll(".painel-conteudo")
    .forEach((secao) => {

      secao.hidden =
        secao.id !== `conteudo-${aba}`;

    });

  document
    .querySelectorAll(".mobile-bottom-item")
    .forEach((item) => {

      const acao =
        item.getAttribute("onclick");

      if (!acao) {
        return;
      }

      item.classList.toggle(
        "mobile-bottom-item--ativo",
        acao.includes(`'${aba}'`)
      );

    });

  fecharMenuMobile();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// ==================================================
// SERVIÇOS
// ==================================================

const formServico =
  document.getElementById("form-servico");

const listaServicosEl =
  document.getElementById("lista-servicos");

const btnSalvarServico =
  document.getElementById("btn-salvar-servico");

const btnCancelarServico =
  document.getElementById("btn-cancelar-servico");

// ==================================================
// CARREGAR SERVIÇOS
// ==================================================

async function carregarServicos() {

  const {
    data,
    error,
  } = await supabaseClient
    .from("servicos")
    .select("*")
    .eq("barbearia_id", lojaId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {

    console.error(
      "Erro ao buscar serviços:",
      error
    );

    listaServicosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os serviços.
      </p>
    `;

    return false;
  }

  renderizarServicos(data);

  return true;
}

// ==================================================
// RENDERIZAR SERVIÇOS
// ==================================================

function renderizarServicos(servicos) {

  listaServicosEl.innerHTML = "";

  if (servicos.length === 0) {

    listaServicosEl.innerHTML = `
      <p class="em-breve">
        Nenhum serviço cadastrado ainda.
      </p>
    `;

    return;
  }

  servicos.forEach((servico) => {

    const item =
      document.createElement("div");

    item.classList.add("item-lista");

    item.innerHTML = `
      <div class="item-info">

        <h3>
          ${servico.nome}
        </h3>

        <p>
          R$ ${Number(servico.preco).toFixed(2)}
          ·
          ${servico.duracao_minutos} min
        </p>

      </div>

      <div class="item-acoes">

        <button
          type="button"
          title="Editar"
          onclick='editarServico(${JSON.stringify(servico)})'
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

// ==================================================
// SALVAR SERVIÇO
// ==================================================

formServico.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();

    const id =
      document.getElementById(
        "servico-id"
      ).value;

    const nome =
      document.getElementById(
        "servico-nome"
      ).value.trim();

    const preco =
      parseFloat(
        document.getElementById(
          "servico-preco"
        ).value
      );

    const duracao =
      parseInt(
        document.getElementById(
          "servico-duracao"
        ).value,
        10
      );

    if (id) {

      const { error } =
        await supabaseClient
          .from("servicos")
          .update({
            nome: nome,
            preco: preco,
            duracao_minutos: duracao,
          })
          .eq("id", id)
          .eq(
            "barbearia_id",
            lojaId
          );

      if (error) {

        console.error(
          "Erro ao editar serviço:",
          error
        );

        alert(
          "Não foi possível salvar a edição."
        );

        return;
      }

    } else {

      const { error } =
        await supabaseClient
          .from("servicos")
          .insert({
            barbearia_id: lojaId,
            nome: nome,
            preco: preco,
            duracao_minutos: duracao,
          });

      if (error) {

        console.error(
          "Erro ao adicionar serviço:",
          error
        );

        alert(
          "Não foi possível adicionar o serviço."
        );

        return;
      }
    }

    cancelarEdicaoServico();

    await carregarServicos();

  }
);

// ==================================================
// EDITAR SERVIÇO
// ==================================================

function editarServico(servico) {

  document.getElementById(
    "servico-id"
  ).value = servico.id;

  document.getElementById(
    "servico-nome"
  ).value = servico.nome;

  document.getElementById(
    "servico-preco"
  ).value = servico.preco;

  document.getElementById(
    "servico-duracao"
  ).value =
    servico.duracao_minutos;

  btnSalvarServico.textContent =
    "Salvar edição";

  btnCancelarServico.hidden = false;

  formServico.scrollIntoView({
    behavior: "smooth",
  });
}

// ==================================================
// CANCELAR EDIÇÃO DE SERVIÇO
// ==================================================

function cancelarEdicaoServico() {

  formServico.reset();

  document.getElementById(
    "servico-id"
  ).value = "";

  document.getElementById(
    "servico-duracao"
  ).value = 30;

  btnSalvarServico.textContent =
    "+ Adicionar serviço";

  btnCancelarServico.hidden = true;
}

// ==================================================
// EXCLUIR SERVIÇO
// ==================================================

async function excluirServico(id) {

  if (
    !confirm(
      "Remover esse serviço?"
    )
  ) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("servicos")
      .delete()
      .eq("id", id)
      .eq(
        "barbearia_id",
        lojaId
      );

  if (error) {

    console.error(
      "Erro ao excluir serviço:",
      error
    );

    alert(
      "Não foi possível remover o serviço."
    );

    return;
  }

  await carregarServicos();
}

// ==================================================
// PRODUTOS
// ==================================================

const formProduto =
  document.getElementById("form-produto");

const listaProdutosEl =
  document.getElementById("lista-produtos");

const btnSalvarProduto =
  document.getElementById(
    "btn-salvar-produto"
  );

const btnCancelarProduto =
  document.getElementById(
    "btn-cancelar-produto"
  );

// ==================================================
// CARREGAR PRODUTOS
// ==================================================

async function carregarProdutos() {

  const {
    data,
    error,
  } = await supabaseClient
    .from("produtos")
    .select("*")
    .eq("barbearia_id", lojaId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {

    console.error(
      "Erro ao buscar produtos:",
      error
    );

    listaProdutosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os produtos.
      </p>
    `;

    return false;
  }

  renderizarProdutos(data);

  return true;
}

// ==================================================
// RENDERIZAR PRODUTOS
// ==================================================

function renderizarProdutos(produtos) {

  listaProdutosEl.innerHTML = "";

  if (produtos.length === 0) {

    listaProdutosEl.innerHTML = `
      <p class="em-breve">
        Nenhum produto cadastrado ainda.
      </p>
    `;

    return;
  }

  produtos.forEach((produto) => {

    const item =
      document.createElement("div");

    item.classList.add(
      "item-lista"
    );

    item.innerHTML = `
      <div class="item-info item-info--com-foto">

        ${
          produto.foto_url
            ? `
              <img
                src="${produto.foto_url}"
                alt="${produto.nome}"
                class="produto-thumb"
              >
            `
            : `
              <div
                class="produto-thumb produto-thumb--vazia"
              >
                🛍️
              </div>
            `
        }

        <div>

          <h3>
            ${produto.nome}
          </h3>

          <p>
            R$ ${Number(produto.preco).toFixed(2)}
            ·
            ${produto.estoque} em estoque
          </p>

        </div>

      </div>

      <div class="item-acoes">

        <button
          type="button"
          title="Editar"
          onclick='editarProduto(${JSON.stringify(produto)})'
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

// ==================================================
// SALVAR PRODUTO
// ==================================================

formProduto.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();

    const id =
      document.getElementById(
        "produto-id"
      ).value;

    const nome =
      document.getElementById(
        "produto-nome"
      ).value.trim();

    const preco =
      parseFloat(
        document.getElementById(
          "produto-preco"
        ).value
      );

    const estoque =
      parseInt(
        document.getElementById(
          "produto-estoque"
        ).value,
        10
      );

    const arquivoFoto =
      document.getElementById(
        "produto-foto"
      ).files[0];

    const fotoAtual =
      document.getElementById(
        "produto-foto-atual"
      ).value;

    let fotoUrl =
      fotoAtual || null;

    // ----------------------------------------------
    // UPLOAD DA FOTO
    // ----------------------------------------------

    if (arquivoFoto) {

      const caminhoArquivo =
        `${sessaoAtual.user.id}/produtos/${Date.now()}-${arquivoFoto.name}`;

      const {
        error: erroUpload,
      } =
        await supabaseClient.storage
          .from("barbearias")
          .upload(
            caminhoArquivo,
            arquivoFoto
          );

      if (erroUpload) {

        console.error(
          "Erro ao enviar foto do produto:",
          erroUpload
        );

        alert(
          "Não foi possível enviar a foto, mas vamos salvar o restante."
        );

      } else {

        const {
          data: urlPublica,
        } =
          supabaseClient.storage
            .from("barbearias")
            .getPublicUrl(
              caminhoArquivo
            );

        fotoUrl =
          urlPublica.publicUrl;
      }
    }

    // ----------------------------------------------
    // EDITAR
    // ----------------------------------------------

    if (id) {

      const { error } =
        await supabaseClient
          .from("produtos")
          .update({
            nome: nome,
            preco: preco,
            estoque: estoque,
            foto_url: fotoUrl,
          })
          .eq("id", id)
          .eq(
            "barbearia_id",
            lojaId
          );

      if (error) {

        console.error(
          "Erro ao editar produto:",
          error
        );

        alert(
          "Não foi possível salvar a edição."
        );

        return;
      }

    }

    // ----------------------------------------------
    // NOVO PRODUTO
    // ----------------------------------------------

    else {

      const { error } =
        await supabaseClient
          .from("produtos")
          .insert({
            barbearia_id: lojaId,
            nome: nome,
            preco: preco,
            estoque: estoque,
            foto_url: fotoUrl,
          });

      if (error) {

        console.error(
          "Erro ao adicionar produto:",
          error
        );

        alert(
          "Não foi possível adicionar o produto."
        );

        return;
      }
    }

    cancelarEdicaoProduto();

    await carregarProdutos();

  }
);

// ==================================================
// EDITAR PRODUTO
// ==================================================

function editarProduto(produto) {

  document.getElementById(
    "produto-id"
  ).value = produto.id;

  document.getElementById(
    "produto-nome"
  ).value = produto.nome;

  document.getElementById(
    "produto-preco"
  ).value = produto.preco;

  document.getElementById(
    "produto-estoque"
  ).value = produto.estoque;

  document.getElementById(
    "produto-foto-atual"
  ).value =
    produto.foto_url || "";

  document.getElementById(
    "produto-foto"
  ).value = "";

  btnSalvarProduto.textContent =
    "Salvar edição";

  btnCancelarProduto.hidden =
    false;

  formProduto.scrollIntoView({
    behavior: "smooth",
  });
}

// ==================================================
// CANCELAR EDIÇÃO DE PRODUTO
// ==================================================

function cancelarEdicaoProduto() {

  formProduto.reset();

  document.getElementById(
    "produto-id"
  ).value = "";

  document.getElementById(
    "produto-foto-atual"
  ).value = "";

  document.getElementById(
    "produto-estoque"
  ).value = 0;

  btnSalvarProduto.textContent =
    "+ Adicionar produto";

  btnCancelarProduto.hidden =
    true;
}

// ==================================================
// EXCLUIR PRODUTO
// ==================================================

async function excluirProduto(id) {

  if (
    !confirm(
      "Remover esse produto?"
    )
  ) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("produtos")
      .delete()
      .eq("id", id)
      .eq(
        "barbearia_id",
        lojaId
      );

  if (error) {

    console.error(
      "Erro ao excluir produto:",
      error
    );

    alert(
      "Não foi possível remover o produto."
    );

    return;
  }

  await carregarProdutos();
}

// ==================================================
// AGENDAMENTOS
// ==================================================

const listaAgendamentosEl =
  document.getElementById(
    "lista-agendamentos"
  );

const STATUS_LABEL = {

  pendente: "Pendente",

  confirmado: "Confirmado",

  concluido: "Concluído",

  cancelado: "Cancelado",

};

// ==================================================
// CARREGAR AGENDAMENTOS
// ==================================================

async function carregarAgendamentos() {

  const {
    data,
    error,
  } =
    await supabaseClient
      .from("agendamentos")
      .select(`
        *,
        servicos(nome),
        profiles(nome)
      `)
      .eq(
        "barbearia_id",
        lojaId
      )
      .order("data_hora", {
        ascending: true,
      });

  if (error) {

    console.error(
      "Erro ao buscar agendamentos:",
      error
    );

    listaAgendamentosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os agendamentos.
      </p>
    `;

    return false;
  }

  renderizarAgendamentos(data);

  return true;
}

// ==================================================
// RENDERIZAR AGENDAMENTOS
// ==================================================

function renderizarAgendamentos(
  agendamentos
) {

  listaAgendamentosEl.innerHTML =
    "";

  if (
    agendamentos.length === 0
  ) {

    listaAgendamentosEl.innerHTML = `
      <p class="em-breve">
        Nenhum agendamento ainda.
      </p>
    `;

    return;
  }

  agendamentos.forEach(
    (agendamento) => {

      const dataHora =
        new Date(
          agendamento.data_hora
        );

      const dataFormatada =
        dataHora.toLocaleDateString(
          "pt-BR"
        );

      const horaFormatada =
        dataHora.toLocaleTimeString(
          "pt-BR",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );

      const nomeCliente =
        agendamento.profiles?.nome ||
        "Cliente";

      const nomeServico =
        agendamento.servicos?.nome ||
        "Serviço";

      const item =
        document.createElement(
          "div"
        );

      item.classList.add(
        "item-lista"
      );

      item.innerHTML = `
        <div class="item-info">

          <h3>
            ${nomeCliente}
          </h3>

          <p>
            ${nomeServico}
            ·
            ${dataFormatada}
            às
            ${horaFormatada}
          </p>

        </div>

        <div class="item-acoes">

          <select
            class="select-status select-status--${agendamento.status}"
            onchange="atualizarStatusAgendamento('${agendamento.id}', this.value)"
          >

            ${Object.entries(
              STATUS_LABEL
            )
              .map(
                ([valor, rotulo]) => `
                  <option
                    value="${valor}"
                    ${
                      agendamento.status ===
                      valor
                        ? "selected"
                        : ""
                    }
                  >
                    ${rotulo}
                  </option>
                `
              )
              .join("")}

          </select>

        </div>
      `;

      listaAgendamentosEl.appendChild(
        item
      );

    }
  );
}

// ==================================================
// ATUALIZAR STATUS
// ==================================================

async function atualizarStatusAgendamento(
  id,
  novoStatus
) {

  const { error } =
    await supabaseClient
      .from("agendamentos")
      .update({
        status: novoStatus,
      })
      .eq("id", id)
      .eq(
        "barbearia_id",
        lojaId
      );

  if (error) {

    console.error(
      "Erro ao atualizar status:",
      error
    );

    alert(
      "Não foi possível atualizar o status."
    );

    return;
  }

  await carregarAgendamentos();
}

// ==================================================
// INICIAR PAINEL
// ==================================================

async function iniciarPainel() {

  try {

    // ----------------------------------------------
    // 1. CARREGAR A LOJA
    // ----------------------------------------------

    const lojaCarregada =
      await carregarLoja();

    if (!lojaCarregada) {
      return;
    }

    // ----------------------------------------------
    // 2. CARREGAR DADOS DO PAINEL
    // ----------------------------------------------

    const [
      servicosOk,
      produtosOk,
      agendamentosOk,
    ] = await Promise.all([

      carregarServicos(),

      carregarProdutos(),

      carregarAgendamentos(),

    ]);

    // ----------------------------------------------
    // 3. VERIFICAR SE TUDO CARREGOU
    // ----------------------------------------------

    if (
      !servicosOk ||
      !produtosOk ||
      !agendamentosOk
    ) {

      mostrarErroCarregamento(
        "Não foi possível carregar todos os dados do painel."
      );

      return;
    }

    // ----------------------------------------------
    // 4. ABRIR VISÃO GERAL
    // ----------------------------------------------

    mudarAba(
      "visao-geral"
    );

    // ----------------------------------------------
    // 5. ESCONDER LOADING
    // ----------------------------------------------

    esconderTelaCarregamento();

  } catch (erro) {

    console.error(
      "Erro inesperado ao iniciar painel:",
      erro
    );

    mostrarErroCarregamento(
      "Ocorreu um erro inesperado ao carregar o painel."
    );
  }
}

// ==================================================
// INICIAR SISTEMA
// ==================================================

iniciarPainel();
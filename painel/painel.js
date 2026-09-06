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
// CARREGAR DADOS DA LOJA
// ==================================================

async function carregarLoja() {
  // --------------------------------------------------
  // 1. VERIFICAR ID DA LOJA
  // --------------------------------------------------

  if (!lojaId) {
    console.error("Nenhum id de loja na URL.");

    voltar();

    return;
  }

  // --------------------------------------------------
  // 2. VERIFICAR SESSÃO
  // --------------------------------------------------

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "../login/index.html";

    return;
  }

  // Guardamos a sessão para usar depois
  sessaoAtual = session;

  // --------------------------------------------------
  // 3. BUSCAR A LOJA
  // --------------------------------------------------

  const { data: loja, error } = await supabaseClient

    .from("barbearias")

    .select("*")

    .eq("id", lojaId)

    .eq("dono_id", session.user.id)

    .single();

  // --------------------------------------------------
  // 4. VERIFICAR RESULTADO
  // --------------------------------------------------

  if (error || !loja) {
    console.error("Erro ao carregar loja:", error);

    painelHeader.innerHTML = `
            <p class="em-breve">
                Loja não encontrada.
            </p>
        `;

    return;
  }

  console.log("Loja carregada:", loja);

  // --------------------------------------------------
  // 5. PEGAR LOGO
  // --------------------------------------------------

  const logo = loja.logo_url;

  // --------------------------------------------------
  // 6. MONTAR HEADER
  // --------------------------------------------------

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

            <h1>${loja.nome}</h1>

            <p>
                📍 ${loja.cidade}
            </p>

        </div>
    `;
}

// ==================================================
// NAVEGAÇÃO DO PAINEL
// ==================================================

function mudarAba(aba) {

    // --------------------------------------------------
    // 1. ATIVAR ITEM DO MENU
    // --------------------------------------------------

    document.querySelectorAll(".menu-item").forEach((item) => {

        item.classList.toggle(
            "menu-item--ativo",
            item.dataset.aba === aba
        );

    });

    // --------------------------------------------------
    // 2. MOSTRAR O CONTEÚDO CORRETO
    // --------------------------------------------------

    document.querySelectorAll(".painel-conteudo").forEach((secao) => {

        secao.hidden = secao.id !== `conteudo-${aba}`;

    });

}

// ==================================================
// SERVIÇOS
// ==================================================

const formServico = document.getElementById("form-servico");

const listaServicosEl = document.getElementById("lista-servicos");

const btnSalvarServico = document.getElementById("btn-salvar-servico");

const btnCancelarServico = document.getElementById("btn-cancelar-servico");

// ==================================================
// CARREGAR SERVIÇOS
// ==================================================

async function carregarServicos() {
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

    return;
  }

  renderizarServicos(data);
}

// ==================================================
// DESENHAR SERVIÇOS
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
    const item = document.createElement("div");

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
// ADICIONAR / EDITAR SERVIÇO
// ==================================================

formServico.addEventListener("submit", async function (event) {
  event.preventDefault();

  const id = document.getElementById("servico-id").value;

  const nome = document.getElementById("servico-nome").value.trim();

  const preco = parseFloat(document.getElementById("servico-preco").value);

  const duracao = parseInt(
    document.getElementById("servico-duracao").value,
    10,
  );

  // --------------------------------------------------
  // EDITAR
  // --------------------------------------------------

  if (id) {
    const { error } = await supabaseClient

      .from("servicos")

      .update({
        nome: nome,
        preco: preco,
        duracao_minutos: duracao,
      })

      .eq("id", id);

    if (error) {
      console.error("Erro ao editar serviço:", error);

      alert("Não foi possível salvar a edição.");

      return;
    }
  }

  // --------------------------------------------------
  // ADICIONAR
  // --------------------------------------------------
  else {
    const { error } = await supabaseClient

      .from("servicos")

      .insert({
        barbearia_id: lojaId,

        nome: nome,

        preco: preco,

        duracao_minutos: duracao,
      });

    if (error) {
      console.error("Erro ao adicionar serviço:", error);

      alert("Não foi possível adicionar o serviço.");

      return;
    }
  }

  // Limpar formulário
  cancelarEdicaoServico();

  // Atualizar lista
  carregarServicos();
});

// ==================================================
// EDITAR SERVIÇO
// ==================================================

function editarServico(servico) {
  document.getElementById("servico-id").value = servico.id;

  document.getElementById("servico-nome").value = servico.nome;

  document.getElementById("servico-preco").value = servico.preco;

  document.getElementById("servico-duracao").value = servico.duracao_minutos;

  btnSalvarServico.textContent = "Salvar edição";

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

  document.getElementById("servico-id").value = "";

  document.getElementById("servico-duracao").value = 30;

  btnSalvarServico.textContent = "+ Adicionar serviço";

  btnCancelarServico.hidden = true;
}

// ==================================================
// EXCLUIR SERVIÇO
// ==================================================

async function excluirServico(id) {
  if (!confirm("Remover esse serviço?")) {
    return;
  }

  const { error } = await supabaseClient

    .from("servicos")

    .delete()

    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir serviço:", error);

    alert("Não foi possível remover o serviço.");

    return;
  }

  carregarServicos();
}

// ==================================================
// PRODUTOS
// ==================================================

const formProduto = document.getElementById("form-produto");

const listaProdutosEl = document.getElementById("lista-produtos");

const btnSalvarProduto = document.getElementById("btn-salvar-produto");

const btnCancelarProduto = document.getElementById("btn-cancelar-produto");

// ==================================================
// CARREGAR PRODUTOS
// ==================================================

async function carregarProdutos() {
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

    return;
  }

  renderizarProdutos(data);
}

// ==================================================
// DESENHAR PRODUTOS
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
    const item = document.createElement("div");

    item.classList.add("item-lista");

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
// ADICIONAR / EDITAR PRODUTO
// ==================================================

formProduto.addEventListener("submit", async function (event) {
  event.preventDefault();

  const id = document.getElementById("produto-id").value;

  const nome = document.getElementById("produto-nome").value.trim();

  const preco = parseFloat(document.getElementById("produto-preco").value);

  const estoque = parseInt(
    document.getElementById("produto-estoque").value,
    10,
  );

  const arquivoFoto = document.getElementById("produto-foto").files[0];

  const fotoAtual = document.getElementById("produto-foto-atual").value;

  // --------------------------------------------------
  // FOTO
  // --------------------------------------------------

  let fotoUrl = fotoAtual || null;

  if (arquivoFoto) {
    const caminhoArquivo = `${sessaoAtual.user.id}/produtos/${Date.now()}-${arquivoFoto.name}`;

    const { error: erroUpload } = await supabaseClient.storage

      .from("barbearias")

      .upload(caminhoArquivo, arquivoFoto);

    if (erroUpload) {
      console.error("Erro ao enviar foto do produto:", erroUpload);

      alert("Não foi possível enviar a foto, mas vamos salvar o restante.");
    } else {
      const { data: urlPublica } = supabaseClient.storage

        .from("barbearias")

        .getPublicUrl(caminhoArquivo);

      fotoUrl = urlPublica.publicUrl;
    }
  }

  // --------------------------------------------------
  // EDITAR PRODUTO
  // --------------------------------------------------

  if (id) {
    const { error } = await supabaseClient

      .from("produtos")

      .update({
        nome: nome,

        preco: preco,

        estoque: estoque,

        foto_url: fotoUrl,
      })

      .eq("id", id);

    if (error) {
      console.error("Erro ao editar produto:", error);

      alert("Não foi possível salvar a edição.");

      return;
    }
  }

  // --------------------------------------------------
  // ADICIONAR PRODUTO
  // --------------------------------------------------
  else {
    const { error } = await supabaseClient

      .from("produtos")

      .insert({
        barbearia_id: lojaId,

        nome: nome,

        preco: preco,

        estoque: estoque,

        foto_url: fotoUrl,
      });

    if (error) {
      console.error("Erro ao adicionar produto:", error);

      alert("Não foi possível adicionar o produto.");

      return;
    }
  }

  cancelarEdicaoProduto();

  carregarProdutos();
});

// ==================================================
// EDITAR PRODUTO
// ==================================================

function editarProduto(produto) {
  document.getElementById("produto-id").value = produto.id;

  document.getElementById("produto-nome").value = produto.nome;

  document.getElementById("produto-preco").value = produto.preco;

  document.getElementById("produto-estoque").value = produto.estoque;

  document.getElementById("produto-foto-atual").value = produto.foto_url || "";

  document.getElementById("produto-foto").value = "";

  btnSalvarProduto.textContent = "Salvar edição";

  btnCancelarProduto.hidden = false;

  formProduto.scrollIntoView({
    behavior: "smooth",
  });
}

// ==================================================
// CANCELAR EDIÇÃO DE PRODUTO
// ==================================================

function cancelarEdicaoProduto() {
  formProduto.reset();

  document.getElementById("produto-id").value = "";

  document.getElementById("produto-foto-atual").value = "";

  document.getElementById("produto-estoque").value = 0;

  btnSalvarProduto.textContent = "+ Adicionar produto";

  btnCancelarProduto.hidden = true;
}

// ==================================================
// EXCLUIR PRODUTO
// ==================================================

async function excluirProduto(id) {
  if (!confirm("Remover esse produto?")) {
    return;
  }

  const { error } = await supabaseClient

    .from("produtos")

    .delete()

    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir produto:", error);

    alert("Não foi possível remover o produto.");

    return;
  }

  carregarProdutos();
}

// ==================================================
// AGENDAMENTOS
// ==================================================

const listaAgendamentosEl = document.getElementById("lista-agendamentos");

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
  const { data, error } = await supabaseClient

    .from("agendamentos")

    .select(
      `
                *,
                servicos(nome),
                profiles(nome)
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

    return;
  }

  renderizarAgendamentos(data);
}

// ==================================================
// DESENHAR AGENDAMENTOS
// ==================================================

function renderizarAgendamentos(agendamentos) {
  listaAgendamentosEl.innerHTML = "";

  if (agendamentos.length === 0) {
    listaAgendamentosEl.innerHTML = `
            <p class="em-breve">
                Nenhum agendamento ainda.
            </p>
        `;

    return;
  }

  agendamentos.forEach((agendamento) => {
    const dataHora = new Date(agendamento.data_hora);

    const dataFormatada = dataHora.toLocaleDateString("pt-BR");

    const horaFormatada = dataHora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const nomeCliente = agendamento.profiles?.nome || "Cliente";

    const nomeServico = agendamento.servicos?.nome || "Serviço";

    const item = document.createElement("div");

    item.classList.add("item-lista");

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

                    ${Object.entries(STATUS_LABEL)

                      .map(
                        ([valor, rotulo]) => `

                                    <option
                                        value="${valor}"
                                        ${
                                          agendamento.status === valor
                                            ? "selected"
                                            : ""
                                        }
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

// ==================================================
// ATUALIZAR STATUS DO AGENDAMENTO
// ==================================================

async function atualizarStatusAgendamento(id, novoStatus) {
  const { error } = await supabaseClient

    .from("agendamentos")

    .update({
      status: novoStatus,
    })

    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar status:", error);

    alert("Não foi possível atualizar o status.");

    return;
  }

  carregarAgendamentos();
}

// ==================================================
// INICIAR PAINEL
// ==================================================

carregarLoja();

carregarServicos();

carregarProdutos();

carregarAgendamentos();

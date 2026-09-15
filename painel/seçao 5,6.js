// 5. PRODUTOS E ESTOQUE

const formProduto = document.getElementById("form-produto");
const listaProdutosEl = document.getElementById("lista-produtos");
const btnSalvarProduto = document.getElementById("btn-salvar-produto");
const btnCancelarProduto = document.getElementById("btn-cancelar-produto");
const inputFotoProduto = document.getElementById("produto-foto");
const previewProduto = document.getElementById("preview-produto");
const previewProdutoImg = document.getElementById("preview-produto-img");
const campoProdutoId = document.getElementById("produto-id");
const campoProdutoNome = document.getElementById("produto-nome");
const campoProdutoPreco = document.getElementById("produto-preco");
const campoProdutoEstoque = document.getElementById("produto-estoque");
const campoProdutoFotoAtual = document.getElementById("produto-foto-atual");

let previewProdutoObjectUrl = null;

// STORAGE

async function enviarArquivoStorage(arquivo, pasta) {
  if (!arquivo || !pasta || !sessaoAtual?.user?.id) {
    return null;
  }

  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

  if (!tiposPermitidos.includes(arquivo.type)) {
    throw new Error("Formato de imagem não permitido.");
  }

  const tamanhoMaximo = 5 * 1024 * 1024;

  if (arquivo.size > tamanhoMaximo) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const extensaoOriginal = arquivo.name.split(".").pop()?.toLowerCase();
  const extensoesPermitidas = ["jpg", "jpeg", "png", "webp"];
  const extensao = extensoesPermitidas.includes(extensaoOriginal)
    ? extensaoOriginal
    : "jpg";

  const identificador = crypto.randomUUID();
  const nomeArquivo = `${Date.now()}-${identificador}.${extensao}`;
  const caminho = `${sessaoAtual.user.id}/${pasta}/${nomeArquivo}`;

  const { error } = await supabaseClient.storage
    .from("barbearias")
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Erro ao enviar arquivo:", error);

    throw error;
  }

  const { data } = supabaseClient.storage
    .from("barbearias")
    .getPublicUrl(caminho);

  return data?.publicUrl || null;
}

// CARREGAR PRODUTOS

async function carregarProdutos() {
  if (!listaProdutosEl || !lojaId) {
    return false;
  }

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
          created_at
        `,
      )
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
  } catch (erro) {
    console.error("Erro inesperado ao carregar produtos:", erro);

    listaProdutosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os produtos.
      </p>
    `;

    return false;
  }
}

// RENDERIZAR PRODUTOS

function renderizarProdutos(produtos) {
  if (!listaProdutosEl) {
    return;
  }

  listaProdutosEl.innerHTML = "";

  if (!Array.isArray(produtos) || !produtos.length) {
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

    const estoque = Number(produto.estoque) || 0;
    const nomeProduto = produto.nome || "Produto";

    item.innerHTML = `
      <div class="item-info item-info--com-foto">

        ${
          produto.foto_url
            ? `
              <img
                src="${escaparHtml(produto.foto_url)}"
                alt="${escaparHtml(nomeProduto)}"
                class="produto-thumb"
                onerror="this.style.display='none'"
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
            ${escaparHtml(nomeProduto)}
          </h3>

          <p>
            ${formatarMoeda(produto.preco)}
            ·
            Estoque: ${estoque}
          </p>

        </div>

      </div>

      <div class="item-acoes">

        <button
          type="button"
          title="Editar produto"
          onclick="editarProduto('${escaparHtml(produto.id)}')"
        >
          ✏️
        </button>

        <button
          type="button"
          title="Excluir produto"
          onclick="excluirProduto('${escaparHtml(produto.id)}')"
        >
          🗑️
        </button>

      </div>
    `;

    listaProdutosEl.appendChild(item);
  });
}

// PREVIEW DA FOTO

function limparPreviewProdutoObjectUrl() {
  if (!previewProdutoObjectUrl) {
    return;
  }

  URL.revokeObjectURL(previewProdutoObjectUrl);

  previewProdutoObjectUrl = null;
}

if (inputFotoProduto) {
  inputFotoProduto.addEventListener("change", () => {
    limparPreviewProdutoObjectUrl();

    const arquivo = inputFotoProduto.files?.[0];

    if (!arquivo) {
      if (campoProdutoFotoAtual?.value && previewProdutoImg) {
        previewProdutoImg.src = campoProdutoFotoAtual.value;

        if (previewProduto) {
          previewProduto.hidden = false;
        }
      } else if (previewProduto) {
        previewProduto.hidden = true;
      }

      return;
    }

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

    if (!tiposPermitidos.includes(arquivo.type)) {
      mostrarMensagem(
        "mensagem-produto",
        "Escolha uma imagem JPG, PNG ou WEBP.",
        "erro",
      );

      inputFotoProduto.value = "";

      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      mostrarMensagem(
        "mensagem-produto",
        "A imagem deve ter no máximo 5 MB.",
        "erro",
      );

      inputFotoProduto.value = "";

      return;
    }

    previewProdutoObjectUrl = URL.createObjectURL(arquivo);

    if (previewProdutoImg) {
      previewProdutoImg.src = previewProdutoObjectUrl;
    }

    if (previewProduto) {
      previewProduto.hidden = false;
    }
  });
}

// SALVAR / EDITAR PRODUTO

if (formProduto) {
  formProduto.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = campoProdutoId?.value?.trim() || "";
    const nome = campoProdutoNome?.value?.trim() || "";
    const preco = Number(campoProdutoPreco?.value);
    const estoque = Number.parseInt(campoProdutoEstoque?.value, 10);
    const arquivoFoto = inputFotoProduto?.files?.[0];
    const fotoAtual = campoProdutoFotoAtual?.value?.trim() || "";

    if (!lojaId) {
      mostrarMensagem(
        "mensagem-produto",
        "Nenhuma barbearia foi selecionada.",
        "erro",
      );

      return;
    }

    if (
      !nome ||
      !Number.isFinite(preco) ||
      preco < 0 ||
      !Number.isInteger(estoque) ||
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

    try {
      let fotoUrl = fotoAtual || null;

      if (arquivoFoto) {
        fotoUrl = await enviarArquivoStorage(arquivoFoto, "produtos");

        if (!fotoUrl) {
          throw new Error("Não foi possível obter a URL da imagem.");
        }
      }

      const dadosProduto = {
        nome,
        preco,
        estoque,
        foto_url: fotoUrl,
      };

      if (id) {
        const { error } = await supabaseClient
          .from("produtos")
          .update(dadosProduto)
          .eq("id", id)
          .eq("barbearia_id", lojaId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabaseClient.from("produtos").insert({
          barbearia_id: lojaId,
          ...dadosProduto,
        });

        if (error) {
          throw error;
        }
      }

      cancelarEdicaoProduto();

      await carregarProdutos();

      if (typeof carregarDashboard === "function") {
        await carregarDashboard();
      }

      mostrarMensagem(
        "mensagem-produto",
        id
          ? "Produto atualizado com sucesso!"
          : "Produto cadastrado com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro ao salvar produto:", erro);

      let mensagem = "Não foi possível salvar o produto.";

      if (erro?.message?.includes("Formato de imagem")) {
        mensagem = "Formato de imagem não permitido.";
      }

      if (erro?.message?.includes("5 MB")) {
        mensagem = "A imagem deve ter no máximo 5 MB.";
      }

      mostrarMensagem("mensagem-produto", mensagem, "erro");
    } finally {
      if (btnSalvarProduto) {
        btnSalvarProduto.disabled = false;

        btnSalvarProduto.textContent = campoProdutoId?.value
          ? "Salvar edição"
          : "+ Adicionar produto";
      }
    }
  });
}

// EDITAR PRODUTO

function editarProduto(id) {
  const produto = produtosCache.find((item) => String(item.id) === String(id));

  if (!produto) {
    mostrarMensagem("mensagem-produto", "Produto não encontrado.", "erro");

    return;
  }

  limparPreviewProdutoObjectUrl();

  if (campoProdutoId) {
    campoProdutoId.value = produto.id;
  }

  if (campoProdutoNome) {
    campoProdutoNome.value = produto.nome || "";
  }

  if (campoProdutoPreco) {
    campoProdutoPreco.value = produto.preco ?? "";
  }

  if (campoProdutoEstoque) {
    campoProdutoEstoque.value = produto.estoque ?? 0;
  }

  if (campoProdutoFotoAtual) {
    campoProdutoFotoAtual.value = produto.foto_url || "";
  }

  if (inputFotoProduto) {
    inputFotoProduto.value = "";
  }

  if (produto.foto_url && previewProdutoImg) {
    previewProdutoImg.src = produto.foto_url;

    if (previewProduto) {
      previewProduto.hidden = false;
    }
  } else {
    if (previewProdutoImg) {
      previewProdutoImg.src = "";
    }

    if (previewProduto) {
      previewProduto.hidden = true;
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
    block: "start",
  });

  campoProdutoNome?.focus();
}

// CANCELAR EDIÇÃO

function cancelarEdicaoProduto() {
  if (!formProduto) {
    return;
  }

  limparPreviewProdutoObjectUrl();

  formProduto.reset();

  if (campoProdutoId) {
    campoProdutoId.value = "";
  }

  if (campoProdutoFotoAtual) {
    campoProdutoFotoAtual.value = "";
  }

  if (previewProduto) {
    previewProduto.hidden = true;
  }

  if (previewProdutoImg) {
    previewProdutoImg.src = "";
  }

  if (btnSalvarProduto) {
    btnSalvarProduto.disabled = false;

    btnSalvarProduto.textContent = "+ Adicionar produto";
  }

  if (btnCancelarProduto) {
    btnCancelarProduto.hidden = true;
  }
}

if (btnCancelarProduto) {
  btnCancelarProduto.addEventListener("click", cancelarEdicaoProduto);
}

// EXCLUIR PRODUTO

async function excluirProduto(id) {
  if (!id || !lojaId) {
    return;
  }

  const produto = produtosCache.find((item) => String(item.id) === String(id));
  const nomeProduto = produto?.nome || "este produto";
  const confirmou = confirm(`Deseja realmente remover "${nomeProduto}"?`);

  if (!confirmou) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("produtos")
      .delete()
      .eq("id", id)
      .eq("barbearia_id", lojaId);

    if (error) {
      console.error("Erro ao excluir produto:", error);

      if (error.code === "23503") {
        mostrarMensagem(
          "mensagem-produto",
          "Este produto possui pedidos vinculados e não pode ser excluído.",
          "erro",
        );

        return;
      }

      mostrarMensagem(
        "mensagem-produto",
        "Não foi possível remover o produto.",
        "erro",
      );

      return;
    }

    if (String(campoProdutoId?.value) === String(id)) {
      cancelarEdicaoProduto();
    }

    await carregarProdutos();

    if (typeof carregarDashboard === "function") {
      await carregarDashboard();
    }

    mostrarMensagem(
      "mensagem-produto",
      "Produto removido com sucesso!",
      "sucesso",
    );
  } catch (erro) {
    console.error("Erro inesperado ao excluir produto:", erro);

    mostrarMensagem(
      "mensagem-produto",
      "Ocorreu um erro ao remover o produto.",
      "erro",
    );
  }
}

// 6. PEDIDOS DE PRODUTOS

const listaPedidosEl = document.getElementById("lista-pedidos");

let pedidosCache = [];
let filtroPedidosAtual = "todos";

// CARREGAR PEDIDOS

async function carregarPedidos() {
  if (!listaPedidosEl || !lojaId) {
    return false;
  }

  listaPedidosEl.innerHTML = `
    <p class="em-breve">
      Carregando pedidos...
    </p>
  `;

  try {
    const { data, error } = await supabaseClient
      .from("pedidos")
      .select(
        `
          id,
          cliente_id,
          barbearia_id,
          produto_id,
          quantidade,
          preco_unitario,
          status,
          created_at,
          atualizado_at,

          profiles:cliente_id (
            id,
            nome,
            telefone
          ),

          produtos:produto_id (
            id,
            nome,
            preco,
            foto_url
          )
        `,
      )
      .eq("barbearia_id", lojaId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    pedidosCache = data || [];

    renderizarPedidos();

    return true;
  } catch (erro) {
    console.error("Erro ao carregar pedidos:", erro);

    pedidosCache = [];

    listaPedidosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os pedidos.
      </p>
    `;

    return false;
  }
}

// RENDERIZAR PEDIDOS

function renderizarPedidos() {
  if (!listaPedidosEl) {
    return;
  }

  let pedidos = Array.isArray(pedidosCache) ? [...pedidosCache] : [];

  if (filtroPedidosAtual !== "todos") {
    pedidos = pedidos.filter((pedido) => pedido.status === filtroPedidosAtual);
  }

  listaPedidosEl.innerHTML = "";

  if (!pedidos.length) {
    listaPedidosEl.innerHTML = `
      <p class="em-breve">
        Nenhum pedido encontrado.
      </p>
    `;

    return;
  }

  pedidos.forEach((pedido) => {
    const item = document.createElement("div");
    item.classList.add("item-lista");
    const cliente = pedido.profiles;
    const produto = pedido.produtos;
    const quantidade = Number(pedido.quantidade) || 0;
    const precoUnitario = Number(pedido.preco_unitario) || 0;
    const total = quantidade * precoUnitario;

    const status = pedido.status || "pendente";

    const dataPedido = pedido.created_at
      ? formatarDataHora(pedido.created_at)
      : "Data não informada";

    const nomeCliente = cliente?.nome || "Cliente";
    const telefoneCliente = cliente?.telefone || "Telefone não informado";
    const nomeProduto = produto?.nome || "Produto";

    item.innerHTML = `
      <div class="item-info item-info--com-foto">

        ${
          produto?.foto_url
            ? `
              <img
                src="${escaparHtml(produto.foto_url)}"
                alt="${escaparHtml(nomeProduto)}"
                class="produto-thumb"
                onerror="this.style.display='none'"
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
            ${escaparHtml(nomeProduto)}
          </h3>

          <p>
            Cliente:
            ${escaparHtml(nomeCliente)}
          </p>

          <p>
            ${escaparHtml(telefoneCliente)}
          </p>

          <p>
            Quantidade:
            ${quantidade}
            ·
            Total:
            ${formatarMoeda(total)}
          </p>

          <p>
            Pedido:
            ${escaparHtml(dataPedido)}
          </p>

          <p>
            Status:
            <strong>
              ${escaparHtml(formatarStatusPedido(status))}
            </strong>
          </p>

        </div>

      </div>

      <div class="item-acoes">

        ${
          status === "pendente"
            ? `
              <button
                type="button"
                title="Confirmar pedido"
                onclick="confirmarPedido('${escaparHtml(pedido.id)}')"
              >
                ✅
              </button>

              <button
                type="button"
                title="Cancelar pedido"
                onclick="cancelarPedido('${escaparHtml(pedido.id)}')"
              >
                ❌
              </button>
            `
            : ""
        }

      </div>
    `;

    listaPedidosEl.appendChild(item);
  });
}

// STATUS DOS PEDIDOS

function formatarStatusPedido(status) {
  const statusMap = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  return statusMap[status] || "Desconhecido";
}

// FILTROS DOS PEDIDOS

document.querySelectorAll(".filtro-pedido").forEach((botao) => {
  botao.addEventListener("click", () => {
    const filtro = botao.dataset.filtroPedido;

    filtroPedidosAtual = filtro || "todos";

    document.querySelectorAll(".filtro-pedido").forEach((item) => {
      item.classList.toggle("filtro--ativo", item === botao);
    });

    renderizarPedidos();
  });
});

// CONFIRMAR PEDIDO

async function confirmarPedido(id) {
  if (!id || !lojaId) {
    return;
  }

  const pedido = pedidosCache.find((item) => String(item.id) === String(id));

  if (!pedido) {
    mostrarMensagem("mensagem-pedidos", "Pedido não encontrado.", "erro");

    return;
  }

  if (pedido.status !== "pendente") {
    mostrarMensagem(
      "mensagem-pedidos",
      "Somente pedidos pendentes podem ser confirmados.",
      "erro",
    );

    return;
  }

  const confirmou = confirm("Deseja confirmar este pedido?");

  if (!confirmou) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("pedidos")
      .update({
        status: "confirmado",
        atualizado_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("barbearia_id", lojaId)
      .eq("status", "pendente")
      .select("id, status")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      mostrarMensagem(
        "mensagem-pedidos",
        "Este pedido já foi alterado ou não está mais pendente.",
        "erro",
      );

      await carregarPedidos();

      return;
    }

    mostrarMensagem(
      "mensagem-pedidos",
      "Pedido confirmado com sucesso!",
      "sucesso",
    );

    await carregarPedidos();

    if (typeof carregarDashboard === "function") {
      await carregarDashboard();
    }
  } catch (erro) {
    console.error("Erro ao confirmar pedido:", erro);

    mostrarMensagem(
      "mensagem-pedidos",
      "Não foi possível confirmar o pedido.",
      "erro",
    );
  }
}

// CANCELAR PEDIDO

async function cancelarPedido(id) {
  if (!id || !lojaId) {
    return;
  }

  const pedido = pedidosCache.find((item) => String(item.id) === String(id));

  if (!pedido) {
    mostrarMensagem("mensagem-pedidos", "Pedido não encontrado.", "erro");

    return;
  }

  if (pedido.status !== "pendente") {
    mostrarMensagem(
      "mensagem-pedidos",
      "Somente pedidos pendentes podem ser cancelados.",
      "erro",
    );

    return;
  }

  const confirmou = confirm(
    "Cancelar este pedido?\n\nO estoque será devolvido automaticamente.",
  );

  if (!confirmou) {
    return;
  }

  try {
    const { data, error } = await supabaseClient.rpc("cancelar_pedido", {
      p_pedido_id: id,
    });

    if (error) {
      throw error;
    }

    console.log("[BarberHub] Pedido cancelado:", data);

    mostrarMensagem(
      "mensagem-pedidos",
      "Pedido cancelado e estoque devolvido.",
      "sucesso",
    );

    await carregarPedidos();

    if (typeof carregarProdutos === "function") {
      await carregarProdutos();
    }

    if (typeof carregarDashboard === "function") {
      await carregarDashboard();
    }
  } catch (erro) {
    console.error("Erro ao cancelar pedido:", erro);

    mostrarMensagem(
      "mensagem-pedidos",
      "Não foi possível cancelar o pedido.",
      "erro",
    );
  }
}

// ==================================================
// TELA DE CARREGAMENTO
// ==================================================

const telaCarregamento =
  document.getElementById("tela-carregamento");

function esconderTelaCarregamento() {
  telaCarregamento.classList.add("tela-carregamento--oculta");
}

function voltar() {
  window.location.href = "../index.html";
}


// ==================================================
// ELEMENTOS DA TELA
// ==================================================

const listaBarbearias =
  document.getElementById("lista-barbearias");

const buscaInput =
  document.getElementById("busca-input");

const botoesFiltro =
  document.querySelectorAll(".filtro-btn");


// ==================================================
// ESTADO DA TELA
// ==================================================

let barbearias = [];

let filtroAtual = "todos";


// ==================================================
// CARREGAR BARBEARIAS
// ==================================================

async function carregarBarbearias() {
  try {

    const { data, error } = await supabaseClient
      .from("barbearias")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      throw error;
    }

    // Guarda as barbearias carregadas
    barbearias = data || [];

    // Mostra na tela
    renderizarBarbearias(barbearias);

  } catch (error) {

    console.error(
      "Erro ao carregar barbearias:",
      error
    );

  } finally {

    esconderTelaCarregamento();
  }
}


// ==================================================
// RENDERIZAR BARBEARIAS
// ==================================================

function renderizarBarbearias(barbearias) {

  listaBarbearias.innerHTML = "";

  if (barbearias.length === 0) {

    listaBarbearias.innerHTML = `
      <div class="estado-vazio">
        <p>Nenhuma barbearia encontrada.</p>
      </div>
    `;

    return;
  }

  barbearias.forEach((barbearia) => {

    const card = document.createElement("article");

    card.className = "card-barbearia";

    card.innerHTML = `
      <div class="card-barbearia-logo">

        ${
          barbearia.logo_url
            ? `
              <img
                src="${barbearia.logo_url}"
                alt="Logo ${barbearia.nome}"
              >
            `
            : "💈"
        }

      </div>

      <div class="card-barbearia-info">

        <h2>
          ${barbearia.nome}
        </h2>

        <p>
          📍 ${barbearia.cidade}
        </p>

        ${
          barbearia.endereco
            ? `<span>${barbearia.endereco}</span>`
            : ""
        }

      </div>

      <button
        type="button"
        class="btn-agendar"
        onclick="abrirBarbearia('${barbearia.id}')"
      >
        Agendar
      </button>
    `;

    listaBarbearias.appendChild(card);
  });
}


// ==================================================
// APLICAR FILTROS
// ==================================================

function aplicarFiltros() {

  const termo =
    buscaInput.value
      .trim()
      .toLowerCase();

  let resultado = [...barbearias];


  // ----------------------------------------------
  // FILTRO DE BUSCA
  // ----------------------------------------------

  if (termo) {

    resultado = resultado.filter((barbearia) => {

      const nome =
        barbearia.nome?.toLowerCase() || "";

      const cidade =
        barbearia.cidade?.toLowerCase() || "";

      return (
        nome.includes(termo) ||
        cidade.includes(termo)
      );

    });
  }


  // ----------------------------------------------
  // FILTRO POR CIDADE
  // ----------------------------------------------

  if (filtroAtual === "cidade") {

    // Por enquanto ainda não temos
    // uma cidade selecionada.
    //
    // Vamos implementar essa parte
    // depois com um filtro de cidade real.

  }


  // ----------------------------------------------
  // MOSTRAR RESULTADO
  // ----------------------------------------------

  renderizarBarbearias(resultado);
}


// ==================================================
// BUSCA
// ==================================================

buscaInput.addEventListener("input", () => {

  aplicarFiltros();

});


// ==================================================
// FILTROS
// ==================================================

botoesFiltro.forEach((botao) => {

  botao.addEventListener("click", () => {

    filtroAtual =
      botao.dataset.categoria;


    botoesFiltro.forEach((item) => {

      item.classList.remove("ativo");

    });


    botao.classList.add("ativo");


    aplicarFiltros();

  });

});


// ==================================================
// ABRIR BARBEARIA
// ==================================================

function abrirBarbearia(barbeariaId) {

  window.location.href =
    `agendamento.html?barbearia_id=${barbeariaId}`;

}


// ==================================================
// INICIAR PÁGINA
// ==================================================

carregarBarbearias();
// ==================================================
// NAVEGAÇÃO
// ==================================================

function cadastrar() {
  window.location.href = "../cadastro/index.html";
}

function voltar() {
  window.location.href = "../index.html";
}

async function sair() {
  try {
    await supabaseClient.auth.signOut();
  } catch (erro) {
    console.error("Erro ao sair:", erro);
  }

  window.location.href = "../login/index.html";
}


// ==================================================
// ENTRAR NA BARBEARIA
// ==================================================

function entrarNaLoja(id) {
  if (!id) {
    console.error("ID da barbearia não informado.");
    return;
  }

  // Abre o painel da barbearia selecionada
  window.location.href = `../painel/index.html?id=${encodeURIComponent(id)}`;
}


// ==================================================
// HOME BARBERHUB
// ==================================================

console.log("Home BarberHub carregado!");

const listaBarbearias = document.getElementById("lista-barbearias");


// ==================================================
// CARREGAR BARBEARIAS DO DONO LOGADO
// ==================================================

async function carregarBarbearias() {

  // --------------------------------------------------
  // Verificar se o Supabase está disponível
  // --------------------------------------------------

  if (!supabaseClient) {
    console.error("Supabase não está conectado.");

    listaBarbearias.innerHTML = `
      <p class="lista-vazia">
        Não foi possível conectar ao sistema.
      </p>
    `;

    return;
  }


  // --------------------------------------------------
  // 1. Verificar sessão
  // --------------------------------------------------

  const {
    data: { session },
    error: sessionError
  } = await supabaseClient.auth.getSession();


  if (sessionError) {
    console.error(
      "Erro ao verificar sessão:",
      sessionError
    );

    listaBarbearias.innerHTML = `
      <p class="lista-vazia">
        Não foi possível verificar sua sessão.
      </p>
    `;

    return;
  }


  // --------------------------------------------------
  // Se não estiver logado
  // --------------------------------------------------

  if (!session) {

    console.log(
      "Nenhuma sessão ativa — redirecionando para login."
    );

    window.location.href = "../login/index.html";

    return;
  }


  // --------------------------------------------------
  // 2. Buscar barbearias do usuário logado
  // --------------------------------------------------

  const {
    data,
    error
  } = await supabaseClient
    .from("barbearias")
    .select("*")
    .eq("dono_id", session.user.id)
    .order("created_at", {
      ascending: true
    });


  // --------------------------------------------------
  // 3. Verificar erro
  // --------------------------------------------------

  if (error) {

    console.error(
      "Erro ao buscar barbearias:",
      error
    );

    listaBarbearias.innerHTML = `
      <p class="lista-vazia">
        Não foi possível carregar suas barbearias.
      </p>
    `;

    return;
  }


  console.log(
    "Barbearias do dono:",
    data
  );


  // --------------------------------------------------
  // Limpar lista
  // --------------------------------------------------

  listaBarbearias.innerHTML = "";


  // --------------------------------------------------
  // 4. Nenhuma barbearia encontrada
  // --------------------------------------------------

  if (!data || data.length === 0) {

    listaBarbearias.innerHTML = `
      <p class="lista-vazia">
        Você ainda não cadastrou nenhuma barbearia.
      </p>
    `;

    return;
  }


  // --------------------------------------------------
  // 5. Criar cards das barbearias
  // --------------------------------------------------

  data.forEach((barbearia) => {

    const card = document.createElement("div");

    card.classList.add(
      "card-barbearia"
    );


    // ------------------------------------------------
    // Logo
    // ------------------------------------------------

    const logo =
      barbearia.logo_url ||
      barbearia.foto_url;


    // ------------------------------------------------
    // Criar estrutura do card
    // ------------------------------------------------

    card.innerHTML = `

      <div class="card-logo">

        ${
          logo
            ? `
              <img
                src="${escaparHtml(logo)}"
                alt="Logo de ${escaparHtml(barbearia.nome || "Barbearia")}"
                class="logo-barbearia"
              >
            `
            : `
              <div class="logo-sem-foto">
                💈
              </div>
            `
        }

      </div>


      <div class="info-barbearia">

        <h2>
          ${escaparHtml(barbearia.nome || "Barbearia")}
        </h2>


        <p>
          📍 ${escaparHtml(
            barbearia.cidade || "Cidade não informada"
          )}
        </p>


        <p>
          📞 ${escaparHtml(
            barbearia.telefone || "Telefone não informado"
          )}
        </p>


        <button
          type="button"
          class="btn-entrar-loja"
          onclick="entrarNaLoja('${barbearia.id}')"
        >
          Entrar →
        </button>

      </div>

    `;


    // ------------------------------------------------
    // Adicionar card à lista
    // ------------------------------------------------

    listaBarbearias.appendChild(card);

  });

}


// ==================================================
// ESCAPAR HTML
// ==================================================

function escaparHtml(valor) {

  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ==================================================
// INICIAR
// ==================================================

carregarBarbearias();
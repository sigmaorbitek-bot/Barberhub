// ==================================================
// BARBERHUB — MINHAS BARBEARIAS
// ==================================================

const CONFIG_BARBEARIAS = {
  HOME_URL: "../index.html",

  LOGIN_URL: "../login/index.html",

  CADASTRO_URL: "../cadastro/index.html?modo=nova-barbearia",

  PAINEL_URL: "../painel/index.html",
};

// ==================================================
// ELEMENTOS
// ==================================================

const listaBarbearias = document.getElementById("lista-barbearias");

// ==================================================
// NAVEGAÇÃO
// ==================================================

function cadastrar() {
  window.location.href = CONFIG_BARBEARIAS.CADASTRO_URL;
}

function voltar() {
  window.location.href = CONFIG_BARBEARIAS.HOME_URL;
}

async function sair() {
  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }
  } catch (erro) {
    console.error("[BarberHub] Erro ao sair:", erro);
  }

  window.location.href = CONFIG_BARBEARIAS.LOGIN_URL;
}

// ==================================================
// ENTRAR NA BARBEARIA
// ==================================================

function entrarNaLoja(id) {
  if (!id) {
    console.error("[BarberHub] ID da barbearia não informado.");

    return;
  }

  window.location.href = `${CONFIG_BARBEARIAS.PAINEL_URL}?id=${encodeURIComponent(
    id,
  )}`;
}

// ==================================================
// ESCAPAR HTML
// ==================================================

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==================================================
// ESTADO DA LISTA
// ==================================================

function mostrarEstadoLista(texto) {
  if (!listaBarbearias) {
    return;
  }

  listaBarbearias.innerHTML = `
    <p class="lista-vazia">
      ${escaparHtml(texto)}
    </p>
  `;
}

// ==================================================
// BUSCAR PERFIL
// ==================================================

async function buscarPerfil(usuarioId) {
  if (!usuarioId) {
    return null;
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select(
      `
          id,
          nome,
          tipo
        `,
    )
    .eq("id", usuarioId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

// ==================================================
// VALIDAR DONO LOGADO
// ==================================================

async function obterDonoLogado() {
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.user) {
    return null;
  }

  const perfil = await buscarPerfil(session.user.id);

  if (!perfil || perfil.tipo !== "dono") {
    return null;
  }

  return {
    usuario: session.user,

    perfil,
  };
}

// ==================================================
// BUSCAR BARBEARIAS
// ==================================================

async function buscarBarbearias(usuarioId) {
  if (!usuarioId) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("barbearias")
    .select(
      `
          id,
          dono_id,
          nome,
          cidade,
          endereco,
          telefone,
          logo_url,
          horario_abertura,
          horario_fechamento,
          created_at
        `,
    )
    .eq("dono_id", usuarioId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

// ==================================================
// CRIAR CARD
// ==================================================

function criarCardBarbearia(barbearia) {
  const card = document.createElement("article");

  card.className = "card-barbearia";

  const logo = barbearia.logo_url || null;

  const nome = barbearia.nome || "Barbearia";

  const cidade = barbearia.cidade || "Cidade não informada";

  const telefone = barbearia.telefone || "Telefone não informado";

  card.innerHTML = `
    <div class="card-logo">

      ${
        logo
          ? `
            <img
              src="${escaparHtml(logo)}"
              alt="Logo de ${escaparHtml(nome)}"
              class="logo-barbearia"
              loading="lazy"
            />
          `
          : `
            <div
              class="logo-sem-foto"
              aria-hidden="true"
            >
              💈
            </div>
          `
      }

    </div>

    <div class="info-barbearia">

      <h2>
        ${escaparHtml(nome)}
      </h2>

      <p>
        📍 ${escaparHtml(cidade)}
      </p>

      <p>
        📞 ${escaparHtml(telefone)}
      </p>

      <button
        type="button"
        class="btn-entrar-loja"
      >
        Entrar →
      </button>

    </div>
  `;

  const botaoEntrar = card.querySelector(".btn-entrar-loja");

  if (botaoEntrar) {
    botaoEntrar.addEventListener("click", () => {
      entrarNaLoja(barbearia.id);
    });
  }

  return card;
}

// ==================================================
// RENDERIZAR BARBEARIAS
// ==================================================

function renderizarBarbearias(barbearias) {
  if (!listaBarbearias) {
    return;
  }

  listaBarbearias.innerHTML = "";

  if (!Array.isArray(barbearias) || barbearias.length === 0) {
    mostrarEstadoLista("Você ainda não cadastrou nenhuma barbearia.");

    return;
  }

  const fragmento = document.createDocumentFragment();

  barbearias.forEach((barbearia) => {
    fragmento.appendChild(criarCardBarbearia(barbearia));
  });

  listaBarbearias.appendChild(fragmento);
}

// ==================================================
// CARREGAR PÁGINA
// ==================================================

async function carregarBarbearias() {
  if (!listaBarbearias) {
    console.error("[BarberHub] Elemento lista-barbearias não encontrado.");

    return;
  }

  if (!supabaseClient) {
    console.error("[BarberHub] Supabase não está conectado.");

    mostrarEstadoLista("Não foi possível conectar ao sistema.");

    return;
  }

  mostrarEstadoLista("Carregando suas barbearias...");

  try {
    // ================================================
    // VERIFICAR DONO
    // ================================================

    const dono = await obterDonoLogado();

    if (!dono?.usuario?.id) {
      /*
        Não existe sessão válida de dono.

        Sai de qualquer sessão eventualmente
        aberta como cliente antes de redirecionar.
      */

      try {
        await supabaseClient.auth.signOut();
      } catch (erroLogout) {
        console.warn(
          "[BarberHub] Não foi possível encerrar a sessão:",
          erroLogout,
        );
      }

      window.location.href = CONFIG_BARBEARIAS.LOGIN_URL;

      return;
    }

    // ================================================
    // BUSCAR TODAS AS BARBEARIAS DO DONO
    // ================================================

    const barbearias = await buscarBarbearias(dono.usuario.id);

    console.log("[BarberHub] Barbearias do dono:", barbearias);

    // ================================================
    // MOSTRAR NA TELA
    // ================================================

    renderizarBarbearias(barbearias);
  } catch (erro) {
    console.error("[BarberHub] Erro ao carregar barbearias:", erro);

    mostrarEstadoLista("Não foi possível carregar suas barbearias.");
  }
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================

async function iniciarPagina() {
  await carregarBarbearias();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarPagina);
} else {
  iniciarPagina();
}

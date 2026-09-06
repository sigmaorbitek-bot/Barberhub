function voltar() {
  {
    window.location.href = "../index.html";
  }
}

function entrarNaLoja(id) {
  window.location.href = `../login/index.html`;
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
  // 1. Confere se existe sessão ativa. Sem isso não tem como saber
  //    "de quem" são as lojas — manda pro login.
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    console.log("Nenhuma sessão ativa — redirecionando para login.");
    window.location.href = "../login/index.html";
    return;
  }

  // 2. Busca só as barbearias cujo dono_id é o usuário logado.
  const { data, error } = await supabaseClient
    .from("barbearias")
    .select("*")
    .eq("dono_id", session.user.id);

  // ==================================================
  // ERRO
  // ==================================================

  if (error) {
    console.error("Erro ao buscar barbearias:", error);

    listaBarbearias.innerHTML = `
            <p class="lista-vazia">
                Não foi possível carregar suas barbearias.
            </p>
        `;

    return;
  }

  console.log("Barbearias do dono:", data);

  listaBarbearias.innerHTML = "";

  // ==================================================
  // NENHUMA BARBEARIA
  // ==================================================

  if (data.length === 0) {
    listaBarbearias.innerHTML = `
            <p class="lista-vazia">
                Você ainda não cadastrou nenhuma barbearia.
            </p>
        `;

    return;
  }

  // ==================================================
  // CRIAR CARDS
  // ==================================================

  data.forEach((barbearia) => {
    const card = document.createElement("div");

    card.classList.add("card-barbearia");

    const logo = barbearia.logo_url || barbearia.foto_url;

    card.innerHTML = `

        <div class="card-logo">

            ${
              logo
                ? `<img 
                        src="${logo}" 
                        alt="Logo ${barbearia.nome}"
                        class="logo-barbearia"
                    >`
                : `<div class="logo-sem-foto">💈</div>`
            }

        </div>

        <div class="info-barbearia">

            <h2>${barbearia.nome}</h2>

            <p>📍 ${barbearia.cidade}</p>

            <p>📞 ${barbearia.telefone || "Telefone não informado"}</p>

            <button
                type="button"
                class="btn-entrar-loja"
                onclick="entrarNaLoja('${barbearia.id}')"
            >
                Entrar →
            </button>

        </div>

    `;

    listaBarbearias.appendChild(card);
  });
}

// ==================================================
// INICIAR
// ==================================================

carregarBarbearias();
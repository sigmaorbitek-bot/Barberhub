// ==================================================
// NAVEGAÇÃO
// ==================================================

function voltar() {
  window.location.href = "../index.html";
}

function irParaCadastro() {
  window.location.href = "../cadastro/index.html";
}

// ==================================================
// FORMULÁRIO
// ==================================================

const formulario = document.getElementById("form-login");
const mensagem = document.getElementById("mensagem");

// ==================================================
// LOGIN
// ==================================================

formulario.addEventListener("submit", async function (event) {
  event.preventDefault();

  console.log("Formulário de login enviado!");

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  mensagem.style.color = "";
  mensagem.textContent = "Entrando...";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: senha,
  });

  // ==================================================
  // ERRO NO LOGIN
  // ==================================================

  if (error) {
    console.error("Erro ao entrar:", error);

    mensagem.textContent = "E-mail ou senha incorretos.";
    mensagem.style.color = "#C1121F";

    return;
  }

  console.log("Login feito:", data.user);

  // ==================================================
  // VER QUANTAS LOJAS ESSE DONO TEM
  // ==================================================

  const { data: lojas, error: erroLojas } = await supabaseClient
    .from("barbearias")
    .select("id")
    .eq("dono_id", data.user.id);

  if (erroLojas) {
    console.error("Erro ao buscar lojas do dono:", erroLojas);

    // Se der erro na busca, manda pra Minhas Lojas mesmo assim —
    // lá tem seu próprio tratamento de erro.
    window.location.href = "./index.html";
    return;
  }

  console.log("Lojas do dono:", lojas);

  // ==================================================
  // SÓ UMA LOJA → PULA DIRETO PRO PAINEL DELA
  // ==================================================

  if (lojas.length === 1) {
    window.location.href = `../painel/index.html?id=${lojas[0].id}`;
    return;
  }

  // ==================================================
  // NENHUMA OU VÁRIAS → VAI PRA "MINHAS LOJAS" ESCOLHER
  // ==================================================

  window.location.href = "../barbearia/index.html";
});
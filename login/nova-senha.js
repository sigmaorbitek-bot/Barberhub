// ==================================================
// ELEMENTOS DA PÁGINA
// ==================================================

const formulario = document.getElementById("form-nova-senha");

const campoNovaSenha = document.getElementById("nova-senha");

const campoConfirmarSenha = document.getElementById("confirmar-senha");

const mensagem = document.getElementById("mensagem");

// ==================================================
// IDENTIFICAR TIPO DE USUÁRIO
// ==================================================

const parametros = new URLSearchParams(window.location.search);

const tipo = parametros.get("tipo");

// ==================================================
// VOLTAR PARA O LOGIN
// ==================================================

function voltarLogin() {
  if (tipo === "cliente") {
    window.location.href = "./cliente.html";
  } else if (tipo === "barbearia") {
    window.location.href = "./index.html";
  } else {
    // Caso a URL não tenha o tipo
    window.location.href = "../index.html";
  }
}

// ==================================================
// ALTERAR SENHA
// ==================================================

formulario.addEventListener("submit", async function (event) {
  event.preventDefault();

  const novaSenha = campoNovaSenha.value;

  const confirmarSenha = campoConfirmarSenha.value;

  // ==================================================
  // VALIDAR SENHAS
  // ==================================================

  if (novaSenha !== confirmarSenha) {
    mensagem.textContent = "As senhas não são iguais.";

    mensagem.style.color = "#C1121F";

    return;
  }

  // ==================================================
  // ATUALIZAR SENHA NO SUPABASE
  // ==================================================

  mensagem.textContent = "Alterando sua senha...";

  mensagem.style.color = "";

  const { error } = await supabaseClient.auth.updateUser({
    password: novaSenha,
  });

  // ==================================================
  // ERRO
  // ==================================================

  if (error) {
    console.error("Erro ao alterar senha:", error);

    mensagem.textContent = "Não foi possível alterar sua senha.";

    mensagem.style.color = "#C1121F";

    return;
  }

  // ==================================================
  // SUCESSO
  // ==================================================

  mensagem.textContent = "Senha alterada com sucesso!";

  mensagem.style.color = "#D4AF37";

  // ==================================================
  // VOLTAR PARA O LOGIN CORRETO
  // ==================================================

  setTimeout(function () {
    voltarLogin();
  }, 2000);
});

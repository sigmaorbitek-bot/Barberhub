// ==================================================
// NAVEGAÇÃO
// ==================================================

function voltar() {
  window.location.href = "../index.html";
}

function irParaCadastro() {
  window.location.href = "../cadastro do cliente/index.html";
}


function entrar() {
  window.location.href = "../clientes/index.html";
}


// ==================================================
// ELEMENTOS DO FORMULÁRIO
// ==================================================

const formLogin = document.getElementById("form-login");

const campoEmail = document.getElementById("email");

const campoSenha = document.getElementById("senha");

const mensagem = document.getElementById("mensagem");


// ==================================================
// LOGIN
// ==================================================

formLogin.addEventListener("submit", async (evento) => {

  evento.preventDefault();

  const email = campoEmail.value.trim();

  const senha = campoSenha.value;

});
// ==================================================
// NAVEGAÇÃO
// ==================================================

function voltar() {
  window.location.href = "../index.html";
}

function irParaCadastro() {
  window.location.href = "../cadastro/cliente.html";
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

  // ==================================================
  // VALIDAÇÃO
  // ==================================================

  if (!email || !senha) {
    mensagem.textContent = "Preencha o e-mail e a senha.";

    return;
  }

  // ==================================================
  // LOGIN NO SUPABASE
  // ==================================================

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,

    password: senha,
  });

  // ==================================================
  // ERRO NO LOGIN
  // ==================================================

  if (error) {
    mensagem.textContent = "E-mail ou senha incorretos.";

    return;
  }

  // ==================================================
  // VERIFICAR SESSÃO
  // ==================================================

  if (data.session) {
    mensagem.textContent = "Login realizado com sucesso!";

    // ==================================================
    // REDIRECIONAMENTO
    // ==================================================

    window.location.href = "../clientes/index.html";
  }
});

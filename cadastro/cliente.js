// ==================================================
// NAVEGAÇÃO
// ==================================================

function voltar() {

  window.location.href =
    "../login/cliente.html";

}

// ==================================================
// ELEMENTOS DO FORMULÁRIO
// ==================================================

const formCadastro =
  document.getElementById("form-cadastro");

const campoNome =
  document.getElementById("nome");

const campoTelefone =
  document.getElementById("telefone");

const campoEmail =
  document.getElementById("email");

const campoSenha =
  document.getElementById("senha");

const campoConfirmarSenha =
  document.getElementById("confirmar-senha");

const mensagem =
  document.getElementById("mensagem");

// ==================================================
// CADASTRO
// ==================================================

formCadastro.addEventListener("submit", async (evento) => {

  evento.preventDefault();

  // ==================================================
  // PEGAR DADOS DO FORMULÁRIO
  // ==================================================

  const nome =
    campoNome.value.trim();

  const telefone =
    campoTelefone.value.trim();

  const email =
    campoEmail.value.trim().toLowerCase();

  const senha =
    campoSenha.value;

  const confirmarSenha =
    campoConfirmarSenha.value;

  // ==================================================
  // VALIDAÇÃO
  // ==================================================

  if (!nome || !email || !senha || !confirmarSenha) {

    mensagem.textContent =
      "Preencha todos os campos obrigatórios.";

    return;
  }

  if (senha.length < 6) {

    mensagem.textContent =
      "A senha deve ter pelo menos 6 caracteres.";

    return;
  }

  if (senha !== confirmarSenha) {

    mensagem.textContent =
      "As senhas não coincidem.";

    return;
  }

  // ==================================================
  // CRIAR CONTA NO SUPABASE AUTHENTICATION
  // ==================================================

  mensagem.textContent =
    "Criando sua conta...";

  const { data, error } =
    await supabaseClient.auth.signUp({

      email: email,
      password: senha,

      options: {

        data: {

          nome: nome,
          telefone: telefone,

        },

      },

    });

  // ==================================================
  // VERIFICAR ERRO NO CADASTRO
  // ==================================================

  if (error) {

    console.error(
      "Erro ao criar conta:",
      error
    );

    mensagem.textContent =
      "Não foi possível criar a conta.";

    return;
  }

  // ==================================================
  // VERIFICAR USUÁRIO CRIADO
  // ==================================================

  if (!data.user) {

    mensagem.textContent =
      "Não foi possível criar o usuário.";

    return;
  }

  // ==================================================
  // CADASTRO REALIZADO COM SUCESSO
  // ==================================================

  mensagem.textContent =
    "Cadastro realizado com sucesso!";

  // ==================================================
  // IR PARA LOGIN
  // ==================================================

  setTimeout(() => {

    window.location.href =
      "../login/cliente.html";

  }, 1000);

});
// ==================================================
// BARBERHUB — CADASTRO DE CLIENTE
// ==================================================

// ==================================================
// NAVEGAÇÃO
// ==================================================

function voltar() {
  window.location.href = "../login/cliente.html";
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
// VERIFICAR SUPABASE
// ==================================================

if (!supabaseClient) {
  console.error("Supabase não foi carregado.");

  if (mensagem) {
    mensagem.textContent =
      "Erro: não foi possível conectar ao sistema.";
  }
}

// ==================================================
// CADASTRO
// ==================================================

formCadastro.addEventListener("submit", async (evento) => {

  evento.preventDefault();

  if (!supabaseClient) {
    mensagem.textContent =
      "Erro de conexão com o sistema.";
    return;
  }

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
  // DESABILITAR BOTÃO
  // ==================================================

  const botao =
    formCadastro.querySelector(
      'button[type="submit"]'
    );

  if (botao) {
    botao.disabled = true;
    botao.textContent = "Criando conta...";
  }

  mensagem.textContent = "";

  // ==================================================
  // CRIAR CONTA NO SUPABASE AUTH
  // ==================================================

  try {

    console.log("Criando cliente...");

    const {
      data,
      error
    } = await supabaseClient.auth.signUp({

      email: email,

      password: senha,

      options: {

        data: {

          // Dados usados pelo trigger
          nome: nome,

          telefone: telefone || null,

          // IMPORTANTE:
          // identifica esse usuário como cliente
          tipo: "cliente"

        }

      }

    });

    // ==================================================
    // VERIFICAR ERRO
    // ==================================================

    if (error) {

      console.error(
        "ERRO AO CRIAR CLIENTE:",
        error
      );

      mensagem.textContent =
        traduzirErroSupabase(error);

      return;
    }

    // ==================================================
    // VERIFICAR USUÁRIO
    // ==================================================

    if (!data || !data.user) {

      console.error(
        "Supabase não retornou o usuário:",
        data
      );

      mensagem.textContent =
        "Não foi possível criar o usuário.";

      return;
    }

    console.log(
      "Cliente criado:",
      data.user.id
    );

    console.log(
      "Perfil será criado automaticamente pelo trigger."
    );

    // ==================================================
    // VERIFICAR SESSÃO
    // ==================================================

    if (!data.session) {

      console.warn(
        "Conta criada, mas ainda não existe sessão."
      );

      mensagem.textContent =
        "Conta criada! Verifique seu e-mail para confirmar o cadastro.";

      return;
    }

    // ==================================================
    // CADASTRO REALIZADO
    // ==================================================

    mensagem.textContent =
      "Cadastro realizado com sucesso!";

    console.log(
      "CADASTRO DO CLIENTE FINALIZADO!"
    );

    // ==================================================
    // IR PARA LOGIN
    // ==================================================

    setTimeout(() => {

      window.location.href =
        "../login/cliente.html";

    }, 1000);

  } catch (erro) {

    console.error(
      "================================="
    );

    console.error(
      "ERRO INESPERADO NO CADASTRO"
    );

    console.error(
      erro
    );

    console.error(
      "Mensagem:",
      erro?.message
    );

    console.error(
      "Stack:",
      erro?.stack
    );

    console.error(
      "================================="
    );

    mensagem.textContent =
      "Ocorreu um erro inesperado. Tente novamente.";

  } finally {

    if (botao) {

      botao.disabled = false;

      botao.textContent =
        "Cadastrar";

    }

  }

});

// ==================================================
// TRADUZIR ERROS DO SUPABASE
// ==================================================

function traduzirErroSupabase(error) {

  if (!error) {
    return "Ocorreu um erro.";
  }

  const mensagemErro =
    error.message?.toLowerCase() || "";

  if (
    mensagemErro.includes("already registered") ||
    mensagemErro.includes("already exists") ||
    mensagemErro.includes("user already registered")
  ) {

    return "Este e-mail já está cadastrado.";

  }

  if (
    mensagemErro.includes("invalid email")
  ) {

    return "Digite um e-mail válido.";

  }

  if (
    mensagemErro.includes("password") &&
    (
      mensagemErro.includes("weak") ||
      mensagemErro.includes("short")
    )
  ) {

    return "A senha escolhida é muito fraca.";

  }

  if (
    mensagemErro.includes("rate limit") ||
    mensagemErro.includes("too many")
  ) {

    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

  }

  return (
    error.message ||
    "Não foi possível realizar o cadastro."
  );
}
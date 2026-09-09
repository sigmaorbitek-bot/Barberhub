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

const formLogin =
  document.getElementById("form-login");

const campoEmail =
  document.getElementById("email");

const campoSenha =
  document.getElementById("senha");

const mensagem =
  document.getElementById("mensagem");


// ==================================================
// RECUPERAR SENHA
// ==================================================

async function esqueciSenha() {

  const email =
    campoEmail.value.trim();


  // ==================================================
  // VALIDAR E-MAIL
  // ==================================================

  if (!email) {

    mensagem.textContent =
      "Digite seu e-mail para recuperar a senha.";

    mensagem.style.color =
      "#C1121F";

    return;
  }


  // ==================================================
  // ENVIAR LINK DE RECUPERAÇÃO
  // ==================================================

  mensagem.style.color = "";

  mensagem.textContent =
    "Enviando link de recuperação...";


  const { error } =
    await supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo:
          window.location.origin +
          "/login/nova-senha.html?tipo=cliente",
      }
    );


  // ==================================================
  // ERRO
  // ==================================================

  if (error) {

    console.error(
      "Erro ao enviar recuperação:",
      error
    );

    mensagem.textContent =
      "Não foi possível enviar o link de recuperação.";

    mensagem.style.color =
      "#C1121F";

    return;
  }


  // ==================================================
  // SUCESSO
  // ==================================================

  mensagem.style.color = "";

  mensagem.textContent =
    "Enviamos um link de recuperação para seu e-mail.";
}


// ==================================================
// LOGIN
// ==================================================

formLogin.addEventListener(
  "submit",
  async (evento) => {

    evento.preventDefault();


    const email =
      campoEmail.value.trim();

    const senha =
      campoSenha.value;


    // ==================================================
    // VALIDAÇÃO
    // ==================================================

    if (!email || !senha) {

      mensagem.textContent =
        "Preencha o e-mail e a senha.";

      return;
    }


    // ==================================================
    // LOGIN NO SUPABASE
    // ==================================================

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({

        email: email,

        password: senha,

      });


    // ==================================================
    // ERRO NO LOGIN
    // ==================================================

    if (error) {

      mensagem.textContent =
        "E-mail ou senha incorretos.";

      return;
    }


    // ==================================================
    // VERIFICAR SESSÃO
    // ==================================================

    if (data.session) {

      mensagem.textContent =
        "Login realizado com sucesso!";


      // ==================================================
      // REDIRECIONAMENTO
      // ==================================================

      window.location.href =
        "../clientes/index.html";

    }

  }
);
// BARBERHUB — CADASTRO DE CLIENTE

const CONFIG_CADASTRO_CLIENTE = {
  LOGIN_URL: "../login/cliente.html",
  PAINEL_URL: "../cliente/index.html",
  SENHA_MINIMA: 6,
};

// ELEMENTOS

const formCadastro = document.getElementById("form-cadastro");
const campoNome = document.getElementById("nome");
const campoTelefone = document.getElementById("telefone");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const campoConfirmarSenha = document.getElementById("confirmar-senha");
const mensagem = document.getElementById("mensagem");

// NAVEGAÇÃO

function voltar() {
  window.location.href = CONFIG_CADASTRO_CLIENTE.LOGIN_URL;
}

// MENSAGENS

function mostrarMensagem(texto, tipo = "erro") {
  if (!mensagem) {
    return;
  }

  mensagem.textContent = texto;

  mensagem.classList.remove(
    "mensagem-sucesso",
    "mensagem-erro",
    "mensagem-aviso",
  );

  if (tipo === "sucesso") {
    mensagem.classList.add("mensagem-sucesso");

    return;
  }

  if (tipo === "aviso") {
    mensagem.classList.add("mensagem-aviso");

    return;
  }

  mensagem.classList.add("mensagem-erro");
}

function limparMensagem() {
  if (!mensagem) {
    return;
  }

  mensagem.textContent = "";

  mensagem.classList.remove(
    "mensagem-sucesso",
    "mensagem-erro",
    "mensagem-aviso",
  );
}

// HELPERS

function normalizarTelefone(telefone) {
  return String(telefone || "")
    .replace(/\D/g, "")
    .trim();
}

function traduzirErroSupabase(error) {
  if (!error) {
    return "Ocorreu um erro.";
  }

  const mensagemErro = error.message?.toLowerCase() || "";

  if (
    mensagemErro.includes("already registered") ||
    mensagemErro.includes("already exists") ||
    mensagemErro.includes("user already registered")
  ) {
    return "Este e-mail já está cadastrado.";
  }

  if (mensagemErro.includes("invalid email")) {
    return "Digite um e-mail válido.";
  }

  if (
    mensagemErro.includes("password") &&
    (mensagemErro.includes("weak") || mensagemErro.includes("short"))
  ) {
    return "A senha escolhida é muito fraca.";
  }

  if (
    mensagemErro.includes("rate limit") ||
    mensagemErro.includes("too many")
  ) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  return error.message || "Não foi possível realizar o cadastro.";
}

// GARANTIR REGISTRO EM CLIENTES

async function garantirCadastroCliente({ usuarioId, nome, telefone, email }) {
  if (!usuarioId) {
    return null;
  }

  const { data: existente, error: erroBusca } = await supabaseClient
    .from("clientes")
    .select(
      `
          id,
          profile_id,
          nome,
          telefone,
          email
        `,
    )
    .eq("profile_id", usuarioId)
    .maybeSingle();

  if (erroBusca) {
    throw erroBusca;
  }

  if (existente) {
    return existente;
  }

  const { data: cliente, error: erroInsert } = await supabaseClient
    .from("clientes")
    .insert({
      profile_id: usuarioId,

      nome: nome,

      telefone: telefone || null,

      email: email,
    })
    .select(
      `
          id,
          profile_id,
          nome,
          telefone,
          email
        `,
    )
    .single();

  if (erroInsert) {
    throw erroInsert;
  }

  return cliente;
}

// CADASTRO

async function cadastrarCliente(evento) {
  evento.preventDefault();

  limparMensagem();

  if (!supabaseClient) {
    mostrarMensagem("Erro de conexão com o sistema.", "erro");

    return;
  }

  if (
    !formCadastro ||
    !campoNome ||
    !campoEmail ||
    !campoSenha ||
    !campoConfirmarSenha
  ) {
    mostrarMensagem("O formulário não foi carregado corretamente.", "erro");

    return;
  }

  const nome = campoNome.value.trim();

  const telefone = normalizarTelefone(campoTelefone?.value);

  const email = campoEmail.value.trim().toLowerCase();

  const senha = campoSenha.value;

  const confirmarSenha = campoConfirmarSenha.value;

  if (!nome) {
    mostrarMensagem("Digite seu nome.", "erro");

    campoNome.focus();

    return;
  }

  if (!email) {
    mostrarMensagem("Digite seu e-mail.", "erro");

    campoEmail.focus();

    return;
  }

  if (!senha) {
    mostrarMensagem("Digite uma senha.", "erro");

    campoSenha.focus();

    return;
  }

  if (senha.length < CONFIG_CADASTRO_CLIENTE.SENHA_MINIMA) {
    mostrarMensagem(
      `A senha deve ter pelo menos ${CONFIG_CADASTRO_CLIENTE.SENHA_MINIMA} caracteres.`,
      "erro",
    );

    campoSenha.focus();

    return;
  }

  if (senha !== confirmarSenha) {
    mostrarMensagem("As senhas não coincidem.", "erro");

    campoConfirmarSenha.focus();

    return;
  }

  const botao = formCadastro.querySelector('button[type="submit"]');

  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Criando conta...";
    }

    mostrarMensagem("Criando sua conta...", "aviso");

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,

      options: {
        data: {
          nome,
          telefone: telefone || null,
          tipo: "cliente",
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error("O Supabase não retornou o usuário criado.");
    }

    const usuarioId = data.user.id;

    console.log("[BarberHub] Cliente criado:", usuarioId);

    /*
      Se confirmação de e-mail estiver ativa,
      o Supabase pode criar o usuário sem sessão.

      Nesse caso não tentamos inserir em clientes,
      porque o RLS exige auth.uid().
    */

    if (!data.session) {
      mostrarMensagem(
        "Conta criada! Verifique seu e-mail para confirmar o cadastro e depois faça login.",
        "sucesso",
      );

      formCadastro.reset();

      setTimeout(() => {
        window.location.href = CONFIG_CADASTRO_CLIENTE.LOGIN_URL;
      }, 3000);

      return;
    }

    /*
      Com sessão ativa, já podemos garantir
      o registro correspondente em clientes.
    */

    await garantirCadastroCliente({
      usuarioId,
      nome,
      telefone,
      email,
    });

    mostrarMensagem(
      "Cadastro realizado com sucesso! Redirecionando...",
      "sucesso",
    );

    formCadastro.reset();

    setTimeout(() => {
      window.location.href = CONFIG_CADASTRO_CLIENTE.PAINEL_URL;
    }, 1200);
  } catch (erro) {
    console.error("[BarberHub] Erro no cadastro do cliente:", erro);

    mostrarMensagem(traduzirErroSupabase(erro), "erro");
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "+ Confirmar Cadastro";
    }
  }
}

// INICIALIZAÇÃO

if (!supabaseClient) {
  console.error("[BarberHub] Supabase não foi carregado.");

  mostrarMensagem("Erro: não foi possível conectar ao sistema.", "erro");
}

if (formCadastro) {
  formCadastro.addEventListener("submit", cadastrarCliente);
}

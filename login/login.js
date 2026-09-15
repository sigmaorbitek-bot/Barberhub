// BARBERHUB — LOGIN DA BARBEARIA

const CONFIG_LOGIN_BARBEARIA = {
  HOME_URL: "../index.html",
  CADASTRO_URL: "../cadastro/index.html",
  PAINEL_URL: "../painel/index.html",
  MINHAS_BARBEARIAS_URL: "../barbearia/index.html",
  NOVA_SENHA_URL: "./nova-senha.html?tipo=barbearia",

  CADASTRO_PENDENTE_KEY: "barberhub_cadastro_barbearia_pendente",
};

// ELEMENTOS

const formulario = document.getElementById("form-login");

const campoEmail = document.getElementById("email");

const campoSenha = document.getElementById("senha");

const mensagem = document.getElementById("mensagem");

// NAVEGAÇÃO

function voltar() {
  window.location.href = CONFIG_LOGIN_BARBEARIA.HOME_URL;
}

function irParaCadastro() {
  window.location.href = CONFIG_LOGIN_BARBEARIA.CADASTRO_URL;
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

// ERROS

function traduzirErroLogin(error) {
  if (!error) {
    return "Não foi possível entrar.";
  }

  const texto = error.message?.toLowerCase() || "";

  if (texto.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }

  if (texto.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (texto.includes("rate limit") || texto.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  return error.message || "Não foi possível entrar.";
}

// PERFIL

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
          telefone,
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

// BARBEARIAS DO DONO

async function buscarBarbeariasDoDono(usuarioId) {
  if (!usuarioId) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("barbearias")
    .select(
      `
          id,
          nome,
          dono_id
        `,
    )
    .eq("dono_id", usuarioId)
    .order("nome", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data || [];
}

// REDIRECIONAR DONO

async function redirecionarDono(usuario) {
  if (!usuario?.id) {
    return false;
  }

  const barbearias = await buscarBarbeariasDoDono(usuario.id);

  // Uma barbearia:
  // entra diretamente no painel.

  if (barbearias.length === 1) {
    window.location.href = `${CONFIG_LOGIN_BARBEARIA.PAINEL_URL}?id=${encodeURIComponent(
      barbearias[0].id,
    )}`;

    return true;
  }

  // Nenhuma barbearia.
  // Pode ser um cadastro que ficou pendente
  // devido à confirmação de e-mail.

  if (barbearias.length === 0) {
    const cadastroPendente = localStorage.getItem(
      CONFIG_LOGIN_BARBEARIA.CADASTRO_PENDENTE_KEY,
    );

    if (cadastroPendente) {
      mostrarMensagem("Finalizando o cadastro da sua barbearia...", "aviso");

      /*
        A página de cadastro possui a função
        que finaliza o cadastro pendente
        quando encontra uma sessão válida.
      */

      setTimeout(() => {
        window.location.href = CONFIG_LOGIN_BARBEARIA.CADASTRO_URL;
      }, 700);

      return true;
    }

    mostrarMensagem(
      "Sua conta existe, mas nenhuma barbearia está vinculada a ela.",
      "erro",
    );

    return false;
  }

  /*
    Compatibilidade com contas antigas
    que eventualmente tenham mais de
    uma barbearia.
  */

  window.location.href = CONFIG_LOGIN_BARBEARIA.MINHAS_BARBEARIAS_URL;

  return true;
}

// RECUPERAR SENHA

async function esqueciSenha() {
  limparMensagem();

  const email = campoEmail?.value.trim().toLowerCase() || "";

  if (!email) {
    mostrarMensagem("Digite o e-mail da sua barbearia.", "erro");

    campoEmail?.focus();

    return;
  }

  try {
    mostrarMensagem("Enviando link de recuperação...", "aviso");

    const redirectTo = new URL(
      CONFIG_LOGIN_BARBEARIA.NOVA_SENHA_URL,
      window.location.href,
    ).href;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw error;
    }

    mostrarMensagem(
      "Enviamos um link de recuperação para seu e-mail.",
      "sucesso",
    );
  } catch (erro) {
    console.error("[BarberHub] Erro ao recuperar senha:", erro);

    mostrarMensagem("Não foi possível enviar o link de recuperação.", "erro");
  }
}

// LOGIN

async function fazerLogin(evento) {
  evento.preventDefault();

  limparMensagem();

  if (!supabaseClient) {
    mostrarMensagem("Erro de conexão com o sistema.", "erro");

    return;
  }

  const email = campoEmail?.value.trim().toLowerCase() || "";

  const senha = campoSenha?.value || "";

  if (!email) {
    mostrarMensagem("Digite seu e-mail.", "erro");

    campoEmail?.focus();

    return;
  }

  if (!senha) {
    mostrarMensagem("Digite sua senha.", "erro");

    campoSenha?.focus();

    return;
  }

  const botao = formulario?.querySelector('button[type="submit"]');

  try {
    if (botao) {
      botao.disabled = true;

      botao.textContent = "Entrando...";
    }

    mostrarMensagem("Entrando...", "aviso");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      throw error;
    }

    if (!data?.session || !data?.user) {
      throw new Error("Não foi possível iniciar sua sessão.");
    }

    // VALIDAR TIPO DO USUÁRIO

    const perfil = await buscarPerfil(data.user.id);

    if (!perfil) {
      await supabaseClient.auth.signOut();

      mostrarMensagem("Seu perfil não foi encontrado.", "erro");

      return;
    }

    if (perfil.tipo !== "dono") {
      await supabaseClient.auth.signOut();

      mostrarMensagem(
        "Esta conta não é uma conta de barbearia. Use o login de cliente.",
        "erro",
      );

      return;
    }

    // REDIRECIONAR

    mostrarMensagem("Login realizado com sucesso!", "sucesso");

    await redirecionarDono(data.user);
  } catch (erro) {
    console.error("[BarberHub] Erro no login da barbearia:", erro);

    mostrarMensagem(traduzirErroLogin(erro), "erro");
  } finally {
    if (botao) {
      botao.disabled = false;

      botao.textContent = "Entrar";
    }
  }
}

// SESSÃO JÁ EXISTENTE

async function verificarSessaoExistente() {
  try {
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session?.user) {
      return;
    }

    const perfil = await buscarPerfil(session.user.id);

    /*
      Só redirecionamos automaticamente
      quando a sessão já aberta pertence
      a um dono.
    */

    if (perfil?.tipo !== "dono") {
      return;
    }

    await redirecionarDono(session.user);
  } catch (erro) {
    console.error("[BarberHub] Erro ao verificar sessão existente:", erro);
  }
}

// INICIALIZAÇÃO

async function iniciarLoginBarbearia() {
  if (!supabaseClient) {
    console.error("[BarberHub] Supabase não foi carregado.");

    mostrarMensagem("Erro: não foi possível conectar ao sistema.", "erro");

    return;
  }

  if (formulario) {
    formulario.addEventListener("submit", fazerLogin);
  }

  await verificarSessaoExistente();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarLoginBarbearia);
} else {
  iniciarLoginBarbearia();
}

// BARBERHUB — LOGIN DO CLIENTE

const CONFIG_LOGIN_CLIENTE = {
  HOME_URL: "../index.html",
  CADASTRO_URL: "../cadastro/cliente.html",
  PAINEL_URL: "../cliente/index.html",
  NOVA_SENHA_URL: "./nova-senha.html?tipo=cliente",
};

// ELEMENTOS

const formLogin = document.getElementById("form-login");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const mensagem = document.getElementById("mensagem");

// NAVEGAÇÃO

function voltar() {
  window.location.href = CONFIG_LOGIN_CLIENTE.HOME_URL;
}

function irParaCadastro() {
  window.location.href = CONFIG_LOGIN_CLIENTE.CADASTRO_URL;
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
  const texto = error?.message?.toLowerCase() || "";

  if (texto.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }

  if (texto.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (texto.includes("rate limit") || texto.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns minutos.";
  }

  return error?.message || "Não foi possível entrar.";
}

// BUSCAR PERFIL

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

// GARANTIR CLIENTE

async function garantirCliente({ usuario, perfil }) {
  if (!usuario?.id) {
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
    .eq("profile_id", usuario.id)
    .maybeSingle();

  if (erroBusca) {
    throw erroBusca;
  }

  if (existente) {
    return existente;
  }

  const { data, error } = await supabaseClient
    .from("clientes")
    .insert({
      profile_id: usuario.id,

      nome:
        perfil?.nome ||
        usuario.user_metadata?.nome ||
        usuario.email ||
        "Cliente",

      telefone: perfil?.telefone || usuario.user_metadata?.telefone || null,

      email: usuario.email || null,
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

  if (error) {
    throw error;
  }

  return data;
}

// RECUPERAR SENHA

async function esqueciSenha() {
  limparMensagem();

  const email = campoEmail?.value.trim().toLowerCase() || "";

  if (!email) {
    mostrarMensagem("Digite seu e-mail para recuperar a senha.", "erro");

    campoEmail?.focus();

    return;
  }

  try {
    mostrarMensagem("Enviando link de recuperação...", "aviso");

    const redirectTo = new URL(
      CONFIG_LOGIN_CLIENTE.NOVA_SENHA_URL,
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
    console.error("[BarberHub] Erro na recuperação de senha:", erro);

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

  const botao = formLogin?.querySelector('button[type="submit"]');

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

    const perfil = await buscarPerfil(data.user.id);

    if (!perfil) {
      await supabaseClient.auth.signOut();

      mostrarMensagem("Seu perfil não foi encontrado.", "erro");

      return;
    }

    // SEGURANÇA:
    // somente cliente entra nesta tela.

    if (perfil.tipo !== "cliente") {
      await supabaseClient.auth.signOut();

      mostrarMensagem(
        "Esta conta não é uma conta de cliente. Use o login da barbearia.",
        "erro",
      );

      return;
    }

    // Garante clientes.profile_id

    await garantirCliente({
      usuario: data.user,

      perfil,
    });

    mostrarMensagem("Login realizado com sucesso!", "sucesso");

    window.location.href = CONFIG_LOGIN_CLIENTE.PAINEL_URL;
  } catch (erro) {
    console.error("[BarberHub] Erro no login do cliente:", erro);

    mostrarMensagem(traduzirErroLogin(erro), "erro");
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Entrar";
    }
  }
}

// VERIFICAR SESSÃO EXISTENTE

async function verificarSessaoExistente() {
  try {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session?.user) {
      return;
    }

    const perfil = await buscarPerfil(session.user.id);

    if (perfil?.tipo === "cliente") {
      window.location.href = CONFIG_LOGIN_CLIENTE.PAINEL_URL;
    }
  } catch (erro) {
    console.error("[BarberHub] Erro ao verificar sessão:", erro);
  }
}

// INICIALIZAÇÃO

async function iniciarLoginCliente() {
  if (!supabaseClient) {
    console.error("[BarberHub] Supabase não foi carregado.");

    mostrarMensagem("Erro: não foi possível conectar ao sistema.", "erro");

    return;
  }

  if (formLogin) {
    formLogin.addEventListener("submit", fazerLogin);
  }

  await verificarSessaoExistente();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarLoginCliente);
} else {
  iniciarLoginCliente();
}

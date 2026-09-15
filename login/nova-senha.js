// BARBERHUB — NOVA SENHA

const CONFIG_NOVA_SENHA = {
  SENHA_MINIMA: 6,

  LOGIN_CLIENTE_URL: "./cliente.html",
  LOGIN_BARBEARIA_URL: "./index.html",
  HOME_URL: "../index.html",
};

// ==================================================
// ELEMENTOS
// ==================================================

const formulario = document.getElementById("form-nova-senha");

const campoNovaSenha = document.getElementById("nova-senha");

const campoConfirmarSenha = document.getElementById("confirmar-senha");

const mensagem = document.getElementById("mensagem");

const botaoVoltar = document.getElementById("btn-voltar-login");

// ==================================================
// TIPO DE USUÁRIO
// ==================================================

const parametros = new URLSearchParams(window.location.search);

const tipo = parametros.get("tipo");

// ==================================================
// MENSAGENS
// ==================================================

function mostrarMensagem(texto, tipoMensagem = "erro") {
  if (!mensagem) {
    return;
  }

  mensagem.textContent = texto;

  mensagem.classList.remove(
    "mensagem-sucesso",
    "mensagem-erro",
    "mensagem-aviso",
  );

  if (tipoMensagem === "sucesso") {
    mensagem.classList.add("mensagem-sucesso");

    return;
  }

  if (tipoMensagem === "aviso") {
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

// ==================================================
// LOGIN CORRETO
// ==================================================

function obterUrlLogin() {
  if (tipo === "cliente") {
    return CONFIG_NOVA_SENHA.LOGIN_CLIENTE_URL;
  }

  if (tipo === "barbearia") {
    return CONFIG_NOVA_SENHA.LOGIN_BARBEARIA_URL;
  }

  return CONFIG_NOVA_SENHA.HOME_URL;
}

function voltarLogin() {
  window.location.href = obterUrlLogin();
}

// ==================================================
// VERIFICAR SESSÃO DE RECUPERAÇÃO
// ==================================================

async function verificarSessaoRecuperacao() {
  try {
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session?.user) {
      mostrarMensagem(
        "O link de recuperação é inválido ou expirou. Solicite um novo link.",
        "erro",
      );

      if (formulario) {
        const botao = formulario.querySelector('button[type="submit"]');

        if (botao) {
          botao.disabled = true;
        }
      }

      return false;
    }

    return true;
  } catch (erro) {
    console.error("[BarberHub] Erro ao verificar recuperação:", erro);

    mostrarMensagem("Não foi possível validar o link de recuperação.", "erro");

    return false;
  }
}

// ==================================================
// TRADUZIR ERROS
// ==================================================

function traduzirErroSenha(error) {
  if (!error) {
    return "Não foi possível alterar sua senha.";
  }

  const texto = error.message?.toLowerCase() || "";

  if (
    texto.includes("password should be at least") ||
    texto.includes("password is too short")
  ) {
    return `A senha precisa ter pelo menos ${CONFIG_NOVA_SENHA.SENHA_MINIMA} caracteres.`;
  }

  if (texto.includes("same password")) {
    return "A nova senha precisa ser diferente da senha atual.";
  }

  if (texto.includes("session") || texto.includes("jwt")) {
    return "Sua sessão de recuperação expirou. Solicite um novo link.";
  }

  return error.message || "Não foi possível alterar sua senha.";
}

// ==================================================
// ALTERAR SENHA
// ==================================================

async function alterarSenha(event) {
  event.preventDefault();

  limparMensagem();

  const novaSenha = campoNovaSenha?.value || "";

  const confirmarSenha = campoConfirmarSenha?.value || "";

  if (!novaSenha) {
    mostrarMensagem("Digite sua nova senha.", "erro");

    campoNovaSenha?.focus();

    return;
  }

  if (novaSenha.length < CONFIG_NOVA_SENHA.SENHA_MINIMA) {
    mostrarMensagem(
      `A senha precisa ter pelo menos ${CONFIG_NOVA_SENHA.SENHA_MINIMA} caracteres.`,
      "erro",
    );

    campoNovaSenha?.focus();

    return;
  }

  if (!confirmarSenha) {
    mostrarMensagem("Confirme sua nova senha.", "erro");

    campoConfirmarSenha?.focus();

    return;
  }

  if (novaSenha !== confirmarSenha) {
    mostrarMensagem("As senhas não são iguais.", "erro");

    campoConfirmarSenha?.focus();

    return;
  }

  const botao = formulario?.querySelector('button[type="submit"]');

  try {
    if (botao) {
      botao.disabled = true;

      botao.textContent = "Alterando senha...";
    }

    mostrarMensagem("Alterando sua senha...", "aviso");

    const sessaoValida = await verificarSessaoRecuperacao();

    if (!sessaoValida) {
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      throw error;
    }

    mostrarMensagem("Senha alterada com sucesso!", "sucesso");

    if (campoNovaSenha) {
      campoNovaSenha.value = "";
    }

    if (campoConfirmarSenha) {
      campoConfirmarSenha.value = "";
    }

    /*
      Encerramos a sessão de recuperação
      antes de voltar ao login.
    */

    await supabaseClient.auth.signOut();

    setTimeout(() => {
      voltarLogin();
    }, 1500);
  } catch (erro) {
    console.error("[BarberHub] Erro ao alterar senha:", erro);

    mostrarMensagem(traduzirErroSenha(erro), "erro");
  } finally {
    if (botao) {
      botao.disabled = false;

      botao.textContent = "Alterar senha";
    }
  }
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================

async function iniciarNovaSenha() {
  if (!supabaseClient) {
    console.error("[BarberHub] Supabase não foi carregado.");

    mostrarMensagem("Erro: não foi possível conectar ao sistema.", "erro");

    return;
  }

  if (formulario) {
    formulario.addEventListener("submit", alterarSenha);
  }

  await verificarSessaoRecuperacao();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarNovaSenha);
} else {
  iniciarNovaSenha();
}

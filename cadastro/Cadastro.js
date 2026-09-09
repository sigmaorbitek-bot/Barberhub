// ======================================================
// BARBERHUB — CADASTRO DE BARBEARIA
// ======================================================

const form = document.getElementById("form-cadastro");
const mensagem = document.getElementById("mensagem");

// ======================================================
// VOLTAR
// ======================================================

function voltar() {
  window.location.href = "../login/index.html";
}

// ======================================================
// VERIFICAÇÃO DO SUPABASE
// ======================================================

if (!supabaseClient) {
  console.error("Supabase não foi carregado.");

  if (mensagem) {
    mensagem.textContent =
      "Erro: não foi possível conectar ao sistema.";
    mensagem.style.color = "#C1121F";
  }
}

// ======================================================
// CADASTRO
// ======================================================

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  // ----------------------------------------------------
  // Verifica conexão
  // ----------------------------------------------------

  if (!supabaseClient) {
    mostrarMensagem(
      "Erro de conexão com o sistema.",
      "erro"
    );
    return;
  }

  // ----------------------------------------------------
  // Elementos
  // ----------------------------------------------------

  const botao = form.querySelector(
    'button[type="submit"]'
  );

  // ----------------------------------------------------
  // Dados do formulário
  // ----------------------------------------------------

  const nome =
    document.getElementById("nome")?.value.trim() || "";

  const telefone =
    document.getElementById("telefone")?.value.trim() || "";

  const cidade =
    document.getElementById("cidade")?.value.trim() || "";

  const endereco =
    document.getElementById("endereco")?.value.trim() || "";

  const horarioAbertura =
    document.getElementById("horario_abertura")?.value || "";

  const horarioFechamento =
    document.getElementById("horario_fechamento")?.value || "";

  const email =
    document.getElementById("email")?.value.trim().toLowerCase() || "";

  const senha =
    document.getElementById("senha")?.value || "";

  const confirmarSenha =
    document.getElementById("confirmar-senha")?.value || "";

  const arquivoLogo =
    document.getElementById("foto")?.files?.[0] || null;

  // ----------------------------------------------------
  // Dias de funcionamento
  // ----------------------------------------------------

  const diasSelecionados = Array.from(
    document.querySelectorAll('input[name="dias"]:checked')
  ).map((checkbox) => checkbox.value);

  // ====================================================
  // VALIDAÇÕES
  // ====================================================

  if (!nome) {
    mostrarMensagem(
      "Digite o nome da barbearia.",
      "erro"
    );
    return;
  }

  if (!cidade) {
    mostrarMensagem(
      "Selecione a cidade.",
      "erro"
    );
    return;
  }

  if (!email) {
    mostrarMensagem(
      "Digite o e-mail.",
      "erro"
    );
    return;
  }

  if (!senha) {
    mostrarMensagem(
      "Digite uma senha.",
      "erro"
    );
    return;
  }

  if (senha.length < 6) {
    mostrarMensagem(
      "A senha precisa ter pelo menos 6 caracteres.",
      "erro"
    );
    return;
  }

  if (senha !== confirmarSenha) {
    mostrarMensagem(
      "As senhas não são iguais.",
      "erro"
    );
    return;
  }

  // ----------------------------------------------------
  // Validação dos horários
  // ----------------------------------------------------

  if (
    horarioAbertura &&
    horarioFechamento &&
    horarioAbertura >= horarioFechamento
  ) {
    mostrarMensagem(
      "O horário de fechamento precisa ser depois da abertura.",
      "erro"
    );
    return;
  }

  // ----------------------------------------------------
  // Validação da logo
  // ----------------------------------------------------

  if (arquivoLogo) {
    const tiposPermitidos = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp"
    ];

    if (!tiposPermitidos.includes(arquivoLogo.type)) {
      mostrarMensagem(
        "A logo precisa ser JPG, PNG ou WEBP.",
        "erro"
      );
      return;
    }

    const tamanhoMaximo = 5 * 1024 * 1024;

    if (arquivoLogo.size > tamanhoMaximo) {
      mostrarMensagem(
        "A logo pode ter no máximo 5 MB.",
        "erro"
      );
      return;
    }
  }

  // ====================================================
  // DESABILITA BOTÃO
  // ====================================================

  if (botao) {
    botao.disabled = true;
    botao.textContent = "Criando cadastro...";
  }

  mensagem.textContent = "";

  try {
    // ==================================================
    // 1 — CRIAR USUÁRIO NO SUPABASE AUTH
    // ==================================================

    console.log("Criando usuário...");

    const {
      data: authData,
      error: authError
    } = await supabaseClient.auth.signUp({
      email: email,
      password: senha,

      options: {
        data: {
          nome: nome,
          telefone: telefone || null,
          tipo: "dono"
        }
      }
    });

    // --------------------------------------------------
    // Erro no Auth
    // --------------------------------------------------

    if (authError) {
      console.error("ERRO AUTH:", authError);

      mostrarMensagem(
        traduzirErroSupabase(authError),
        "erro"
      );

      return;
    }

    // --------------------------------------------------
    // Verifica usuário
    // --------------------------------------------------

    if (!authData || !authData.user) {
      console.error(
        "Supabase não retornou o usuário:",
        authData
      );

      mostrarMensagem(
        "Não foi possível criar a conta.",
        "erro"
      );

      return;
    }

    const usuarioId = authData.user.id;

    console.log(
      "Usuário criado:",
      usuarioId
    );

    // ==================================================
    // IMPORTANTE
    // ==================================================
    //
    // O perfil NÃO é criado aqui.
    //
    // O trigger:
    //
    // on_auth_user_created
    //
    // chama:
    //
    // handle_new_user()
    //
    // e cria automaticamente o registro em profiles.
    //
    // ==================================================

    console.log(
      "Perfil será criado automaticamente pelo trigger."
    );

    // ==================================================
    // 2 — VERIFICAR SESSÃO
    // ==================================================

    if (!authData.session) {
      console.warn(
        "Usuário criado, porém sem sessão."
      );

      mostrarMensagem(
        "Conta criada! Verifique seu e-mail para confirmar o cadastro.",
        "sucesso"
      );

      return;
    }

    // ==================================================
    // 3 — UPLOAD DA LOGO
    // ==================================================

    let logoUrl = null;

    if (arquivoLogo) {
      console.log("Enviando logo...");

      const extensao =
        arquivoLogo.name
          .split(".")
          .pop()
          .toLowerCase();

      const nomeArquivo =
        `${Date.now()}-${crypto.randomUUID()}.${extensao}`;

      const caminhoArquivo =
        `${usuarioId}/${nomeArquivo}`;

      const {
        error: erroUpload
      } = await supabaseClient.storage
        .from("barbearias")
        .upload(
          caminhoArquivo,
          arquivoLogo,
          {
            cacheControl: "3600",
            upsert: false
          }
        );

      // ------------------------------------------------
      // Erro upload
      // ------------------------------------------------

      if (erroUpload) {
        console.error(
          "ERRO AO ENVIAR LOGO:",
          erroUpload
        );

        mostrarMensagem(
          "Conta criada, mas não foi possível enviar a logo.",
          "erro"
        );

        return;
      }

      // ------------------------------------------------
      // URL pública
      // ------------------------------------------------

      const {
        data: urlData
      } = supabaseClient.storage
        .from("barbearias")
        .getPublicUrl(caminhoArquivo);

      logoUrl =
        urlData?.publicUrl || null;

      console.log(
        "Logo enviada:",
        logoUrl
      );
    }

    // ==================================================
    // 4 — CRIAR BARBEARIA
    // ==================================================

    console.log(
      "Criando barbearia..."
    );

    const dadosBarbearia = {
      dono_id: usuarioId,
      nome: nome,
      cidade: cidade,
      endereco: endereco || null,
      telefone: telefone || null,
      horario_abertura:
        horarioAbertura || null,
      horario_fechamento:
        horarioFechamento || null,
      dias_funcionamento:
        diasSelecionados,
      logo_url:
        logoUrl
    };

    console.log(
      "Dados da barbearia:",
      dadosBarbearia
    );

    const {
      data: barbearia,
      error: erroBarbearia
    } = await supabaseClient
      .from("barbearias")
      .insert(dadosBarbearia)
      .select()
      .single();

    // --------------------------------------------------
    // Erro barbearia
    // --------------------------------------------------

    if (erroBarbearia) {
      console.error(
        "================================="
      );

      console.error(
        "ERRO AO CRIAR BARBEARIA"
      );

      console.error(
        "Mensagem:",
        erroBarbearia.message
      );

      console.error(
        "Detalhes:",
        erroBarbearia.details
      );

      console.error(
        "Hint:",
        erroBarbearia.hint
      );

      console.error(
        "Código:",
        erroBarbearia.code
      );

      console.error(
        "Objeto completo:",
        erroBarbearia
      );

      console.error(
        "================================="
      );

      mostrarMensagem(
        "Conta criada, mas não foi possível criar a barbearia. Veja o Console (F12).",
        "erro"
      );

      return;
    }

    console.log(
      "Barbearia criada:",
      barbearia
    );

    // ==================================================
    // 5 — SUCESSO
    // ==================================================

    mostrarMensagem(
      "Cadastro realizado com sucesso! Redirecionando...",
      "sucesso"
    );

    console.log(
      "CADASTRO FINALIZADO COM SUCESSO!"
    );

    // ==================================================
    // REDIRECIONAMENTO
    // ==================================================

    setTimeout(() => {
      window.location.href =
        `../painel/index.html?id=${barbearia.id}`;
    }, 1000);

  } catch (erro) {

    // ==================================================
    // ERRO INESPERADO
    // ==================================================

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

    mostrarMensagem(
      "Ocorreu um erro inesperado. Abra o Console (F12) para verificar.",
      "erro"
    );

  } finally {

    // ==================================================
    // REATIVA BOTÃO
    // ==================================================

    if (botao) {
      botao.disabled = false;
      botao.textContent = "Cadastrar";
    }
  }
});

// ======================================================
// FUNÇÃO — MOSTRAR MENSAGEM
// ======================================================

function mostrarMensagem(
  texto,
  tipo = "erro"
) {
  if (!mensagem) {
    return;
  }

  mensagem.textContent = texto;

  if (tipo === "sucesso") {
    mensagem.style.color = "#D4AF37";
  } else {
    mensagem.style.color = "#C1121F";
  }
}

// ======================================================
// TRADUZIR ERROS DO SUPABASE
// ======================================================

function traduzirErroSupabase(error) {
  if (!error) {
    return "Ocorreu um erro.";
  }

  const mensagemErro =
    error.message?.toLowerCase() || "";

  // ----------------------------------------------------
  // E-mail já cadastrado
  // ----------------------------------------------------

  if (
    mensagemErro.includes("already registered") ||
    mensagemErro.includes("already exists") ||
    mensagemErro.includes("user already registered")
  ) {
    return "Este e-mail já está cadastrado.";
  }

  // ----------------------------------------------------
  // E-mail inválido
  // ----------------------------------------------------

  if (
    mensagemErro.includes("invalid email")
  ) {
    return "Digite um e-mail válido.";
  }

  // ----------------------------------------------------
  // Senha fraca
  // ----------------------------------------------------

  if (
    mensagemErro.includes("password") &&
    (
      mensagemErro.includes("weak") ||
      mensagemErro.includes("short")
    )
  ) {
    return "A senha escolhida é muito fraca.";
  }

  // ----------------------------------------------------
  // Rate limit
  // ----------------------------------------------------

  if (
    mensagemErro.includes("rate limit") ||
    mensagemErro.includes("too many")
  ) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  // ----------------------------------------------------
  // Retorna erro original
  // ----------------------------------------------------

  return (
    error.message ||
    "Não foi possível realizar o cadastro."
  );
}
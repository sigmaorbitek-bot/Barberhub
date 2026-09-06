// ==================================================
// VOLTAR
// ==================================================

function voltar() {
  window.location.href = "../barbearia/index.html";
}

// ==================================================
// FORMULÁRIO
// ==================================================

const formulario = document.getElementById("form-cadastro");

const mensagem = document.getElementById("mensagem");

// ==================================================
// CADASTRAR BARBEARIA
// ==================================================

formulario.addEventListener("submit", async function (event) {
  // Impede o navegador de recarregar a página
  event.preventDefault();

  console.log("Formulário enviado!");

  // ==================================================
  // PEGAR DADOS DO FORMULÁRIO
  // ==================================================

  const nome = document.getElementById("nome").value.trim();

  const telefone = document.getElementById("telefone").value.trim();

  const cidade = document.getElementById("cidade").value;

  const endereco = document.getElementById("endereco").value.trim();

  const horarioAbertura = document.getElementById("horario_abertura").value;

  const horarioFechamento = document.getElementById("horario_fechamento").value;

  const email = document.getElementById("email").value.trim();

  const senha = document.getElementById("senha").value;

  const confirmarSenha = document.getElementById("confirmar-senha").value;

  // ==================================================
  // PEGAR O ARQUIVO DA LOGO
  // ==================================================

  const arquivoLogo = document.getElementById("foto").files[0];

  // ==================================================
  // PEGAR DIAS DE FUNCIONAMENTO
  // ==================================================

  const diasSelecionados = [];

  const dias = document.querySelectorAll('input[name="dias"]:checked');

  dias.forEach((dia) => {
    diasSelecionados.push(dia.value);
  });

  // ==================================================
  // LOG PARA CONFERIR OS DADOS
  // ==================================================

  console.log("Nome:", nome);
  console.log("Telefone:", telefone);
  console.log("Cidade:", cidade);
  console.log("Endereço:", endereco);
  console.log("Abertura:", horarioAbertura);
  console.log("Fechamento:", horarioFechamento);
  console.log("Dias:", diasSelecionados);
  console.log("Email:", email);
  console.log("Logo:", arquivoLogo);

  // ==================================================
  // VALIDAR SENHAS
  // ==================================================

  if (senha !== confirmarSenha) {
    mensagem.textContent = "As senhas não são iguais.";

    return;
  }

  // ==================================================
  // CRIAR USUÁRIO NO AUTHENTICATION
  // ==================================================

  mensagem.textContent = "Criando sua conta...";

  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: senha,
  });

  // ==================================================
  // ERRO NO CADASTRO
  // ==================================================

  if (error) {
    console.error("Erro ao criar usuário:", error);

    mensagem.textContent = error.message;
    mensagem.style.color = "#C1121F";

    return;
  }

  console.log("Usuário criado:", data.user);

  // ==================================================
  // USUÁRIO CRIADO
  // ==================================================

  if (!data.user) {
    console.error("Usuário não foi criado.");

    mensagem.textContent = "Não foi possível criar a conta.";
    mensagem.style.color = "#C1121F";

    return;
  }

  console.log("ID do usuário:", data.user.id);
  const usuarioId = data.user.id;

  // ==================================================
  // CRIAR PERFIL (tabela profiles)
  // ==================================================

  mensagem.textContent = "Salvando seu perfil...";

  const { data: perfil, error: erroPerfil } = await supabaseClient
    .from("profiles")
    .insert({
      id: usuarioId,
      tipo: "dono",
      nome: nome,
      telefone: telefone,
    })
    .select()
    .single();

  if (erroPerfil) {
    console.error("Erro ao criar perfil:", erroPerfil);

    mensagem.textContent =
      "Usuário criado, mas não foi possível criar o perfil.";

    mensagem.style.color = "#C1121F";

    return;
  }

  console.log("Perfil criado:", perfil);

  // ==================================================
  // ENVIAR A LOGO (se a pessoa escolheu um arquivo)
  // ==================================================

  let logoUrl = null;

  if (arquivoLogo) {
    mensagem.textContent = "Enviando a logo...";

    // Caminho dentro do bucket: uma pasta por usuário, evita
    // que uma pessoa sobrescreva o arquivo de outra sem querer.
    const caminhoArquivo = `${usuarioId}/${Date.now()}-${arquivoLogo.name}`;

    const { error: erroUpload } = await supabaseClient.storage
      .from("barbearias")
      .upload(caminhoArquivo, arquivoLogo);

    if (erroUpload) {
      console.error("Erro ao enviar logo:", erroUpload);

      // Não trava o cadastro por causa da logo — só avisa e segue.
      mensagem.textContent =
        "Não foi possível enviar a logo, mas vamos continuar o cadastro.";
      mensagem.style.color = "#D4AF37";
    } else {
      // Pega a URL pública do arquivo que acabou de subir.
      const { data: urlPublica } = supabaseClient.storage
        .from("barbearias")
        .getPublicUrl(caminhoArquivo);

      logoUrl = urlPublica.publicUrl;

      console.log("Logo enviada:", logoUrl);
    }
  }

  // ==================================================
  // CRIAR BARBEARIA (tabela barbearias)
  // ==================================================

  mensagem.textContent = "Cadastrando sua barbearia...";

  const { data: barbearia, error: erroBarbearia } = await supabaseClient
    .from("barbearias")
    .insert({
      dono_id: usuarioId,
      nome: nome,
      cidade: cidade,
      endereco: endereco,
      telefone: telefone,
      horario_abertura: horarioAbertura || null,
      horario_fechamento: horarioFechamento || null,
      dias_funcionamento: diasSelecionados,
      logo_url: logoUrl,
    })
    .select()
    .single();

  // ==================================================
  // ERRO AO CRIAR A BARBEARIA
  // ==================================================

  if (erroBarbearia) {
    console.error("Erro ao criar barbearia:", erroBarbearia);

    mensagem.textContent =
      "Perfil criado, mas não foi possível salvar a barbearia.";

    mensagem.style.color = "#C1121F";

    return;
  }

  console.log("Barbearia criada:", barbearia);

  // ==================================================
  // TUDO CERTO
  // ==================================================

  mensagem.textContent = "Barbearia cadastrada com sucesso!";
  mensagem.style.color = "#4ade80";

  setTimeout(() => {
    voltar();
  }, 1200);
});
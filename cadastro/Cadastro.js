// BARBERHUB — CADASTRO DE BARBEARIA

const CONFIG_CADASTRO = {
  LOGIN_URL: "../login/index.html",
  PAINEL_URL: "../painel/index.html",

  SENHA_MINIMA: 6,
  TAMANHO_MAXIMO_LOGO: 5 * 1024 * 1024,

  TIPOS_LOGO: ["image/jpeg", "image/png", "image/webp"],

  STORAGE_BUCKET: "barbearias",

  CADASTRO_PENDENTE_KEY: "barberhub_cadastro_barbearia_pendente",
};

// ELEMENTOS

const parametrosCadastro = new URLSearchParams(window.location.search);
const MODO_NOVA_BARBEARIA = parametrosCadastro.get("modo") === "nova-barbearia";
const form = document.getElementById("form-cadastro");
const mensagem = document.getElementById("mensagem");

// NAVEGAÇÃO

function voltar() {
  window.location.href = CONFIG_CADASTRO.LOGIN_URL;
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

function gerarIdBarbearia() {
  return `barbearia-${crypto.randomUUID()}`;
}

function traduzirErroSupabase(error) {
  if (!error) {
    return "Ocorreu um erro.";
  }

  const texto = error.message?.toLowerCase() || "";

  if (
    texto.includes("already registered") ||
    texto.includes("already exists") ||
    texto.includes("user already registered")
  ) {
    return "Este e-mail já está cadastrado.";
  }

  if (texto.includes("invalid email")) {
    return "Digite um e-mail válido.";
  }

  if (
    texto.includes("password") &&
    (texto.includes("weak") || texto.includes("short"))
  ) {
    return "A senha escolhida é muito fraca.";
  }

  if (texto.includes("rate limit") || texto.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  if (
    texto.includes("row-level security") ||
    texto.includes("violates row-level security")
  ) {
    return "O banco bloqueou esta operação por segurança.";
  }

  return error.message || "Não foi possível realizar o cadastro.";
}

// DADOS DO FORMULÁRIO

function obterDadosFormulario() {
  const nome = document.getElementById("nome")?.value.trim() || "";

  const telefone = normalizarTelefone(
    document.getElementById("telefone")?.value,
  );

  const cidade = document.getElementById("cidade")?.value.trim() || "";

  const endereco = document.getElementById("endereco")?.value.trim() || "";

  const horarioAbertura =
    document.getElementById("horario_abertura")?.value || "";

  const horarioFechamento =
    document.getElementById("horario_fechamento")?.value || "";

  const email =
    document.getElementById("email")?.value.trim().toLowerCase() || "";

  const senha = document.getElementById("senha")?.value || "";

  const confirmarSenha =
    document.getElementById("confirmar-senha")?.value || "";

  const arquivoLogo = document.getElementById("foto")?.files?.[0] || null;

  const diasSelecionados = Array.from(
    document.querySelectorAll('input[name="dias"]:checked'),
  ).map((checkbox) => checkbox.value);

  return {
    nome,
    telefone,
    cidade,
    endereco,
    horarioAbertura,
    horarioFechamento,
    email,
    senha,
    confirmarSenha,
    arquivoLogo,
    diasSelecionados,
  };
}

// VALIDAÇÕES

function validarCadastro(dados) {
  if (!dados.nome) {
    return "Digite o nome da barbearia.";
  }

  if (!dados.cidade) {
    return "Digite a cidade.";
  }

  /*
    E-mail e senha só são obrigatórios
    quando estamos criando uma CONTA nova.

    Quando o usuário veio de:
    ?modo=nova-barbearia

    ele já está autenticado.
  */

  if (!MODO_NOVA_BARBEARIA) {
    if (!dados.email) {
      return "Digite o e-mail.";
    }

    if (!dados.senha) {
      return "Digite uma senha.";
    }

    if (dados.senha.length < CONFIG_CADASTRO.SENHA_MINIMA) {
      return `A senha precisa ter pelo menos ${CONFIG_CADASTRO.SENHA_MINIMA} caracteres.`;
    }

    if (dados.senha !== dados.confirmarSenha) {
      return "As senhas não são iguais.";
    }
  }

  if (
    dados.horarioAbertura &&
    dados.horarioFechamento &&
    dados.horarioAbertura >= dados.horarioFechamento
  ) {
    return "O horário de fechamento precisa ser depois da abertura.";
  }

  if (
    dados.diasSelecionados.length &&
    (!dados.horarioAbertura || !dados.horarioFechamento)
  ) {
    return "Informe os horários de abertura e fechamento.";
  }

  if (dados.arquivoLogo) {
    if (!CONFIG_CADASTRO.TIPOS_LOGO.includes(dados.arquivoLogo.type)) {
      return "A logo precisa ser JPG, PNG ou WEBP.";
    }

    if (dados.arquivoLogo.size > CONFIG_CADASTRO.TAMANHO_MAXIMO_LOGO) {
      return "A logo pode ter no máximo 5 MB.";
    }
  }

  return null;
}

// CADASTRO PENDENTE

function salvarCadastroPendente(dados) {
  const dadosPendentes = {
    nome: dados.nome,

    telefone: dados.telefone,

    cidade: dados.cidade,

    endereco: dados.endereco,

    horarioAbertura: dados.horarioAbertura,

    horarioFechamento: dados.horarioFechamento,

    diasSelecionados: dados.diasSelecionados,
  };

  localStorage.setItem(
    CONFIG_CADASTRO.CADASTRO_PENDENTE_KEY,

    JSON.stringify(dadosPendentes),
  );
}

function obterCadastroPendente() {
  try {
    const salvo = localStorage.getItem(CONFIG_CADASTRO.CADASTRO_PENDENTE_KEY);

    if (!salvo) {
      return null;
    }

    return JSON.parse(salvo);
  } catch (erro) {
    console.error("[BarberHub] Erro ao ler cadastro pendente:", erro);

    return null;
  }
}

function limparCadastroPendente() {
  localStorage.removeItem(CONFIG_CADASTRO.CADASTRO_PENDENTE_KEY);
}

// CRIAR BARBEARIA

async function criarBarbearia({
  usuarioId,
  nome,
  cidade,
  endereco,
  telefone,
  horarioAbertura,
  horarioFechamento,
  diasSelecionados,
}) {
  if (!usuarioId) {
    throw new Error("Usuário não identificado.");
  }

  const id = gerarIdBarbearia();

  const { data, error } = await supabaseClient
    .from("barbearias")
    .insert({
      id,

      dono_id: usuarioId,

      nome,

      cidade,

      endereco: endereco || null,

      telefone: telefone || null,

      horario_abertura: horarioAbertura || null,

      horario_fechamento: horarioFechamento || null,

      dias_funcionamento: diasSelecionados || [],

      logo_url: null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// HORÁRIOS DE FUNCIONAMENTO

function converterDiaSemana(dia) {
  const mapa = {
    dom: 0,
    seg: 1,
    ter: 2,
    qua: 3,
    qui: 4,
    sex: 5,
    sab: 6,
  };

  return mapa[dia] ?? null;
}

async function criarHorariosFuncionamento({
  barbeariaId,
  diasSelecionados,
  horarioAbertura,
  horarioFechamento,
}) {
  if (
    !barbeariaId ||
    !diasSelecionados?.length ||
    !horarioAbertura ||
    !horarioFechamento
  ) {
    return [];
  }

  const diasNumericos = diasSelecionados
    .map(converterDiaSemana)
    .filter((dia) => dia !== null);

  if (!diasNumericos.length) {
    return [];
  }

  const { data: existentes, error: erroBusca } = await supabaseClient
    .from("horarios_funcionamento")
    .select(
      `
          id,
          dia_semana
        `,
    )
    .eq("barbearia_id", barbeariaId);

  if (erroBusca) {
    throw erroBusca;
  }

  const diasExistentes = new Set(
    (existentes || []).map((item) => Number(item.dia_semana)),
  );

  const novosHorarios = diasNumericos
    .filter((diaSemana) => !diasExistentes.has(diaSemana))
    .map((diaSemana) => ({
      barbearia_id: barbeariaId,

      dia_semana: diaSemana,

      aberto: true,

      hora_abertura: horarioAbertura,

      hora_fechamento: horarioFechamento,

      intervalo_inicio: null,

      intervalo_fim: null,
    }));

  if (!novosHorarios.length) {
    return existentes || [];
  }

  const { data, error } = await supabaseClient
    .from("horarios_funcionamento")
    .insert(novosHorarios)
    .select();

  if (error) {
    throw error;
  }

  return data || [];
}

// UPLOAD DA LOGO

async function enviarLogo({ usuarioId, barbeariaId, arquivoLogo }) {
  if (!usuarioId || !barbeariaId || !arquivoLogo) {
    return null;
  }

  const extensao = arquivoLogo.name.split(".").pop()?.toLowerCase() || "png";

  const nomeArquivo = `${crypto.randomUUID()}.${extensao}`;

  const caminhoArquivo = `${usuarioId}/${barbeariaId}/${nomeArquivo}`;

  const { error: erroUpload } = await supabaseClient.storage
    .from(CONFIG_CADASTRO.STORAGE_BUCKET)
    .upload(caminhoArquivo, arquivoLogo, {
      cacheControl: "3600",

      upsert: false,
    });

  if (erroUpload) {
    throw erroUpload;
  }

  const { data: urlData } = supabaseClient.storage
    .from(CONFIG_CADASTRO.STORAGE_BUCKET)
    .getPublicUrl(caminhoArquivo);

  const logoUrl = urlData?.publicUrl || null;

  if (!logoUrl) {
    return null;
  }

  const { error: erroAtualizacao } = await supabaseClient
    .from("barbearias")
    .update({
      logo_url: logoUrl,
    })
    .eq("id", barbeariaId)
    .eq("dono_id", usuarioId);

  if (erroAtualizacao) {
    throw erroAtualizacao;
  }

  return logoUrl;
}

// FINALIZAR CRIAÇÃO DA BARBEARIA

async function finalizarCadastroBarbearia({
  usuarioId,
  dados,
  arquivoLogo = null,
}) {
  const barbearia = await criarBarbearia({
    usuarioId,

    nome: dados.nome,

    cidade: dados.cidade,

    endereco: dados.endereco,

    telefone: dados.telefone,

    horarioAbertura: dados.horarioAbertura,

    horarioFechamento: dados.horarioFechamento,

    diasSelecionados: dados.diasSelecionados,
  });

  await criarHorariosFuncionamento({
    barbeariaId: barbearia.id,
    diasSelecionados: dados.diasSelecionados,
    horarioAbertura: dados.horarioAbertura,
    horarioFechamento: dados.horarioFechamento,
  });

  let alertaLogo = null;

  if (arquivoLogo) {
    try {
      await enviarLogo({
        usuarioId,
        barbeariaId: barbearia.id,
        arquivoLogo,
      });
    } catch (erro) {
      alertaLogo = erro;

      console.warn(
        "[BarberHub] A barbearia foi criada, mas a logo não pôde ser enviada:",
        erro,
      );
    }
  }

  return {
    barbearia,
    alertaLogo,
  };
}
// Dono Logado
async function obterDonoLogado() {
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.user) {
    return null;
  }

  const { data: perfil, error: erroPerfil } = await supabaseClient
    .from("profiles")
    .select(
      `
          id,
          nome,
          tipo
        `,
    )
    .eq("id", session.user.id)
    .maybeSingle();

  if (erroPerfil) {
    throw erroPerfil;
  }

  if (!perfil || perfil.tipo !== "dono") {
    return null;
  }

  return {
    usuario: session.user,

    perfil,
  };
}

// CADASTRAR

async function cadastrarBarbearia(evento) {
  evento.preventDefault();

  limparMensagem();

  if (!supabaseClient) {
    mostrarMensagem("Erro de conexão com o sistema.", "erro");

    return;
  }

  const dados = obterDadosFormulario();

  const erroValidacao = validarCadastro(dados);

  if (erroValidacao) {
    mostrarMensagem(erroValidacao, "erro");

    return;
  }

  const botao = form?.querySelector('button[type="submit"]');

  try {
    if (botao) {
      botao.disabled = true;

      botao.textContent = MODO_NOVA_BARBEARIA
        ? "Criando barbearia..."
        : "Criando cadastro...";
    }

    // ==================================================
    // NOVA BARBEARIA PARA DONO JÁ LOGADO
    // ==================================================

    if (MODO_NOVA_BARBEARIA) {
      mostrarMensagem("Criando sua nova barbearia...", "aviso");

      const dono = await obterDonoLogado();

      if (!dono?.usuario?.id) {
        mostrarMensagem("Sua sessão expirou. Entre novamente.", "erro");

        setTimeout(() => {
          window.location.href = CONFIG_CADASTRO.LOGIN_URL;
        }, 1500);

        return;
      }

      const resultado = await finalizarCadastroBarbearia({
        usuarioId: dono.usuario.id,

        dados,

        arquivoLogo: dados.arquivoLogo,
      });

      if (resultado.alertaLogo) {
        mostrarMensagem(
          "Barbearia criada! A logo não pôde ser enviada agora, mas você poderá adicioná-la pelo painel.",
          "sucesso",
        );
      } else {
        mostrarMensagem("Nova barbearia criada com sucesso!", "sucesso");
      }

      setTimeout(() => {
        window.location.href = `${CONFIG_CADASTRO.PAINEL_URL}?id=${encodeURIComponent(
          resultado.barbearia.id,
        )}`;
      }, 1000);

      return;
    }

    // ==================================================
    // PRIMEIRO CADASTRO
    // CRIA CONTA + BARBEARIA
    // ==================================================

    mostrarMensagem("Criando sua conta...", "aviso");

    const urlConfirmacao = `${window.location.origin}${window.location.pathname}`;

    const { data: authData, error: authError } =
      await supabaseClient.auth.signUp({
        email: dados.email,

        password: dados.senha,

        options: {
          emailRedirectTo: urlConfirmacao,

          data: {
            nome: dados.nome,

            telefone: dados.telefone || null,

            tipo: "dono",
          },
        },
      });

    if (authError) {
      throw authError;
    }

    if (!authData?.user) {
      throw new Error("O Supabase não retornou o usuário criado.");
    }

    const usuarioId = authData.user.id;

    // Confirmação de e-mail ativa.

    if (!authData.session) {
      salvarCadastroPendente(dados);

      form?.reset();

      mostrarMensagem(
        "Conta criada! Confirme seu e-mail. Depois da confirmação concluiremos o cadastro da barbearia.",
        "sucesso",
      );

      return;
    }

    mostrarMensagem("Criando sua barbearia...", "aviso");

    const resultado = await finalizarCadastroBarbearia({
      usuarioId,
      dados,

      arquivoLogo: dados.arquivoLogo,
    });

    limparCadastroPendente();

    if (resultado.alertaLogo) {
      mostrarMensagem(
        "Barbearia criada! A logo não pôde ser enviada agora, mas você poderá adicioná-la pelo painel.",
        "sucesso",
      );
    } else {
      mostrarMensagem(
        "Cadastro realizado com sucesso! Redirecionando...",
        "sucesso",
      );
    }

    setTimeout(() => {
      window.location.href = `${CONFIG_CADASTRO.PAINEL_URL}?id=${encodeURIComponent(
        resultado.barbearia.id,
      )}`;
    }, 1200);
  } catch (erro) {
    console.error("[BarberHub] Erro no cadastro da barbearia:", erro);

    mostrarMensagem(traduzirErroSupabase(erro), "erro");
  } finally {
    if (botao) {
      botao.disabled = false;

      botao.textContent = "+ Cadastrar Barbearia";
    }
  }
}

// FINALIZAR CADASTRO DEPOIS DA CONFIRMAÇÃO DE E-MAIL

async function finalizarCadastroPendente() {
  const dadosPendentes = obterCadastroPendente();

  if (!dadosPendentes) {
    return false;
  }

  try {
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session?.user) {
      return false;
    }

    mostrarMensagem("Finalizando o cadastro da sua barbearia...", "aviso");

    const resultado = await finalizarCadastroBarbearia({
      usuarioId: session.user.id,

      dados: dadosPendentes,

      /*
          O navegador não consegue guardar o arquivo
          da logo no localStorage.

          Caso a confirmação de e-mail tenha sido
          necessária, a logo poderá ser enviada depois.
        */
      arquivoLogo: null,
    });

    limparCadastroPendente();

    mostrarMensagem(
      "Barbearia criada com sucesso! Redirecionando...",
      "sucesso",
    );

    setTimeout(() => {
      window.location.href = `${CONFIG_CADASTRO.PAINEL_URL}?id=${encodeURIComponent(
        resultado.barbearia.id,
      )}`;
    }, 1200);

    return true;
  } catch (erro) {
    console.error("[BarberHub] Erro ao finalizar cadastro pendente:", erro);

    mostrarMensagem(
      "Sua conta foi confirmada, mas não conseguimos finalizar a barbearia. Tente novamente.",
      "erro",
    );

    return false;
  }
}

async function configurarModoCadastro() {
  if (!MODO_NOVA_BARBEARIA) {
    return;
  }

  const secaoConta = document.getElementById("secao-conta");

  const avisoConta = document.getElementById("aviso-conta-existente");

  const campoEmail = document.getElementById("email");

  const campoSenha = document.getElementById("senha");

  const campoConfirmarSenha = document.getElementById("confirmar-senha");

  // ================================================
  // VERIFICAR DONO LOGADO
  // ================================================

  const dono = await obterDonoLogado();

  if (!dono?.usuario?.id) {
    mostrarMensagem("Sua sessão expirou. Entre novamente.", "erro");

    setTimeout(() => {
      window.location.href = CONFIG_CADASTRO.LOGIN_URL;
    }, 1500);

    return;
  }

  // ================================================
  // E-MAIL E SENHA NÃO SÃO NECESSÁRIOS
  // ================================================

  if (campoEmail) {
    campoEmail.required = false;

    campoEmail.value = dono.usuario.email || "";
  }

  if (campoSenha) {
    campoSenha.required = false;
    campoSenha.value = "";
  }

  if (campoConfirmarSenha) {
    campoConfirmarSenha.required = false;

    campoConfirmarSenha.value = "";
  }

  // ================================================
  // ESCONDER CRIAÇÃO DE CONTA
  // ================================================

  if (secaoConta) {
    secaoConta.hidden = true;
  }

  // ================================================
  // MOSTRAR AVISO
  // ================================================

  if (avisoConta) {
    avisoConta.hidden = false;
  }
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================

async function iniciarCadastro() {
  if (!supabaseClient) {
    console.error("[BarberHub] Supabase não foi carregado.");

    mostrarMensagem("Erro: não foi possível conectar ao sistema.", "erro");

    return;
  }

  if (form) {
    form.addEventListener("submit", cadastrarBarbearia);
  }

  await configurarModoCadastro();

  await finalizarCadastroPendente();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarCadastro);
} else {
  iniciarCadastro();
}

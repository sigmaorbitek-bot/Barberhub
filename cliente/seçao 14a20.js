// 14. BARBEARIAS / FAVORITOS

// 14.1 VERIFICAR SE É FAVORITO

function ehFavorito(barbeariaId) {
  if (!barbeariaId) {
    return false;
  }

  return favoritosCliente.some((id) => String(id) === String(barbeariaId));
}

// 14.2 CARREGAR FAVORITOS

async function carregarFavoritos() {
  if (!usuarioAtual?.id) {
    favoritosCliente = [];

    atualizarTotalFavoritos();

    renderizarBarbearias(barbearias);

    return [];
  }

  try {
    const { data, error } = await supabaseClient
      .from("favoritos")
      .select(
        `
          barbearia_id
        `,
      )
      .eq("cliente_id", usuarioAtual.id);

    if (error) {
      throw error;
    }

    favoritosCliente = (data || [])
      .map((item) => item.barbearia_id)
      .filter(Boolean);

    atualizarTotalFavoritos();
    renderizarBarbearias(barbearias);

    return favoritosCliente;
  } catch (erro) {
    mostrarErroConsole("Erro ao carregar favoritos", erro);

    favoritosCliente = [];
    atualizarTotalFavoritos();
    renderizarBarbearias(barbearias);

    return [];
  }
}

// 14.3 ATUALIZAR CONTADOR

function atualizarTotalFavoritos() {
  const elemento = document.getElementById("total-favoritos");

  if (!elemento) {
    return;
  }

  elemento.textContent = String(favoritosCliente.length);
}

// 14.4 ADICIONAR FAVORITO

async function adicionarFavorito(barbeariaId) {
  if (!usuarioAtual?.id) {
    alert("Sua sessão expirou. Faça login novamente.");

    return false;
  }

  if (!barbeariaId) {
    return false;
  }

  if (ehFavorito(barbeariaId)) {
    return true;
  }

  try {
    const { error } = await supabaseClient.from("favoritos").insert({
      cliente_id: usuarioAtual.id,

      barbearia_id: barbeariaId,
    });

    if (error) {
      throw error;
    }

    favoritosCliente.push(barbeariaId);

    favoritosCliente = [...new Set(favoritosCliente.map(String))];

    atualizarTotalFavoritos();

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao adicionar favorito", erro);

    return false;
  }
}

// 14.5 REMOVER FAVORITO

async function removerFavorito(barbeariaId) {
  if (!usuarioAtual?.id) {
    return false;
  }

  if (!barbeariaId) {
    return false;
  }

  try {
    const { error } = await supabaseClient
      .from("favoritos")
      .delete()
      .eq("cliente_id", usuarioAtual.id)
      .eq("barbearia_id", barbeariaId);

    if (error) {
      throw error;
    }

    favoritosCliente = favoritosCliente.filter(
      (id) => String(id) !== String(barbeariaId),
    );

    atualizarTotalFavoritos();

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao remover favorito", erro);

    return false;
  }
}

// 14.6 ALTERNAR FAVORITO

async function alternarFavorito(barbeariaId) {
  if (!barbeariaId) {
    return false;
  }

  const botao = document.querySelector(
    `.btn-favoritar-barbearia[data-barbearia-id="${CSS.escape(
      String(barbeariaId),
    )}"]`,
  );

  const favoritoAtual = ehFavorito(barbeariaId);

  try {
    if (botao) {
      botao.disabled = true;

      botao.textContent = favoritoAtual ? "Removendo..." : "Salvando...";
    }

    let sucesso = false;

    if (favoritoAtual) {
      sucesso = await removerFavorito(barbeariaId);
    } else {
      sucesso = await adicionarFavorito(barbeariaId);
    }

    if (!sucesso) {
      alert(
        favoritoAtual
          ? "Não foi possível remover esta barbearia dos favoritos."
          : "Não foi possível adicionar esta barbearia aos favoritos.",
      );

      return false;
    }

    renderizarBarbeariasComBusca();

    return true;
  } finally {
    if (botao) {
      botao.disabled = false;
    }
  }
}

// 14.7 ORDENAR BARBEARIAS

function ordenarBarbearias(listaBarbearias) {
  return [...listaBarbearias].sort((a, b) => {
    const favoritoA = ehFavorito(a.id);

    const favoritoB = ehFavorito(b.id);

    if (favoritoA && !favoritoB) {
      return -1;
    }

    if (!favoritoA && favoritoB) {
      return 1;
    }

    return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
      sensitivity: "base",
    });
  });
}

// 14.8 FILTRAR BARBEARIAS

function filtrarBarbearias(listaBarbearias, termo) {
  const busca = String(termo || "")
    .trim()
    .toLowerCase();

  if (!busca) {
    return listaBarbearias;
  }

  return listaBarbearias.filter((barbearia) => {
    const texto = [barbearia.nome, barbearia.cidade, barbearia.endereco]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return texto.includes(busca);
  });
}

// 14.9 RENDERIZAR BARBEARIAS

function renderizarBarbearias(listaBarbearias) {
  const lista = document.getElementById("lista-favoritos");

  if (!lista) {
    return;
  }

  const dados = ordenarBarbearias(listaBarbearias || []);

  if (!dados.length) {
    lista.innerHTML = `
      <div class="lista-vazia">

        <p>
          💈 Nenhuma barbearia encontrada.
        </p>

        <small>
          Quando houver barbearias cadastradas,
          elas aparecerão aqui.
        </small>

      </div>
    `;

    return;
  }

  lista.innerHTML = dados
    .map((barbearia) => {
      const logo = barbearia.logo_url || "../assets/barber.png";

      const favorita = ehFavorito(barbearia.id);

      return `
            <article
              class="
                item-barbearia
                ${favorita ? "item-barbearia--favorita" : ""}
              "
              data-barbearia-id="${escapeHTML(barbearia.id)}"
            >

              <div
                class="item-barbearia-imagem"
              >

                <img
                  src="${escapeHTML(logo)}"
                  alt="Logo ${escapeHTML(barbearia.nome || "Barbearia")}"
                  loading="lazy"
                  onerror="this.src='../assets/barber.png'"
                />

                ${
                  favorita
                    ? `
                      <span
                        class="item-barbearia-favorita-badge"
                      >
                        ❤️ Favorita
                      </span>
                    `
                    : ""
                }

              </div>

              <div
                class="item-barbearia-conteudo"
              >

                <h3>
                  ${escapeHTML(barbearia.nome || "Barbearia")}
                </h3>

                ${
                  barbearia.cidade
                    ? `
                      <p>
                        📍
                        ${escapeHTML(barbearia.cidade)}
                      </p>
                    `
                    : ""
                }

                ${
                  barbearia.endereco
                    ? `
                      <p>
                        🏠
                        ${escapeHTML(barbearia.endereco)}
                      </p>
                    `
                    : ""
                }

                ${
                  barbearia.telefone
                    ? `
                      <p>
                        📱
                        ${escapeHTML(barbearia.telefone)}
                      </p>
                    `
                    : ""
                }

                <div
                  class="item-barbearia-acoes"
                >

                  <button
                    type="button"
                    class="
                      btn-principal
                      btn-agendar-barbearia
                    "
                    data-barbearia-id="${escapeHTML(barbearia.id)}"
                  >
                    📅 Agendar
                  </button>

                  <button
                    type="button"
                    class="
                      btn-secundario
                      btn-favoritar-barbearia
                      ${favorita ? "btn-favoritar-barbearia--ativo" : ""}
                    "
                    data-barbearia-id="${escapeHTML(barbearia.id)}"
                    aria-pressed="${favorita ? "true" : "false"}"
                  >
                    ${favorita ? "❤️ Favorita" : "🤍 Favoritar"}
                  </button>

                </div>

              </div>

            </article>
          `;
    })
    .join("");
}

// 14.10 RENDERIZAR COM BUSCA

function renderizarBarbeariasComBusca() {
  const campo = document.getElementById("busca-barbearia");
  const termo = campo?.value || "";
  const filtradas = filtrarBarbearias(barbearias, termo);

  renderizarBarbearias(filtradas);
}

// 14.11 SELECIONAR BARBEARIA PARA AGENDAMENTO

async function selecionarBarbeariaParaAgendamento(barbeariaId) {
  if (!barbeariaId) {
    return;
  }

  mudarAba("agendamento");

  const select = document.getElementById("agendamento-barbearia");

  if (!select) {
    return;
  }

  select.value = barbeariaId;

  horariosFuncionamento = [];

  limparMensagem("mensagem-agendamento");

  limparHorarios();

  await Promise.all([
    carregarServicos(barbeariaId),
    carregarProfissionais(barbeariaId),
    carregarHorariosFuncionamento(barbeariaId),
  ]);

  const campoData = document.getElementById("agendamento-data");

  if (campoData && !campoData.value) {
    campoData.value = obterDataMinima();
  }
}

// 14.12 CONFIGURAR BUSCA

function configurarBuscaBarbearia() {
  const campo = document.getElementById("busca-barbearia");

  if (!campo) {
    return;
  }

  if (campo.dataset.buscaConfigurada === "true") {
    return;
  }

  campo.dataset.buscaConfigurada = "true";

  campo.addEventListener("input", () => {
    renderizarBarbeariasComBusca();
  });
}

// 14.13 EVENTOS DAS BARBEARIAS

function configurarEventosBarbearias() {
  const lista = document.getElementById("lista-favoritos");

  if (!lista) {
    return;
  }

  if (lista.dataset.barbeariasConfiguradas === "true") {
    return;
  }

  lista.dataset.barbeariasConfiguradas = "true";

  lista.addEventListener("click", (evento) => {
    const btnAgendar = evento.target.closest(".btn-agendar-barbearia");

    if (btnAgendar) {
      const barbeariaId = btnAgendar.dataset.barbeariaId;

      selecionarBarbeariaParaAgendamento(barbeariaId);

      return;
    }

    const btnFavoritar = evento.target.closest(".btn-favoritar-barbearia");

    if (btnFavoritar) {
      const barbeariaId = btnFavoritar.dataset.barbeariaId;

      alternarFavorito(barbeariaId);
    }
  });
}

// 15. MEU PERFIL

// 15.1 NORMALIZAR TELEFONE

function normalizarTelefone(telefone) {
  const numero = String(telefone || "").replace(/\D/g, "");

  return numero || null;
}

// 15.2 SALVAR PERFIL

async function salvarPerfil() {
  if (!usuarioAtual?.id) {
    mostrarMensagem(
      "mensagem-perfil",
      "Sua sessão expirou. Faça login novamente.",
      "erro",
    );

    return false;
  }

  const campoNome = document.getElementById("perfil-nome");
  const campoTelefone = document.getElementById("perfil-telefone");
  const botao = document.getElementById("btn-salvar-perfil");
  const nome = campoNome?.value?.trim() || "";
  const telefone = normalizarTelefone(campoTelefone?.value);

  if (!nome) {
    mostrarMensagem("mensagem-perfil", "Informe seu nome.", "erro");

    campoNome?.focus();

    return false;
  }

  if (nome.length < 2) {
    mostrarMensagem("mensagem-perfil", "Informe um nome válido.", "erro");

    campoNome?.focus();

    return false;
  }

  if (telefone && (telefone.length < 10 || telefone.length > 13)) {
    mostrarMensagem("mensagem-perfil", "Informe um telefone válido.", "erro");

    campoTelefone?.focus();

    return false;
  }

  try {
    if (botao) {
      botao.disabled = true;

      botao.textContent = "Salvando...";
    }

    mostrarMensagem("mensagem-perfil", "Salvando seus dados...", "info");

    const { data: perfilAtualizado, error: erroPerfil } = await supabaseClient
      .from("profiles")
      .update({
        nome,
        telefone,
      })
      .eq("id", usuarioAtual.id)
      .select(
        `
          id,
          nome,
          telefone,
          tipo,
          created_at
        `,
      )
      .single();

    if (erroPerfil) {
      throw erroPerfil;
    }

    perfilAtual = perfilAtualizado;

    let cliente = clienteAtual;

    if (!cliente?.id) {
      cliente = await garantirClienteAtual();
    }

    if (cliente?.id) {
      const { data: clienteAtualizado, error: erroCliente } =
        await supabaseClient
          .from("clientes")
          .update({
            nome,
            telefone,
            email: usuarioAtual.email || null,
          })
          .eq("id", cliente.id)
          .eq("profile_id", usuarioAtual.id)
          .select(
            `
            id,
            profile_id,
            nome,
            telefone,
            email,
            created_at
          `,
          )
          .single();

      if (erroCliente) {
        throw erroCliente;
      }

      clienteAtual = clienteAtualizado;
    }

    if (nomeCliente) {
      nomeCliente.textContent = nome;
    }

    preencherFormularioPerfil();

    mostrarMensagem(
      "mensagem-perfil",
      "Dados atualizados com sucesso! ✅",
      "sucesso",
    );

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao salvar perfil", erro);

    mostrarMensagem(
      "mensagem-perfil",
      "Não foi possível atualizar seus dados.",
      "erro",
    );

    return false;
  } finally {
    if (botao) {
      botao.disabled = false;

      botao.textContent = "Salvar dados";
    }
  }
}

// 15.3 ALTERAR SENHA

async function alterarSenha() {
  if (!usuarioAtual?.id) {
    mostrarMensagem(
      "mensagem-perfil",
      "Sua sessão expirou. Faça login novamente.",
      "erro",
    );

    return false;
  }

  const novaSenha = window.prompt("Digite sua nova senha:");

  if (novaSenha === null) {
    return false;
  }

  if (novaSenha.length < 6) {
    alert("A senha precisa ter pelo menos 6 caracteres.");

    return false;
  }

  const confirmar = window.prompt("Digite novamente a nova senha:");

  if (confirmar === null) {
    return false;
  }

  if (confirmar !== novaSenha) {
    alert("As senhas não são iguais.");

    return false;
  }

  const botao = document.getElementById("btn-alterar-senha");

  try {
    if (botao) {
      botao.disabled = true;

      botao.textContent = "Alterando...";
    }

    mostrarMensagem("mensagem-perfil", "Alterando sua senha...", "info");

    const { error } = await supabaseClient.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      throw error;
    }

    mostrarMensagem(
      "mensagem-perfil",
      "Senha alterada com sucesso! 🔐",
      "sucesso",
    );

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao alterar senha", erro);

    mostrarMensagem(
      "mensagem-perfil",
      "Não foi possível alterar sua senha.",
      "erro",
    );

    return false;
  } finally {
    if (botao) {
      botao.disabled = false;

      botao.textContent = "Alterar senha";
    }
  }
}
// 16. NAVEGAÇÃO

// 16.1 DADOS DAS ABAS

const DADOS_ABAS = {
  inicio: {
    titulo: "Início",
    descricao: "Acompanhe sua conta e seus próximos horários.",
  },

  agendamento: {
    titulo: "Agendar horário",
    descricao: "Escolha a barbearia, serviço, profissional e horário.",
  },

  agendamentos: {
    titulo: "Meus agendamentos",
    descricao: "Consulte seus horários marcados no BarberHub.",
  },

  notificacoes: {
    titulo: "Notificações",
    descricao:
      "Acompanhe confirmações e atualizações dos seus agendamentos e pedidos.",
  },

  produtos: {
    titulo: "Produtos",
    descricao: "Veja os produtos disponíveis nas barbearias.",
  },

  avaliacoes: {
    titulo: "Avaliações",
    descricao: "Avalie seus atendimentos e acompanhe seus comentários.",
  },

  favoritos: {
    titulo: "Barbearias",
    descricao:
      "Encontre barbearias, favorite suas preferidas e agende seu horário.",
  },

  perfil: {
    titulo: "Meu perfil",
    descricao: "Consulte e altere seus dados pessoais.",
  },
};

// 16.2 ATUALIZAR MENU ATIVO

function atualizarMenuAtivo(aba) {
  document.querySelectorAll(".menu-item[data-aba]").forEach((item) => {
    item.classList.toggle("ativo", item.dataset.aba === aba);
  });

  document.querySelectorAll(".mobile-menu-item[data-aba]").forEach((item) => {
    item.classList.toggle("ativo", item.dataset.aba === aba);
  });

  document.querySelectorAll(".mobile-bottom-item[data-aba]").forEach((item) => {
    const ativo = item.dataset.aba === aba;

    item.classList.toggle("ativo", ativo);
    item.classList.toggle("mobile-bottom-item--ativo", ativo);
  });
}

// 16.3 ATUALIZAR CABEÇALHO

function atualizarCabecalhoAba(aba) {
  const titulo = document.getElementById("titulo-painel");
  const descricao = document.getElementById("descricao-painel");
  const dados = DADOS_ABAS[aba];

  if (!dados) {
    return;
  }

  if (titulo) {
    titulo.textContent = dados.titulo;
  }

  if (descricao) {
    descricao.textContent = dados.descricao;
  }
}

// 16.4 CARREGAR DADOS DA ABA

async function carregarDadosDaAba(aba) {
  try {
    switch (aba) {
      case "inicio":
        await carregarDashboard();
        break;

      case "agendamento":
        await carregarDadosAgendamento();
        break;

      case "agendamentos":
        await carregarAgendamentos();
        break;

      case "notificacoes":
        await carregarNotificacoesCliente();
        break;

      case "produtos":
        await carregarProdutosCliente();
        break;

      case "avaliacoes":
        await carregarAvaliacoesCliente();
        break;

      case "favoritos":
        if (!barbearias.length) {
          await carregarBarbearias();
        }

        await carregarFavoritos();

        renderizarBarbeariasComBusca();
        break;

      case "perfil":
        preencherFormularioPerfil();
        break;

      default:
        console.warn(`[BarberHub] Aba não reconhecida: ${aba}`);
    }
  } catch (erro) {
    mostrarErroConsole(`Erro ao carregar aba ${aba}`, erro);
  }
}

// 16.5 MUDAR ABA

async function mudarAba(aba) {
  if (!aba || !DADOS_ABAS[aba]) {
    return;
  }

  const conteudoAtivo = document.getElementById(`conteudo-${aba}`);

  if (!conteudoAtivo) {
    console.warn(`[BarberHub] Conteúdo da aba "${aba}" não encontrado.`);

    return;
  }

  document.querySelectorAll(".painel-conteudo").forEach((conteudo) => {
    conteudo.classList.add("oculto");
  });

  conteudoAtivo.classList.remove("oculto");

  atualizarMenuAtivo(aba);
  atualizarCabecalhoAba(aba);
  fecharMenuMobile();

  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });

  await carregarDadosDaAba(aba);
}

// 17. MENU MOBILE

// 17.1 ABRIR MENU

function abrirMenuMobile() {
  const menu = document.getElementById("menu-mobile");

  const botao = document.getElementById("btn-menu-mobile");

  if (!menu) {
    return;
  }

  menu.classList.add("aberto");

  menu.removeAttribute("inert");

  menu.setAttribute("aria-hidden", "false");

  if (botao) {
    botao.setAttribute("aria-expanded", "true");
  }

  document.body.classList.add("menu-mobile-aberto");
}

// 17.2 FECHAR MENU

function fecharMenuMobile() {
  const menu = document.getElementById("menu-mobile");

  const botao = document.getElementById("btn-menu-mobile");

  if (!menu) {
    return;
  }

  const focoDentroDoMenu = menu.contains(document.activeElement);

  if (focoDentroDoMenu && botao) {
    botao.focus();
  }

  menu.classList.remove("aberto");

  menu.setAttribute("aria-hidden", "true");

  menu.setAttribute("inert", "");

  if (botao) {
    botao.setAttribute("aria-expanded", "false");
  }

  document.body.classList.remove("menu-mobile-aberto");
}

// 17.3 ALTERNAR MENU

function alternarMenuMobile() {
  const menu = document.getElementById("menu-mobile");

  if (!menu) {
    return;
  }

  if (menu.classList.contains("aberto")) {
    fecharMenuMobile();
  } else {
    abrirMenuMobile();
  }
}

// 18. EVENTOS

// 18.1 EVENTOS DE NAVEGAÇÃO

function configurarEventosNavegacao() {
  document.querySelectorAll("[data-aba]").forEach((item) => {
    if (item.dataset.navegacaoConfigurada === "true") {
      return;
    }

    item.dataset.navegacaoConfigurada = "true";

    item.addEventListener("click", (evento) => {
      const aba = item.dataset.aba;

      if (!aba) {
        return;
      }

      evento.preventDefault();

      mudarAba(aba);
    });
  });
}

// 18.2 MENU MOBILE

function configurarEventosMenuMobile() {
  const btnMenuMobile = document.getElementById("btn-menu-mobile");
  const btnMenuBottom = document.getElementById("btn-menu-bottom");
  const btnFecharMenu = document.getElementById("btn-fechar-menu");

  if (btnMenuMobile && btnMenuMobile.dataset.eventoConfigurado !== "true") {
    btnMenuMobile.dataset.eventoConfigurado = "true";

    btnMenuMobile.addEventListener("click", (evento) => {
      evento.stopPropagation();

      alternarMenuMobile();
    });
  }

  if (btnMenuBottom && btnMenuBottom.dataset.eventoConfigurado !== "true") {
    btnMenuBottom.dataset.eventoConfigurado = "true";

    btnMenuBottom.addEventListener("click", (evento) => {
      evento.preventDefault();
      evento.stopPropagation();

      alternarMenuMobile();
    });
  }

  if (btnFecharMenu && btnFecharMenu.dataset.eventoConfigurado !== "true") {
    btnFecharMenu.dataset.eventoConfigurado = "true";

    btnFecharMenu.addEventListener("click", fecharMenuMobile);
  }

  if (document.body.dataset.eventoFecharMenuConfigurado !== "true") {
    document.body.dataset.eventoFecharMenuConfigurado = "true";

    document.addEventListener("click", (evento) => {
      const menu = document.getElementById("menu-mobile");
      const btnTopo = document.getElementById("btn-menu-mobile");
      const btnBottom = document.getElementById("btn-menu-bottom");

      if (!menu || !menu.classList.contains("aberto")) {
        return;
      }

      if (
        menu.contains(evento.target) ||
        btnTopo?.contains(evento.target) ||
        btnBottom?.contains(evento.target)
      ) {
        return;
      }

      fecharMenuMobile();
    });

    document.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape") {
        fecharMenuMobile();
      }
    });
  }
}

// 18.3 BARBEARIA DO AGENDAMENTO

function configurarEventoBarbeariaAgendamento() {
  const selectBarbearia = document.getElementById("agendamento-barbearia");

  if (
    !selectBarbearia ||
    selectBarbearia.dataset.eventoConfigurado === "true"
  ) {
    return;
  }

  selectBarbearia.dataset.eventoConfigurado = "true";

  selectBarbearia.addEventListener("change", async () => {
    const barbeariaId = selectBarbearia.value;

    const selectServico = document.getElementById("agendamento-servico");

    const selectProfissional = document.getElementById(
      "agendamento-profissional",
    );

    horariosFuncionamento = [];
    servicos = [];
    profissionais = [];

    limparMensagem("mensagem-agendamento");

    limparHorarios();

    if (selectServico) {
      selectServico.innerHTML = `
          <option value="">
            Selecione um serviço
          </option>
        `;
    }

    if (selectProfissional) {
      selectProfissional.innerHTML = `
          <option value="">
            Qualquer profissional
          </option>
        `;
    }

    if (!barbeariaId) {
      return;
    }

    try {
      await Promise.all([
        carregarServicos(barbeariaId),
        carregarProfissionais(barbeariaId),
        carregarHorariosFuncionamento(barbeariaId),
      ]);
    } catch (erro) {
      mostrarErroConsole("Erro ao carregar dados da barbearia", erro);

      mostrarMensagem(
        "mensagem-agendamento",
        "Não foi possível carregar os dados desta barbearia.",
        "erro",
      );
    }
  });
}

// 18.4 CAMPOS DO AGENDAMENTO

function configurarEventosCamposAgendamento() {
  const selectServico = document.getElementById("agendamento-servico");

  const selectProfissional = document.getElementById(
    "agendamento-profissional",
  );

  const campoData = document.getElementById("agendamento-data");

  if (selectServico && selectServico.dataset.eventoConfigurado !== "true") {
    selectServico.dataset.eventoConfigurado = "true";

    selectServico.addEventListener("change", carregarHorariosDisponiveis);
  }

  if (
    selectProfissional &&
    selectProfissional.dataset.eventoConfigurado !== "true"
  ) {
    selectProfissional.dataset.eventoConfigurado = "true";

    selectProfissional.addEventListener("change", carregarHorariosDisponiveis);
  }

  if (campoData && campoData.dataset.eventoConfigurado !== "true") {
    campoData.dataset.eventoConfigurado = "true";

    campoData.addEventListener("change", carregarHorariosDisponiveis);
  }
}

// 18.5 CONFIRMAR AGENDAMENTO

function configurarEventoConfirmarAgendamento() {
  const botao = document.getElementById("btn-confirmar-agendamento");

  if (!botao || botao.dataset.eventoConfigurado === "true") {
    return;
  }

  botao.dataset.eventoConfigurado = "true";

  botao.addEventListener("click", confirmarAgendamento);
}

// 18.6 CANCELAR AGENDAMENTO

function configurarEventoCancelarAgendamento() {
  const lista = document.getElementById("lista-meus-agendamentos");

  if (!lista || lista.dataset.cancelamentoConfigurado === "true") {
    return;
  }

  lista.dataset.cancelamentoConfigurado = "true";

  lista.addEventListener("click", (evento) => {
    const botao = evento.target.closest(".btn-cancelar-agendamento");

    if (!botao) {
      return;
    }

    cancelarAgendamento(botao.dataset.id);
  });
}

// 18.7 FILTROS DE AGENDAMENTOS

function configurarFiltrosAgendamentos() {
  document
    .querySelectorAll("#conteudo-agendamentos [data-filtro]")
    .forEach((botao) => {
      if (botao.dataset.eventoConfigurado === "true") {
        return;
      }

      botao.dataset.eventoConfigurado = "true";

      botao.addEventListener("click", () => {
        const filtro = botao.dataset.filtro;

        if (!filtro) {
          return;
        }

        filtroAgendamentosAtual = filtro;

        document
          .querySelectorAll("#conteudo-agendamentos [data-filtro]")
          .forEach((item) => {
            item.classList.toggle("ativo", item === botao);
          });

        renderizarAgendamentos();
      });
    });
}

// 18.8 FORMULÁRIO DO PERFIL

function configurarEventosPerfil() {
  const formulario = document.getElementById("form-perfil");
  const botaoSenha = document.getElementById("btn-alterar-senha");

  if (formulario && formulario.dataset.eventoConfigurado !== "true") {
    formulario.dataset.eventoConfigurado = "true";

    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();

      salvarPerfil();
    });
  }

  if (botaoSenha && botaoSenha.dataset.eventoConfigurado !== "true") {
    botaoSenha.dataset.eventoConfigurado = "true";

    botaoSenha.addEventListener("click", alterarSenha);
  }
}

// 18.9 CONFIGURAR TODOS OS EVENTOS

function configurarEventos() {
  configurarEventosNavegacao();
  configurarEventosMenuMobile();
  configurarEventoBarbeariaAgendamento();
  configurarEventosCamposAgendamento();
  configurarEventoConfirmarAgendamento();
  configurarEventoCancelarAgendamento();
  configurarFiltrosAgendamentos();
  configurarEventosNotificacoes();
  configurarEventosProdutos();
  configurarEventosAvaliacoes();
  configurarBuscaBarbearia();
  configurarEventosBarbearias();
  configurarEventosPerfil();
}
// 18.10 WEB PUSH DO CLIENTE

const btnAtivarPushCliente = document.getElementById("btn-ativar-push-cliente");

const statusPushClienteEl = document.getElementById("status-push-cliente");

function atualizarStatusPushCliente() {
  if (!btnAtivarPushCliente || !statusPushClienteEl) {
    return;
  }

  if (!("Notification" in window)) {
    btnAtivarPushCliente.disabled = true;

    btnAtivarPushCliente.textContent = "Notificações não suportadas";

    statusPushClienteEl.textContent =
      "Este navegador não suporta notificações.";

    return;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    btnAtivarPushCliente.disabled = true;

    btnAtivarPushCliente.textContent = "Notificações não suportadas";

    statusPushClienteEl.textContent = "Este navegador não suporta Web Push.";

    return;
  }

  if (Notification.permission === "granted") {
    btnAtivarPushCliente.disabled = false;

    btnAtivarPushCliente.textContent = "✅ Notificações ativadas";

    statusPushClienteEl.textContent =
      "✅ Notificações permitidas neste dispositivo.";

    return;
  }

  if (Notification.permission === "denied") {
    btnAtivarPushCliente.disabled = false;

    btnAtivarPushCliente.textContent = "🔒 Notificações bloqueadas";

    statusPushClienteEl.textContent =
      "❌ As notificações estão bloqueadas no navegador.";

    return;
  }

  btnAtivarPushCliente.disabled = false;

  btnAtivarPushCliente.textContent = "🔔 Ativar notificações neste dispositivo";

  statusPushClienteEl.textContent = "As notificações ainda não foram ativadas.";
}

function converterVapidCliente(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function salvarPushCliente(subscription) {
  if (!subscription || !usuarioAtual?.id) {
    return false;
  }

  const subscriptionJson = subscription.toJSON();

  const endpoint = subscription.endpoint;

  const p256dh = subscriptionJson.keys?.p256dh;

  const authKey = subscriptionJson.keys?.auth;

  if (!endpoint || !p256dh || !authKey) {
    throw new Error("Dados da inscrição Web Push incompletos.");
  }

  const { error } =
  await supabaseClient.rpc(
    "registrar_push_subscription",
    {
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth_key: authKey,
      p_user_agent:
        navigator.userAgent,
    },
  );

  if (error) {
    throw error;
  }

  return true;
}

async function criarPushCliente() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker não suportado.");
  }

  if (!("PushManager" in window)) {
    throw new Error("Push Manager não suportado.");
  }

  if (Notification.permission !== "granted") {
    throw new Error("Permissão de notificações não concedida.");
  }

  if (typeof VAPID_PUBLIC_KEY === "undefined" || !VAPID_PUBLIC_KEY) {
    throw new Error("VAPID_PUBLIC_KEY não configurada.");
  }

  const registro = await navigator.serviceWorker.ready;

  let subscription = await registro.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registro.pushManager.subscribe({
      userVisibleOnly: true,

      applicationServerKey: converterVapidCliente(VAPID_PUBLIC_KEY),
    });
  }

  await salvarPushCliente(subscription);

  return subscription;
}

async function ativarPushCliente() {
  if (!("Notification" in window)) {
    atualizarStatusPushCliente();

    return false;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    atualizarStatusPushCliente();

    return false;
  }

  if (Notification.permission === "denied") {
    atualizarStatusPushCliente();

    return false;
  }

  try {
    if (btnAtivarPushCliente) {
      btnAtivarPushCliente.disabled = true;

      btnAtivarPushCliente.textContent = "Ativando notificações...";
    }

    if (Notification.permission === "default") {
      const permissao = await Notification.requestPermission();

      if (permissao !== "granted") {
        atualizarStatusPushCliente();

        return false;
      }
    }

    await criarPushCliente();

    atualizarStatusPushCliente();

    if (statusPushClienteEl) {
      statusPushClienteEl.textContent =
        "✅ Este dispositivo está registrado para receber notificações.";
    }

    return true;
  } catch (erro) {
    mostrarErroConsole("Erro ao ativar Web Push do cliente", erro);

    if (statusPushClienteEl) {
      statusPushClienteEl.textContent =
        "⚠️ Não foi possível registrar este dispositivo para notificações.";
    }

    return false;
  } finally {
    if (btnAtivarPushCliente) {
      btnAtivarPushCliente.disabled = false;
    }
  }
}

async function verificarPushClienteAtual() {
  atualizarStatusPushCliente();

  if (
    !usuarioAtual?.id ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    const registro = await navigator.serviceWorker.ready;

    const subscription = await registro.pushManager.getSubscription();

    if (!subscription) {
      return;
    }

    await salvarPushCliente(subscription);

    atualizarStatusPushCliente();
  } catch (erro) {
    mostrarErroConsole("Erro ao verificar Web Push do cliente", erro);
  }
}

if (btnAtivarPushCliente) {
  btnAtivarPushCliente.addEventListener("click", ativarPushCliente);
}

// 19. SAIR

// 19.1 ENCERRAR SESSÃO

async function sair() {
  try {
    mostrarTelaCarregamento();

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }
  } catch (erro) {
    mostrarErroConsole("Erro ao sair", erro);
  } finally {
    window.location.href = CONFIG.LOGIN_URL;
  }
}
// 19.2 REGISTRAR SERVICE WORKER

async function registrarServiceWorkerCliente() {
  if (!("serviceWorker" in navigator)) {
    console.warn("[BarberHub] Service Worker não suportado neste navegador.");

    return null;
  }

  try {
    const registro = await navigator.serviceWorker.register("../sw.js", {
      scope: "/",
    });

    console.log(
      "[BarberHub] Service Worker do cliente registrado:",
      registro.scope,
    );

    return registro;
  } catch (erro) {
    console.error("[BarberHub] Erro ao registrar Service Worker:", erro);

    return null;
  }
}

// 20. INICIALIZAÇÃO

// 20.1 PREPARAR CAMPO DE DATA

function prepararCampoDataAgendamento() {
  const campoData = document.getElementById("agendamento-data");

  if (!campoData) {
    return;
  }

  const hoje = obterDataMinima();

  campoData.min = hoje;

  if (!campoData.value) {
    campoData.value = hoje;
  }
}

// 20.2 INICIAR PÁGINA

async function iniciarPagina() {
  try {
    mostrarTelaCarregamento();

    const sessaoValida = await verificarSessao();

    if (!sessaoValida) {
      return;
    }

    await carregarCliente();
    await registrarServiceWorkerCliente();
    await verificarPushClienteAtual();

    prepararCampoDataAgendamento();

    await carregarBarbearias();
    await carregarFavoritos();
    configurarEventos();

    filtroAgendamentosAtual = "proximos";

    renderizarBarbeariasComBusca();

    await mudarAba("inicio");

    atualizarTotalFavoritos();
  } catch (erro) {
    mostrarErroConsole("Erro ao iniciar painel do cliente", erro);

    alert(
      "Ocorreu um erro ao carregar o painel. Atualize a página e tente novamente.",
    );
  } finally {
    esconderTelaCarregamento();
  }
}

// 20.3 INICIAR QUANDO O HTML ESTIVER PRONTO

document.addEventListener("DOMContentLoaded", iniciarPagina);

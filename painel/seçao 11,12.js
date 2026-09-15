// 11. HORÁRIOS DE FUNCIONAMENTO

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const listaHorariosEl = document.getElementById("lista-horarios");
const formHorarios = document.getElementById("form-horarios");
const btnSalvarHorarios = document.getElementById("btn-salvar-horarios");

// CARREGAR HORÁRIOS

async function carregarHorarios() {
  if (!listaHorariosEl || !lojaId) {
    return false;
  }

  listaHorariosEl.innerHTML = `
    <p class="em-breve">
      Carregando horários...
    </p>
  `;

  try {
    const [respostaHorarios, respostaProfissionais] = await Promise.all([
      supabaseClient
        .from("horarios_funcionamento")
        .select(
          `
          id,
          barbearia_id,
          dia_semana,
          aberto,
          hora_abertura,
          hora_fechamento,
          intervalo_inicio,
          intervalo_fim
        `,
        )
        .eq("barbearia_id", lojaId)
        .order("dia_semana", {
          ascending: true,
        }),

      supabaseClient
        .from("profissionais")
        .select(
          `
          id,
          barbearia_id,
          nome,
          telefone,
          foto_url,
          ativo,
          created_at
        `,
        )
        .eq("barbearia_id", lojaId)
        .order("nome", {
          ascending: true,
        }),
    ]);

    if (respostaHorarios.error) {
      throw respostaHorarios.error;
    }

    if (respostaProfissionais.error) {
      throw respostaProfissionais.error;
    }

    horariosCache = respostaHorarios.data || [];
    profissionaisCache = respostaProfissionais.data || [];
    horariosProfissionaisCache = [];

    if (profissionaisCache.length) {
      const idsProfissionais = profissionaisCache.map(
        (profissional) => profissional.id,
      );

      const { data, error } = await supabaseClient
        .from("horarios_profissionais")
        .select(
          `
          id,
          profissional_id,
          dia_semana,
          aberto,
          hora_inicio,
          hora_fim,
          intervalo_inicio,
          intervalo_fim
        `,
        )
        .in("profissional_id", idsProfissionais)
        .order("dia_semana", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      horariosProfissionaisCache = data || [];
    }

    renderizarHorarios(
      horariosCache,
      horariosProfissionaisCache,
      profissionaisCache,
    );

    atualizarCardProfissionais();

    return true;
  } catch (erro) {
    console.error("Erro ao carregar horários:", erro);

    horariosCache = [];
    horariosProfissionaisCache = [];

    listaHorariosEl.innerHTML = `
      <p class="em-breve">
        Não foi possível carregar os horários.
      </p>
    `;

    mostrarMensagem(
      "mensagem-horarios",
      "Não foi possível carregar os horários.",
      "erro",
    );

    return false;
  }
}

// RENDERIZAR HORÁRIOS

function renderizarHorarios(horarios, horariosProfissionais, profissionais) {
  if (!listaHorariosEl) {
    return;
  }

  const horariosGerais = Array.isArray(horarios) ? horarios : [];
  const horariosIndividuais = Array.isArray(horariosProfissionais)
    ? horariosProfissionais
    : [];

  const listaProfissionais = Array.isArray(profissionais) ? profissionais : [];
  listaHorariosEl.innerHTML = "";

  const tituloGeral = document.createElement("div");
  tituloGeral.classList.add("horarios-secao-titulo");

  tituloGeral.innerHTML = `
    <h3>
      🏪 Horário da barbearia
    </h3>

    <p>
      Defina os dias e horários em que a barbearia funciona.
    </p>
  `;

  listaHorariosEl.appendChild(tituloGeral);

  const containerGeral = document.createElement("div");

  containerGeral.classList.add("horarios-gerais");

  DIAS_SEMANA.forEach((nomeDia, dia) => {
    const horario = horariosGerais.find(
      (item) => Number(item.dia_semana) === dia,
    );

    const aberto = Boolean(horario?.aberto);
    const horaAbertura = horario?.hora_abertura
      ? horario.hora_abertura.substring(0, 5)
      : "08:00";
    const horaFechamento = horario?.hora_fechamento
      ? horario.hora_fechamento.substring(0, 5)
      : "18:00";

    const intervaloInicio = horario?.intervalo_inicio
      ? horario.intervalo_inicio.substring(0, 5)
      : "";
    const intervaloFim = horario?.intervalo_fim
      ? horario.intervalo_fim.substring(0, 5)
      : "";
    const item = document.createElement("div");

    item.classList.add("horario-item");

    item.innerHTML = `
        <div class="horario-cabecalho">

          <span class="horario-dia">
            ${escaparHtml(nomeDia)}
          </span>

          <label class="horario-toggle">

            <input
              type="checkbox"
              id="horario-aberto-${dia}"
              ${aberto ? "checked" : ""}
              onchange="alternarHorario(${dia})"
            >

            <span>
              ${aberto ? "Aberto" : "Fechado"}
            </span>

          </label>

        </div>

        <div class="horario-campos">

          <div class="horario-campo">

            <label
              for="horario-abertura-${dia}"
            >
              Abertura
            </label>

            <input
              type="time"
              id="horario-abertura-${dia}"
              value="${escaparHtml(horaAbertura)}"
              ${!aberto ? "disabled" : ""}
            >

          </div>

          <div class="horario-campo">

            <label
              for="horario-fechamento-${dia}"
            >
              Fechamento
            </label>

            <input
              type="time"
              id="horario-fechamento-${dia}"
              value="${escaparHtml(horaFechamento)}"
              ${!aberto ? "disabled" : ""}
            >

          </div>

          <div class="horario-campo">

            <label
              for="horario-intervalo-inicio-${dia}"
            >
              Início intervalo
            </label>

            <input
              type="time"
              id="horario-intervalo-inicio-${dia}"
              value="${escaparHtml(intervaloInicio)}"
              ${!aberto ? "disabled" : ""}
            >

          </div>

          <div class="horario-campo">

            <label
              for="horario-intervalo-fim-${dia}"
            >
              Fim intervalo
            </label>

            <input
              type="time"
              id="horario-intervalo-fim-${dia}"
              value="${escaparHtml(intervaloFim)}"
              ${!aberto ? "disabled" : ""}
            >

          </div>

        </div>
      `;

    containerGeral.appendChild(item);
  });

  listaHorariosEl.appendChild(containerGeral);
  const tituloProfissionais = document.createElement("div");
  tituloProfissionais.classList.add("horarios-secao-titulo");
  tituloProfissionais.innerHTML = `
    <h3>
      💈 Horários dos profissionais
    </h3>

    <p>
      Configure o horário de trabalho de cada profissional.
    </p>
  `;

  listaHorariosEl.appendChild(tituloProfissionais);

  if (!listaProfissionais.length) {
    const vazio = document.createElement("p");

    vazio.classList.add("em-breve");

    vazio.textContent =
      "Cadastre pelo menos um profissional para configurar os horários individuais.";

    listaHorariosEl.appendChild(vazio);

    return;
  }

  listaProfissionais.forEach((profissional) => {
    const card = document.createElement("div");
    card.classList.add("horario-profissional");
    const cabecalho = document.createElement("div");
    cabecalho.classList.add("horario-profissional-cabecalho");

    cabecalho.innerHTML = `
        <h4>
          💈
          ${escaparHtml(profissional.nome || "Profissional")}
        </h4>

        <small>
          Horário individual
        </small>
      `;

    card.appendChild(cabecalho);
    const diasContainer = document.createElement("div");
    diasContainer.classList.add("horario-profissional-dias");

    DIAS_SEMANA.forEach((nomeDia, dia) => {
      const horario = horariosIndividuais.find(
        (item) =>
          String(item.profissional_id) === String(profissional.id) &&
          Number(item.dia_semana) === dia,
      );

      const aberto = Boolean(horario?.aberto);
      const horaInicio = horario?.hora_inicio
        ? horario.hora_inicio.substring(0, 5)
        : "08:00";
      const horaFim = horario?.hora_fim
        ? horario.hora_fim.substring(0, 5)
        : "18:00";
      const intervaloInicio = horario?.intervalo_inicio
        ? horario.intervalo_inicio.substring(0, 5)
        : "";
      const intervaloFim = horario?.intervalo_fim
        ? horario.intervalo_fim.substring(0, 5)
        : "";

      const prefixo = `prof-${profissional.id}-${dia}`;
      const item = document.createElement("div");

      item.classList.add("horario-item", "horario-item-profissional");
      item.innerHTML = `
            <div class="horario-cabecalho">

              <span class="horario-dia">
                ${escaparHtml(nomeDia)}
              </span>

              <label class="horario-toggle">

                <input
                  type="checkbox"
                  id="${escaparHtml(prefixo)}-aberto"
                  ${aberto ? "checked" : ""}
                  onchange="alternarHorarioProfissional(
                    '${escaparHtml(profissional.id)}',
                    ${dia}
                  )"
                >

                <span>
                  ${aberto ? "Aberto" : "Fechado"}
                </span>

              </label>

            </div>

            <div class="horario-campos">

              <div class="horario-campo">

                <label
                  for="${escaparHtml(prefixo)}-inicio"
                >
                  Entrada
                </label>

                <input
                  type="time"
                  id="${escaparHtml(prefixo)}-inicio"
                  value="${escaparHtml(horaInicio)}"
                  ${!aberto ? "disabled" : ""}
                >

              </div>

              <div class="horario-campo">

                <label
                  for="${escaparHtml(prefixo)}-fim"
                >
                  Saída
                </label>

                <input
                  type="time"
                  id="${escaparHtml(prefixo)}-fim"
                  value="${escaparHtml(horaFim)}"
                  ${!aberto ? "disabled" : ""}
                >

              </div>

              <div class="horario-campo">

                <label
                  for="${escaparHtml(prefixo)}-intervalo-inicio"
                >
                  Início intervalo
                </label>

                <input
                  type="time"
                  id="${escaparHtml(prefixo)}-intervalo-inicio"
                  value="${escaparHtml(intervaloInicio)}"
                  ${!aberto ? "disabled" : ""}
                >

              </div>

              <div class="horario-campo">

                <label
                  for="${escaparHtml(prefixo)}-intervalo-fim"
                >
                  Fim intervalo
                </label>

                <input
                  type="time"
                  id="${escaparHtml(prefixo)}-intervalo-fim"
                  value="${escaparHtml(intervaloFim)}"
                  ${!aberto ? "disabled" : ""}
                >

              </div>

            </div>
          `;

      diasContainer.appendChild(item);
    });

    card.appendChild(diasContainer);
    listaHorariosEl.appendChild(card);
  });
}

// ATIVAR / DESATIVAR DIA DA BARBEARIA

function alternarHorario(dia) {
  const checkbox = document.getElementById(`horario-aberto-${dia}`);

  if (!checkbox) {
    return;
  }

  const idsCampos = [
    `horario-abertura-${dia}`,
    `horario-fechamento-${dia}`,
    `horario-intervalo-inicio-${dia}`,
    `horario-intervalo-fim-${dia}`,
  ];

  idsCampos.forEach((id) => {
    const campo = document.getElementById(id);

    if (campo) {
      campo.disabled = !checkbox.checked;
    }
  });

  const texto = checkbox.closest(".horario-toggle")?.querySelector("span");

  if (texto) {
    texto.textContent = checkbox.checked ? "Aberto" : "Fechado";
  }
}

// ATIVAR / DESATIVAR HORÁRIO DO PROFISSIONAL

function alternarHorarioProfissional(profissionalId, dia) {
  const prefixo = `prof-${profissionalId}-${dia}`;

  const checkbox = document.getElementById(`${prefixo}-aberto`);

  if (!checkbox) {
    return;
  }

  const idsCampos = [
    `${prefixo}-inicio`,
    `${prefixo}-fim`,
    `${prefixo}-intervalo-inicio`,
    `${prefixo}-intervalo-fim`,
  ];

  idsCampos.forEach((id) => {
    const campo = document.getElementById(id);

    if (campo) {
      campo.disabled = !checkbox.checked;
    }
  });

  const texto = checkbox.closest(".horario-toggle")?.querySelector("span");

  if (texto) {
    texto.textContent = checkbox.checked ? "Aberto" : "Fechado";
  }
}

// VALIDAR HORÁRIO GERAL

function validarHorarioDia(dia) {
  const checkbox = document.getElementById(`horario-aberto-${dia}`);

  if (!checkbox) {
    return {
      valido: false,
      mensagem: "Dia de funcionamento inválido.",
    };
  }

  if (!checkbox.checked) {
    return {
      valido: true,
    };
  }

  const abertura =
    document.getElementById(`horario-abertura-${dia}`)?.value || "";
  const fechamento =
    document.getElementById(`horario-fechamento-${dia}`)?.value || "";
  const intervaloInicio =
    document.getElementById(`horario-intervalo-inicio-${dia}`)?.value || "";
  const intervaloFim =
    document.getElementById(`horario-intervalo-fim-${dia}`)?.value || "";

  if (!abertura || !fechamento) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: informe abertura e fechamento.`,
    };
  }

  if (abertura >= fechamento) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: a abertura precisa ser antes do fechamento.`,
    };
  }

  const apenasUmIntervalo = Boolean(intervaloInicio) !== Boolean(intervaloFim);

  if (apenasUmIntervalo) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: preencha o início e o fim do intervalo.`,
    };
  }

  if (intervaloInicio && intervaloFim) {
    if (intervaloInicio >= intervaloFim) {
      return {
        valido: false,
        mensagem: `${DIAS_SEMANA[dia]}: o início do intervalo precisa ser antes do fim.`,
      };
    }

    if (intervaloInicio <= abertura || intervaloFim >= fechamento) {
      return {
        valido: false,
        mensagem: `${DIAS_SEMANA[dia]}: o intervalo precisa ficar dentro do horário de funcionamento.`,
      };
    }
  }

  return {
    valido: true,
  };
}

// VALIDAR HORÁRIO DO PROFISSIONAL

function validarHorarioProfissional(profissionalId, dia) {
  const prefixo = `prof-${profissionalId}-${dia}`;

  const checkbox = document.getElementById(`${prefixo}-aberto`);

  if (!checkbox) {
    return {
      valido: false,
      mensagem: "Horário do profissional inválido.",
    };
  }

  if (!checkbox.checked) {
    return {
      valido: true,
    };
  }

  const inicio = document.getElementById(`${prefixo}-inicio`)?.value || "";
  const fim = document.getElementById(`${prefixo}-fim`)?.value || "";
  const intervaloInicio =
    document.getElementById(`${prefixo}-intervalo-inicio`)?.value || "";
  const intervaloFim =
    document.getElementById(`${prefixo}-intervalo-fim`)?.value || "";
  if (!inicio || !fim) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: informe entrada e saída.`,
    };
  }

  if (inicio >= fim) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: a entrada precisa ser antes da saída.`,
    };
  }

  const apenasUmIntervalo = Boolean(intervaloInicio) !== Boolean(intervaloFim);

  if (apenasUmIntervalo) {
    return {
      valido: false,
      mensagem: `${DIAS_SEMANA[dia]}: preencha o início e o fim do intervalo.`,
    };
  }

  if (intervaloInicio && intervaloFim) {
    if (intervaloInicio >= intervaloFim) {
      return {
        valido: false,

        mensagem: `${DIAS_SEMANA[dia]}: o início do intervalo precisa ser antes do fim.`,
      };
    }

    if (intervaloInicio <= inicio || intervaloFim >= fim) {
      return {
        valido: false,
        mensagem: `${DIAS_SEMANA[dia]}: o intervalo precisa ficar dentro do horário do profissional.`,
      };
    }
  }

  return {
    valido: true,
  };
}

// LER HORÁRIO GERAL DA TELA

function obterHorarioDiaFormulario(dia) {
  const checkbox = document.getElementById(`horario-aberto-${dia}`);
  const aberto = Boolean(checkbox?.checked);

  return {
    aberto,

    hora_abertura: aberto
      ? document.getElementById(`horario-abertura-${dia}`)?.value || null
      : null,

    hora_fechamento: aberto
      ? document.getElementById(`horario-fechamento-${dia}`)?.value || null
      : null,

    intervalo_inicio: aberto
      ? document.getElementById(`horario-intervalo-inicio-${dia}`)?.value ||
        null
      : null,

    intervalo_fim: aberto
      ? document.getElementById(`horario-intervalo-fim-${dia}`)?.value || null
      : null,
  };
}

// LER HORÁRIO DO PROFISSIONAL DA TELA

function obterHorarioProfissionalFormulario(profissionalId, dia) {
  const prefixo = `prof-${profissionalId}-${dia}`;
  const checkbox = document.getElementById(`${prefixo}-aberto`);
  const aberto = Boolean(checkbox?.checked);

  return {
    aberto,
    hora_inicio: aberto
      ? document.getElementById(`${prefixo}-inicio`)?.value || null
      : null,

    hora_fim: aberto
      ? document.getElementById(`${prefixo}-fim`)?.value || null
      : null,

    intervalo_inicio: aberto
      ? document.getElementById(`${prefixo}-intervalo-inicio`)?.value || null
      : null,

    intervalo_fim: aberto
      ? document.getElementById(`${prefixo}-intervalo-fim`)?.value || null
      : null,
  };
}

// SALVAR HORÁRIOS

if (formHorarios) {
  formHorarios.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!lojaId) {
      mostrarMensagem(
        "mensagem-horarios",
        "Barbearia não identificada.",
        "erro",
      );

      return;
    }

    for (let dia = 0; dia <= 6; dia++) {
      const validacao = validarHorarioDia(dia);

      if (!validacao.valido) {
        mostrarMensagem("mensagem-horarios", validacao.mensagem, "erro");

        return;
      }
    }

    const profissionaisAtuais = Array.isArray(profissionaisCache)
      ? profissionaisCache
      : [];

    for (const profissional of profissionaisAtuais) {
      for (let dia = 0; dia <= 6; dia++) {
        const validacao = validarHorarioProfissional(profissional.id, dia);

        if (!validacao.valido) {
          mostrarMensagem(
            "mensagem-horarios",
            `${profissional.nome}: ${validacao.mensagem}`,
            "erro",
          );

          return;
        }
      }
    }

    if (btnSalvarHorarios) {
      btnSalvarHorarios.disabled = true;

      btnSalvarHorarios.textContent = "Salvando...";
    }

    try {
      for (let dia = 0; dia <= 6; dia++) {
        const dadosHorario = obterHorarioDiaFormulario(dia);
        const horarioExistente = horariosCache.find(
          (item) => Number(item.dia_semana) === dia,
        );

        if (horarioExistente) {
          const { error } = await supabaseClient
            .from("horarios_funcionamento")
            .update(dadosHorario)
            .eq("id", horarioExistente.id)
            .eq("barbearia_id", lojaId);

          if (error) {
            throw error;
          }
        } else {
          const { error } = await supabaseClient
            .from("horarios_funcionamento")
            .insert({
              barbearia_id: lojaId,

              dia_semana: dia,

              ...dadosHorario,
            });

          if (error) {
            throw error;
          }
        }
      }

      for (const profissional of profissionaisAtuais) {
        for (let dia = 0; dia <= 6; dia++) {
          const dadosHorario = obterHorarioProfissionalFormulario(
            profissional.id,
            dia,
          );

          const horarioExistente = horariosProfissionaisCache.find(
            (item) =>
              String(item.profissional_id) === String(profissional.id) &&
              Number(item.dia_semana) === dia,
          );

          if (horarioExistente) {
            const { error } = await supabaseClient
              .from("horarios_profissionais")
              .update(dadosHorario)
              .eq("id", horarioExistente.id)
              .eq("profissional_id", profissional.id);

            if (error) {
              throw error;
            }
          } else {
            const { error } = await supabaseClient
              .from("horarios_profissionais")
              .insert({
                profissional_id: profissional.id,
                dia_semana: dia,
                ...dadosHorario,
              });

            if (error) {
              throw error;
            }
          }
        }
      }

      await carregarHorarios();

      mostrarMensagem(
        "mensagem-horarios",
        "Horários salvos com sucesso!",
        "sucesso",
      );
    } catch (erro) {
      console.error("Erro ao salvar horários:", erro);

      mostrarMensagem(
        "mensagem-horarios",
        "Não foi possível salvar todos os horários.",
        "erro",
      );

      await carregarHorarios();
    } finally {
      if (btnSalvarHorarios) {
        btnSalvarHorarios.disabled = false;
        btnSalvarHorarios.textContent = "💾 Salvar horários";
      }
    }
  });
}

// 12. AVALIAÇÕES E COMENTÁRIOS

const avaliacaoMediaEl = document.getElementById("avaliacao-media");
const avaliacaoMediaPaginaEl = document.getElementById(
  "avaliacao-media-pagina",
);
const totalAvaliacoesEl = document.getElementById("total-avaliacoes");
const listaComentariosEl = document.getElementById("lista-comentarios");
const listaComentariosDashboardEl = document.getElementById(
  "lista-comentarios-dashboard",
);

// CARREGAR AVALIAÇÕES

async function carregarAvaliacoes() {
  if (!lojaId) {
    return false;
  }

  try {
    const { data, error } = await supabaseClient
      .from("avaliacoes")
      .select(
        `
          id,
          barbearia_id,
          cliente_id,
          agendamento_id,
          nota,
          comentario,
          created_at,

          profiles:cliente_id (
            id,
            nome,
            telefone
          )
        `,
      )
      .eq("barbearia_id", lojaId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    avaliacoesCache = data || [];
    renderizarAvaliacoes(avaliacoesCache);
    renderizarComentariosDashboard(avaliacoesCache);

    return true;
  } catch (erro) {
    console.error("Erro ao carregar avaliações:", erro);

    avaliacoesCache = [];

    renderizarAvaliacoes([]);
    renderizarComentariosDashboard([]);

    return false;
  }
}

// CALCULAR MÉDIA

function calcularMediaAvaliacoes(avaliacoes) {
  const lista = Array.isArray(avaliacoes) ? avaliacoes : [];

  if (!lista.length) {
    return 0;
  }

  const notasValidas = lista
    .map((avaliacao) => Number(avaliacao.nota))
    .filter((nota) => Number.isFinite(nota) && nota >= 1 && nota <= 5);

  if (!notasValidas.length) {
    return 0;
  }

  const soma = notasValidas.reduce((total, nota) => total + nota, 0);
  return soma / notasValidas.length;
}

// GERAR ESTRELAS

function gerarEstrelas(nota) {
  const notaNumerica = Number(nota);

  const notaSegura = Number.isFinite(notaNumerica)
    ? Math.min(5, Math.max(0, Math.round(notaNumerica)))
    : 0;

  let estrelas = "";

  for (let indice = 1; indice <= 5; indice++) {
    estrelas += indice <= notaSegura ? "★" : "☆";
  }

  return estrelas;
}

// FORMATAR DATA DA AVALIAÇÃO

function formatarDataAvaliacao(data) {
  if (!data) {
    return "";
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return "";
  }

  return dataObj.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ATUALIZAR RESUMO

function atualizarResumoAvaliacoes() {
  const lista = Array.isArray(avaliacoesCache) ? avaliacoesCache : [];
  const media = calcularMediaAvaliacoes(lista);
  const mediaFormatada = media.toFixed(1);

  if (avaliacaoMediaEl) {
    avaliacaoMediaEl.textContent = mediaFormatada;
  }

  if (avaliacaoMediaPaginaEl) {
    avaliacaoMediaPaginaEl.textContent = mediaFormatada;
  }

  if (totalAvaliacoesEl) {
    totalAvaliacoesEl.textContent = String(lista.length);
  }
}

// RENDERIZAR AVALIAÇÕES

function renderizarAvaliacoes(avaliacoes) {
  const lista = Array.isArray(avaliacoes) ? avaliacoes : [];
  avaliacoesCache = lista;

  atualizarResumoAvaliacoes();

  if (!listaComentariosEl) {
    return;
  }

  listaComentariosEl.innerHTML = "";

  if (!lista.length) {
    listaComentariosEl.innerHTML = `
      <div class="item-vazio">
        <p>
          ⭐ Ainda não existem avaliações.
        </p>
      </div>
    `;

    return;
  }

  listaComentariosEl.innerHTML = lista
    .map((avaliacao) => {
      const clienteNome = avaliacao.profiles?.nome || "Cliente";
      const nota = Number(avaliacao.nota) || 0;
      const comentario =
        avaliacao.comentario?.trim() || "Cliente não deixou comentário.";
      const dataFormatada = formatarDataAvaliacao(avaliacao.created_at);

      return `
            <div
              class="item-lista avaliacao-item"
            >

              <div
                class="avaliacao-cabecalho"
              >

                <div>

                  <strong>
                    ${escaparHtml(clienteNome)}
                  </strong>

                  <div
                    class="avaliacao-estrelas"
                    aria-label="${escaparHtml(`${nota} de 5 estrelas`)}"
                  >
                    ${gerarEstrelas(nota)}
                  </div>

                </div>

                ${
                  dataFormatada
                    ? `
                      <span
                        class="avaliacao-data"
                      >
                        ${escaparHtml(dataFormatada)}
                      </span>
                    `
                    : ""
                }

              </div>

              <p
                class="avaliacao-comentario"
              >
                ${escaparHtml(comentario)}
              </p>

            </div>
          `;
    })
    .join("");
}

// COMENTÁRIOS RECENTES DO DASHBOARD

function renderizarComentariosDashboard(avaliacoes) {
  if (!listaComentariosDashboardEl) {
    return;
  }

  const lista = Array.isArray(avaliacoes) ? avaliacoes : [];
  const comentarios = lista
    .filter((avaliacao) => Boolean(avaliacao.comentario?.trim()))
    .slice(0, 3);

  listaComentariosDashboardEl.innerHTML = "";

  if (!comentarios.length) {
    listaComentariosDashboardEl.innerHTML = `
      <p class="em-breve">
        Nenhum comentário recente.
      </p>
    `;

    return;
  }

  comentarios.forEach((avaliacao) => {
    const clienteNome = avaliacao.profiles?.nome || "Cliente";
    const comentario = avaliacao.comentario?.trim() || "";
    const nota = Number(avaliacao.nota) || 0;
    const dataFormatada = formatarDataAvaliacao(avaliacao.created_at);
    const item = document.createElement("div");

    item.classList.add("item-lista", "avaliacao-item");

    item.innerHTML = `
        <div class="item-info">

          <h3>
            ${escaparHtml(clienteNome)}
          </h3>

          <div
            class="avaliacao-estrelas"
          >
            ${gerarEstrelas(nota)}
          </div>

          <p>
            ${escaparHtml(comentario)}
          </p>

          ${
            dataFormatada
              ? `
                <small>
                  ${escaparHtml(dataFormatada)}
                </small>
              `
              : ""
          }

        </div>
      `;

    listaComentariosDashboardEl.appendChild(item);
  });
}

const btnComentariosEl = document.getElementById("btn-comentarios");

const btnComentariosMobileEl = document.getElementById(
  "btn-comentarios-mobile",
);

const badgeComentariosEl = document.getElementById("badge-comentarios");

const badgeComentariosMobileEl = document.getElementById(
  "badge-comentarios-mobile",
);

function atualizarBadgeComentarios() {
  const quantidade = avaliacoesCache.filter((avaliacao) =>
    Boolean(avaliacao.comentario?.trim()),
  ).length;

  const texto = quantidade > 99 ? "99+" : String(quantidade);

  if (badgeComentariosEl) {
    badgeComentariosEl.textContent = texto;

    badgeComentariosEl.hidden = quantidade === 0;
  }

  if (badgeComentariosMobileEl) {
    badgeComentariosMobileEl.textContent = texto;

    badgeComentariosMobileEl.hidden = quantidade === 0;
  }
}

function abrirComentarios() {
  mudarAba("visao-geral");

  requestAnimationFrame(() => {
    const lista = document.getElementById("lista-comentarios-dashboard");

    lista?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

btnComentariosEl?.addEventListener("click", abrirComentarios);
btnComentariosMobileEl?.addEventListener("click", abrirComentarios);

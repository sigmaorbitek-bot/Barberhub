// 16. RELATÓRIOS

const campoDataInicial = document.getElementById("relatorio-data-inicial");
const campoDataFinal = document.getElementById("relatorio-data-final");
const btnGerarRelatorio = document.getElementById("btn-gerar-relatorio");
const btnEnviarWhatsapp = document.getElementById("btn-enviar-whatsapp");

// SELEÇÃO DO TIPO

document.querySelectorAll(".btn-relatorio[data-relatorio]").forEach((botao) => {
  botao.addEventListener("click", () => {
    document
      .querySelectorAll(".btn-relatorio[data-relatorio]")
      .forEach((item) => {
        item.classList.remove("btn-relatorio--ativo");
      });

    botao.classList.add("btn-relatorio--ativo");
    tipoRelatorioSelecionado = botao.dataset.relatorio || "geral";
  });
});

// DATAS PADRÃO

function prepararDatasRelatorio() {
  if (!campoDataInicial || !campoDataFinal) {
    return;
  }

  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  if (!campoDataInicial.value) {
    campoDataInicial.value = obterDataLocalISO(primeiroDia);
  }

  if (!campoDataFinal.value) {
    campoDataFinal.value = obterDataLocalISO(hoje);
  }
}

prepararDatasRelatorio();

// VALIDAR PERÍODO

function obterPeriodoRelatorio() {
  const dataInicial = campoDataInicial?.value?.trim() || "";
  const dataFinal = campoDataFinal?.value?.trim() || "";

  if (!dataInicial || !dataFinal) {
    return {
      valido: false,
      mensagem: "Informe a data inicial e a data final.",
    };
  }

  if (dataInicial > dataFinal) {
    return {
      valido: false,
      mensagem: "A data inicial não pode ser maior que a data final.",
    };
  }

  const inicio = new Date(`${dataInicial}T00:00:00`);
  const fimExclusivo = new Date(`${dataFinal}T00:00:00`);
  fimExclusivo.setDate(fimExclusivo.getDate() + 1);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fimExclusivo.getTime())) {
    return {
      valido: false,
      mensagem: "Período inválido.",
    };
  }

  return {
    valido: true,
    dataInicial,
    dataFinal,
    inicio,
    fimExclusivo,
  };
}

// BUSCAR DADOS

async function buscarDadosRelatorio(periodo) {
  if (!lojaId) {
    throw new Error("Barbearia não identificada.");
  }

  const [respostaAgendamentos, respostaGastos] = await Promise.all([
    supabaseClient
      .from("agendamentos")
      .select(
        `
        id,
        cliente_id,
        servico_id,
        profissional_id,
        data_hora,
        status,
        cliente_nome,
        cliente_telefone,

        clientes:cliente_id (
          id,
          nome,
          telefone
        ),

        servicos:servico_id (
          id,
          nome,
          preco
        ),

        profissionais:profissional_id (
          id,
          nome
        )
      `,
      )
      .eq("barbearia_id", lojaId)
      .gte("data_hora", periodo.inicio.toISOString())
      .lt("data_hora", periodo.fimExclusivo.toISOString())
      .order("data_hora", {
        ascending: true,
      }),

    supabaseClient
      .from("gastos")
      .select(
        `
        id,
        descricao,
        valor,
        categoria,
        data_gasto,
        pagamento
      `,
      )
      .eq("barbearia_id", lojaId)
      .gte("data_gasto", periodo.dataInicial)
      .lte("data_gasto", periodo.dataFinal)
      .order("data_gasto", {
        ascending: true,
      }),
  ]);

  if (respostaAgendamentos.error) {
    throw respostaAgendamentos.error;
  }

  if (respostaGastos.error) {
    throw respostaGastos.error;
  }

  return {
    agendamentos: respostaAgendamentos.data || [],

    gastos: respostaGastos.data || [],
  };
}

// CALCULAR RESUMO

function calcularResumoRelatorio({ agendamentos, gastos }) {
  const concluidos = agendamentos.filter((item) => item.status === "concluido");
  const cancelados = agendamentos.filter((item) => item.status === "cancelado");
  const faturamento = concluidos.reduce((total, item) => {
    const preco = Number(item.servicos?.preco);

    return total + (Number.isFinite(preco) ? preco : 0);
  }, 0);

  const despesas = gastos.reduce((total, gasto) => {
    const valor = Number(gasto.valor);

    return total + (Number.isFinite(valor) ? valor : 0);
  }, 0);

  return {
    total: agendamentos.length,
    concluidos: concluidos.length,
    cancelados: cancelados.length,
    faturamento,
    despesas,
    lucro: faturamento - despesas,
  };
}

// AGRUPAR DADOS

function agruparRelatorio(agendamentos, tipo) {
  const mapa = new Map();

  agendamentos.forEach((item) => {
    let id = "";
    let nome = "";

    if (tipo === "servicos") {
      id = item.servico_id || "sem-servico";
      nome = item.servicos?.nome || "Serviço";
    }

    if (tipo === "clientes") {
      id = item.cliente_id || item.cliente_nome || "sem-cliente";
      nome = item.clientes?.nome || item.cliente_nome || "Cliente";
    }

    if (tipo === "profissionais") {
      id = item.profissional_id || "sem-profissional";
      nome = item.profissionais?.nome || "Não informado";
    }

    if (!nome) {
      return;
    }

    const atual = mapa.get(id) || {
      nome,
      total: 0,
      concluidos: 0,
      faturamento: 0,
    };

    atual.total += 1;

    if (item.status === "concluido") {
      atual.concluidos += 1;
      atual.faturamento += Number(item.servicos?.preco) || 0;
    }

    mapa.set(id, atual);
  });

  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
}

// NOME DO RELATÓRIO

function obterTituloRelatorio(tipo) {
  const titulos = {
    geral: "Relatório geral",
    financeiro: "Relatório financeiro",
    servicos: "Relatório de serviços",
    clientes: "Relatório de clientes",
    profissionais: "Relatório de profissionais",
    agendamentos: "Relatório de agendamentos",
  };

  return titulos[tipo] || titulos.geral;
}

// LINHAS DE AGENDAMENTOS

function gerarLinhasAgendamentos(agendamentos) {
  if (!agendamentos.length) {
    return `
      <tr>
        <td colspan="5">
          Nenhum agendamento encontrado.
        </td>
      </tr>
    `;
  }

  return agendamentos
    .map((item) => {
      const cliente = item.clientes?.nome || item.cliente_nome || "Cliente";
      const servico = item.servicos?.nome || "Serviço";
      const profissional = item.profissionais?.nome || "Não informado";
      const status = STATUS_LABEL[item.status] || item.status || "Pendente";

      return `
        <tr>

          <td>
            ${escaparHtml(cliente)}
          </td>

          <td>
            ${escaparHtml(servico)}
          </td>

          <td>
            ${escaparHtml(profissional)}
          </td>

          <td>
            ${escaparHtml(formatarDataHora(item.data_hora))}
          </td>

          <td>
            ${escaparHtml(status)}
          </td>

        </tr>
      `;
    })
    .join("");
}

// CONTEÚDO ESPECÍFICO

function gerarConteudoRelatorio(tipo, dados, resumo) {
  if (tipo === "financeiro") {
    const linhasGastos = dados.gastos.length
      ? dados.gastos
          .map(
            (gasto) => `
                <tr>
                  <td>
                    ${escaparHtml(gasto.descricao || "Gasto")}
                  </td>

                  <td>
                    ${escaparHtml(gasto.categoria || "Sem categoria")}
                  </td>

                  <td>
                    ${escaparHtml(formatarData(gasto.data_gasto))}
                  </td>

                  <td>
                    -
                    ${formatarMoeda(gasto.valor)}
                  </td>
                </tr>
              `,
          )
          .join("")
      : `
            <tr>
              <td colspan="4">
                Nenhum gasto encontrado.
              </td>
            </tr>
          `;

    return `
      <div class="resumo">

        <div class="card">
          Entradas
          <strong>
            ${formatarMoeda(resumo.faturamento)}
          </strong>
        </div>

        <div class="card">
          Saídas
          <strong>
            ${formatarMoeda(resumo.despesas)}
          </strong>
        </div>

        <div class="card">
          Lucro
          <strong>
            ${formatarMoeda(resumo.lucro)}
          </strong>
        </div>

      </div>

      <h2>
        Gastos do período
      </h2>

      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Data</th>
            <th>Valor</th>
          </tr>
        </thead>

        <tbody>
          ${linhasGastos}
        </tbody>
      </table>
    `;
  }

  if (tipo === "servicos" || tipo === "clientes" || tipo === "profissionais") {
    const agrupados = agruparRelatorio(dados.agendamentos, tipo);

    const linhas = agrupados.length
      ? agrupados
          .map(
            (item) => `
                <tr>
                  <td>
                    ${escaparHtml(item.nome)}
                  </td>

                  <td>
                    ${item.total}
                  </td>

                  <td>
                    ${item.concluidos}
                  </td>

                  <td>
                    ${formatarMoeda(item.faturamento)}
                  </td>
                </tr>
              `,
          )
          .join("")
      : `
            <tr>
              <td colspan="4">
                Nenhum dado encontrado.
              </td>
            </tr>
          `;

    const primeiraColuna =
      tipo === "servicos"
        ? "Serviço"
        : tipo === "clientes"
          ? "Cliente"
          : "Profissional";

    return `
      <div class="resumo">

        <div class="card">
          Agendamentos
          <strong>
            ${resumo.total}
          </strong>
        </div>

        <div class="card">
          Concluídos
          <strong>
            ${resumo.concluidos}
          </strong>
        </div>

        <div class="card">
          Faturamento
          <strong>
            ${formatarMoeda(resumo.faturamento)}
          </strong>
        </div>

      </div>

      <table>
        <thead>
          <tr>
            <th>
              ${primeiraColuna}
            </th>

            <th>
              Agendamentos
            </th>

            <th>
              Concluídos
            </th>

            <th>
              Faturamento
            </th>
          </tr>
        </thead>

        <tbody>
          ${linhas}
        </tbody>
      </table>
    `;
  }

  return `
    <div class="resumo">

      <div class="card">
        Agendamentos
        <strong>
          ${resumo.total}
        </strong>
      </div>

      <div class="card">
        Concluídos
        <strong>
          ${resumo.concluidos}
        </strong>
      </div>

      <div class="card">
        Faturamento
        <strong>
          ${formatarMoeda(resumo.faturamento)}
        </strong>
      </div>

    </div>

    <table>

      <thead>
        <tr>
          <th>Cliente</th>
          <th>Serviço</th>
          <th>Profissional</th>
          <th>Data</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        ${gerarLinhasAgendamentos(dados.agendamentos)}
      </tbody>

    </table>
  `;
}

// GERAR RELATÓRIO

async function gerarRelatorio() {
  const periodo = obterPeriodoRelatorio();

  if (!periodo.valido) {
    alert(periodo.mensagem);

    return;
  }

  if (!lojaId || !lojaAtual) {
    alert("Não foi possível identificar a barbearia.");

    return;
  }

  if (btnGerarRelatorio) {
    btnGerarRelatorio.disabled = true;

    btnGerarRelatorio.textContent = "Gerando...";
  }

  try {
    const dados = await buscarDadosRelatorio(periodo);
    const resumo = calcularResumoRelatorio(dados);
    const tipo = tipoRelatorioSelecionado || "geral";
    const titulo = obterTituloRelatorio(tipo);
    const nomeLoja = escaparHtml(lojaAtual.nome || "BarberHub");
    const conteudo = gerarConteudoRelatorio(tipo, dados, resumo);
    const janela = window.open("", "_blank");

    if (!janela) {
      alert("Permita pop-ups no navegador para gerar o relatório.");

      return;
    }

    janela.document.write(`
      <!DOCTYPE html>

      <html lang="pt-BR">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          ${escaparHtml(titulo)}
          -
          ${nomeLoja}
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            font-family:
              Arial,
              sans-serif;

            max-width: 1200px;
            margin: 0 auto;
            padding: 40px;
            color: #222;
            background: #fff;
          }

          h1 {
            margin-bottom: 5px;
          }

          h2 {
            margin-top: 32px;
          }

          .periodo {
            color: #666;
          }

          .resumo {
            display: grid;
            grid-template-columns:
              repeat(
                3,
                minmax(0, 1fr)
              );
            gap: 15px;
            margin: 30px 0;
          }

          .card {
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 10px;
          }

          .card strong {
            display: block;
            font-size: 26px;
            margin-top: 8px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }

          th,
          td {
            padding: 12px;
            border-bottom:
              1px solid #ddd;
            text-align: left;
          }

          th {
            background: #f5f5f5;
          }

          .botao {
            padding: 10px 18px;
            margin-top: 24px;
            cursor: pointer;
          }

          @media print {

            .botao {
              display: none;
            }

            body {
              max-width: none;
              padding: 0;
            }

          }

        </style>

      </head>

      <body>

        <h1>
          ${nomeLoja}
        </h1>

        <h2>
          ${escaparHtml(titulo)}
        </h2>

        <p class="periodo">
          Período:
          ${escaparHtml(formatarData(periodo.dataInicial))}
          até
          ${escaparHtml(formatarData(periodo.dataFinal))}
        </p>

        ${conteudo}

        <button
          type="button"
          class="botao"
          onclick="window.print()"
        >
          Imprimir / Salvar PDF
        </button>

      </body>

      </html>
    `);

    janela.document.close();
  } catch (erro) {
    console.error("Erro ao gerar relatório:", erro);

    alert("Não foi possível gerar o relatório.");
  } finally {
    if (btnGerarRelatorio) {
      btnGerarRelatorio.disabled = false;

      btnGerarRelatorio.textContent = "📄 Gerar relatório";
    }
  }
}

if (btnGerarRelatorio) {
  btnGerarRelatorio.addEventListener("click", gerarRelatorio);
}

// GERAR TEXTO PARA WHATSAPP

function gerarTextoRelatorioWhatsapp(tipo, dados, resumo, periodo) {
  const nomeBarbearia = lojaAtual?.nome || "BarberHub";
  const titulo = obterTituloRelatorio(tipo).toUpperCase();

  let detalhes = "";

  if (tipo === "financeiro") {
    detalhes = [
      `📈 Entradas: ${formatarMoeda(resumo.faturamento)}`,
      `📉 Saídas: ${formatarMoeda(resumo.despesas)}`,
      `💰 Lucro: ${formatarMoeda(resumo.lucro)}`,
    ].join("\n");
  } else if (
    tipo === "servicos" ||
    tipo === "clientes" ||
    tipo === "profissionais"
  ) {
    const agrupados = agruparRelatorio(dados.agendamentos, tipo);

    detalhes = agrupados.length
      ? agrupados
          .map(
            (item, indice) =>
              `${indice + 1}. ${item.nome}\n` +
              `Agendamentos: ${item.total}\n` +
              `Concluídos: ${item.concluidos}\n` +
              `Faturamento: ${formatarMoeda(item.faturamento)}`,
          )
          .join("\n\n")
      : "Nenhum dado encontrado.";
  } else {
    detalhes = dados.agendamentos.length
      ? dados.agendamentos
          .map((item, indice) => {
            const cliente =
              item.clientes?.nome || item.cliente_nome || "Cliente";

            const profissional = item.profissionais?.nome || "Não informado";

            const servico = item.servicos?.nome || "Serviço";

            const status =
              STATUS_LABEL[item.status] || item.status || "Pendente";

            return (
              `${indice + 1}. ${cliente}\n` +
              `💈 Profissional: ${profissional}\n` +
              `✂️ Serviço: ${servico}\n` +
              `📅 ${formatarDataHora(item.data_hora)}\n` +
              `📌 ${status}`
            );
          })
          .join("\n\n")
      : "Nenhum agendamento encontrado.";
  }

  return `
💈 ${nomeBarbearia}

📊 ${titulo}

📅 Período:
${formatarData(periodo.dataInicial)} até ${formatarData(periodo.dataFinal)}

━━━━━━━━━━━━━━━━━━

📌 RESUMO

📅 Agendamentos: ${resumo.total}
✅ Concluídos: ${resumo.concluidos}
❌ Cancelados: ${resumo.cancelados}
💰 Faturamento: ${formatarMoeda(resumo.faturamento)}

━━━━━━━━━━━━━━━━━━

${detalhes}

━━━━━━━━━━━━━━━━━━

Relatório gerado pelo BarberHub.
`.trim();
}

// ENVIAR PELO WHATSAPP

async function enviarRelatorioWhatsapp() {
  const periodo = obterPeriodoRelatorio();

  if (!periodo.valido) {
    alert(periodo.mensagem);

    return;
  }

  if (!lojaAtual || !lojaId) {
    alert("Não foi possível identificar a barbearia.");

    return;
  }

  let telefone = lojaAtual.telefone || "";

  telefone = telefone.replace(/\D/g, "");

  if (!telefone) {
    alert("Cadastre o número de WhatsApp da barbearia em Configurações.");

    return;
  }

  if (!telefone.startsWith("55")) {
    telefone = `55${telefone}`;
  }

  if (btnEnviarWhatsapp) {
    btnEnviarWhatsapp.disabled = true;

    btnEnviarWhatsapp.textContent = "Preparando...";
  }

  try {
    const dados = await buscarDadosRelatorio(periodo);
    const resumo = calcularResumoRelatorio(dados);
    const mensagem = gerarTextoRelatorioWhatsapp(
      tipoRelatorioSelecionado || "geral",
      dados,
      resumo,
      periodo,
    );

    const url =
      `https://wa.me/${telefone}` + `?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  } catch (erro) {
    console.error("Erro ao preparar relatório para WhatsApp:", erro);

    alert("Não foi possível preparar o relatório.");
  } finally {
    if (btnEnviarWhatsapp) {
      btnEnviarWhatsapp.disabled = false;

      btnEnviarWhatsapp.textContent = "📱 Enviar pelo WhatsApp";
    }
  }
}

if (btnEnviarWhatsapp) {
  btnEnviarWhatsapp.addEventListener("click", enviarRelatorioWhatsapp);
}

// 17. INICIALIZAÇÃO DO PAINEL

let painelInicializando = false;
let painelInicializado = false;

function prepararInterfaceInicial() {
  if (menuMobile) {
    menuMobile.classList.remove("mobile-menu--aberto");
  }

  if (btnMenuMobile) {
    btnMenuMobile.setAttribute("aria-expanded", "false");
  }

  if (btnMenuBottom) {
    btnMenuBottom.setAttribute("aria-expanded", "false");
  }

  prepararFormularioAgendamentoManual();
  prepararFormularioGasto();
  prepararDatasRelatorio();
}

async function carregarDadosPrincipaisPainel() {
  const resultados = await Promise.allSettled([
    carregarServicos(),
    carregarProdutos(),
    carregarProfissionais(),
    carregarClientes(),
  ]);

  resultados.forEach((resultado, indice) => {
    if (resultado.status === "rejected") {
      const nomes = ["serviços", "produtos", "profissionais", "clientes"];

      console.error(`Erro ao carregar ${nomes[indice]}:`, resultado.reason);
    }
  });
}

async function carregarDadosSecundariosPainel() {
  const tarefas = [
    carregarAgendamentos(),
    carregarHorarios(),
    carregarAvaliacoes(),
    carregarNotificacoes(),
    carregarFinanceiro(),
    carregarDashboard(),
    carregarConfiguracoes(),
  ];

  if (typeof carregarPedidos === "function") {
    tarefas.push(carregarPedidos());
  }

  const resultados = await Promise.allSettled(tarefas);

  resultados.forEach((resultado) => {
    if (resultado.status === "rejected") {
      console.error("Erro durante o carregamento do painel:", resultado.reason);
    }
  });
}

async function iniciarPainel() {
  if (painelInicializando || painelInicializado) {
    return;
  }

  painelInicializando = true;

  try {
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      mostrarErroCarregamento("Supabase não foi configurado corretamente.");

      return;
    }

    if (!lojaId) {
      mostrarErroCarregamento("Nenhuma barbearia foi identificada.");

      return;
    }

    const lojaCarregada = await carregarLoja();

    if (!lojaCarregada) {
      return;
    }

    prepararInterfaceInicial();

    await carregarDadosPrincipaisPainel();

    preencherClientesAgendamento();
    preencherServicosAgendamento();

    await carregarDadosSecundariosPainel();

    mudarAba("visao-geral");

    painelInicializado = true;

    esconderTelaCarregamento();

    console.log("BarberHub: painel carregado com sucesso.");
  } catch (erro) {
    console.error("Erro inesperado ao iniciar painel:", erro);

    mostrarErroCarregamento("Ocorreu um erro inesperado ao carregar o painel.");
  } finally {
    painelInicializando = false;
  }
}

function ajustarPainelAoRedimensionar() {
  const larguraDesktop = window.matchMedia("(min-width: 769px)");

  if (larguraDesktop.matches && menuMobile) {
    menuMobile.classList.remove("mobile-menu--aberto");
    btnMenuMobile?.setAttribute("aria-expanded", "false");
    btnMenuBottom?.setAttribute("aria-expanded", "false");
  }
}

window.addEventListener("resize", ajustarPainelAoRedimensionar);
window.addEventListener("orientationchange", ajustarPainelAoRedimensionar);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !painelInicializado) {
    return;
  }

  if (typeof carregarNotificacoes === "function") {
    carregarNotificacoes();
  }
});

iniciarPainel();

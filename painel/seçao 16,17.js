// ==================================================
// 16. RELATÓRIOS
// ==================================================

const campoDataInicial = document.getElementById("relatorio-data-inicial");

const campoDataFinal = document.getElementById("relatorio-data-final");

const btnGerarRelatorio = document.getElementById("btn-gerar-relatorio");

const btnEnviarWhatsapp = document.getElementById("btn-enviar-whatsapp");

// ==================================================
// 16.1 — SELEÇÃO DO TIPO DE RELATÓRIO
// ==================================================

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

// ==================================================
// 16.2 — DATAS PADRÃO
// ==================================================

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

// ==================================================
// 16.3 — VALIDAR PERÍODO
// ==================================================

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

// ==================================================
// 16.4 — BUSCAR DADOS DO RELATÓRIO
// ==================================================

async function buscarDadosRelatorio(periodo) {
  if (!lojaId) {
    throw new Error("Barbearia não identificada.");
  }

  const [respostaAgendamentos, respostaGastos, respostaPedidos] =
    await Promise.all([
      // ------------------------------------------
      // AGENDAMENTOS
      // ------------------------------------------

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

      // ------------------------------------------
      // GASTOS
      // ------------------------------------------

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

      // ------------------------------------------
      // PEDIDOS CONFIRMADOS
      // ------------------------------------------

      supabaseClient
        .from("pedidos")
        .select(
          `
        id,
        cliente_id,
        produto_id,
        quantidade,
        preco_unitario,
        status,
        created_at,
        atualizado_at,

        produtos:produto_id (
          id,
          nome
        )
      `,
        )
        .eq("barbearia_id", lojaId)
        .eq("status", "confirmado")
        .gte("atualizado_at", periodo.inicio.toISOString())
        .lt("atualizado_at", periodo.fimExclusivo.toISOString())
        .order("atualizado_at", {
          ascending: true,
        }),
    ]);

  if (respostaAgendamentos.error) {
    throw respostaAgendamentos.error;
  }

  if (respostaGastos.error) {
    throw respostaGastos.error;
  }

  if (respostaPedidos.error) {
    throw respostaPedidos.error;
  }

  return {
    agendamentos: respostaAgendamentos.data || [],

    gastos: respostaGastos.data || [],

    pedidos: respostaPedidos.data || [],
  };
}

// ==================================================
// 16.5 — CALCULAR RESUMO
// ==================================================

function calcularResumoRelatorio({ agendamentos, gastos, pedidos }) {
  const concluidos = agendamentos.filter((item) => item.status === "concluido");

  const cancelados = agendamentos.filter((item) => item.status === "cancelado");

  // ------------------------------------------
  // SERVIÇOS
  // ------------------------------------------

  const faturamentoServicos = concluidos.reduce((total, item) => {
    const preco = Number(item.servicos?.preco);

    return total + (Number.isFinite(preco) ? preco : 0);
  }, 0);

  // ------------------------------------------
  // PRODUTOS
  // ------------------------------------------

  const faturamentoProdutos = pedidos.reduce((total, pedido) => {
    const quantidade = Number(pedido.quantidade);

    const preco = Number(pedido.preco_unitario);

    if (!Number.isFinite(quantidade) || !Number.isFinite(preco)) {
      return total;
    }

    return total + quantidade * preco;
  }, 0);

  const produtosVendidos = pedidos.reduce((total, pedido) => {
    const quantidade = Number(pedido.quantidade);

    return total + (Number.isFinite(quantidade) ? quantidade : 0);
  }, 0);

  // ------------------------------------------
  // DESPESAS
  // ------------------------------------------

  const despesas = gastos.reduce((total, gasto) => {
    const valor = Number(gasto.valor);

    return total + (Number.isFinite(valor) ? valor : 0);
  }, 0);

  // ------------------------------------------
  // TOTAIS
  // ------------------------------------------

  const faturamento = faturamentoServicos + faturamentoProdutos;

  const lucro = faturamento - despesas;

  return {
    total: agendamentos.length,

    concluidos: concluidos.length,

    cancelados: cancelados.length,

    produtosVendidos,

    faturamentoServicos,

    faturamentoProdutos,

    faturamento,

    despesas,

    lucro,
  };
}

// ==================================================
// 16.6 — AGRUPAR SERVIÇOS / CLIENTES / PROFISSIONAIS
// ==================================================

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

// ==================================================
// 16.7 — AGRUPAR PRODUTOS
// ==================================================

function agruparProdutosRelatorio(pedidos) {
  const mapa = new Map();

  pedidos.forEach((pedido) => {
    const id = pedido.produto_id || pedido.produtos?.nome || "sem-produto";

    const nome = pedido.produtos?.nome || "Produto";

    const quantidade = Number(pedido.quantidade) || 0;

    const preco = Number(pedido.preco_unitario) || 0;

    const atual = mapa.get(id) || {
      nome,
      quantidade: 0,
      faturamento: 0,
    };

    atual.quantidade += quantidade;

    atual.faturamento += quantidade * preco;

    mapa.set(id, atual);
  });

  return Array.from(mapa.values()).sort(
    (a, b) => b.faturamento - a.faturamento,
  );
}

// ==================================================
// 16.8 — TÍTULO DO RELATÓRIO
// ==================================================

function obterTituloRelatorio(tipo) {
  const titulos = {
    geral: "Relatório geral",

    financeiro: "Relatório financeiro",

    servicos: "Relatório de serviços",

    produtos: "Relatório de produtos",

    clientes: "Relatório de clientes",

    profissionais: "Relatório de profissionais",

    agendamentos: "Relatório de agendamentos",
  };

  return titulos[tipo] || titulos.geral;
}

// ==================================================
// 16.9 — LINHAS DOS AGENDAMENTOS
// ==================================================

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

// ==================================================
// 16.10 — LINHAS DOS PRODUTOS
// ==================================================

function gerarLinhasProdutosVendidos(pedidos) {
  if (!pedidos.length) {
    return `
      <tr>
        <td colspan="5">
          Nenhum produto vendido neste período.
        </td>
      </tr>
    `;
  }

  return pedidos
    .map((pedido) => {
      const produto = pedido.produtos?.nome || "Produto";

      const quantidade = Number(pedido.quantidade) || 0;

      const preco = Number(pedido.preco_unitario) || 0;

      const total = quantidade * preco;

      const dataVenda = pedido.atualizado_at || pedido.created_at;

      return `
          <tr>

            <td>
              ${escaparHtml(produto)}
            </td>

            <td>
              ${quantidade}
            </td>

            <td>
              ${formatarMoeda(preco)}
            </td>

            <td>
              ${formatarMoeda(total)}
            </td>

            <td>
              ${dataVenda ? escaparHtml(formatarDataHora(dataVenda)) : "-"}
            </td>

          </tr>
        `;
    })
    .join("");
}

// ==================================================
// 16.11 — TABELA DE PRODUTOS
// ==================================================

function gerarTabelaProdutos(pedidos) {
  return `
    <h2>
      🛍️ Produtos vendidos
    </h2>

    <table>

      <thead>
        <tr>
          <th>Produto</th>
          <th>Quantidade</th>
          <th>Preço unitário</th>
          <th>Total</th>
          <th>Data da venda</th>
        </tr>
      </thead>

      <tbody>
        ${gerarLinhasProdutosVendidos(pedidos)}
      </tbody>

    </table>
  `;
}

// ==================================================
// 16.12 — CONTEÚDO ESPECÍFICO
// ==================================================

function gerarConteudoRelatorio(tipo, dados, resumo) {
  // ==========================================
  // FINANCEIRO
  // ==========================================

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
          Serviços

          <strong>
            ${formatarMoeda(resumo.faturamentoServicos)}
          </strong>
        </div>

        <div class="card">
          Produtos

          <strong>
            ${formatarMoeda(resumo.faturamentoProdutos)}
          </strong>
        </div>

        <div class="card">
          Entradas totais

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


      ${gerarTabelaProdutos(dados.pedidos)}


      <h2>
        💸 Gastos do período
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

  // ==========================================
  // PRODUTOS
  // ==========================================

  if (tipo === "produtos") {
    const agrupados = agruparProdutosRelatorio(dados.pedidos);

    const linhas = agrupados.length
      ? agrupados
          .map(
            (item) => `
                <tr>

                  <td>
                    ${escaparHtml(item.nome)}
                  </td>

                  <td>
                    ${item.quantidade}
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
              <td colspan="3">
                Nenhum produto vendido neste período.
              </td>
            </tr>
          `;

    return `
      <div class="resumo">

        <div class="card">
          Produtos vendidos

          <strong>
            ${resumo.produtosVendidos}
          </strong>
        </div>

        <div class="card">
          Pedidos confirmados

          <strong>
            ${dados.pedidos.length}
          </strong>
        </div>

        <div class="card">
          Faturamento com produtos

          <strong>
            ${formatarMoeda(resumo.faturamentoProdutos)}
          </strong>
        </div>

      </div>


      <h2>
        📊 Resumo por produto
      </h2>

      <table>

        <thead>
          <tr>
            <th>
              Produto
            </th>

            <th>
              Quantidade vendida
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


      ${gerarTabelaProdutos(dados.pedidos)}
    `;
  }

  // ==========================================
  // SERVIÇOS / CLIENTES / PROFISSIONAIS
  // ==========================================

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
          Faturamento de serviços

          <strong>
            ${formatarMoeda(resumo.faturamentoServicos)}
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

  // ==========================================
  // AGENDAMENTOS
  // ==========================================

  if (tipo === "agendamentos") {
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
          Cancelados

          <strong>
            ${resumo.cancelados}
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

  // ==========================================
  // GERAL
  // ==========================================

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
        Produtos vendidos

        <strong>
          ${resumo.produtosVendidos}
        </strong>
      </div>

      <div class="card">
        Serviços

        <strong>
          ${formatarMoeda(resumo.faturamentoServicos)}
        </strong>
      </div>

      <div class="card">
        Produtos

        <strong>
          ${formatarMoeda(resumo.faturamentoProdutos)}
        </strong>
      </div>

      <div class="card">
        Faturamento total

        <strong>
          ${formatarMoeda(resumo.faturamento)}
        </strong>
      </div>

    </div>


    <h2>
      ✂️ Agendamentos
    </h2>

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


    ${gerarTabelaProdutos(dados.pedidos)}
  `;
}

// ==================================================
// 16.13 — GERAR RELATÓRIO
// ==================================================

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
            box-sizing:
              border-box;
          }

          body {
            font-family:
              Arial,
              sans-serif;

            max-width:
              1200px;

            margin:
              0 auto;

            padding:
              40px;

            color:
              #222;

            background:
              #fff;
          }

          h1 {
            margin-bottom:
              5px;
          }

          h2 {
            margin-top:
              32px;
          }

          .periodo {
            color:
              #666;
          }

          .resumo {
            display:
              grid;

            grid-template-columns:
              repeat(
                auto-fit,
                minmax(
                  170px,
                  1fr
                )
              );

            gap:
              15px;

            margin:
              30px 0;
          }

          .card {
            padding:
              20px;

            border:
              1px solid #ddd;

            border-radius:
              10px;
          }

          .card strong {
            display:
              block;

            margin-top:
              8px;

            font-size:
              26px;
          }

          table {
            width:
              100%;

            border-collapse:
              collapse;

            margin-top:
              20px;
          }

          th,
          td {
            padding:
              12px;

            border-bottom:
              1px solid #ddd;

            text-align:
              left;
          }

          th {
            background:
              #f5f5f5;
          }

          .botao {
            padding:
              10px 18px;

            margin-top:
              24px;

            cursor:
              pointer;
          }

          @media
          (max-width: 700px) {

            body {
              padding:
                20px;
            }

            table {
              font-size:
                12px;
            }

            th,
            td {
              padding:
                8px;
            }

          }

          @media print {

            .botao {
              display:
                none;
            }

            body {
              max-width:
                none;

              padding:
                0;
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

// ==================================================
// 16.14 — GERAR TEXTO PARA WHATSAPP
// ==================================================

function gerarTextoRelatorioWhatsapp(tipo, dados, resumo, periodo) {
  const nomeBarbearia = lojaAtual?.nome || "BarberHub";

  const titulo = obterTituloRelatorio(tipo).toUpperCase();

  let detalhes = "";

  // ------------------------------------------
  // FINANCEIRO
  // ------------------------------------------

  if (tipo === "financeiro") {
    detalhes = [
      `✂️ Serviços: ${formatarMoeda(resumo.faturamentoServicos)}`,

      `🛍️ Produtos: ${formatarMoeda(resumo.faturamentoProdutos)}`,

      `📈 Entradas: ${formatarMoeda(resumo.faturamento)}`,

      `📉 Saídas: ${formatarMoeda(resumo.despesas)}`,

      `💰 Lucro: ${formatarMoeda(resumo.lucro)}`,
    ].join("\n");
  }

  // ------------------------------------------
  // PRODUTOS
  // ------------------------------------------
  else if (tipo === "produtos") {
    const agrupados = agruparProdutosRelatorio(dados.pedidos);

    detalhes = agrupados.length
      ? agrupados
          .map(
            (item, indice) =>
              `${indice + 1}. ${item.nome}\n` +
              `Quantidade: ${item.quantidade}\n` +
              `Faturamento: ${formatarMoeda(item.faturamento)}`,
          )
          .join("\n\n")
      : "Nenhum produto vendido neste período.";
  }

  // ------------------------------------------
  // SERVIÇOS / CLIENTES / PROFISSIONAIS
  // ------------------------------------------
  else if (
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
  }

  // ------------------------------------------
  // AGENDAMENTOS
  // ------------------------------------------
  else if (tipo === "agendamentos") {
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

  // ------------------------------------------
  // GERAL
  // ------------------------------------------
  else {
    detalhes =
      `✂️ Serviços: ${formatarMoeda(resumo.faturamentoServicos)}\n` +
      `🛍️ Produtos: ${formatarMoeda(resumo.faturamentoProdutos)}\n` +
      `💰 Faturamento total: ${formatarMoeda(resumo.faturamento)}`;
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

🛍️ Produtos vendidos: ${resumo.produtosVendidos}

✂️ Serviços: ${formatarMoeda(resumo.faturamentoServicos)}

🛍️ Produtos: ${formatarMoeda(resumo.faturamentoProdutos)}

💰 Faturamento total: ${formatarMoeda(resumo.faturamento)}

━━━━━━━━━━━━━━━━━━

${detalhes}

━━━━━━━━━━━━━━━━━━

Relatório gerado pelo BarberHub.
  `.trim();
}

// ==================================================
// 16.15 — ENVIAR PELO WHATSAPP
// ==================================================

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

// ==================================================
// 17. INICIALIZAÇÃO DO PAINEL
// ==================================================

let painelInicializando = false;

let painelInicializado = false;

// ==================================================
// 17.1 — PREPARAR INTERFACE
// ==================================================

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

// ==================================================
// 17.2 — DADOS PRINCIPAIS
// ==================================================

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

// ==================================================
// 17.3 — DADOS SECUNDÁRIOS
// ==================================================

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

// ==================================================
// 17.4 — INICIAR PAINEL
// ==================================================

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

// ==================================================
// 17.5 — RESPONSIVIDADE
// ==================================================

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

// ==================================================
// 17.6 — ATUALIZAR NOTIFICAÇÕES AO VOLTAR
// ==================================================

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !painelInicializado) {
    return;
  }

  if (typeof carregarNotificacoes === "function") {
    carregarNotificacoes();
  }
});

// ==================================================
// 17.7 — INICIALIZAÇÃO
// ==================================================

iniciarPainel();

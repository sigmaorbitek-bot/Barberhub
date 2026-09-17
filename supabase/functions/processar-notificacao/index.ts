import { createClient } from "jsr:@supabase/supabase-js@2";

// ======================================================
// 1. VARIÁVEIS DE AMBIENTE
// ======================================================

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "";

const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const WEBHOOK_SECRET =
  Deno.env.get("WEBHOOK_SECRET") ?? "";


// ======================================================
// 2. CLIENTE SUPABASE DO BACKEND
// ======================================================

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
);


// ======================================================
// 3. RESPOSTA JSON
// ======================================================

function respostaJson(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        "Content-Type":
          "application/json",
      },
    },
  );
}


// ======================================================
// 4. EDGE FUNCTION
// ======================================================

Deno.serve(async (req) => {
  try {
    // ==================================================
    // 4.1 ACEITAR APENAS POST
    // ==================================================

    if (req.method !== "POST") {
      return respostaJson(
        {
          sucesso: false,
          erro: "Método não permitido.",
        },
        405,
      );
    }


    // ==================================================
    // 4.2 VALIDAR CONFIGURAÇÃO
    // ==================================================

    if (!SUPABASE_URL) {
      throw new Error(
        "SUPABASE_URL não configurada.",
      );
    }


    if (!SERVICE_ROLE_KEY) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY não configurada.",
      );
    }


    if (!WEBHOOK_SECRET) {
      console.error(
        "WEBHOOK_SECRET não configurado.",
      );

      return respostaJson(
        {
          sucesso: false,
          erro:
            "Configuração de segurança ausente.",
        },
        500,
      );
    }


    // ==================================================
    // 4.3 VALIDAR SEGREDO DO WEBHOOK
    // ==================================================

    const segredoRecebido =
      req.headers.get(
        "x-webhook-secret",
      ) ?? "";


    if (
      segredoRecebido !==
      WEBHOOK_SECRET
    ) {
      console.warn(
        "Tentativa de acesso com WEBHOOK_SECRET inválido.",
      );

      return respostaJson(
        {
          sucesso: false,
          erro: "Não autorizado.",
        },
        401,
      );
    }


    // ==================================================
    // 4.4 LER PAYLOAD
    // ==================================================

    const payload =
      await req.json();


    console.log(
      "Webhook recebido:",
      payload,
    );


    // ==================================================
    // 4.5 ACEITAR NOVO AGENDAMENTO
    // ==================================================

    if (
      payload.type !== "INSERT" ||
      payload.table !==
        "agendamentos"
    ) {
      return respostaJson({
        sucesso: true,

        ignorado: true,

        motivo:
          "Evento não corresponde a um novo agendamento.",
      });
    }


    // ==================================================
    // 5. VALIDAR AGENDAMENTO
    // ==================================================

    const agendamento =
      payload.record;


    if (!agendamento?.id) {
      throw new Error(
        "ID do agendamento não informado.",
      );
    }


    if (
      !agendamento?.barbearia_id
    ) {
      throw new Error(
        "Barbearia do agendamento não informada.",
      );
    }


    const barbeariaId =
      String(
        agendamento.barbearia_id,
      ).trim();


    // ==================================================
    // 6. BUSCAR BARBEARIA E DONO
    // ==================================================

    console.log(
      "Buscando barbearia:",
      barbeariaId,
    );


    const {
      data: barbearia,
      error: erroBarbearia,
    } = await supabase
      .from("barbearias")
      .select(`
        id,
        nome,
        dono_id
      `)
      .eq(
        "id",
        barbeariaId,
      )
      .maybeSingle();


    // ==================================================
    // 6.1 ERRO AO BUSCAR BARBEARIA
    // ==================================================

    if (erroBarbearia) {
      console.error(
        "Erro completo ao buscar barbearia:",
        {
          message:
            erroBarbearia.message,

          code:
            erroBarbearia.code,

          details:
            erroBarbearia.details,

          hint:
            erroBarbearia.hint,
        },
      );


      return respostaJson(
        {
          sucesso: false,

          etapa:
            "buscar_barbearia",

          barbearia_id:
            barbeariaId,

          erro: {
            message:
              erroBarbearia.message,

            code:
              erroBarbearia.code,

            details:
              erroBarbearia.details,

            hint:
              erroBarbearia.hint,
          },
        },
        500,
      );
    }


    // ==================================================
    // 6.2 BARBEARIA NÃO ENCONTRADA
    // ==================================================

    if (!barbearia) {
      console.error(
        "Barbearia não encontrada:",
        barbeariaId,
      );


      return respostaJson(
        {
          sucesso: false,

          etapa:
            "buscar_barbearia",

          erro:
            "Barbearia não encontrada.",

          barbearia_id:
            barbeariaId,
        },
        404,
      );
    }


    // ==================================================
    // 6.3 VALIDAR DONO
    // ==================================================

    if (!barbearia.dono_id) {
      throw new Error(
        "Dono da barbearia não encontrado.",
      );
    }


    console.log(
      "Barbearia encontrada:",
      {
        id:
          barbearia.id,

        nome:
          barbearia.nome,

        dono_id:
          barbearia.dono_id,
      },
    );


    // ==================================================
    // 7. BUSCAR SERVIÇO
    // ==================================================

    let nomeServico =
      "Serviço";


    if (
      agendamento.servico_id
    ) {
      const {
        data: servico,
        error: erroServico,
      } = await supabase
        .from("servicos")
        .select("nome")
        .eq(
          "id",
          agendamento.servico_id,
        )
        .maybeSingle();


      if (erroServico) {
        console.error(
          "Erro ao buscar serviço:",
          erroServico,
        );
      }


      if (servico?.nome) {
        nomeServico =
          servico.nome;
      }
    }


    // ==================================================
    // 8. CLIENTE
    // ==================================================

    const nomeCliente =
      agendamento.cliente_nome ||
      "Cliente";


    // ==================================================
    // 9. FORMATAR DATA E HORA
    // ==================================================

    let horario =
      "horário não informado";


    if (
      agendamento.data_hora
    ) {
      const dataHora =
        new Date(
          agendamento.data_hora,
        );


      if (
        !Number.isNaN(
          dataHora.getTime(),
        )
      ) {
        horario =
          dataHora.toLocaleString(
            "pt-BR",
            {
              dateStyle:
                "short",

              timeStyle:
                "short",

              timeZone:
                "America/Recife",
            },
          );
      }
    }


    // ==================================================
    // 10. MONTAR NOTIFICAÇÃO
    // ==================================================

    const titulo =
      "🔔 Novo agendamento";


    const mensagem =
      `${nomeCliente} marcou ${nomeServico} para ${horario}.`;


    // ==================================================
    // 11. CRIAR NOTIFICAÇÃO INTERNA
    // ==================================================

    const {
      error: erroNotificacao,
    } = await supabase
      .from("notificacoes")
      .insert({
        barbearia_id:
          barbeariaId,

        tipo:
          "novo_agendamento",

        titulo,

        mensagem,

        referencia_id:
          agendamento.id,

        lida:
          false,
      });


    if (erroNotificacao) {
      console.error(
        "Erro ao criar notificação interna:",
        erroNotificacao,
      );

      /*
       * Não interrompemos o processamento.
       *
       * Mesmo se a notificação interna
       * falhar, o Web Push ainda pode
       * ser enviado.
       */
    }


    // ==================================================
    // 12. BUSCAR PREFERÊNCIAS DO DONO
    // ==================================================

    const {
      data: preferencias,
      error: erroPreferencias,
    } = await supabase
      .from(
        "preferencias_notificacoes",
      )
      .select(`
        novo_agendamento
      `)
      .eq(
        "usuario_id",
        barbearia.dono_id,
      )
      .maybeSingle();


    if (erroPreferencias) {
      console.error(
        "Erro ao buscar preferências:",
        erroPreferencias,
      );


      throw new Error(
        "Não foi possível verificar as preferências de notificações.",
      );
    }


    // ==================================================
    // 12.1 PREFERÊNCIA PADRÃO
    // ==================================================

    /*
     * Se ainda não existir uma linha
     * em preferencias_notificacoes,
     * consideramos o push ativado.
     */

    const pushAtivado =
      preferencias
        ?.novo_agendamento !==
      false;


    console.log(
      "Preferência novo_agendamento:",
      pushAtivado,
    );


    // ==================================================
    // 12.2 PUSH DESATIVADO
    // ==================================================

    if (!pushAtivado) {
      console.log(
        "Push de novo agendamento desativado pelo dono.",
      );


      return respostaJson({
        sucesso:
          true,

        agendamento_id:
          agendamento.id,

        barbearia_id:
          barbeariaId,

        notificacao_interna:
          true,

        push_enviado:
          false,

        motivo:
          "Preferência novo_agendamento desativada.",
      });
    }


    // ==================================================
    // 13. BUSCAR DISPOSITIVOS DO DONO
    // ==================================================

    const {
      data: dispositivos,
      error: erroDispositivos,
    } = await supabase
      .from(
        "push_subscriptions",
      )
      .select(`
        id,
        endpoint,
        p256dh,
        auth_key
      `)
      .eq(
        "usuario_id",
        barbearia.dono_id,
      )
      .eq(
        "ativo",
        true,
      );


    if (erroDispositivos) {
      console.error(
        "Erro ao buscar dispositivos:",
        erroDispositivos,
      );


      throw new Error(
        "Não foi possível buscar os dispositivos.",
      );
    }


    // ==================================================
    // 14. NENHUM DISPOSITIVO CADASTRADO
    // ==================================================

    if (
      !dispositivos ||
      dispositivos.length === 0
    ) {
      console.log(
        "Nenhum dispositivo Web Push ativo para o dono.",
      );


      return respostaJson({
        sucesso:
          true,

        agendamento_id:
          agendamento.id,

        barbearia_id:
          barbeariaId,

        notificacao_interna:
          true,

        push_enviado:
          false,

        motivo:
          "Nenhum dispositivo Web Push ativo.",
      });
    }


    // ==================================================
    // 15. URL AO CLICAR NA NOTIFICAÇÃO
    // ==================================================

    const url =
      `/painel/index.html?id=${encodeURIComponent(
        barbeariaId,
      )}`;


    // ==================================================
    // 16. ENVIAR PUSH
    // ==================================================

    const resultados =
      await Promise.allSettled(
        dispositivos.map(
          async (
            dispositivo,
          ) => {
            const resposta =
              await fetch(
                `${SUPABASE_URL}/functions/v1/enviar-push`,
                {
                  method:
                    "POST",

                  headers: {
                    "Content-Type":
                      "application/json",

                    Authorization:
                      `Bearer ${SERVICE_ROLE_KEY}`,
                  },

                  body:
                    JSON.stringify({
                      subscription:
                        {
                          endpoint:
                            dispositivo.endpoint,

                          keys: {
                            p256dh:
                              dispositivo.p256dh,

                            auth:
                              dispositivo.auth_key,
                          },
                        },

                      titulo,

                      mensagem,

                      url,
                    }),
                },
              );


            if (
              !resposta.ok
            ) {
              const texto =
                await resposta.text();


              throw new Error(
                `Falha ao enviar push. Status ${resposta.status}: ${texto}`,
              );
            }


            return await resposta.json();
          },
        ),
      );


    // ==================================================
    // 17. CONTAR ENVIOS
    // ==================================================

    const enviados =
      resultados.filter(
        (resultado) =>
          resultado.status ===
          "fulfilled",
      ).length;


    const falhas =
      resultados.filter(
        (resultado) =>
          resultado.status ===
          "rejected",
      ).length;


    // ==================================================
    // 18. LOGAR FALHAS INDIVIDUAIS
    // ==================================================

    resultados.forEach(
      (
        resultado,
        indice,
      ) => {
        if (
          resultado.status ===
          "rejected"
        ) {
          console.error(
            `Erro no dispositivo ${dispositivos[indice].id}:`,
            resultado.reason,
          );
        }
      },
    );


    // ==================================================
    // 19. RESULTADO FINAL
    // ==================================================

    console.log(
      `Push finalizado. Enviados: ${enviados}. Falhas: ${falhas}.`,
    );


    return respostaJson({
      sucesso:
        true,

      agendamento_id:
        agendamento.id,

      barbearia_id:
        barbeariaId,

      usuario_destino:
        barbearia.dono_id,

      dispositivos:
        dispositivos.length,

      enviados,

      falhas,
    });
  } catch (erro) {
    // ==================================================
    // 20. ERRO GERAL
    // ==================================================

    console.error(
      "Erro ao processar notificação:",
      erro,
    );


    return respostaJson(
      {
        sucesso:
          false,

        erro:
          erro instanceof Error
            ? erro.message
            : "Erro desconhecido.",
      },
      500,
    );
  }
});
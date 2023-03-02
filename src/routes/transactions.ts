import { FastifyInstance } from "fastify";
import { z } from "zod";
import { knexClient } from "../database";
import { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";

//tipos de testes
// Unitários: unidade da sua aplicação, como uma função específica
// Integração: comunicação entre duas ou mais unidades
// e2e - ponta a ponta:  simulam um usuário operando na nossa aplicação; no caso do backend, simulam por exemplo as entradas HTTP que o server recebe e se
//                       todo o comportamento, desde as rotas ate o banco de dados, esta funcionando corretamente 

export async function transactionsRoutes(app: FastifyInstance) {

  //middleware global apenas para todas as rotas desse arquivo
  app.addHook('preHandler', async (request, reply) => {
    console.log(`[${request.method}] ${request.url}`)
  })

  //preHandler -> coloca o middleware
  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {

    const { sessionId } = request.cookies;

    const transactions = await knexClient("transactions")
      .where('session_id', sessionId)
      .select('*');
    return {
      transactions
    }
  })

  app.get('/summary', { preHandler: [checkSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies;

    const summary = await knexClient("transactions")
      .where({
        session_id: sessionId
      })
      .sum('amount', { as: 'amount' })
      .first()

    return {
      summary
    }
  })

  app.get('/:id', { preHandler: [checkSessionIdExists] }, async (request) => {

    const { sessionId } = request.cookies;

    const getTransactionParamsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = getTransactionParamsSchema.parse(request.params);

    const transaction = await knexClient("transactions").where({
      id,
      session_id: sessionId
    }).first()

    return {
      transaction
    }
  })

  app.post('/', async (request, reply) => {
    //criando schema com zod pra indiciar o que deve ter no body
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit'])
    })

    //fazendo parse do schema com o body da request, e desestruturando o resultado (se der erro no parse, vai gerar uma exception)
    const { title, amount, type } = createTransactionBodySchema.parse(request.body)

    let sessionId = request.cookies.sessionId;

    if (!sessionId) {
      sessionId = randomUUID();

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
      })
    }

    await knexClient("transactions").insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId
    })

    return reply.status(201).send();
  })
}
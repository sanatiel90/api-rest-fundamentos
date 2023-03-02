import { afterAll, beforeAll, beforeEach, describe, expect, it, test } from "vitest";
import { app } from "../src/app";
import supertest from 'supertest'
import { execSync } from "child_process";

//describe é usado pra categorizar os testes
describe('Transactions routes', () => {

  //funcao do vitest que é executada uma unica vez antes dos testes serem rodados
  //ela esta executando a funcao app.ready(), que indica que o app ja carregou todos os plugins, middlewares etc que precisava, 
  //para que agora possa executar os testes
  beforeAll(async () => {
    await app.ready()
  })

  //esta vai executar depois que todos os testes rodarem, e vai liberar o app da memoria
  afterAll(async () => {
    await app.close()
  })


  //antes de cada teste sera rodado essas linhas de comandos (executadas atraves do execSync do node) para resetar e criar o banco de dados
  //cada teste é recomendado que seja feito no banco zerado
  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })


  it('should be able to create a new transaction', async () => {
    const response = await supertest(app.server).post('/transactions').send({
      title: 'New transaction',
      amount: 5000,
      type: 'credit'
    })

    expect(response.statusCode).toEqual(201);
  })

  //cada teste tem q funcionar sem depender de outros testes, entao se num novo teste vc precisar de um trecho de codigo que ja foi usado em outro teste, vc vai
  //ter q copiar e colar esse trecho pro novo teste pra que ele faça tudo de novo
  it('should be able to list all transactions', async () => {
    const createTransactionResponse = await supertest(app.server).post('/transactions').send({
      title: 'New transaction',
      amount: 5000,
      type: 'credit'
    })

    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionResponse = await supertest(app.server).get('/transactions').set('Cookie', cookies).expect(200)

    expect(listTransactionResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000
      })
    ])
  })


  it('should be able to get a specific transactions', async () => {
    const createTransactionResponse = await supertest(app.server).post('/transactions').send({
      title: 'New transaction',
      amount: 5000,
      type: 'credit'
    })

    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionResponse = await supertest(app.server).get('/transactions').set('Cookie', cookies).expect(200)

    const transactionId = listTransactionResponse.body.transactions[0].id;

    const getTransactionResponse = await supertest(app.server).get(`/transactions/${transactionId}`).set('Cookie', cookies).expect(200)

    expect(getTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000
      })
    )
  })


  it.only('should be able to get the summery', async () => {
    const createTransactionResponse = await supertest(app.server).post('/transactions').send({
      title: 'Credit transaction',
      amount: 5000,
      type: 'credit'
    })

    const cookies = createTransactionResponse.get('Set-Cookie')

    await supertest(app.server).post('/transactions').set('Cookie', cookies).send({
      title: 'Debit transaction',
      amount: 2000,
      type: 'debit'
    })

    const summaryResponse = await supertest(app.server).get('/transactions/summary').set('Cookie', cookies).expect(200)

    expect(summaryResponse.body.summary).toEqual({
      amount: 3000
    })
  })

})


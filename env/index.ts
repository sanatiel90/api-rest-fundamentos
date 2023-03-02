import { config } from 'dotenv'
import { z } from 'zod'

//verifica se a var de ambiente NODE_ENV esta como test (no caso do uso do vitest, ela será setada automaticamente como 'test')
//se estiver, carregar no path das var de ambiente o arquivo .env de testes, para usar por exemplo o bd de testes
if (process.env.NODE_ENV === 'test') {
  config({ path: '.env.test' })
} else {
  //se NODE_ENV nao estiver como test, carrega o config() normal, que vai buscar o .env normal da app
  config()
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3333)
})

const result = envSchema.safeParse(process.env)

if (result.success === false) {
  console.error('Invalid environment variables', result.error.format())
  throw new Error('Invalid environment variables')
}

export const env = result.data
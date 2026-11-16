/**
 * Conexão dos testes de integração.
 *
 * Por defeito: MongoDB do docker-compose local (host 27018). No GitHub Actions
 * o service container publica 27017 e o workflow define MONGODB_URI.
 *
 * Os testes usam o banco `order_integration` (nunca o `order` de desenvolvimento),
 * para o reset não apagar dados de quem roda a stack local.
 */
export const INTEGRATION_MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27018/order';

export const INTEGRATION_MONGODB_DB = 'order_integration';

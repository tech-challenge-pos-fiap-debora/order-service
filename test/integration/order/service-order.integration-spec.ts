import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  TEST_DOCUMENT,
  TEST_PLATE,
  TEST_PRODUCT_CODE,
  TEST_PRODUCT_ID,
} from '../../../src/order/application/use-case/service-order/__fakes__/service-order.fakes';
import { UserRole } from '../../../src/shared/auth/user-role';
import {
  bootstrapIntegrationApp,
  shutdownIntegrationApp,
  signRoleToken,
} from '../helpers/integration-app';

describe('Order — catálogo e ordens de serviço (integration, MongoDB)', () => {
  let app: INestApplication;

  const bearer = (role: UserRole) => ({
    Authorization: `Bearer ${signRoleToken(app, role)}`,
  });

  beforeAll(async () => {
    app = await bootstrapIntegrationApp();
  }, 120_000);

  afterAll(async () => {
    await shutdownIntegrationApp(app);
  });

  it('sem JWT: GET /service-orders retorna 401', async () => {
    const res = await request(app.getHttpServer()).get('/service-orders');
    expect(res.status).toBe(401);
  });

  it('mecânico: POST /services retorna 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/services')
      .set(bearer(UserRole.MECANICO))
      .send({ name: 'Não deve criar', basePrice: 10 });
    expect(res.status).toBe(403);
  });

  it('admin cria serviço; atendente abre OS e lista; productId persiste na peça', async () => {
    const catalogRes = await request(app.getHttpServer())
      .post('/services')
      .set(bearer(UserRole.ADMIN))
      .send({
        name: `Troca de óleo ${Date.now()}`,
        basePrice: 120,
        defaultParts: [{ productCode: TEST_PRODUCT_CODE, quantity: 1 }],
      });
    expect(catalogRes.status).toBe(201);
    const catalogId = catalogRes.body.id as string;

    const catalogGet = await request(app.getHttpServer())
      .get(`/services/${catalogId}`)
      .set(bearer(UserRole.ATENDENTE));
    expect(catalogGet.status).toBe(200);
    expect(catalogGet.body.defaultParts[0].productCode).toBe(TEST_PRODUCT_CODE);

    const openRes = await request(app.getHttpServer())
      .post('/service-orders/open')
      .set(bearer(UserRole.ATENDENTE))
      .send({
        client: {
          name: 'Maria',
          email: 'maria@example.com',
          document: TEST_DOCUMENT,
        },
        vehicle: {
          plate: TEST_PLATE,
          brand: 'Fiat',
          model: 'Uno',
          year: 2015,
        },
        requestedServicesDescription: 'Revisão',
        services: [{ catalogServiceId: catalogId, quantity: 1 }],
        parts: [{ productCode: TEST_PRODUCT_CODE, quantity: 2 }],
      });
    expect(openRes.status).toBe(201);
    expect(openRes.body.status).toBe('RECEIVED');
    expect(openRes.body.partLines[0].productId).toBe(TEST_PRODUCT_ID);
    const orderId = openRes.body.id as string;

    const getRes = await request(app.getHttpServer())
      .get(`/service-orders/${orderId}`)
      .set(bearer(UserRole.ATENDENTE));
    expect(getRes.status).toBe(200);
    expect(getRes.body.client.document).toBe(TEST_DOCUMENT);
    expect(getRes.body.vehicle.plate).toBe(TEST_PLATE);
    expect(getRes.body.partLines[0]).toMatchObject({
      productId: TEST_PRODUCT_ID,
      productCode: TEST_PRODUCT_CODE,
      quantity: 2,
    });

    const listRes = await request(app.getHttpServer())
      .get('/service-orders')
      .set(bearer(UserRole.MECANICO));
    expect(listRes.status).toBe(200);
    expect(
      (listRes.body as { id: string }[]).some((o) => o.id === orderId),
    ).toBe(true);

    const diagRes = await request(app.getHttpServer())
      .patch(`/service-orders/${orderId}/diagnosis`)
      .set(bearer(UserRole.MECANICO))
      .send({ diagnosis: 'Troca de óleo e filtro' });
    expect(diagRes.status).toBe(200);
    expect(diagRes.body.status).toBe('IN_DIAGNOSIS');

    const partRes = await request(app.getHttpServer())
      .post(`/service-orders/${orderId}/parts`)
      .set(bearer(UserRole.MECANICO))
      .send({ productCode: TEST_PRODUCT_CODE.toLowerCase(), quantity: 1 });
    expect(partRes.status).toBe(201);
    expect(partRes.body.partLines).toHaveLength(2);
    expect(partRes.body.partLines[1].productId).toBe(TEST_PRODUCT_ID);
  });
});

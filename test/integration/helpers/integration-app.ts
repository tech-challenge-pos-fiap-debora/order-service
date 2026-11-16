import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import {
  InMemoryClientLookup,
  InMemoryClientProvisioning,
  InMemoryProductLookup,
  InMemoryStockService,
  InMemoryVehicleLookup,
  InMemoryVehicleProvisioning,
  defaultProductSnapshot,
} from '../../../src/order/application/use-case/service-order/__fakes__/service-order.fakes';
import { CLIENT_LOOKUP } from '../../../src/order/domain/ports/client-lookup.port';
import { CLIENT_PROVISIONING } from '../../../src/order/domain/ports/client-provisioning.port';
import { PRODUCT_LOOKUP } from '../../../src/order/domain/ports/product-lookup.port';
import { VEHICLE_LOOKUP } from '../../../src/order/domain/ports/vehicle-lookup.port';
import { VEHICLE_PROVISIONING } from '../../../src/order/domain/ports/vehicle-provisioning.port';
import { STOCK_SERVICE } from '../../../src/shared/domain/ports/stock-service.port';
import { UserRole } from '../../../src/shared/auth/user-role';
import { configureHttpApp } from '../../../src/shared/interfaces/http/config/configure-http-app';
import { INTEGRATION_JWT_SECRET } from '../dev-credentials.fixture';
import {
  INTEGRATION_MONGODB_DB,
  INTEGRATION_MONGODB_URI,
} from './database-url';

export async function bootstrapIntegrationApp(): Promise<INestApplication> {
  process.env.MONGODB_URI = INTEGRATION_MONGODB_URI;
  process.env.MONGODB_DB = INTEGRATION_MONGODB_DB;
  process.env.JWT_SECRET = INTEGRATION_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.NEW_RELIC_ENABLED = 'false';

  // Identidade e estoque são outros microsserviços: aqui entram fakes em memória.
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CLIENT_LOOKUP)
    .useValue(new InMemoryClientLookup())
    .overrideProvider(CLIENT_PROVISIONING)
    .useValue(new InMemoryClientProvisioning())
    .overrideProvider(VEHICLE_LOOKUP)
    .useValue(new InMemoryVehicleLookup())
    .overrideProvider(VEHICLE_PROVISIONING)
    .useValue(new InMemoryVehicleProvisioning())
    .overrideProvider(PRODUCT_LOOKUP)
    .useValue(new InMemoryProductLookup().seed(defaultProductSnapshot()))
    .overrideProvider(STOCK_SERVICE)
    .useValue(new InMemoryStockService())
    .compile();

  const app = moduleRef.createNestApplication();
  configureHttpApp(app);
  await app.init();
  return app;
}

export async function shutdownIntegrationApp(
  app: INestApplication,
): Promise<void> {
  await app.close();
}

/** Emite JWT no mesmo formato do identity-service (sem chamar /auth). */
export function signRoleToken(
  app: INestApplication,
  role: UserRole,
  overrides: { sub?: string; email?: string } = {},
): string {
  const jwt = app.get(JwtService);
  return jwt.sign({
    sub: overrides.sub ?? '00000000-0000-4000-8000-000000000001',
    email: overrides.email ?? `integration-${role}@test.dev`,
    role,
  });
}

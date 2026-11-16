import { Module } from '@nestjs/common';
import { STOCK_SERVICE } from '../../../shared/domain/ports/stock-service.port';
import { CLIENT_LOOKUP } from '../../domain/ports/client-lookup.port';
import { CLIENT_PROVISIONING } from '../../domain/ports/client-provisioning.port';
import { VEHICLE_LOOKUP } from '../../domain/ports/vehicle-lookup.port';
import { VEHICLE_PROVISIONING } from '../../domain/ports/vehicle-provisioning.port';
import { PRODUCT_LOOKUP } from '../../domain/ports/product-lookup.port';
import { PRODUCT_PROVISIONING } from '../../domain/ports/product-provisioning.port';
import { HttpIdentityClientAdapter } from './http-identity-client.adapter';
import { HttpIdentityVehicleAdapter } from './http-identity-vehicle.adapter';
import { HttpStockProductAdapter } from './http-stock-product.adapter';
import { HttpStockService } from './http-stock.service';
import { IntegrationHttpClient } from './integration-http.client';

@Module({
  providers: [
    IntegrationHttpClient,
    HttpIdentityClientAdapter,
    HttpIdentityVehicleAdapter,
    HttpStockProductAdapter,
    HttpStockService,
    { provide: CLIENT_LOOKUP, useExisting: HttpIdentityClientAdapter },
    { provide: CLIENT_PROVISIONING, useExisting: HttpIdentityClientAdapter },
    { provide: VEHICLE_LOOKUP, useExisting: HttpIdentityVehicleAdapter },
    { provide: VEHICLE_PROVISIONING, useExisting: HttpIdentityVehicleAdapter },
    { provide: PRODUCT_LOOKUP, useExisting: HttpStockProductAdapter },
    { provide: PRODUCT_PROVISIONING, useExisting: HttpStockProductAdapter },
    { provide: STOCK_SERVICE, useExisting: HttpStockService },
  ],
  exports: [
    CLIENT_LOOKUP,
    CLIENT_PROVISIONING,
    VEHICLE_LOOKUP,
    VEHICLE_PROVISIONING,
    PRODUCT_LOOKUP,
    PRODUCT_PROVISIONING,
    STOCK_SERVICE,
  ],
})
export class OrderAdaptersModule {}

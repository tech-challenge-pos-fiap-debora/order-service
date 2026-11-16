import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SERVICE_ORDER_REPOSITORY } from '../../domain/repositories/tokens';
import {
  SERVICE_ORDER_PERSISTENCE,
  TelemetryServiceOrderRepository,
} from '../observability/telemetry-service-order.repository';
import { MongoServiceOrderRepository } from './mongo/repositories/mongo-service-order.repository';
import {
  SERVICE_ORDER_MODEL,
  ServiceOrderSchema,
} from './mongo/schemas/service-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SERVICE_ORDER_MODEL, schema: ServiceOrderSchema },
    ]),
  ],
  providers: [
    {
      provide: SERVICE_ORDER_PERSISTENCE,
      useClass: MongoServiceOrderRepository,
    },
    {
      provide: SERVICE_ORDER_REPOSITORY,
      useClass: TelemetryServiceOrderRepository,
    },
  ],
  exports: [SERVICE_ORDER_REPOSITORY],
})
export class OrderDatabaseModule {}

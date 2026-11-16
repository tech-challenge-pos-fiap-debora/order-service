import { Module } from '@nestjs/common';
import { CatalogServiceModule } from './catalog-service.module';
import { ServiceOrderModule } from './service-order.module';

@Module({
  imports: [CatalogServiceModule, ServiceOrderModule],
})
export class OrderModule {}

import { Module } from '@nestjs/common';
import { CatalogServiceModule } from './catalog-service.module';
import { ServiceOrderModule } from './service-order.module';
import { MessagingConsumerModule } from './messaging-consumer.module';

@Module({
  imports: [CatalogServiceModule, ServiceOrderModule, MessagingConsumerModule],
})
export class OrderModule {}

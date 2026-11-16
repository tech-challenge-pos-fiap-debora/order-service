import { Module } from '@nestjs/common';
import { ConfigureModule } from './shared/infrastructure/configure/configure.module';
import { ObservabilityModule } from './shared/infrastructure/observability/observability.module';
import { HealthModule } from './shared/infrastructure/ioc/health.module';
import { AuthModule } from './shared/auth/auth.module';
import { OrderModule } from './order/infrastructure/ioc/order.module';

@Module({
  imports: [
    ConfigureModule,
    ObservabilityModule,
    HealthModule,
    AuthModule,
    OrderModule,
  ],
})
export class AppModule {}

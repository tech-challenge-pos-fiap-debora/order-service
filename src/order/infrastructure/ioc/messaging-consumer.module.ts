import { Module } from '@nestjs/common';
import { ApplyGeneratedBudgetUseCase } from '../../application/use-case/service-order/apply-generated-budget';
import { HandleSagaOutcomesUseCase } from '../../application/use-case/service-order/handle-saga-outcomes';
import { BUDGET_DELIVERY_NOTIFIER } from '../../domain/ports/budget-delivery-notifier.port';
import { SagaEventsConsumer } from '../../interfaces/messaging/saga-events.consumer';
import { LoggingBudgetDeliveryNotifier } from '../notifications/logging-budget-delivery-notifier';
import { OrderDatabaseModule } from '../database/database.module';
import { OrderAdaptersModule } from '../adapters/adapters.module';
import { MessagingModule } from '../../../shared/infrastructure/messaging/messaging.module';

@Module({
  imports: [OrderDatabaseModule, OrderAdaptersModule, MessagingModule],
  providers: [
    {
      provide: BUDGET_DELIVERY_NOTIFIER,
      useClass: LoggingBudgetDeliveryNotifier,
    },
    ApplyGeneratedBudgetUseCase,
    HandleSagaOutcomesUseCase,
    SagaEventsConsumer,
  ],
})
export class MessagingConsumerModule {}

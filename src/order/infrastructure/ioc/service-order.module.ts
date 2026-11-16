import { Module } from '@nestjs/common';
import {
  AddPartToOrderUseCase,
  AddServiceToOrderUseCase,
  ApproveBudgetUseCase,
  CreateServiceOrderUseCase,
  DeliverServiceOrderUseCase,
  FinishServiceOrderUseCase,
  GenerateBudgetUseCase,
  GetAllServiceOrdersUseCase,
  GetAverageExecutionTimeUseCase,
  GetPublicServiceOrderBudgetUseCase,
  GetPublicServiceOrderStatusUseCase,
  GetServiceOrderUseCase,
  OpenServiceOrderUseCase,
  PublicApproveBudgetUseCase,
  PublicRejectBudgetUseCase,
  RegisterDiagnosisUseCase,
  RejectBudgetUseCase,
} from '../../application/use-case/service-order';
import { ApplyGeneratedBudgetUseCase } from '../../application/use-case/service-order/apply-generated-budget';
import { HandleSagaOutcomesUseCase } from '../../application/use-case/service-order/handle-saga-outcomes';
import { BUDGET_DELIVERY_NOTIFIER } from '../../domain/ports/budget-delivery-notifier.port';
import { PublicServiceOrderController } from '../../interfaces/http/service-order/public-service-order.controller';
import { ServiceOrderController } from '../../interfaces/http/service-order/service-order.controller';
import { LoggingBudgetDeliveryNotifier } from '../notifications/logging-budget-delivery-notifier';
import { OrderDatabaseModule } from '../database/database.module';
import { CatalogServiceDatabaseModule } from '../database/catalog-service-database.module';
import { OrderAdaptersModule } from '../adapters/adapters.module';
import { MessagingModule } from '../../../shared/infrastructure/messaging/messaging.module';

@Module({
  imports: [
    OrderDatabaseModule,
    CatalogServiceDatabaseModule,
    OrderAdaptersModule,
    MessagingModule,
  ],
  providers: [
    {
      provide: BUDGET_DELIVERY_NOTIFIER,
      useClass: LoggingBudgetDeliveryNotifier,
    },
    CreateServiceOrderUseCase,
    OpenServiceOrderUseCase,
    GetServiceOrderUseCase,
    GetAllServiceOrdersUseCase,
    RegisterDiagnosisUseCase,
    AddServiceToOrderUseCase,
    AddPartToOrderUseCase,
    GenerateBudgetUseCase,
    ApplyGeneratedBudgetUseCase,
    HandleSagaOutcomesUseCase,
    ApproveBudgetUseCase,
    RejectBudgetUseCase,
    PublicApproveBudgetUseCase,
    PublicRejectBudgetUseCase,
    FinishServiceOrderUseCase,
    DeliverServiceOrderUseCase,
    GetPublicServiceOrderBudgetUseCase,
    GetPublicServiceOrderStatusUseCase,
    GetAverageExecutionTimeUseCase,
  ],
  controllers: [ServiceOrderController, PublicServiceOrderController],
})
export class ServiceOrderModule {}

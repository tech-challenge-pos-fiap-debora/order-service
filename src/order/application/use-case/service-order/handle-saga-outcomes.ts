import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleViolationError,
  EntityNotFoundError,
} from '../../../../shared/domain/errors';
import { ServiceOrder } from '../../../domain/entities/service-order';
import { ServiceOrderStatus } from '../../../domain/entities/service-order-status';
import type { ServiceOrderRepositoryInterface } from '../../../domain/repositories/service-order.repository';
import { SERVICE_ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import {
  EVENT_PUBLISHER,
  type EventPublisherPort,
} from '../../../../shared/domain/ports/event-publisher.port';

@Injectable()
export class HandleSagaOutcomesUseCase {
  private readonly logger = new Logger(HandleSagaOutcomesUseCase.name);

  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepo: ServiceOrderRepositoryInterface,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisherPort,
  ) {}

  async onBudgetFailed(serviceOrderId: string, reason: string): Promise<void> {
    const order = await this.orderRepo.findById(serviceOrderId);
    if (!order) {
      this.logger.warn(`OS não encontrada serviceOrderId=${serviceOrderId}`);
      return;
    }
    if (order.status !== ServiceOrderStatus.WAITING_BUDGET) return;
    try {
      order.revertToDiagnosis(reason);
      await this.orderRepo.save(order);
    } catch (e) {
      throw new BusinessRuleViolationError(
        e instanceof Error ? e.message : 'Invalid operation',
      );
    }
  }

  async onPaymentCreated(serviceOrderId: string): Promise<ServiceOrder | null> {
    const order = await this.orderRepo.findById(serviceOrderId);
    if (!order) throw new EntityNotFoundError('Service order not found');
    if (order.status === ServiceOrderStatus.WAITING_PAYMENT) return order;
    if (order.status === ServiceOrderStatus.IN_EXECUTION) return order;
    try {
      order.markWaitingPayment();
    } catch (e) {
      throw new BusinessRuleViolationError(
        e instanceof Error ? e.message : 'Invalid operation',
      );
    }
    return this.orderRepo.save(order);
  }

  async onPaymentConfirmed(serviceOrderId: string): Promise<ServiceOrder | null> {
    const order = await this.orderRepo.findById(serviceOrderId);
    if (!order) throw new EntityNotFoundError('Service order not found');
    if (order.isInExecution()) return order;
    try {
      order.startExecution();
    } catch (e) {
      throw new BusinessRuleViolationError(
        e instanceof Error ? e.message : 'Invalid operation',
      );
    }
    return this.orderRepo.save(order);
  }

  async cancelFromSaga(
    serviceOrderId: string,
    reason: string,
    publishCancelled = true,
  ): Promise<ServiceOrder | null> {
    const order = await this.orderRepo.findById(serviceOrderId);
    if (!order) {
      this.logger.warn(`OS não encontrada serviceOrderId=${serviceOrderId}`);
      return null;
    }
    if (order.status === ServiceOrderStatus.CANCELLED) return order;
    const previousStatus = order.status;
    try {
      order.cancelBySaga(reason);
    } catch (e) {
      throw new BusinessRuleViolationError(
        e instanceof Error ? e.message : 'Invalid operation',
      );
    }
    const saved = (await this.orderRepo.save(order))!;
    if (publishCancelled) {
      await this.events.publish({
        eventId: randomUUID(),
        type: 'order.cancelled',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: saved.id,
        producer: 'order-service',
        payload: {
          serviceOrderId: saved.id,
          reason,
          previousStatus,
        },
      });
    }
    return saved;
  }
}

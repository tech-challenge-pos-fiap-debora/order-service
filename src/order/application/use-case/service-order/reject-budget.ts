import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleViolationError,
  EntityNotFoundError,
} from '../../../../shared/domain/errors';
import { ServiceOrder } from '../../../domain/entities/service-order';
import type { ServiceOrderRepositoryInterface } from '../../../domain/repositories/service-order.repository';
import { SERVICE_ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import {
  EVENT_PUBLISHER,
  type EventPublisherPort,
} from '../../../../shared/domain/ports/event-publisher.port';

@Injectable()
export class RejectBudgetUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepo: ServiceOrderRepositoryInterface,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisherPort,
  ) {}

  async execute(id: string, reason?: string): Promise<ServiceOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new EntityNotFoundError('Service order not found');

    const budgetId = order.budget?.budgetId;
    const previousStatus = order.status;

    try {
      order.rejectBudget(reason);
    } catch (e) {
      throw new BusinessRuleViolationError(
        e instanceof Error ? e.message : 'Invalid operation',
      );
    }

    const saved = (await this.orderRepo.save(order))!;

    await this.events.publish({
      eventId: randomUUID(),
      type: 'order.budget.rejected',
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: saved.id,
      producer: 'order-service',
      payload: {
        serviceOrderId: saved.id,
        budgetId,
        reason: reason ?? saved.cancellationReason,
      },
    });

    await this.events.publish({
      eventId: randomUUID(),
      type: 'order.cancelled',
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: saved.id,
      producer: 'order-service',
      payload: {
        serviceOrderId: saved.id,
        reason: reason ?? saved.cancellationReason,
        previousStatus,
      },
    });

    return saved!;
  }
}

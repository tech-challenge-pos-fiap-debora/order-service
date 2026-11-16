import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleViolationError,
  EntityNotFoundError,
} from '../../../../shared/domain/errors';
import type { ServiceOrderRepositoryInterface } from '../../../domain/repositories/service-order.repository';
import { SERVICE_ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { ServiceOrder } from '../../../domain/entities/service-order';
import {
  EVENT_PUBLISHER,
  type EventPublisherPort,
} from '../../../../shared/domain/ports/event-publisher.port';

/**
 * Aprova o orçamento e publica `order.budget.approved`.
 * Baixa de estoque e início da execução ficam na saga (stock → billing → order).
 */
@Injectable()
export class ApproveBudgetUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepo: ServiceOrderRepositoryInterface,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisherPort,
  ) {}

  async execute(id: string): Promise<ServiceOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new EntityNotFoundError('Service order not found');

    if (order.isInExecution()) {
      return order;
    }

    try {
      order.approveBudget();
    } catch (e) {
      throw new BusinessRuleViolationError(
        e instanceof Error ? e.message : 'Invalid operation',
      );
    }

    const saved = (await this.orderRepo.save(order))!;

    await this.events.publish({
      eventId: randomUUID(),
      type: 'order.budget.approved',
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: saved.id,
      producer: 'order-service',
      payload: {
        serviceOrderId: saved.id,
        budgetId: saved.budget?.budgetId,
      },
    });

    return saved!;
  }
}

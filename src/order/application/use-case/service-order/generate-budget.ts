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
  CLIENT_LOOKUP,
  type ClientLookupPort,
} from '../../../domain/ports/client-lookup.port';
import {
  EVENT_PUBLISHER,
  type EventPublisherPort,
} from '../../../../shared/domain/ports/event-publisher.port';

/**
 * Inicia a saga de orçamento: marca WAITING_BUDGET e publica
 * `order.budget.requested` para o billing cotar peças e gerar o orçamento.
 */
@Injectable()
export class GenerateBudgetUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepo: ServiceOrderRepositoryInterface,
    @Inject(CLIENT_LOOKUP)
    private readonly clientLookup: ClientLookupPort,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisherPort,
  ) {}

  async execute(id: string): Promise<ServiceOrder> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new EntityNotFoundError('Service order not found');

    if (!order.diagnosis?.trim()) {
      throw new BusinessRuleViolationError(
        'Registre o diagnóstico antes de gerar o orçamento',
      );
    }

    if (order.serviceLines.length + order.partLines.length === 0) {
      throw new BusinessRuleViolationError(
        'Cannot generate budget without service or part lines',
      );
    }

    try {
      order.markWaitingBudget();
    } catch (e) {
      throw new BusinessRuleViolationError(
        e instanceof Error ? e.message : 'Invalid operation',
      );
    }

    const saved = (await this.orderRepo.save(order))!;
    const client = await this.clientLookup.findById(saved.clientId);
    if (!client) {
      throw new EntityNotFoundError(`Client "${saved.clientId}" not found`);
    }

    const partDemandMap = saved.aggregatePartDemand();
    const nameByCode = new Map<string, string>();
    for (const sl of saved.serviceLines) {
      for (const dp of sl.defaultParts) {
        if (dp.name?.trim() && !nameByCode.has(dp.productCode)) {
          nameByCode.set(dp.productCode, dp.name);
        }
      }
    }
    for (const pl of saved.partLines) {
      if (pl.name?.trim()) nameByCode.set(pl.productCode, pl.name);
    }

    await this.events.publish({
      eventId: randomUUID(),
      type: 'order.budget.requested',
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: saved.id,
      producer: 'order-service',
      payload: {
        serviceOrderId: saved.id,
        client: {
          id: client.id,
          document: client.document,
          name: client.name,
          email: client.email,
        },
        vehicle: {
          plate: saved.vehiclePlate,
          brand: saved.vehicleBrand,
          model: saved.vehicleModel,
          year: saved.vehicleYear,
        },
        serviceLines: saved.serviceLines.map((l) => ({
          catalogServiceId: l.catalogServiceId,
          name: l.name,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        })),
        partDemand: Array.from(partDemandMap.entries()).map(
          ([productCode, quantity]) => ({
            productCode,
            name: nameByCode.get(productCode),
            quantity,
          }),
        ),
      },
    });

    return saved!;
  }
}

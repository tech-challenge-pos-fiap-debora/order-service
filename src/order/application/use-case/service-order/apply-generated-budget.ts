import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleViolationError,
  EntityNotFoundError,
} from '../../../../shared/domain/errors';
import type { BudgetItem } from '../../../domain/entities/service-order';
import { ServiceOrder } from '../../../domain/entities/service-order';
import { ServiceOrderStatus } from '../../../domain/entities/service-order-status';
import type { ServiceOrderRepositoryInterface } from '../../../domain/repositories/service-order.repository';
import { SERVICE_ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import {
  BUDGET_DELIVERY_NOTIFIER,
  type BudgetDeliveryNotifier,
} from '../../../domain/ports/budget-delivery-notifier.port';
import {
  CLIENT_LOOKUP,
  type ClientLookupPort,
} from '../../../domain/ports/client-lookup.port';

export type ApplyGeneratedBudgetInput = {
  serviceOrderId: string;
  budgetId: string;
  items: BudgetItem[];
  servicesTotal: number;
  partsTotal: number;
  total: number;
};

@Injectable()
export class ApplyGeneratedBudgetUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepo: ServiceOrderRepositoryInterface,
    @Inject(CLIENT_LOOKUP)
    private readonly clientLookup: ClientLookupPort,
    @Inject(BUDGET_DELIVERY_NOTIFIER)
    private readonly budgetDelivery: BudgetDeliveryNotifier,
  ) {}

  async execute(input: ApplyGeneratedBudgetInput): Promise<ServiceOrder> {
    const order = await this.orderRepo.findById(input.serviceOrderId);
    if (!order) throw new EntityNotFoundError('Service order not found');

    if (
      order.status === ServiceOrderStatus.WAITING_APPROVAL &&
      order.budget?.budgetId === input.budgetId
    ) {
      return order;
    }

    try {
      order.applyBudget({
        items: input.items,
        servicesTotal: input.servicesTotal,
        partsTotal: input.partsTotal,
        total: input.total,
        approved: false,
        budgetId: input.budgetId,
      });
    } catch (e) {
      throw new BusinessRuleViolationError(
        e instanceof Error ? e.message : 'Invalid operation',
      );
    }

    const saved = (await this.orderRepo.save(order))!;
    const client = await this.clientLookup.findById(saved.clientId);
    if (client && saved.budget) {
      await this.budgetDelivery.notifyBudgetReady({
        serviceOrderId: saved.id,
        clientDocument: saved.clientDocument,
        clientName: saved.clientName,
        clientEmail: client.email,
        vehiclePlate: saved.vehiclePlate,
        vehicleBrand: saved.vehicleBrand,
        vehicleModel: saved.vehicleModel,
        vehicleYear: saved.vehicleYear,
        budget: saved.budget,
      });
    }
    return saved!;
  }
}

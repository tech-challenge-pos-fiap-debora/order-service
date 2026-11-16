import {
  ServiceOrder,
  type BudgetItem,
  type ServiceOrderProps,
} from '../../../domain/entities/service-order';
import { DocumentVO } from '../../../../shared/domain/value-objects/document.vo';
import { Money } from '../../../../shared/domain/value-objects/money.vo';
import { PlateVO } from '../../../../shared/domain/value-objects/plate.vo';
import type { ServiceOrderDoc } from './schemas/service-order.schema';

type Status = ServiceOrderProps['status'];

const toDate = (value: Date | string | null | undefined): Date | undefined =>
  value ? new Date(value) : undefined;

const toText = (value: string | null | undefined): string | undefined =>
  value ?? undefined;

export function documentToServiceOrder(doc: ServiceOrderDoc): ServiceOrder {
  const props: ServiceOrderProps = {
    status: doc.status as Status,
    client: {
      id: doc.client.id,
      document: DocumentVO.parse(doc.client.document),
      name: doc.client.name,
    },
    vehicle: {
      id: doc.vehicle.id,
      plate: PlateVO.parse(doc.vehicle.plate),
      brand: doc.vehicle.brand,
      model: doc.vehicle.model,
      year: Number(doc.vehicle.year),
    },
    requestedServicesDescription: toText(doc.requestedServicesDescription),
    diagnosis: toText(doc.diagnosis),
    serviceLines: (doc.serviceLines ?? []).map((l) => ({
      id: String(l.id),
      catalogServiceId: String(l.catalogServiceId),
      name: String(l.name),
      unitPrice: Money.parse(Number(l.unitPrice)),
      quantity: Number(l.quantity),
      defaultParts: (l.defaultParts ?? []).map((p) => ({
        productCode: String(p.productCode),
        name: String(p.name ?? ''),
        quantity: Number(p.quantity),
      })),
    })),
    partLines: (doc.partLines ?? []).map((p) => ({
      id: String(p.id),
      productId: p.productId ?? null,
      productCode: String(p.productCode),
      name: String(p.name),
      quantity: Number(p.quantity),
    })),
    budget: doc.budget
      ? {
          items: (doc.budget.items ?? []).map(
            (i): BudgetItem => ({
              type: i.type as BudgetItem['type'],
              referenceId: i.referenceId,
              description: i.description,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              total: Number(i.total),
            }),
          ),
          servicesTotal: Number(doc.budget.servicesTotal),
          partsTotal: Number(doc.budget.partsTotal),
          total: Number(doc.budget.total),
          approved: Boolean(doc.budget.approved),
          approvedAt: toDate(doc.budget.approvedAt),
        }
      : undefined,
    statusHistory: (doc.statusHistory ?? []).map((h) => ({
      from: (h.from as Status | null) ?? null,
      to: h.to as Status,
      at: new Date(h.at),
    })),
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
    startedAt: toDate(doc.startedAt),
    finishedAt: toDate(doc.finishedAt),
    deliveredAt: toDate(doc.deliveredAt),
    cancellationReason: toText(doc.cancellationReason),
  };
  return ServiceOrder.restore(props, doc._id);
}

export function serviceOrderToDocument(order: ServiceOrder): ServiceOrderDoc {
  const budget = order.budget;
  return {
    _id: order.id,
    status: order.status,
    client: {
      id: order.clientId,
      document: order.clientDocument,
      name: order.clientName,
    },
    vehicle: {
      id: order.vehicleId,
      plate: order.vehiclePlate,
      brand: order.vehicleBrand,
      model: order.vehicleModel,
      year: order.vehicleYear,
    },
    requestedServicesDescription: order.requestedServicesDescription ?? null,
    diagnosis: order.diagnosis ?? null,
    serviceLines: order.serviceLines.map((l) => ({
      id: l.id,
      catalogServiceId: l.catalogServiceId,
      name: l.name,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      defaultParts: l.defaultParts.map((p) => ({ ...p })),
    })),
    partLines: order.partLines.map((p) => ({
      id: p.id,
      productId: p.productId ?? null,
      productCode: p.productCode,
      name: p.name,
      quantity: p.quantity,
    })),
    budget: budget
      ? {
          items: budget.items.map((i) => ({ ...i })),
          servicesTotal: budget.servicesTotal,
          partsTotal: budget.partsTotal,
          total: budget.total,
          approved: budget.approved,
          approvedAt: budget.approvedAt ?? null,
        }
      : null,
    statusHistory: order.statusHistory.map((h) => ({
      from: h.from,
      to: h.to,
      at: h.at,
    })),
    startedAt: order.startedAt ?? null,
    finishedAt: order.finishedAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    cancellationReason: order.cancellationReason ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

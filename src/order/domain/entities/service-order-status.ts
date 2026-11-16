export enum ServiceOrderStatus {
  RECEIVED = 'RECEIVED',
  IN_DIAGNOSIS = 'IN_DIAGNOSIS',
  WAITING_BUDGET = 'WAITING_BUDGET',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  WAITING_PAYMENT = 'WAITING_PAYMENT',
  IN_EXECUTION = 'IN_EXECUTION',
  FINISHED = 'FINISHED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export const EDITABLE_STATUSES: ServiceOrderStatus[] = [
  ServiceOrderStatus.RECEIVED,
  ServiceOrderStatus.IN_DIAGNOSIS,
  ServiceOrderStatus.WAITING_BUDGET,
  ServiceOrderStatus.WAITING_APPROVAL,
];

export const SERVICE_ORDER_LISTING_ORDER: ServiceOrderStatus[] = [
  ServiceOrderStatus.IN_EXECUTION,
  ServiceOrderStatus.WAITING_PAYMENT,
  ServiceOrderStatus.WAITING_APPROVAL,
  ServiceOrderStatus.WAITING_BUDGET,
  ServiceOrderStatus.IN_DIAGNOSIS,
  ServiceOrderStatus.RECEIVED,
];

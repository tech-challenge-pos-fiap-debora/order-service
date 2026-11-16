export type OrderDomainEventType =
  | 'order.budget.requested'
  | 'order.budget.approved'
  | 'order.budget.rejected'
  | 'order.cancelled';

export type DomainEventEnvelope<TType extends string, TPayload> = {
  eventId: string;
  type: TType;
  version: 1;
  occurredAt: string;
  correlationId: string;
  causationId?: string;
  producer: 'order-service';
  payload: TPayload;
};

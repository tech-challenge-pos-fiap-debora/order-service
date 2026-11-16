import { ConfigService } from '@nestjs/config';
import { SagaEventsConsumer } from './saga-events.consumer';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe('SagaEventsConsumer (order)', () => {
  const applyBudget = { execute: jest.fn() };
  const saga = {
    onBudgetFailed: jest.fn(),
    onPaymentCreated: jest.fn(),
    onPaymentConfirmed: jest.fn(),
    cancelFromSaga: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function build() {
    return new SagaEventsConsumer(
      configWith({}),
      applyBudget as never,
      saga as never,
    );
  }

  it('despacha billing.budget.generated', async () => {
    const consumer = build();
    const payload = {
      budgetId: 'b1',
      serviceOrderId: 'os-1',
      items: [],
      servicesTotal: 10,
      partsTotal: 5,
      total: 15,
    };
    await consumer.handleRaw(
      JSON.stringify({
        type: 'billing.budget.generated',
        correlationId: 'os-1',
        eventId: 'e1',
        payload,
      }),
    );
    expect(applyBudget.execute).toHaveBeenCalledWith(payload);
  });

  it('despacha billing.payment.confirmed via envelope SNS', async () => {
    const consumer = build();
    await consumer.handleRaw(
      JSON.stringify({
        Message: JSON.stringify({
          type: 'billing.payment.confirmed',
          correlationId: 'os-1',
          payload: { serviceOrderId: 'os-1' },
        }),
      }),
    );
    expect(saga.onPaymentConfirmed).toHaveBeenCalledWith('os-1');
  });

  it('despacha stock.reservation.failed → cancel', async () => {
    const consumer = build();
    await consumer.handleRaw(
      JSON.stringify({
        type: 'stock.reservation.failed',
        correlationId: 'os-1',
        payload: { serviceOrderId: 'os-1', reason: 'sem estoque' },
      }),
    );
    expect(saga.cancelFromSaga).toHaveBeenCalledWith('os-1', 'sem estoque');
  });

  it('despacha failed/created e usa motivos padrão', async () => {
    const consumer = build();
    await consumer.handleRaw(
      JSON.stringify({
        type: 'billing.budget.failed',
        correlationId: 'os-1',
        payload: { serviceOrderId: 'os-1', reason: 'erro' },
      }),
    );
    expect(saga.onBudgetFailed).toHaveBeenCalledWith('os-1', 'erro');

    await consumer.handleRaw(
      JSON.stringify({
        type: 'billing.payment.created',
        correlationId: 'os-1',
        payload: { serviceOrderId: 'os-1' },
      }),
    );
    expect(saga.onPaymentCreated).toHaveBeenCalledWith('os-1');

    await consumer.handleRaw(
      JSON.stringify({
        type: 'billing.payment.failed',
        correlationId: 'os-1',
        payload: { serviceOrderId: 'os-1' },
      }),
    );
    expect(saga.cancelFromSaga).toHaveBeenCalledWith(
      'os-1',
      'Falha no pagamento',
    );

    await consumer.handleRaw(
      JSON.stringify({
        type: 'unknown.event',
        correlationId: 'os-1',
        payload: {},
      }),
    );
  });
});

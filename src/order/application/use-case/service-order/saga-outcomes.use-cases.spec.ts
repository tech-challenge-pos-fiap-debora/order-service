import { ServiceOrderStatus } from '../../../domain/entities/service-order-status';
import { ApplyGeneratedBudgetUseCase } from './apply-generated-budget';
import { HandleSagaOutcomesUseCase } from './handle-saga-outcomes';
import {
  InMemoryClientLookup,
  InMemoryServiceOrderRepository,
  SpyEventPublisher,
  TEST_CATALOG_ID,
  TEST_CLIENT_ID,
  TEST_PRODUCT_CODE,
  createDiagnosedOrderWithService,
  createWaitingApprovalOrder,
} from './__fakes__/service-order.fakes';

describe('saga outcome use cases', () => {
  const budgetPayload = {
    budgetId: 'budget-1',
    items: [
      {
        type: 'SERVICE' as const,
        referenceId: TEST_CATALOG_ID,
        description: 'Troca de correia',
        quantity: 1,
        unitPrice: 150,
        total: 150,
      },
      {
        type: 'PART' as const,
        referenceId: TEST_PRODUCT_CODE,
        description: 'Correia',
        quantity: 1,
        unitPrice: 50,
        total: 50,
      },
    ],
    servicesTotal: 150,
    partsTotal: 50,
    total: 200,
  };

  it('aplica orçamento gerado e notifica cliente', async () => {
    const order = createDiagnosedOrderWithService('os-1');
    order.markWaitingBudget();
    const repo = new InMemoryServiceOrderRepository().seed(order);
    const clients = new InMemoryClientLookup().seed({
      id: TEST_CLIENT_ID,
      document: '87075443089',
      name: 'Maria',
      email: 'maria@test.dev',
    });
    const delivery = { notifyBudgetReady: jest.fn() };
    const useCase = new ApplyGeneratedBudgetUseCase(
      repo,
      clients,
      delivery as never,
    );

    const saved = await useCase.execute({
      serviceOrderId: 'os-1',
      ...budgetPayload,
    });
    expect(saved.status).toBe(ServiceOrderStatus.WAITING_APPROVAL);
    expect(saved.budget?.budgetId).toBe('budget-1');
    expect(delivery.notifyBudgetReady).toHaveBeenCalled();

    const again = await useCase.execute({
      serviceOrderId: 'os-1',
      ...budgetPayload,
    });
    expect(again.id).toBe(saved.id);
    expect(delivery.notifyBudgetReady).toHaveBeenCalledTimes(1);
  });

  it('trata falha de orçamento, pagamento e cancelamento da saga', async () => {
    const waitingBudget = createDiagnosedOrderWithService('os-fail');
    waitingBudget.markWaitingBudget();

    const waitingApproval = createWaitingApprovalOrder('os-pay');
    waitingApproval.approveBudget();

    const toCancel = createWaitingApprovalOrder('os-cancel');
    const repo = new InMemoryServiceOrderRepository().seed(
      waitingBudget,
      waitingApproval,
      toCancel,
    );
    const events = new SpyEventPublisher();
    const useCase = new HandleSagaOutcomesUseCase(repo, events);

    await useCase.onBudgetFailed('os-fail', 'sem linhas');
    expect(waitingBudget.status).toBe(ServiceOrderStatus.IN_DIAGNOSIS);

    await useCase.onBudgetFailed('missing', 'x');

    const waitingPayment = await useCase.onPaymentCreated('os-pay');
    expect(waitingPayment?.status).toBe(ServiceOrderStatus.WAITING_PAYMENT);
    expect((await useCase.onPaymentCreated('os-pay'))?.status).toBe(
      ServiceOrderStatus.WAITING_PAYMENT,
    );

    const executing = await useCase.onPaymentConfirmed('os-pay');
    expect(executing?.status).toBe(ServiceOrderStatus.IN_EXECUTION);

    const cancelled = await useCase.cancelFromSaga('os-cancel', 'sem estoque');
    expect(cancelled?.status).toBe(ServiceOrderStatus.CANCELLED);
    expect(events.events[0]?.type).toBe('order.cancelled');
    expect(await useCase.cancelFromSaga('missing', 'x')).toBeNull();
  });
});

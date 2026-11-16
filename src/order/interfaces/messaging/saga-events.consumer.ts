import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { awsClientOptions } from '../../../shared/infrastructure/messaging/aws-client.factory';
import { ApplyGeneratedBudgetUseCase } from '../../application/use-case/service-order/apply-generated-budget';
import { HandleSagaOutcomesUseCase } from '../../application/use-case/service-order/handle-saga-outcomes';
import type { BudgetItem } from '../../domain/entities/service-order';

type IncomingEvent = {
  eventId?: string;
  type: string;
  correlationId: string;
  causationId?: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class SagaEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SagaEventsConsumer.name);
  private readonly client: SQSClient;
  private readonly queueUrl: string;
  private running = false;
  private loop?: Promise<void>;

  constructor(
    private readonly config: ConfigService,
    private readonly applyBudget: ApplyGeneratedBudgetUseCase,
    private readonly saga: HandleSagaOutcomesUseCase,
  ) {
    this.queueUrl =
      this.config.get<string>('SQS_QUEUE_URL') ||
      this.config.get<string>('SQS_ORDER_QUEUE_URL') ||
      '';
    this.client = new SQSClient(awsClientOptions(this.config));
  }

  onModuleInit(): void {
    if (!this.queueUrl) {
      this.logger.warn('SQS_QUEUE_URL ausente; consumer SNS/SQS desligado');
      return;
    }
    this.running = true;
    this.loop = this.pollLoop();
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    await this.loop;
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        const result = await this.client.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 5,
            WaitTimeSeconds: 10,
            MessageAttributeNames: ['All'],
          }),
        );

        for (const message of result.Messages ?? []) {
          try {
            await this.handleRaw(message.Body ?? '{}');
            if (message.ReceiptHandle) {
              await this.client.send(
                new DeleteMessageCommand({
                  QueueUrl: this.queueUrl,
                  ReceiptHandle: message.ReceiptHandle,
                }),
              );
            }
          } catch (error) {
            this.logger.error(
              `falha ao processar mensagem: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `erro no poll SQS: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  async handleRaw(body: string): Promise<void> {
    const parsed = JSON.parse(body) as IncomingEvent | { Message?: string };
    const event: IncomingEvent =
      'Message' in parsed && parsed.Message
        ? (JSON.parse(parsed.Message) as IncomingEvent)
        : (parsed as IncomingEvent);
    await this.dispatch(event);
  }

  private async dispatch(event: IncomingEvent): Promise<void> {
    this.logger.log(
      `consume type=${event.type} correlationId=${event.correlationId} eventId=${event.eventId}`,
    );

    switch (event.type) {
      case 'billing.budget.generated': {
        const payload = event.payload as {
          budgetId: string;
          serviceOrderId: string;
          items: BudgetItem[];
          servicesTotal: number;
          partsTotal: number;
          total: number;
        };
        await this.applyBudget.execute(payload);
        break;
      }
      case 'billing.budget.failed': {
        const payload = event.payload as {
          serviceOrderId: string;
          reason: string;
        };
        await this.saga.onBudgetFailed(payload.serviceOrderId, payload.reason);
        break;
      }
      case 'billing.payment.created': {
        const payload = event.payload as { serviceOrderId: string };
        await this.saga.onPaymentCreated(payload.serviceOrderId);
        break;
      }
      case 'billing.payment.confirmed': {
        const payload = event.payload as { serviceOrderId: string };
        await this.saga.onPaymentConfirmed(payload.serviceOrderId);
        break;
      }
      case 'billing.payment.failed': {
        const payload = event.payload as {
          serviceOrderId: string;
          reason?: string;
        };
        await this.saga.cancelFromSaga(
          payload.serviceOrderId,
          payload.reason ?? 'Falha no pagamento',
        );
        break;
      }
      case 'stock.reservation.failed': {
        const payload = event.payload as {
          serviceOrderId: string;
          reason?: string;
        };
        await this.saga.cancelFromSaga(
          payload.serviceOrderId,
          payload.reason ?? 'Falha na reserva de estoque',
        );
        break;
      }
      default:
        this.logger.debug(`evento ignorado type=${event.type}`);
    }
  }
}

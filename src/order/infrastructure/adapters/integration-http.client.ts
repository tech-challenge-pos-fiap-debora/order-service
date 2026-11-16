import { Inject, Injectable } from '@nestjs/common';
import { IntegrationError } from '../../../shared/domain/errors';
import {
  TELEMETRY,
  type TelemetryPort,
} from '../../../shared/domain/ports/telemetry.port';

export type IntegrationTarget = 'identity-service' | 'stock-service';

const TARGET_ENV: Record<IntegrationTarget, string> = {
  'identity-service': 'IDENTITY_SERVICE_URL',
  'stock-service': 'STOCK_SERVICE_URL',
};

/**
 * Cliente HTTP mínimo para chamadas entre microsserviços. A URL base vem do
 * ambiente; se não estiver configurada a chamada falha com erro claro (503),
 * em vez de a aplicação cair no boot.
 */
@Injectable()
export class IntegrationHttpClient {
  constructor(@Inject(TELEMETRY) private readonly telemetry: TelemetryPort) {}

  baseUrl(target: IntegrationTarget): string {
    const envName = TARGET_ENV[target];
    const url = process.env[envName]?.trim();
    if (!url) {
      const error = new IntegrationError(
        `${envName} não configurada: integração com ${target} indisponível`,
        { code: 'INTEGRATION_NOT_CONFIGURED' },
      );
      this.fail(target, 'not-configured', error);
      throw error;
    }
    return url.replace(/\/+$/, '');
  }

  /** Retorna `null` em 404 quando `allowNotFound` é verdadeiro. */
  async request<T>(
    target: IntegrationTarget,
    method: 'GET' | 'POST',
    path: string,
    options: { body?: unknown; allowNotFound?: boolean } = {},
  ): Promise<T | null> {
    const url = `${this.baseUrl(target)}${path}`;
    const token = process.env.INTEGRATION_SERVICE_TOKEN?.trim();

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(
          Number(process.env.INTEGRATION_TIMEOUT_MS ?? 5000),
        ),
      });
    } catch (cause) {
      const error = new IntegrationError(
        `Falha ao chamar ${target} (${method} ${path}): ${
          cause instanceof Error ? cause.message : 'erro desconhecido'
        }`,
        { code: 'INTEGRATION_UNREACHABLE' },
      );
      this.fail(target, 'unreachable', error);
      throw error;
    }

    if (response.status === 404 && options.allowNotFound) {
      return null;
    }
    if (!response.ok) {
      const error = new IntegrationError(
        `${target} respondeu ${response.status} em ${method} ${path}`,
        { code: 'INTEGRATION_BAD_RESPONSE' },
      );
      this.fail(target, `http-${response.status}`, error);
      throw error;
    }
    if (response.status === 204) {
      return null;
    }
    return (await response.json()) as T;
  }

  private fail(target: IntegrationTarget, reason: string, error: Error): void {
    this.telemetry.recordEvent('IntegrationFailureEvent', { target, reason });
    this.telemetry.recordError(error, { target, reason });
  }
}

import { Injectable } from '@nestjs/common';
import type {
  StockAvailabilityItem,
  StockDemandItem,
  StockQuoteItem,
  StockServicePort,
} from '../../../shared/domain/ports/stock-service.port';
import { IntegrationHttpClient } from './integration-http.client';

/**
 * Stub HTTP do stock-service (disponibilidade, cotação FIFO e baixa).
 * Contrato esperado: `POST /stock/availability`, `POST /stock/quote` e
 * `POST /stock/decrease`.
 */
@Injectable()
export class HttpStockService implements StockServicePort {
  constructor(private readonly http: IntegrationHttpClient) {}

  async getAvailability(
    demand: StockDemandItem[],
  ): Promise<StockAvailabilityItem[]> {
    const result = await this.http.request<StockAvailabilityItem[]>(
      'stock-service',
      'POST',
      '/stock/availability',
      { body: { items: demand } },
    );
    return result ?? [];
  }

  async quoteFifoCost(demand: StockDemandItem[]): Promise<StockQuoteItem[]> {
    const result = await this.http.request<StockQuoteItem[]>(
      'stock-service',
      'POST',
      '/stock/quote',
      { body: { items: demand } },
    );
    return result ?? [];
  }

  async decreaseStock(productCode: string, quantity: number): Promise<void> {
    await this.http.request('stock-service', 'POST', '/stock/decrease', {
      body: { productCode, quantity },
    });
  }
}

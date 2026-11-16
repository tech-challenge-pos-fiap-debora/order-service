import { Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors';
import type {
  ProductLookupPort,
  ProductSnapshot,
} from '../../domain/ports/product-lookup.port';
import type {
  ProductProvisioningPort,
  ProvisionProductInput,
} from '../../domain/ports/product-provisioning.port';
import { IntegrationHttpClient } from './integration-http.client';

/**
 * Stub HTTP do stock-service (produtos). O lookup devolve id + code + name.
 * Contrato esperado: `GET /product/:code` e `POST /product/get-or-create`.
 */
@Injectable()
export class HttpStockProductAdapter
  implements ProductLookupPort, ProductProvisioningPort
{
  constructor(private readonly http: IntegrationHttpClient) {}

  async findByCode(code: string): Promise<ProductSnapshot> {
    const product = await this.findByCodeOrNull(code);
    if (!product) {
      throw new EntityNotFoundError(`Product "${code}" not found`);
    }
    return product;
  }

  async findByCodeOrNull(code: string): Promise<ProductSnapshot | null> {
    const raw = await this.http.request<ProductSnapshot>(
      'stock-service',
      'GET',
      `/product/${encodeURIComponent(code)}`,
      { allowNotFound: true },
    );
    return raw ? { id: raw.id, code: raw.code, name: raw.name } : null;
  }

  async getOrCreate(input: ProvisionProductInput): Promise<ProductSnapshot> {
    const raw = await this.http.request<ProductSnapshot>(
      'stock-service',
      'POST',
      '/product/get-or-create',
      { body: input },
    );
    if (!raw) {
      throw new EntityNotFoundError(`Product "${input.code}" not found`);
    }
    return { id: raw.id, code: raw.code, name: raw.name };
  }
}

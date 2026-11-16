import { Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors';
import type {
  ClientLookupPort,
  ClientSnapshot,
} from '../../domain/ports/client-lookup.port';
import type {
  ClientProvisioningPort,
  ProvisionClientInput,
} from '../../domain/ports/client-provisioning.port';
import { IntegrationHttpClient } from './integration-http.client';

/**
 * Stub HTTP do identity-service (clientes).
 * Contrato esperado: `GET /client/:id` e `POST /client/get-or-create`.
 */
@Injectable()
export class HttpIdentityClientAdapter
  implements ClientLookupPort, ClientProvisioningPort
{
  constructor(private readonly http: IntegrationHttpClient) {}

  findById(id: string): Promise<ClientSnapshot | null> {
    return this.http.request<ClientSnapshot>(
      'identity-service',
      'GET',
      `/client/${encodeURIComponent(id)}`,
      { allowNotFound: true },
    );
  }

  async getOrCreate(input: ProvisionClientInput): Promise<ClientSnapshot> {
    const client = await this.http.request<ClientSnapshot>(
      'identity-service',
      'POST',
      '/client/get-or-create',
      { body: input },
    );
    if (!client) {
      throw new EntityNotFoundError('Client not found');
    }
    return client;
  }
}

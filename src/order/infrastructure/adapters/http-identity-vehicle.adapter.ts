import { Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors';
import type {
  VehicleLookupPort,
  VehicleSnapshot,
} from '../../domain/ports/vehicle-lookup.port';
import type {
  ProvisionVehicleInput,
  VehicleProvisioningPort,
} from '../../domain/ports/vehicle-provisioning.port';
import { IntegrationHttpClient } from './integration-http.client';

/**
 * Stub HTTP do identity-service (veículos).
 * Contrato esperado: `GET /vehicle/:id` e `POST /vehicle/get-or-create`.
 */
@Injectable()
export class HttpIdentityVehicleAdapter
  implements VehicleLookupPort, VehicleProvisioningPort
{
  constructor(private readonly http: IntegrationHttpClient) {}

  findById(id: string): Promise<VehicleSnapshot | null> {
    return this.http.request<VehicleSnapshot>(
      'identity-service',
      'GET',
      `/vehicle/${encodeURIComponent(id)}`,
      { allowNotFound: true },
    );
  }

  async getOrCreate(input: ProvisionVehicleInput): Promise<VehicleSnapshot> {
    const vehicle = await this.http.request<VehicleSnapshot>(
      'identity-service',
      'POST',
      '/vehicle/get-or-create',
      { body: input },
    );
    if (!vehicle) {
      throw new EntityNotFoundError('Vehicle not found');
    }
    return vehicle;
  }
}

import { CatalogService } from '../../../domain/entities/catalog-service';
import type { CatalogServiceRepositoryInterface } from '../../../domain/repositories/catalog-service.repository';
import {
  InMemoryProductLookup,
  TEST_PRODUCT_CODE,
  TEST_PRODUCT_ID,
} from '../service-order/__fakes__/service-order.fakes';
import { CreateCatalogServiceUseCase } from './create-catalog-service';
import { DeleteCatalogServiceUseCase } from './delete-catalog-service';
import { GetAllCatalogServicesUseCase } from './get-all-catalog-service';
import { GetCatalogServiceUseCase } from './get-catalog-service';
import { UpdateCatalogServiceUseCase } from './update-catalog-service';

class MemoryCatalogRepo implements CatalogServiceRepositoryInterface {
  readonly items = new Map<string, CatalogService>();

  async create(data: CatalogService): Promise<CatalogService> {
    this.items.set(data.id, data);
    return data;
  }
  async find(): Promise<CatalogService[]> {
    return [...this.items.values()];
  }
  async findById(id: string): Promise<CatalogService | null> {
    return this.items.get(id) ?? null;
  }
  async updateById(
    id: string,
    data: {
      name: string;
      description?: string;
      basePrice: number;
      active: boolean;
      defaultParts: Array<{ productCode: string; quantity: number }>;
    },
  ): Promise<CatalogService | null> {
    if (!this.items.has(id)) return null;
    const updated = CatalogService.create(data, id);
    this.items.set(id, updated);
    return updated;
  }
  async remove(id: string): Promise<void> {
    this.items.delete(id);
  }
}

describe('catalog service use cases', () => {
  const products = new InMemoryProductLookup().seed({
    id: TEST_PRODUCT_ID,
    code: TEST_PRODUCT_CODE,
    name: 'Correia',
  });

  it('cria, lista, atualiza, busca e remove', async () => {
    const repo = new MemoryCatalogRepo();
    const created = await new CreateCatalogServiceUseCase(
      repo,
      products,
    ).execute({
      name: ' Troca de correia ',
      description: 'serviço',
      basePrice: 150,
      defaultParts: [{ productCode: TEST_PRODUCT_CODE, quantity: 1 }],
    });
    expect(created.name).toBe('Troca de correia');
    expect(created.defaultParts[0].productCode).toBe(TEST_PRODUCT_CODE);

    expect(await new GetAllCatalogServicesUseCase(repo).execute()).toHaveLength(
      1,
    );
    expect(
      (await new GetCatalogServiceUseCase(repo).execute(created.id)).id,
    ).toBe(created.id);

    const updated = await new UpdateCatalogServiceUseCase(
      repo,
      products,
    ).execute(created.id, { basePrice: 180, active: false });
    expect(updated.basePrice).toBe(180);
    expect(updated.active).toBe(false);

    await new DeleteCatalogServiceUseCase(repo).execute(created.id);
    expect(repo.items.size).toBe(0);
  });

  it('falha ao criar com produto inexistente', async () => {
    const repo = new MemoryCatalogRepo();
    await expect(
      new CreateCatalogServiceUseCase(repo, products).execute({
        name: 'X',
        basePrice: 10,
        defaultParts: [{ productCode: 'MISSING', quantity: 1 }],
      }),
    ).rejects.toThrow(/not found/i);
  });
});

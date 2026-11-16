import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { CatalogService } from '../../../../domain/entities/catalog-service';
import type {
  CatalogServiceRepositoryInterface,
  CatalogServiceUpdateInput,
} from '../../../../domain/repositories/catalog-service.repository';
import {
  CATALOG_SERVICE_MODEL,
  type CatalogServiceDoc,
} from '../schemas/catalog-service.schema';

@Injectable()
export class MongoCatalogServiceRepository implements CatalogServiceRepositoryInterface {
  constructor(
    @InjectModel(CATALOG_SERVICE_MODEL)
    private readonly model: Model<CatalogServiceDoc>,
  ) {}

  private toDomain(doc: CatalogServiceDoc): CatalogService {
    return CatalogService.create(
      {
        name: doc.name,
        description: doc.description ?? undefined,
        basePrice: Number(doc.basePrice),
        active: doc.active,
        defaultParts: (doc.defaultParts ?? []).map((p) => ({
          productCode: p.productCode,
          quantity: Number(p.quantity),
        })),
      },
      doc._id,
    );
  }

  private toDocument(
    entity: CatalogService,
    createdAt: Date,
    updatedAt: Date,
  ): CatalogServiceDoc {
    return {
      _id: entity.id,
      name: entity.name,
      description: entity.description ?? null,
      basePrice: entity.basePrice,
      active: entity.active,
      defaultParts: entity.defaultParts.map((p) => ({
        productCode: p.productCode,
        quantity: p.quantity,
      })),
      createdAt,
      updatedAt,
    };
  }

  async create(data: CatalogService): Promise<CatalogService> {
    const now = new Date();
    const doc = this.toDocument(data, now, now);
    await this.model.collection.insertOne(doc as never);
    return this.toDomain(doc);
  }

  async find(): Promise<CatalogService[]> {
    const docs = await this.model
      .find()
      .sort({ name: 1 })
      .lean<CatalogServiceDoc[]>();
    return docs.map((d) => this.toDomain(d));
  }

  async findById(id: string): Promise<CatalogService | null> {
    const doc = await this.model.findById(id).lean<CatalogServiceDoc>();
    return doc ? this.toDomain(doc) : null;
  }

  async updateById(
    id: string,
    data: CatalogServiceUpdateInput,
  ): Promise<CatalogService | null> {
    const existing = await this.model.findById(id).lean<CatalogServiceDoc>();
    if (!existing) return null;

    const entity = this.toDomain(existing);
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as CatalogServiceUpdateInput;
    entity.update(payload);

    const doc = this.toDocument(
      entity,
      new Date(existing.createdAt),
      new Date(),
    );
    await this.model.collection.replaceOne({ _id: id } as never, doc);
    return this.toDomain(doc);
  }

  async remove(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id });
  }
}

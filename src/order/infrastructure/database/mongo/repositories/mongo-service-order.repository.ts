import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ServiceOrder } from '../../../../domain/entities/service-order';
import { ServiceOrderStatus } from '../../../../domain/entities/service-order-status';
import type { ServiceOrderRepositoryInterface } from '../../../../domain/repositories/service-order.repository';
import { DocumentVO } from '../../../../../shared/domain/value-objects/document.vo';
import { PlateVO } from '../../../../../shared/domain/value-objects/plate.vo';
import {
  documentToServiceOrder,
  serviceOrderToDocument,
} from '../service-order.mapper';
import {
  SERVICE_ORDER_MODEL,
  type ServiceOrderDoc,
} from '../schemas/service-order.schema';

@Injectable()
export class MongoServiceOrderRepository implements ServiceOrderRepositoryInterface {
  constructor(
    @InjectModel(SERVICE_ORDER_MODEL)
    private readonly model: Model<ServiceOrderDoc>,
  ) {}

  async create(order: ServiceOrder): Promise<ServiceOrder> {
    const doc = serviceOrderToDocument(order);
    await this.model.collection.insertOne(doc as never);
    return documentToServiceOrder(doc);
  }

  async find(): Promise<ServiceOrder[]> {
    const docs = await this.model
      .find({
        status: {
          $nin: [
            ServiceOrderStatus.DELIVERED,
            ServiceOrderStatus.FINISHED,
            ServiceOrderStatus.CANCELLED,
          ],
        },
      })
      .sort({ createdAt: 1 })
      .lean<ServiceOrderDoc[]>();
    return docs.map(documentToServiceOrder);
  }

  async findById(id: string): Promise<ServiceOrder | null> {
    const doc = await this.model.findById(id).lean<ServiceOrderDoc>();
    return doc ? documentToServiceOrder(doc) : null;
  }

  async findOpenByDocument(
    document: string,
    plate?: string,
  ): Promise<ServiceOrder[]> {
    const filter: Record<string, unknown> = {
      'client.document': DocumentVO.parse(document).value,
      status: {
        $nin: [ServiceOrderStatus.DELIVERED, ServiceOrderStatus.CANCELLED],
      },
    };
    if (plate) {
      filter['vehicle.plate'] = PlateVO.parse(plate).value;
    }

    const docs = await this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .lean<ServiceOrderDoc[]>();
    return docs.map(documentToServiceOrder);
  }

  async findFinished(): Promise<ServiceOrder[]> {
    const docs = await this.model
      .find({ startedAt: { $ne: null }, finishedAt: { $ne: null } })
      .lean<ServiceOrderDoc[]>();
    return docs.map(documentToServiceOrder);
  }

  async save(order: ServiceOrder): Promise<ServiceOrder | null> {
    const doc = serviceOrderToDocument(order);
    const result = await this.model.collection.replaceOne(
      { _id: order.id } as never,
      doc,
    );
    return result.matchedCount === 0 ? null : documentToServiceOrder(doc);
  }
}

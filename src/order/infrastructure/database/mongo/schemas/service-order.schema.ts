import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export const SERVICE_ORDER_MODEL = 'ServiceOrder';
export const SERVICE_ORDERS_COLLECTION = 'service_orders';

export type ServiceOrderClientDoc = {
  id: string;
  document: string;
  name: string;
};

export type ServiceOrderVehicleDoc = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
};

export type ServiceOrderServiceLineDoc = {
  id: string;
  catalogServiceId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  defaultParts: { productCode: string; name: string; quantity: number }[];
};

export type ServiceOrderPartLineDoc = {
  id: string;
  productId: string | null;
  productCode: string;
  name: string;
  quantity: number;
};

export type ServiceOrderBudgetDoc = {
  items: {
    type: string;
    referenceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  servicesTotal: number;
  partsTotal: number;
  total: number;
  approved: boolean;
  approvedAt?: Date | null;
};

export type ServiceOrderStatusHistoryDoc = {
  from: string | null;
  to: string;
  at: Date;
};

/** Documento da coleção `service_orders` (`_id` = UUID de negócio). */
@Schema({
  collection: SERVICE_ORDERS_COLLECTION,
  versionKey: false,
  timestamps: false,
})
export class ServiceOrderDoc {
  @Prop({ type: String })
  _id!: string;

  @Prop({ type: String, required: true })
  status!: string;

  @Prop({ type: Object, required: true })
  client!: ServiceOrderClientDoc;

  @Prop({ type: Object, required: true })
  vehicle!: ServiceOrderVehicleDoc;

  @Prop({ type: String, default: null })
  requestedServicesDescription?: string | null;

  @Prop({ type: String, default: null })
  diagnosis?: string | null;

  @Prop({ type: [Object], default: [] })
  serviceLines!: ServiceOrderServiceLineDoc[];

  @Prop({ type: [Object], default: [] })
  partLines!: ServiceOrderPartLineDoc[];

  @Prop({ type: Object, default: null })
  budget?: ServiceOrderBudgetDoc | null;

  @Prop({ type: [Object], default: [] })
  statusHistory!: ServiceOrderStatusHistoryDoc[];

  @Prop({ type: Date, default: null })
  startedAt?: Date | null;

  @Prop({ type: Date, default: null })
  finishedAt?: Date | null;

  @Prop({ type: Date, default: null })
  deliveredAt?: Date | null;

  @Prop({ type: String, default: null })
  cancellationReason?: string | null;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: Date, required: true })
  updatedAt!: Date;
}

export const ServiceOrderSchema = SchemaFactory.createForClass(ServiceOrderDoc);

ServiceOrderSchema.index({ status: 1, createdAt: 1 });
ServiceOrderSchema.index({ 'client.document': 1, status: 1 });
ServiceOrderSchema.index({ 'vehicle.plate': 1 });
ServiceOrderSchema.index({ startedAt: 1, finishedAt: 1 });

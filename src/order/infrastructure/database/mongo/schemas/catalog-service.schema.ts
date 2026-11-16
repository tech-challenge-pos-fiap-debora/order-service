import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export const CATALOG_SERVICE_MODEL = 'CatalogService';
export const CATALOG_SERVICES_COLLECTION = 'catalog_services';

export type CatalogServiceDefaultPartDoc = {
  productCode: string;
  quantity: number;
};

/** Documento da coleção `catalog_services` (`_id` = UUID de negócio). */
@Schema({
  collection: CATALOG_SERVICES_COLLECTION,
  versionKey: false,
  timestamps: false,
})
export class CatalogServiceDoc {
  @Prop({ type: String })
  _id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, default: null })
  description?: string | null;

  @Prop({ type: Number, required: true })
  basePrice!: number;

  @Prop({ type: Boolean, default: true })
  active!: boolean;

  @Prop({ type: [Object], default: [] })
  defaultParts!: CatalogServiceDefaultPartDoc[];

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: Date, required: true })
  updatedAt!: Date;
}

export const CatalogServiceSchema =
  SchemaFactory.createForClass(CatalogServiceDoc);

CatalogServiceSchema.index({ active: 1 });
CatalogServiceSchema.index({ name: 1 });

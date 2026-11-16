import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CATALOG_SERVICE_REPOSITORY } from '../../domain/repositories/catalog-service-repository.token';
import { MongoCatalogServiceRepository } from './mongo/repositories/mongo-catalog-service.repository';
import {
  CATALOG_SERVICE_MODEL,
  CatalogServiceSchema,
} from './mongo/schemas/catalog-service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CATALOG_SERVICE_MODEL, schema: CatalogServiceSchema },
    ]),
  ],
  providers: [
    {
      provide: CATALOG_SERVICE_REPOSITORY,
      useClass: MongoCatalogServiceRepository,
    },
  ],
  exports: [CATALOG_SERVICE_REPOSITORY],
})
export class CatalogServiceDatabaseModule {}

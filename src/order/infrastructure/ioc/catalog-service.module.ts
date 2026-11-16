import { Module } from '@nestjs/common';
import {
  CreateCatalogServiceUseCase,
  DeleteCatalogServiceUseCase,
  GetAllCatalogServicesUseCase,
  GetCatalogServiceUseCase,
  UpdateCatalogServiceUseCase,
} from '../../application/use-case/catalog-service';
import { CatalogServiceController } from '../../interfaces/http/catalog-service/catalog-service.controller';
import { CatalogServiceDatabaseModule } from '../database/catalog-service-database.module';
import { OrderAdaptersModule } from '../adapters/adapters.module';

@Module({
  imports: [CatalogServiceDatabaseModule, OrderAdaptersModule],
  providers: [
    CreateCatalogServiceUseCase,
    GetAllCatalogServicesUseCase,
    GetCatalogServiceUseCase,
    UpdateCatalogServiceUseCase,
    DeleteCatalogServiceUseCase,
  ],
  controllers: [CatalogServiceController],
})
export class CatalogServiceModule {}

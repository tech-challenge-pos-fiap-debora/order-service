import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

export const DEFAULT_MONGO_DB_NAME = 'order';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error('MONGODB_URI is not set');
        }
        return {
          uri,
          dbName: config.get<string>('MONGODB_DB') || DEFAULT_MONGO_DB_NAME,
          serverSelectionTimeoutMS: Number(
            config.get<string>('MONGODB_SERVER_SELECTION_TIMEOUT_MS') ?? 5000,
          ),
        };
      },
    }),
  ],
})
export class MongoModule {}

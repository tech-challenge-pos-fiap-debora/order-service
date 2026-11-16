import mongoose from 'mongoose';
import {
  INTEGRATION_MONGODB_DB,
  INTEGRATION_MONGODB_URI,
} from './database-url';

export async function resetIntegrationDatabase(): Promise<void> {
  const connection = await mongoose
    .createConnection(INTEGRATION_MONGODB_URI, {
      dbName: INTEGRATION_MONGODB_DB,
      serverSelectionTimeoutMS: 5000,
    })
    .asPromise();

  try {
    await connection.dropDatabase();
  } finally {
    await connection.close();
  }
}

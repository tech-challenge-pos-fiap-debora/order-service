#!/usr/bin/env node
// Seed idempotente do catálogo demo (coleção `catalog_services`).
// Uso: MONGODB_URI=mongodb://localhost:27018/order node scripts/seed-mongo.mjs
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || 'order';

const catalog = [
  {
    _id: '33333333-3333-4333-8333-333333333301',
    name: 'Troca de óleo (demo)',
    description: 'Fixture para testes locais',
    basePrice: 120,
    active: true,
    defaultParts: [
      { productCode: 'DEMO-OIL-01', quantity: 1 },
      { productCode: 'DEMO-FILTER-01', quantity: 1 },
    ],
  },
  {
    _id: '33333333-3333-4333-8333-333333333302',
    name: 'Alinhamento e balanceamento (demo)',
    description: 'Fixture para testes locais',
    basePrice: 150,
    active: true,
    defaultParts: [],
  },
];

await mongoose.connect(uri, { dbName });

try {
  const db = mongoose.connection.db;
  const catalogServices = db.collection('catalog_services');
  const now = new Date();

  for (const { _id, ...fields } of catalog) {
    await catalogServices.updateOne(
      { _id },
      {
        $set: { ...fields, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  await catalogServices.createIndex({ active: 1 });
  await catalogServices.createIndex({ name: 1 });

  const serviceOrders = db.collection('service_orders');
  await serviceOrders.createIndex({ status: 1, createdAt: 1 });
  await serviceOrders.createIndex({ 'client.document': 1, status: 1 });
  await serviceOrders.createIndex({ 'vehicle.plate': 1 });
  await serviceOrders.createIndex({ startedAt: 1, finishedAt: 1 });

  console.log(
    `Seed ok em "${dbName}": ${catalog.length} serviços de catálogo (upsert).`,
  );
} finally {
  await mongoose.disconnect();
}

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { serverRoot } from './paths.js';

let memoryServer;

const LOCAL_PORT = 27018;
const dbPath = path.join(
  process.env.LOCALAPPDATA || path.join(serverRoot, 'data'),
  'garissa-sportsconnect',
  'mongo'
);

async function connectExisting() {
  const uri = `mongodb://127.0.0.1:${LOCAL_PORT}/garissa_sportsconnect`;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 1200 });
    await mongoose.connection.db.admin().ping();
    console.log('Connected to existing local MongoDB.');
    return true;
  } catch {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => {});
    return false;
  }
}

async function startEmbedded(wipe) {
  if (wipe) fs.rmSync(dbPath, { recursive: true, force: true });
  fs.mkdirSync(dbPath, { recursive: true });
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({
    instance: {
      port: LOCAL_PORT,
      dbName: 'garissa_sportsconnect',
      dbPath,
      storageEngine: 'wiredTiger',
    },
  });
  await mongoose.connect(memoryServer.getUri(), { dbName: 'garissa_sportsconnect' });
}

export async function connectDB() {
  const uri = process.env.MONGO_URI?.trim();
  if (uri) {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGO_URI is required in production. Add your MongoDB Atlas connection string.');
  }

  if (await connectExisting()) return;

  try {
    await startEmbedded(false);
  } catch (error) {
    console.warn('Local database could not be reused. Creating a fresh one.');
    console.warn(error?.message || error);
    if (memoryServer) {
      await memoryServer.stop(true).catch(() => {});
      memoryServer = null;
    }
    await mongoose.disconnect().catch(() => {});
    await startEmbedded(true);
  }
  console.log(`Connected to local persistent MongoDB at ${dbPath}.`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop(false);
    memoryServer = null;
  }
}

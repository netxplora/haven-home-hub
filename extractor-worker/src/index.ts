import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { processExtractionJob } from './queue/worker';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = 'property_extraction';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

console.log('Starting Extraction Worker...');

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`[Job ${job.id}] Processing URL: ${job.data.url}`);
    await processExtractionJob(job);
  },
  { 
    connection: connection as any,
    concurrency: 2 // Handle 2 extractions concurrently
  }
);

worker.on('completed', (job) => {
  console.log(`[Job ${job.id}] Completed successfully`);
});

worker.on('failed', (job, err) => {
  console.log(`[Job ${job?.id}] Failed with error: ${err.message}`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});

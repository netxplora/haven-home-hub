import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { processExtractionJob } from './queue/worker';

dotenv.config({ path: '../.env' }); // Adjust path if needed to find Supabase credentials

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Starting Extraction Worker (Supabase Polling Mode)...');

async function pollJobs() {
  try {
    // Fetch one pending job
    const { data: jobs, error } = await supabase
      .from('extraction_jobs')
      .select('*')
      .eq('status', 'pending')
      .limit(1);

    if (error) throw error;

    if (jobs && jobs.length > 0) {
      const job = jobs[0];
      console.log(`[Job ${job.id}] Picked up pending job for URL: ${job.url}`);
      
      // Mark as initializing so other workers don't pick it up
      await supabase.from('extraction_jobs').update({ status: 'initializing' }).eq('id', job.id);

      // Process it (we simulate the BullMQ job object structure)
      await processExtractionJob({
        data: { url: job.url, jobId: job.id }
      } as any).catch(e => console.error(`Job failed:`, e));
    }
  } catch (e) {
    console.error("Polling error:", e);
  }

  // Poll every 3 seconds
  setTimeout(pollJobs, 3000);
}

pollJobs();

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  process.exit(0);
});

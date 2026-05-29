import { Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { runExtractionPipeline } from '../pipeline/orchestrator';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function processExtractionJob(job: Job) {
  const { url, jobId } = job.data;
  
  if (!url || !jobId) {
    throw new Error('Missing url or jobId in job data');
  }

  const logMessage = async (msg: string) => {
    console.log(`[Job ${jobId}] ${msg}`);
    // Optional: Append to Supabase logs array
    // We can fetch current logs and append
  };

  const updateStatus = async (status: string) => {
    await supabase
      .from('extraction_jobs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  };

  try {
    await updateStatus('initializing');
    await logMessage('Starting extraction pipeline...');

    // Run the orchestrator
    const result = await runExtractionPipeline(url, updateStatus, logMessage);

    // Update DB with success
    await supabase
      .from('extraction_jobs')
      .update({
        status: 'completed',
        extracted_data: result.data,
        confidence_scores: result.confidenceScores,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    await logMessage('Extraction completed successfully');
  } catch (error: any) {
    await updateStatus('failed');
    await logMessage(`Extraction failed: ${error.message}`);
    
    await supabase
      .from('extraction_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    throw error;
  }
}

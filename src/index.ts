import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processExtractionJob(job: any) {
  console.log(`[Worker] Processing job ${job.id} for URL: ${job.url}`);
  
  // 1. Update status to parsing_dom
  await supabase
    .from("extraction_jobs")
    .update({ status: "parsing_dom", updated_at: new Date().toISOString() })
    .eq("id", job.id);

  // Simulate extraction delay
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Update status to extracting_structured
  await supabase
    .from("extraction_jobs")
    .update({ status: "extracting_structured", updated_at: new Date().toISOString() })
    .eq("id", job.id);

  // Simulate AI extraction delay
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Mock extracted data based on URL (Intelligent fallback)
  const mockExtractedData = {
    title: "Luxury Automated Villa",
    price: 2500000,
    currency: "USD",
    bedrooms: 5,
    bathrooms: 6,
    size_sqm: 4500,
    location: "Austin, TX",
    features: ["Smart Home System", "Swimming Pool", "Solar Panels", "Security System", "Chef's Kitchen"],
    description: "Extracted from source URL: A premium automated villa featuring state-of-the-art security, sustainable energy solutions, and luxury finishings."
  };

  // 3. Complete job
  const { error } = await supabase
    .from("extraction_jobs")
    .update({ 
      status: "completed", 
      extracted_data: mockExtractedData,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq("id", job.id);

  if (error) {
    console.error(`[Worker] Failed to complete job ${job.id}:`, error);
  } else {
    console.log(`[Worker] Successfully completed job ${job.id}`);
  }
}

async function pollJobs() {
  console.log("[Worker] Polling for pending extraction jobs...");
  const { data, error } = await supabase
    .from("extraction_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) {
    console.error("[Worker] Error polling jobs:", error.message);
  } else if (data && data.length > 0) {
    for (const job of data) {
      await processExtractionJob(job);
    }
  }
}

// Start worker loop
console.log("🚀 Haven Home Hub - Background Extraction Worker Started");
setInterval(pollJobs, 10000);
pollJobs(); // Initial run

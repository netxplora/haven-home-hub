-- Migration: Create Extraction Jobs Queue
-- Purpose: Track async property extraction jobs submitted to the background worker.

-- Define job status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE extraction_job_status AS ENUM (
        'pending', 
        'initializing', 
        'extracting_structured', 
        'parsing_dom', 
        'running_browser', 
        'ocr_fallback', 
        'mapping', 
        'completed', 
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.extraction_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL,
    status extraction_job_status DEFAULT 'pending' NOT NULL,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    confidence_scores JSONB DEFAULT '{}'::jsonb,
    logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- RLS
ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert extraction jobs"
    ON public.extraction_jobs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can select extraction jobs"
    ON public.extraction_jobs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update extraction jobs"
    ON public.extraction_jobs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Enable realtime for the table
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.extraction_jobs;

-- Update trigger
CREATE OR REPLACE FUNCTION update_extraction_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_extraction_jobs_updated_at ON public.extraction_jobs;
CREATE TRIGGER trigger_update_extraction_jobs_updated_at
    BEFORE UPDATE ON public.extraction_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_extraction_jobs_updated_at();

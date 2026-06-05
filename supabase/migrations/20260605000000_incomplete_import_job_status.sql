-- Migration: Add incomplete_import to extraction_job_status
ALTER TYPE extraction_job_status ADD VALUE 'incomplete_import';

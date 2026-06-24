-- Migration: Create Careers CMS System

-- 1. Settings Table
CREATE TABLE IF NOT EXISTS public.careers_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hero_title TEXT NOT NULL DEFAULT 'Build Your Career With TrustBank',
    hero_subtitle TEXT,
    hero_description TEXT DEFAULT 'Join our innovative team',
    hero_background_url TEXT,
    cta_text TEXT DEFAULT 'View Open Positions',
    cta_link TEXT DEFAULT '#openings',
    cta_enabled BOOLEAN DEFAULT true,
    total_employees INTEGER DEFAULT 0,
    countries_served INTEGER DEFAULT 0,
    open_positions INTEGER DEFAULT 0,
    accept_applications BOOLEAN DEFAULT true,
    accept_cv_uploads BOOLEAN DEFAULT true,
    allowed_file_types TEXT[] DEFAULT ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    max_upload_size_mb INTEGER DEFAULT 5,
    seo_title TEXT,
    seo_description TEXT,
    seo_og_title TEXT,
    seo_og_description TEXT,
    seo_og_image TEXT,
    seo_canonical_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert singleton row if not exists
INSERT INTO public.careers_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.careers_settings);

-- 2. Benefits Table
CREATE TABLE IF NOT EXISTS public.careers_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Job Categories Table
CREATE TABLE IF NOT EXISTS public.careers_job_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Jobs Table
CREATE TABLE IF NOT EXISTS public.careers_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category_id UUID REFERENCES public.careers_job_categories(id) ON DELETE SET NULL,
    department TEXT NOT NULL,
    employment_type TEXT NOT NULL,
    location TEXT NOT NULL,
    experience_level TEXT,
    salary_range TEXT,
    description TEXT,
    responsibilities TEXT,
    requirements TEXT,
    benefits TEXT,
    application_deadline TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('open', 'closed', 'draft', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Culture Table
CREATE TABLE IF NOT EXISTS public.careers_culture (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Testimonials Table
CREATE TABLE IF NOT EXISTS public.careers_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name TEXT NOT NULL,
    position TEXT NOT NULL,
    department TEXT,
    photo_url TEXT,
    testimonial TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Process Table
CREATE TABLE IF NOT EXISTS public.careers_process (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. FAQs Table
CREATE TABLE IF NOT EXISTS public.careers_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Applicants Table
CREATE TABLE IF NOT EXISTS public.careers_applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.careers_jobs(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    cv_url TEXT,
    cover_letter TEXT,
    status TEXT DEFAULT 'Received' CHECK (status IN ('Received', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Hired', 'Rejected')),
    internal_notes TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure Applications Bucket Exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('applications', 'applications', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for applications bucket
-- Admins can do anything
DROP POLICY IF EXISTS "Admins have full access to applications" ON storage.objects;
CREATE POLICY "Admins have full access to applications" ON storage.objects
FOR ALL USING (bucket_id = 'applications' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Public can upload new CVs (insert only)
DROP POLICY IF EXISTS "Public can upload applications" ON storage.objects;
CREATE POLICY "Public can upload applications" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'applications');

-- Row Level Security (RLS)
ALTER TABLE public.careers_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.careers_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.careers_job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.careers_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.careers_culture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.careers_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.careers_process ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.careers_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.careers_applicants ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- Public Read Policies
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Public read careers_settings" ON public.careers_settings;
CREATE POLICY "Public read careers_settings" ON public.careers_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active careers_benefits" ON public.careers_benefits;
CREATE POLICY "Public read active careers_benefits" ON public.careers_benefits FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Public read careers_job_categories" ON public.careers_job_categories;
CREATE POLICY "Public read careers_job_categories" ON public.careers_job_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read open careers_jobs" ON public.careers_jobs;
CREATE POLICY "Public read open careers_jobs" ON public.careers_jobs FOR SELECT USING (status = 'open');

DROP POLICY IF EXISTS "Public read active careers_culture" ON public.careers_culture;
CREATE POLICY "Public read active careers_culture" ON public.careers_culture FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Public read active careers_testimonials" ON public.careers_testimonials;
CREATE POLICY "Public read active careers_testimonials" ON public.careers_testimonials FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Public read active careers_process" ON public.careers_process;
CREATE POLICY "Public read active careers_process" ON public.careers_process FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Public read active careers_faqs" ON public.careers_faqs;
CREATE POLICY "Public read active careers_faqs" ON public.careers_faqs FOR SELECT USING (status = 'active');

-- Public Insert for Applicants
DROP POLICY IF EXISTS "Public insert careers_applicants" ON public.careers_applicants;
CREATE POLICY "Public insert careers_applicants" ON public.careers_applicants FOR INSERT WITH CHECK (true);

-- -------------------------------------------------------------
-- Admin All Access Policies
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Admin all careers_settings" ON public.careers_settings;
CREATE POLICY "Admin all careers_settings" ON public.careers_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin all careers_benefits" ON public.careers_benefits;
CREATE POLICY "Admin all careers_benefits" ON public.careers_benefits FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin all careers_job_categories" ON public.careers_job_categories;
CREATE POLICY "Admin all careers_job_categories" ON public.careers_job_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin all careers_jobs" ON public.careers_jobs;
CREATE POLICY "Admin all careers_jobs" ON public.careers_jobs FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin all careers_culture" ON public.careers_culture;
CREATE POLICY "Admin all careers_culture" ON public.careers_culture FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin all careers_testimonials" ON public.careers_testimonials;
CREATE POLICY "Admin all careers_testimonials" ON public.careers_testimonials FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin all careers_process" ON public.careers_process;
CREATE POLICY "Admin all careers_process" ON public.careers_process FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin all careers_faqs" ON public.careers_faqs;
CREATE POLICY "Admin all careers_faqs" ON public.careers_faqs FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin all careers_applicants" ON public.careers_applicants;
CREATE POLICY "Admin all careers_applicants" ON public.careers_applicants FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

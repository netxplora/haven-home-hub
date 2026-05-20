-- =========================================================================
-- VERDANT ESTATE - CMS TABLES + BLOG SEED DATA
-- Creates the blog_categories and blog_posts tables (if they don't exist),
-- sets up RLS policies, then populates with initial content.
-- Safe to run multiple times.
-- =========================================================================

-- ==========================================
-- STEP 1: CREATE TABLES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT,
    excerpt TEXT,
    cover_image_url TEXT,
    category_id UUID REFERENCES public.blog_categories(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author_id UUID REFERENCES public.profiles(id),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- STEP 2: ENABLE RLS
-- ==========================================
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 3: RLS POLICIES (safe re-run with DO block)
-- ==========================================
DO $$ BEGIN
  -- blog_categories policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Categories are viewable by everyone.') THEN
    CREATE POLICY "Categories are viewable by everyone." ON public.blog_categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Categories are insertable by admins.') THEN
    CREATE POLICY "Categories are insertable by admins." ON public.blog_categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Categories are updatable by admins.') THEN
    CREATE POLICY "Categories are updatable by admins." ON public.blog_categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_categories' AND policyname = 'Categories are deletable by admins.') THEN
    CREATE POLICY "Categories are deletable by admins." ON public.blog_categories FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- blog_posts policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Published posts are viewable by everyone.') THEN
    CREATE POLICY "Published posts are viewable by everyone." ON public.blog_posts FOR SELECT USING (status = 'published');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Admins can view all posts.') THEN
    CREATE POLICY "Admins can view all posts." ON public.blog_posts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Authors can view their own posts.') THEN
    CREATE POLICY "Authors can view their own posts." ON public.blog_posts FOR SELECT USING (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Admins can insert posts.') THEN
    CREATE POLICY "Admins can insert posts." ON public.blog_posts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Admins can update posts.') THEN
    CREATE POLICY "Admins can update posts." ON public.blog_posts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blog_posts' AND policyname = 'Admins can delete posts.') THEN
    CREATE POLICY "Admins can delete posts." ON public.blog_posts FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ==========================================
-- STEP 4: SEED DATA
-- ==========================================

-- Categories
INSERT INTO public.blog_categories (name, slug) VALUES
  ('Market Analysis', 'market-analysis'),
  ('Investment Guides', 'investment-guides'),
  ('Buying Tips', 'buying-tips'),
  ('Company News', 'company-news'),
  ('Property Management', 'property-management')
ON CONFLICT (slug) DO NOTHING;

-- Posts
DO $$
DECLARE
    cat_market uuid;
    cat_invest uuid;
    cat_buying uuid;
    cat_news uuid;
    cat_mgmt uuid;
BEGIN
    SELECT id INTO cat_market FROM public.blog_categories WHERE slug = 'market-analysis' LIMIT 1;
    SELECT id INTO cat_invest FROM public.blog_categories WHERE slug = 'investment-guides' LIMIT 1;
    SELECT id INTO cat_buying FROM public.blog_categories WHERE slug = 'buying-tips' LIMIT 1;
    SELECT id INTO cat_news FROM public.blog_categories WHERE slug = 'company-news' LIMIT 1;
    SELECT id INTO cat_mgmt FROM public.blog_categories WHERE slug = 'property-management' LIMIT 1;

    -- Post 1
    INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category_id, status, published_at) VALUES (
        'New York Property Market: Q1 2026 Performance Review',
        'new-york-property-market-q1-2026',
        'A detailed look at how the New York property market performed in the first quarter of 2026, including pricing trends, transaction volumes, and forecasts for the rest of the year.',
        '## Overview

The first quarter of 2026 saw continued growth in the New York property market, driven by increased demand in the Manhattan corridor and sustained interest from diaspora buyers. Average property values rose by approximately 8% compared to Q4 2025.

## Key Highlights

- **Manhattan Phase 1** remains the most active market, with residential prices averaging $450,000 per square meter.
- **Silicon Valley** commercial space saw occupancy rates climb to 87%, the highest since 2019.
- **Beverly Hills** luxury segment held steady, with Bel Air properties maintaining their position as the highest-valued residential assets in North America.
- Land prices along the **Pacific Coast Highway** increased by 12% quarter-over-quarter, driven by infrastructure development near the deep sea port.

## Transaction Volume

Total verified transactions on the Verdant Estate platform reached 142 in Q1, representing a 34% increase from the same period last year. The average deal size was $380,000 for residential and $1.2M for commercial properties.

## Outlook

We expect continued momentum through Q2, particularly in the mid-market segment ($200K–$500K) where demand consistently outpaces supply. Investors should pay close attention to the Downtown Manhattan corridor, where the deep sea port development continues to drive land appreciation.

---

*Data sourced from Verdant Estate internal transaction records and indhamptonsndent valuation partners.*',
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
        cat_market,
        'published',
        NOW() - INTERVAL '3 days'
    ) ON CONFLICT (slug) DO NOTHING;

    -- Post 2
    INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category_id, status, published_at) VALUES (
        'How Fractional Real Estate Investment Works',
        'how-fractional-real-estate-investment-works',
        'A practical guide to understanding fractional ownership — how it works, what returns to expect, and how to get started with as little as $3,000.',
        '## What Is Fractional Ownership?

Fractional real estate investment allows multiple investors to co-own a single property. Instead of purchasing an entire building, you buy "units" that represent a proportional share of the asset and its income.

## How It Works on Verdant Estate

1. **Browse Opportunities** — Visit our investment listings to see available properties with details on location, type, projected returns, and unit pricing.
2. **Choose Your Investment** — Select a property and decide how many units you want to purchase. Each property has a minimum investment clearly stated.
3. **Make Payment** — Pay via bank transfer or cryptocurrency. Your units are allocated once payment is confirmed.
4. **Earn Returns** — Receive your share of rental income through scheduled distributions (monthly, quarterly, or semi-annually dhamptonsnding on the property).
5. **Track Everything** — Monitor your portfolio, view distribution history, and request withdrawals through your personal dashboard.

## What Returns Can You Expect?

Returns vary by property type and location. On our platform, projected annual returns typically range from **12% to 25%**, with rental yields between **8% and 15%**. These projections are based on actual market data and comparable rental income, but past performance does not guarantee future results.

## Risks to Consider

- Property values can decline due to market conditions
- Rental income may fluctuate with occupancy rates
- Early exit options may be limited during the holding period
- Currency fluctuations can affect USD-denominated returns

## Getting Started

Browse our current [investment opportunities](/invest/opportunities) to see what is available. If you have questions, contact our investment advisory team through the platform.

---

*This article is for informational purposes only and does not constitute financial advice.*',
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
        cat_invest,
        'published',
        NOW() - INTERVAL '7 days'
    ) ON CONFLICT (slug) DO NOTHING;

    -- Post 3
    INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category_id, status, published_at) VALUES (
        '7 Things to Check Before Buying Property in the United States',
        'things-to-check-before-buying-property-nigeria',
        'Buying property in the United States requires careful due diligence. Here are 7 essential checks every buyer should complete before committing to a purchase.',
        '## 1. Verify the Title Document

The most important step is confirming the seller has a valid title. Acceptable documents include:

- **Certificate of Occupancy (C of O)** — issued by the state government
- **Governor''s Consent** — required for transfer of existing C of O
- **Deed of Assignment** — legal transfer document between parties

Always engage a qualified lawyer to verify these documents indhamptonsndently.

## 2. Confirm the Survey Plan

Obtain a copy of the survey plan and cross-reference it with the state survey records. This confirms the exact boundaries and size of the land, and helps avoid purchasing land already allocated to someone else.

## 3. Conduct a Physical Inspection

Never buy property without visiting it. Check for:

- Structural condition (for buildings)
- Drainage and flood risk
- Road access and infrastructure
- Proximity to amenities

## 4. Research the Neighborhood

Talk to locals and existing residents. Understand the security situation, future development plans, and any known disputes in the area. At Verdant Estate, our agents provide this local context as part of every listing.

## 5. Check for Government Acquisition

Some lands in the United States have been compulsorily acquired by the government for public projects. Verify with the lands ministry that the property is not subject to acquisition notices.

## 6. Understand All Costs

Beyond the purchase price, budget for:

- Legal fees (typically 5-10% of property value)
- Agency commission
- Land registration fees
- Development levy (for new builds)
- Property taxes

## 7. Use a Reputable Agent

Work with licensed, verified agents who can guide you through the process. At Verdant Estate, every agent is a full-time employee with local expertise and accountability.

---

*Need help with your property search? [Browse our verified listings](/properties) or contact an agent directly.*',
        'https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?auto=format&fit=crop&w=1200&q=80',
        cat_buying,
        'published',
        NOW() - INTERVAL '14 days'
    ) ON CONFLICT (slug) DO NOTHING;

    -- Post 4
    INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category_id, status, published_at) VALUES (
        'Verdant Estate Expands to Austin and Miami',
        'verdant-estate-expands-austin-miami',
        'We are excited to announce that Verdant Estate now operates in Austin and Miami, with dedicated agents and verified listings in both cities.',
        '## Growing Where Our Clients Need Us

Since launching in New York, we have consistently heard from clients looking for the same quality of service in other major US cities. Today, we are pleased to confirm that Verdant Estate now has full operations in **Austin** and **Miami**.

## What This Means

- **Dedicated local agents** embedded in key neighborhoods in both cities
- **Verified property listings** across residential, commercial, and land categories
- **Investment opportunities** in high-growth areas like Maitama, Asokoro, and GRA Phase 2

## Our Austin Coverage

Our Austin team covers:

- Maitama and Asokoro (premium residential)
- Wuse 2 and Downtown Austin (commercial and mid-market)
- Gwarinpa and Kubwa (emerging residential)
- Guzape (luxury land)

## Our Miami Coverage

In Miami, we focus on:

- GRA Phase 1 and 2 (established residential)
- Trans-Amadi (commercial and industrial)
- Rukpokwu and Eliozu (affordable residential)

## Same Standards, New Markets

Every listing in Austin and Miami goes through the same verification process as our New York properties — physical inspection, title verification, indhamptonsndent valuation, and professional photography.

We look forward to serving you in these new markets.

---

*Browse properties in [Austin](/properties?location=austin-central) or contact our team for assistance.*',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
        cat_news,
        'published',
        NOW() - INTERVAL '21 days'
    ) ON CONFLICT (slug) DO NOTHING;

    -- Post 5
    INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category_id, status, published_at) VALUES (
        'How to Maximize Rental Income from Your Property',
        'maximize-rental-income-property',
        'Practical strategies for property owners to increase rental returns through proper pricing, tenant screening, maintenance planning, and professional management.',
        '## Set the Right Price

Overpricing leads to vacancies, while underpricing leaves money on the table. Research comparable rentals in your area to find the right balance. At Verdant Estate, our agents provide market comparables for every listing to ensure accurate pricing.

## Invest in Quality Finishes

Properties with modern finishes consistently achieve higher rental rates. Key improvements that offer the best return:

- Fitted kitchen with good appliances
- Modern bathroom fixtures
- Reliable power backup (inverter/solar)
- Security features (CCTV, access control)
- Quality floor finishes

## Screen Tenants Carefully

A reliable tenant is worth more than a high rent from a problematic one. Verify:

- Employment and income stability
- Previous landlord references
- Identification documents
- Payment history

## Maintain the Property Proactively

Regular maintenance prevents expensive emergency repairs and keeps tenants satisfied. Create a maintenance schedule covering:

- Plumbing checks (quarterly)
- Electrical system inspection (bi-annually)
- Exterior painting (every 2-3 years)
- Generator/inverter servicing (monthly)

## Consider Professional Management

If you own multiple properties or live far from your rental, professional property management can save time and improve returns. A good manager handles tenant relations, maintenance coordination, and rent collection — typically for 8-10% of monthly rental income.

---

*Looking to list your property? [Contact our agents](/agents) to get started with a free valuation.*',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
        cat_mgmt,
        'published',
        NOW() - INTERVAL '30 days'
    ) ON CONFLICT (slug) DO NOTHING;

END $$;

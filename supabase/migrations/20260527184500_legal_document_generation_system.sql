-- Migration: Legal Document Generation & Management System
-- Purpose: Configures tables, columns, constraints, versioning, storage, and default templates for legal document automation.

-- 1. Modify public.user_documents for cross-table relations and metadata
ALTER TABLE public.user_documents DROP CONSTRAINT IF EXISTS user_documents_property_id_fkey;

-- Rename property_id constraint or update reference to point to public.properties
ALTER TABLE public.user_documents 
  ADD COLUMN IF NOT EXISTS investment_property_id uuid REFERENCES public.investment_properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS verification_code text,
  ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

-- Re-link property_id to public.properties(id)
ALTER TABLE public.user_documents
  ADD CONSTRAINT user_documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- 2. Create admin_signatures table for signature and seal management
CREATE TABLE IF NOT EXISTS public.admin_signatures (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    file_path text NOT NULL,
    type text NOT NULL CHECK (type IN ('signature', 'seal')),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on admin_signatures
ALTER TABLE public.admin_signatures ENABLE ROW LEVEL SECURITY;

-- Policies for admin_signatures
DROP POLICY IF EXISTS "Authenticated users can view active signatures" ON public.admin_signatures;
CREATE POLICY "Authenticated users can view active signatures" ON public.admin_signatures
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage signatures" ON public.admin_signatures;
CREATE POLICY "Admins can manage signatures" ON public.admin_signatures
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Enhance document_templates table check constraints
ALTER TABLE public.document_templates DROP CONSTRAINT IF EXISTS document_templates_document_type_check;

ALTER TABLE public.document_templates ADD CONSTRAINT document_templates_document_type_check CHECK (document_type = ANY (ARRAY[
  'investment_agreement'::text, 'property_purchase'::text, 'lease_agreement'::text, 'kyc_declaration'::text,
  'contract_of_sale'::text, 'deed_of_assignment'::text, 'survey_plan'::text, 'allocation_letter'::text, 'purchase_receipt'::text,
  'property_purchase_agreement'::text, 'ownership_confirmation'::text, 'payment_receipt'::text, 'invoice'::text, 'reservation_confirmation'::text,
  'fractional_ownership_certificate'::text, 'investment_confirmation_letter'::text, 'roi_agreement_summary'::text, 'investment_receipt'::text
]));

ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS signature_placement jsonb DEFAULT '{"signature": "bottom-left", "seal": "bottom-right"}'::jsonb,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1 NOT NULL;

-- 4. Create document_template_history table
CREATE TABLE IF NOT EXISTS public.document_template_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id uuid REFERENCES public.document_templates(id) ON DELETE CASCADE,
    name text,
    content_html text,
    document_type text,
    version integer,
    signature_placement jsonb,
    created_at timestamptz DEFAULT now(),
    updated_by uuid
);

-- Enable RLS on document_template_history
ALTER TABLE public.document_template_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view and manage template history" ON public.document_template_history;
CREATE POLICY "Admins can view and manage template history" ON public.document_template_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Storage Bucket Configuration for admin-assets (signatures/seals)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('admin-assets', 'admin-assets', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage.objects on admin-assets
DROP POLICY IF EXISTS "Admins can manage admin-assets" ON storage.objects;
CREATE POLICY "Admins can manage admin-assets" ON storage.objects
    FOR ALL USING (
        bucket_id = 'admin-assets' AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can read admin-assets" ON storage.objects;
CREATE POLICY "Authenticated users can read admin-assets" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'admin-assets' AND auth.role() = 'authenticated'
    );

-- 6. Insert Default Templates for all supported document types
-- Clear previous dynamic templates to avoid conflicts
DELETE FROM public.document_templates WHERE document_type IN (
  'contract_of_sale', 'deed_of_assignment', 'survey_plan', 'allocation_letter', 'purchase_receipt',
  'property_purchase_agreement', 'ownership_confirmation', 'payment_receipt', 'invoice', 'reservation_confirmation',
  'fractional_ownership_certificate', 'investment_confirmation_letter', 'roi_agreement_summary', 'investment_receipt'
);

-- Contract of Sale (COS)
INSERT INTO public.document_templates (name, document_type, content_html, signature_placement, version, is_active)
VALUES (
  'Contract of Sale (Land)',
  'contract_of_sale',
  '<div class="legal-doc">
    <div class="doc-header">
      <h2>CONTRACT OF SALE OF LAND</h2>
      <p>Reference: {{document_reference}}</p>
    </div>
    <div class="doc-body">
      <p>This CONTRACT OF SALE (the "Agreement") is entered into this {{issue_date}} by and between:</p>
      <p><strong>VENDOR:</strong> {{company_name}} (the "Seller")</p>
      <p><strong>PURCHASER:</strong> {{investor_name}} (Email: {{investor_email}}, Phone: {{investor_phone}})</p>
      
      <h3>1. DESCRIPTION OF PROPERTY</h3>
      <p>The Vendor agrees to sell and the Purchaser agrees to buy all that parcel of land identified as:</p>
      <ul>
        <li><strong>Property ID:</strong> {{property_id}}</li>
        <li><strong>Property Name:</strong> {{property_name}}</li>
        <li><strong>Location:</strong> {{property_location}}</li>
        <li><strong>Type:</strong> Land ({{property_type}})</li>
      </ul>

      <h3>2. FINANCIAL TERMS</h3>
      <p>The total purchase price for the property is <strong>{{purchase_amount}}</strong>. The Purchaser has paid a sum of <strong>{{amount_paid}}</strong> via {{payment_method}} leaving an outstanding balance of <strong>{{outstanding_balance}}</strong>.</p>
      
      <h3>3. TRANSFER OF INTEREST</h3>
      <p>Upon final payment and verification, all legal title and beneficial ownership in the property shall transfer to the Purchaser. The Seller shall execute a Grant Deed in favor of the Purchaser.</p>

      <h3>4. GOVERNING LAW</h3>
      <p>This Contract shall be governed by, and construed in accordance with, the laws of the jurisdiction in which the property is located.</p>
    </div>
  </div>',
  '{"signature": "bottom-left", "seal": "bottom-right"}'::jsonb,
  1,
  true
);

-- Deed of Assignment (DOA)
INSERT INTO public.document_templates (name, document_type, content_html, signature_placement, version, is_active)
VALUES (
  'Deed of Assignment (Land)',
  'deed_of_assignment',
  '<div class="legal-doc">
    <div class="doc-header">
      <h2>DEED OF ASSIGNMENT</h2>
      <p>Reference: {{document_reference}}</p>
    </div>
    <div class="doc-body">
      <p>THIS DEED OF ASSIGNMENT is made on {{issue_date}} BETWEEN:</p>
      <p><strong>ASSIGNOR:</strong> {{company_name}} (Represented by authorized signatories)</p>
      <p><strong>ASSIGNEE:</strong> {{investor_name}} of {{investor_address}}</p>
      
      <p>WHEREAS the Assignor is the beneficial owner of the property known as <strong>{{property_name}}</strong> located at <strong>{{property_location}}</strong>.</p>
      <p>NOW THIS DEED WITNESSETH that in consideration of the sum of <strong>{{purchase_amount}}</strong> paid by the Assignee (receipt of which the Assignor hereby acknowledges), the Assignor hereby assigns, transfers, and conveys all right, title, and interest in the property unto the Assignee to hold same absolutely.</p>
      
      <p>The Assignor covenants that it has full power to assign the land and that the Assignee shall quietly enjoy the property without interruption.</p>
    </div>
  </div>',
  '{"signature": "bottom-left", "seal": "bottom-right"}'::jsonb,
  1,
  true
);

-- Survey Plan
INSERT INTO public.document_templates (name, document_type, content_html, signature_placement, version, is_active)
VALUES (
  'Official Survey Plan Layout',
  'survey_plan',
  '<div class="legal-doc">
    <div class="doc-header">
      <h2>SURVEY PLAN REFERENCE</h2>
      <p>Plan Reference: {{document_reference}}</p>
    </div>
    <div class="doc-body">
      <p>This document certifies the survey allocation reference for the property: <strong>{{property_name}}</strong>.</p>
      <table class="w-full border-collapse border border-slate-300 mt-4 text-sm">
        <tr><td class="border p-2 bg-slate-50 font-bold">Property Ref ID</td><td class="border p-2">{{property_id}}</td></tr>
        <tr><td class="border p-2 bg-slate-50 font-bold">Owner</td><td class="border p-2">{{investor_name}}</td></tr>
        <tr><td class="border p-2 bg-slate-50 font-bold">Coordinates / Beacon Numbers</td><td class="border p-2">Beacon ID #HHH-{{property_id}}-01 to 04</td></tr>
        <tr><td class="border p-2 bg-slate-50 font-bold">Acreage / Size</td><td class="border p-2">{{property_location}}</td></tr>
      </table>
      <p class="mt-4 text-xs text-muted-foreground">Certified survey beacon documentation is filed directly in the Land Registry database under Reference: {{transaction_reference}}.</p>
    </div>
  </div>',
  '{"signature": "bottom-left", "seal": "bottom-right"}'::jsonb,
  1,
  true
);

-- Allocation Letter
INSERT INTO public.document_templates (name, document_type, content_html, signature_placement, version, is_active)
VALUES (
  'Physical Allocation Letter',
  'allocation_letter',
  '<div class="legal-doc">
    <div class="doc-header">
      <h2>OFFICIAL LAND ALLOCATION LETTER</h2>
      <p>Ref No: {{document_reference}}</p>
    </div>
    <div class="doc-body">
      <p>Date: {{issue_date}}</p>
      <p>To: <strong>{{investor_name}}</strong> ({{investor_email}})</p>
      
      <p>Dear Sir/Madam,</p>
      <p>We are pleased to inform you that following the full payment of <strong>{{amount_paid}}</strong> for your acquisition, you have been physically and legally allocated the following property plot:</p>
      <ul>
        <li><strong>Property Unit:</strong> {{property_name}}</li>
        <li><strong>Location:</strong> {{property_location}}</li>
        <li><strong>Registered Reference:</strong> {{property_id}}</li>
      </ul>
      <p>Please note that physical site possession and boundary layout handovers will proceed in coordination with your assigned agent. Congratulations on your acquisition.</p>
    </div>
  </div>',
  '{"signature": "bottom-left", "seal": "bottom-right"}'::jsonb,
  1,
  true
);

-- Purchase Receipt
INSERT INTO public.document_templates (name, document_type, content_html, signature_placement, version, is_active)
VALUES (
  'Official Purchase Receipt',
  'purchase_receipt',
  '<div class="legal-doc">
    <div class="doc-header">
      <h2>OFFICIAL PURCHASE RECEIPT</h2>
      <p>Receipt ID: {{document_reference}}</p>
    </div>
    <div class="doc-body">
      <p>Payment Date: {{payment_date}}</p>
      <p>Received From: <strong>{{investor_name}}</strong></p>
      <p>Amount Paid: <strong>{{amount_paid}}</strong></p>
      <p>Payment Method: {{payment_method}}</p>
      <p>Transaction Reference: {{transaction_reference}}</p>
      
      <hr class="my-4"/>
      <p>This document serves as acknowledgment of payment for: <strong>{{property_name}}</strong> (Location: {{property_location}}).</p>
      <p><strong>Outstanding Balance:</strong> {{outstanding_balance}}</p>
    </div>
  </div>',
  '{"signature": "bottom-left", "seal": "bottom-right"}'::jsonb,
  1,
  true
);

-- Property Purchase Agreement
INSERT INTO public.document_templates (name, document_type, content_html, signature_placement, version, is_active)
VALUES (
  'Property Purchase Agreement',
  'property_purchase_agreement',
  '<div class="legal-doc">
    <div class="doc-header">
      <h2>PROPERTY PURCHASE AGREEMENT</h2>
      <p>Reference: {{document_reference}}</p>
    </div>
    <div class="doc-body">
      <p>This Property Purchase Agreement is executed on {{issue_date}} by:</p>
      <p><strong>SELLER:</strong> {{company_name}}</p>
      <p><strong>BUYER:</strong> {{investor_name}} ({{investor_email}})</p>
      
      <h3>1. CONTRACT PROPERTY</h3>
      <p>The Seller sells and the Buyer purchases the residential/commercial building structure described as:</p>
      <ul>
        <li><strong>Title:</strong> {{property_name}}</li>
        <li><strong>Address:</strong> {{property_location}}</li>
        <li><strong>Property Category/Type:</strong> {{property_type}}</li>
      </ul>

      <h3>2. PRICING & PAYMENT</h3>
      <p>The contract price is <strong>{{purchase_amount}}</strong>. The Seller confirms the receipt of <strong>{{amount_paid}}</strong> under reference <strong>{{transaction_reference}}</strong>.</p>

      <h3>3. WARRANTIES</h3>
      <p>The Seller warrants that the property is free of all liens, charges, and encumbrances, and that the Seller holds valid title to execute this transfer.</p>
    </div>
  </div>',
  '{"signature": "bottom-left", "seal": "bottom-right"}'::jsonb,
  1,
  true
);

-- Ownership Confirmation
INSERT INTO public.document_templates (name, document_type, content_html, signature_placement, version, is_active)
VALUES (
  'Certificate of Ownership Confirmation',
  'ownership_confirmation',
  '<div class="legal-doc text-center">
    <div class="doc-header my-6">
      <h1 class="text-3xl font-serif text-primary">{{company_name_upper}}</h1>
      <h2 class="text-xl font-bold tracking-widest mt-2">CERTIFICATE OF OWNERSHIP</h2>
      <p class="text-xs text-muted-foreground font-mono">No. {{document_reference}}</p>
    </div>
    <div class="doc-body text-left max-w-lg mx-auto leading-loose">
      <p>This certifies that <strong>{{investor_name}}</strong> is the registered owner of the property:</p>
      <p class="text-center font-bold font-serif text-lg bg-slate-50 p-4 border rounded-xl my-4">{{property_name}}</p>
      <p>Located at <strong>{{property_location}}</strong>.</p>
      <p>This certificate represents a legal purchase value of <strong>{{purchase_amount}}</strong> fully completed and verified on <strong>{{approval_date}}</strong>.</p>
    </div>
  </div>',
  '{"signature": "bottom-left", "seal": "bottom-right"}'::jsonb,
  1,
  true
);

-- Fractional Ownership Certificate
INSERT INTO public.document_templates (name, document_type, content_html, signature_placement, version, is_active)
VALUES (
  'Fractional Investment Certificate',
  'fractional_ownership_certificate',
  '<div class="legal-doc text-center border-4 border-primary p-8 rounded-3xl bg-primary/5">
    <div class="doc-header my-4">
      <h1 class="text-3xl font-serif text-primary tracking-wide font-extrabold">{{company_name_upper}}</h1>
      <h2 class="text-lg font-bold tracking-widest uppercase mt-1">Fractional Ownership Certificate</h2>
      <p class="text-xs text-muted-foreground font-mono">Security Reference: {{document_reference}}</p>
    </div>
    <div class="doc-body text-left max-w-xl mx-auto leading-relaxed space-y-4">
      <p>This is to certify that <strong>{{investor_name}}</strong> is the registered owner of <strong>{{units_owned}} unit(s)</strong> in the real estate asset pool:</p>
      <p class="text-center font-bold text-lg bg-background p-4 border border-primary/20 rounded-xl font-serif text-primary">{{property_name}}</p>
      <p>Representing a capital investment of <strong>{{amount_invested}}</strong>, fully paid and verified under transaction reference <strong>{{transaction_reference}}</strong>.</p>
      <p>The holder hereof is entitled to proportional dividends, yields, and returns generated by the asset in accordance with the terms of the Co-Investment Pool agreement.</p>
    </div>
  </div>',
  '{"signature": "bottom-left", "seal": "bottom-right"}'::jsonb,
  1,
  true
);

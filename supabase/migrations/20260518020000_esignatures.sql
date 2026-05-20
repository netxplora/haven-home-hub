-- =============================================
-- Document E-Signatures Workflow
-- =============================================
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content_html TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('investment_agreement', 'property_purchase', 'lease_agreement', 'kyc_declaration')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signed_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  reference_id UUID, -- Optional ID linking to an investment or property
  signature_data TEXT NOT NULL, -- Base64 image or typed signature hash
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  document_snapshot TEXT NOT NULL -- The exact text agreed to at the time
);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON document_templates FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their own signed docs"
  ON signed_documents FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can sign docs"
  ON signed_documents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add sample template
INSERT INTO document_templates (name, document_type, content_html)
VALUES (
  'Standard Investment Agreement', 
  'investment_agreement',
  '<h1>Investment Agreement</h1><p>By signing this document, the investor agrees to the terms and conditions of the Haven Home Hub property co-investment platform...</p>'
) ON CONFLICT DO NOTHING;

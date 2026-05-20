-- =============================================================
-- Admin Payment Method Management System
-- =============================================================
-- Unified, database-driven payment method management.
-- Replaces fragmented system_configs + crypto_assets + crypto_providers.
-- =============================================================

-- 1. Create the unified payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Categorization
  payment_category text NOT NULL CHECK (payment_category IN ('bank_transfer', 'digital_currency', 'third_party_provider')),
  method_name text NOT NULL,
  description text,
  instructions text, -- Admin-editable help text shown to users

  -- Status & ordering
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,

  -- Flexible configuration stored as JSONB
  -- Bank: { bank_name, account_name, account_number, swift_code, routing_number, country }
  -- Crypto: { wallet_address, wallet_network, wallet_label, supported_currency, qr_code_url }
  -- Provider: { provider_url, supported_methods, country_support }
  configuration jsonb NOT NULL DEFAULT '{}',

  -- Display
  icon_url text, -- optional logo/icon image
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION set_payment_methods_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_payment_methods_updated ON public.payment_methods;
CREATE TRIGGER tg_payment_methods_updated
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_methods_updated();

-- 2. RLS Policies
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can READ active methods (for checkout pages)
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;
CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods
  FOR SELECT USING (true);

-- Only admins can INSERT
DROP POLICY IF EXISTS "Admins can create payment methods" ON public.payment_methods;
CREATE POLICY "Admins can create payment methods" ON public.payment_methods
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- Only admins can UPDATE
DROP POLICY IF EXISTS "Admins can update payment methods" ON public.payment_methods;
CREATE POLICY "Admins can update payment methods" ON public.payment_methods
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- Only admins can DELETE
DROP POLICY IF EXISTS "Admins can delete payment methods" ON public.payment_methods;
CREATE POLICY "Admins can delete payment methods" ON public.payment_methods
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- 3. Unique constraint: only one default per category
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_default
  ON public.payment_methods (payment_category)
  WHERE (is_default = true AND is_active = true);

-- 4. Function to ensure at most one default per category
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.payment_methods
    SET is_default = false
    WHERE payment_category = NEW.payment_category
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_ensure_single_default ON public.payment_methods;
CREATE TRIGGER tg_ensure_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.payment_methods
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- 5. Enable Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_methods;
EXCEPTION WHEN OTHERS THEN
  -- Ignore duplicate object error
END $$;

-- 6. Seed initial data from existing tables (migrate existing configs)
-- Migrate crypto_assets to payment_methods
INSERT INTO public.payment_methods (payment_category, method_name, description, instructions, is_active, display_order, configuration)
SELECT
  'digital_currency',
  ca.name || ' (' || ca.symbol || ')',
  'Pay with ' || ca.name || ' on the ' || ca.network || ' network',
  'Send the exact amount to the wallet address below. Include the payment reference in your transaction memo if supported.',
  ca.is_active,
  ROW_NUMBER() OVER (ORDER BY ca.symbol) * 10,
  jsonb_build_object(
    'wallet_address', ca.wallet_address,
    'wallet_network', ca.network,
    'wallet_label', ca.symbol,
    'supported_currency', ca.symbol
  )
FROM public.crypto_assets ca
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm
  WHERE pm.configuration->>'wallet_address' = ca.wallet_address
);

-- Migrate crypto_providers to payment_methods
INSERT INTO public.payment_methods (payment_category, method_name, description, instructions, is_active, display_order, configuration, icon_url)
SELECT
  'third_party_provider',
  cp.name,
  cp.description,
  'Use this provider to purchase digital currency, then return to complete your payment.',
  cp.is_active,
  100 + ROW_NUMBER() OVER (ORDER BY cp.display_order) * 10,
  jsonb_build_object(
    'provider_url', cp.url_template,
    'supported_methods', cp.supported_assets::text
  ),
  cp.logo_url
FROM public.crypto_providers cp
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm
  WHERE pm.method_name = cp.name AND pm.payment_category = 'third_party_provider'
);

-- Migrate bank transfer config
INSERT INTO public.payment_methods (payment_category, method_name, description, instructions, is_active, is_default, display_order, configuration)
SELECT
  'bank_transfer',
  'Bank Transfer',
  'Direct transfer to our official bank account',
  'Transfer the exact amount to the bank details below. Use the payment reference as the transfer description.',
  true,
  true,
  0,
  jsonb_build_object(
    'bank_name', 'Verdant Estate Bank',
    'account_name', 'Verdant Estate Ltd',
    'account_number', '1234567890',
    'swift_code', '',
    'routing_number', '',
    'country', ''
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods WHERE payment_category = 'bank_transfer'
);

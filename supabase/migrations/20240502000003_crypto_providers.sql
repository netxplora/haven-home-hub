
-- Create Crypto Providers table for managing third-party purchase options
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'provider_integration_type') THEN
        CREATE TYPE public.provider_integration_type AS ENUM ('widget', 'redirect');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.crypto_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    integration_type public.provider_integration_type NOT NULL DEFAULT 'redirect',
    url_template text NOT NULL, -- e.g. https://buy.moonpay.com?apiKey=...&currency={symbol}&amount={amount}&address={address}
    logo_url text,
    supported_assets jsonb NOT NULL DEFAULT '["USDT", "BTC", "ETH"]'::jsonb,
    supported_networks jsonb NOT NULL DEFAULT '["ERC20", "TRC20", "Bitcoin"]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    is_default boolean NOT NULL DEFAULT false,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.crypto_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers: public read" ON public.crypto_providers;
CREATE POLICY "Providers: public read" ON public.crypto_providers
    FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Providers: admin all" ON public.crypto_providers;
CREATE POLICY "Providers: admin all" ON public.crypto_providers
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS tr_crypto_providers_updated ON public.crypto_providers;
CREATE TRIGGER tr_crypto_providers_updated
    BEFORE UPDATE ON public.crypto_providers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ensure only one default provider exists
CREATE OR REPLACE FUNCTION public.ensure_single_default_provider()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.crypto_providers
        SET is_default = false
        WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ensure_single_default_provider ON public.crypto_providers;
CREATE TRIGGER tr_ensure_single_default_provider
    BEFORE INSERT OR UPDATE OF is_default ON public.crypto_providers
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION public.ensure_single_default_provider();

-- Seed initial provider (MoonPay)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.crypto_providers WHERE name = 'MoonPay') THEN
    INSERT INTO public.crypto_providers (name, description, integration_type, url_template, is_default, display_order)
    VALUES (
        'MoonPay', 
        'Fast and secure crypto purchase using card or bank transfer.', 
        'redirect', 
        'https://buy.moonpay.com?apiKey=pk_test_123&currencyCode={symbol}&baseCurrencyAmount={amount}&walletAddress={address}', 
        true, 
        1
    );
  END IF;
END $$;

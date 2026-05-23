-- Migration: Seed Digital Currency Icons
-- Description: Automatically populates the icon_url for standard digital currencies in the payment_methods table.

UPDATE public.payment_methods
SET icon_url = 'https://cryptologos.cc/logos/tether-usdt-logo.png'
WHERE payment_category = 'digital_currency' 
  AND icon_url IS NULL
  AND configuration->>'supported_currency' = 'USDT';

UPDATE public.payment_methods
SET icon_url = 'https://cryptologos.cc/logos/bitcoin-btc-logo.png'
WHERE payment_category = 'digital_currency' 
  AND icon_url IS NULL
  AND configuration->>'supported_currency' = 'BTC';

UPDATE public.payment_methods
SET icon_url = 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
WHERE payment_category = 'digital_currency' 
  AND icon_url IS NULL
  AND configuration->>'supported_currency' = 'ETH';

UPDATE public.payment_methods
SET icon_url = 'https://cryptologos.cc/logos/solana-sol-logo.png'
WHERE payment_category = 'digital_currency' 
  AND icon_url IS NULL
  AND configuration->>'supported_currency' = 'SOL';

UPDATE public.payment_methods
SET icon_url = 'https://cryptologos.cc/logos/bnb-bnb-logo.png'
WHERE payment_category = 'digital_currency' 
  AND icon_url IS NULL
  AND configuration->>'supported_currency' = 'BNB';

UPDATE public.payment_methods
SET icon_url = 'https://cryptologos.cc/logos/tron-trx-logo.png'
WHERE payment_category = 'digital_currency' 
  AND icon_url IS NULL
  AND configuration->>'supported_currency' = 'TRX';

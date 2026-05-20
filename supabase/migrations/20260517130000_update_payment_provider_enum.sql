-- Add new payment categories to payment_provider enum if they don't exist

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'payment_provider' AND e.enumlabel = 'digital_currency') THEN
        ALTER TYPE payment_provider ADD VALUE 'digital_currency';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'payment_provider' AND e.enumlabel = 'bank_transfer') THEN
        ALTER TYPE payment_provider ADD VALUE 'bank_transfer';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'payment_provider' AND e.enumlabel = 'third_party_provider') THEN
        ALTER TYPE payment_provider ADD VALUE 'third_party_provider';
    END IF;
END $$;

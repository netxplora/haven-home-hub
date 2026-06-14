-- Pagination Optimizations
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_secondary_transactions_created_at ON secondary_market_transactions(created_at DESC);

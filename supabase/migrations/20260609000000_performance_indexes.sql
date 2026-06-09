-- ============================================================
-- Performance Indexes for Haven Home Hub
-- Targets the most frequent query patterns across the platform
-- ============================================================

-- ── Properties ──
-- Properties listing page: filtered by status, type, sorted by created_at
CREATE INDEX IF NOT EXISTS idx_properties_status_type ON properties (status, property_type);
CREATE INDEX IF NOT EXISTS idx_properties_created_at_desc ON properties (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties (agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties (slug);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties (featured) WHERE featured = true;

-- ── Property Images ──
CREATE INDEX IF NOT EXISTS idx_property_images_property_id_sort ON property_images (property_id, sort_order);

-- ── User Investments ──
-- Portfolio queries: by user, by status, by property
CREATE INDEX IF NOT EXISTS idx_user_investments_user_id_status ON user_investments (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_investments_property_id ON user_investments (property_id);
CREATE INDEX IF NOT EXISTS idx_user_investments_created_at_desc ON user_investments (created_at DESC);

-- ── Investment Properties ──
CREATE INDEX IF NOT EXISTS idx_investment_properties_status ON investment_properties (status);

-- ── Returns ──
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns (user_id);
CREATE INDEX IF NOT EXISTS idx_returns_distribution_date ON returns (distribution_date DESC);
CREATE INDEX IF NOT EXISTS idx_returns_payout_id ON returns (payout_id);

-- ── Payments ──
-- Payment lookups: by user, by property, by type+status
CREATE INDEX IF NOT EXISTS idx_payments_user_id_type ON payments (user_id, payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_property_id_type ON payments (property_id, payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments (reference);



-- ── Notifications ──
-- User notification feed: unread first, sorted by date
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications (user_id, read_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc ON notifications (created_at DESC);

-- ── Inquiries ──
CREATE INDEX IF NOT EXISTS idx_inquiries_agent_id_status ON inquiries (agent_id, status);
CREATE INDEX IF NOT EXISTS idx_inquiries_property_id ON inquiries (property_id);

-- ── Bookings ──
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id_status ON bookings (agent_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_preferred_date ON bookings (preferred_date);

-- ── Saved Properties (Wishlist) ──
CREATE INDEX IF NOT EXISTS idx_saved_properties_user_id ON saved_properties (user_id);

-- ── Support Tickets ──
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);


-- ── Support Messages ──
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages (ticket_id, created_at);

-- ── Documents ──
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_type ON user_documents (document_type);

-- ── Referrals ──
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals (referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON referral_rewards (user_id);



-- ── Investment Certificates ──
CREATE INDEX IF NOT EXISTS idx_certificates_investment_id ON investment_certificates (investment_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON investment_certificates (user_id);



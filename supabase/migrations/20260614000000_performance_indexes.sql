-- Performance Indexes for Foreign Keys
-- These indexes optimize dashboard loading and JOIN performance across the platform.

-- User Investments
CREATE INDEX IF NOT EXISTS idx_user_investments_user_id ON user_investments(user_id);

-- Reservations
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_property_id ON reservations(property_id);

-- Documents (Assuming it's user_documents based on earlier migration)
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON user_documents(user_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Support Tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);

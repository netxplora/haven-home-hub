-- 1. Create activity_toasts table
CREATE TABLE IF NOT EXISTS public.activity_toasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL, -- e.g., 'purchase', 'rent', 'fractional', 'reservation', 'listing', 'milestone'
    message TEXT NOT NULL,
    property_id UUID REFERENCES public.investment_properties(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for activity_toasts
ALTER TABLE public.activity_toasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity toasts are viewable by everyone" ON public.activity_toasts
    FOR SELECT USING (is_active = true);

CREATE POLICY "Activity toasts are manageable by admins" ON public.activity_toasts
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- 2. Create investment_audit_logs table
CREATE TABLE IF NOT EXISTS public.investment_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.investment_properties(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for investment_audit_logs
ALTER TABLE public.investment_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investment audit logs are viewable by admins only" ON public.investment_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert audit logs" ON public.investment_audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- 3. Insert Toast settings into system_configs
INSERT INTO public.system_configs (key, value, description, category, is_public)
VALUES (
    'activity_toasts',
    '{"enabled": true, "interval_seconds": 15, "display_count": 50}',
    'Configuration for real-time activity toasts shown to visitors',
    'marketing',
    true
)
ON CONFLICT (key) DO NOTHING;

-- 4. Set up auto-generation trigger function for user_investments
CREATE OR REPLACE FUNCTION generate_investment_activity_toast()
RETURNS TRIGGER AS $$
DECLARE
    user_initial TEXT;
    property_name TEXT;
BEGIN
    -- We only want to generate toasts when a new investment is verified (confirmed/active)
    IF (NEW.status = 'confirmed' OR NEW.status = 'active') AND (OLD.status = 'pending' OR OLD.status = 'payment_under_review') THEN
        
        -- Get user's first letter for privacy (obscured)
        SELECT 
            UPPER(SUBSTRING(full_name, 1, 1)) || '***'
        INTO user_initial
        FROM public.profiles WHERE id = NEW.user_id;
        
        -- Get property title
        SELECT title INTO property_name FROM public.investment_properties WHERE id = NEW.property_id;

        -- Insert toast
        INSERT INTO public.activity_toasts (type, message, property_id)
        VALUES (
            'fractional',
            user_initial || ' invested in ' || property_name,
            NEW.property_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach trigger to user_investments
DROP TRIGGER IF EXISTS trigger_investment_activity_toast ON public.user_investments;
CREATE TRIGGER trigger_investment_activity_toast
    AFTER UPDATE OF status ON public.user_investments
    FOR EACH ROW
    EXECUTE FUNCTION generate_investment_activity_toast();

-- 6. Optional trigger for payments (if we want real-time notifications on purchases)
CREATE OR REPLACE FUNCTION generate_payment_activity_toast()
RETURNS TRIGGER AS $$
DECLARE
    user_initial TEXT;
    property_name TEXT;
    p_type TEXT;
    verb TEXT;
BEGIN
    IF NEW.status = 'success' AND OLD.status != 'success' THEN
        SELECT 
            UPPER(SUBSTRING(full_name, 1, 1)) || '***'
        INTO user_initial
        FROM public.profiles WHERE id = NEW.user_id;

        SELECT title INTO property_name FROM public.investment_properties WHERE id = NEW.investment_property_id;

        IF NEW.payment_type = 'investment' THEN
            -- Already handled by user_investments approval trigger
            RETURN NEW;
        ELSIF NEW.payment_type = 'purchase' THEN
            p_type := 'purchase';
            verb := 'purchased units in';
        ELSIF NEW.payment_type = 'reservation' THEN
            p_type := 'reservation';
            verb := 'reserved a spot in';
        ELSE
            RETURN NEW;
        END IF;

        IF property_name IS NOT NULL THEN
            INSERT INTO public.activity_toasts (type, message, property_id)
            VALUES (
                p_type,
                user_initial || ' ' || verb || ' ' || property_name,
                NEW.investment_property_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payment_activity_toast ON public.payments;
CREATE TRIGGER trigger_payment_activity_toast
    AFTER UPDATE OF status ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION generate_payment_activity_toast();

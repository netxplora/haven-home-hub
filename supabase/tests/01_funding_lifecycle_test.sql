BEGIN;

DO $$
DECLARE
    v_user_id UUID;
    v_property_id UUID;
    v_investment_id UUID;
    v_prop_status TEXT;
    v_inv_status TEXT;
    v_inv_investment_status TEXT;
    v_notification_count INT;
BEGIN
    -- 1. Create a dummy user
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (id, email) VALUES (v_user_id, 'testuser@havenhomehub.com');


    -- 2. Create a dummy investment property
    v_property_id := gen_random_uuid();
    INSERT INTO public.investment_properties (
        id, slug, title, description, property_type, min_investment, 
        projected_return_min, projected_return_max, total_value,
        total_units, units_sold, status, location, city, state, country, cover_image_url, currency,
        unit_price, distribution_frequency, holding_period_months, income_model, risk_notes
    ) VALUES (
        v_property_id, 'test-funding-property', 'Test Funding Property', 'Description', 'commercial', 500,
        10, 15, 100000,
        100, 0, 'open', 'Test Loc', 'Test City', 'Test State', 'Test Country', 'https://example.com/img.jpg', 'USD',
        1000, 'monthly', 12, 'Rental Income', 'None'
    );

    -- 3. Create a dummy user investment
    v_investment_id := gen_random_uuid();
    INSERT INTO public.user_investments (
        id, user_id, property_id, amount_invested, units_owned, status
    ) VALUES (
        v_investment_id, v_user_id, v_property_id, 1000, 1, 'active'
    );

    -- 4. Trigger the funding completion by updating units_sold to total_units
    UPDATE public.investment_properties
    SET units_sold = total_units
    WHERE id = v_property_id;

    -- 5. Verify the property status was updated to fully_funded
    SELECT status INTO v_prop_status FROM public.investment_properties WHERE id = v_property_id;
    IF v_prop_status != 'fully_funded' THEN
        RAISE EXCEPTION 'Property status did not flip to fully_funded. Current status: %', v_prop_status;
    END IF;

    -- 6. Verify the user investment status was updated
    SELECT status, investment_status INTO v_inv_status, v_inv_investment_status 
    FROM public.user_investments WHERE id = v_investment_id;
    
    IF v_inv_status != 'preparing_for_roi' THEN
        RAISE EXCEPTION 'User investment status did not flip to preparing_for_roi. Current status: %', v_inv_status;
    END IF;

    -- 7. Verify notifications were dispatched
    SELECT count(*) INTO v_notification_count FROM public.notifications WHERE user_id = v_user_id AND type = 'property';
    IF v_notification_count = 0 THEN
        RAISE EXCEPTION 'No notifications were dispatched to the user.';
    END IF;

    RAISE NOTICE 'Funding & ROI Lifecycle validations passed successfully.';

    -- Rollback everything to ensure no test data is left behind
    RAISE EXCEPTION 'Test Complete - Rolling Back';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM = 'Test Complete - Rolling Back' THEN
            RAISE NOTICE 'Test passed and state rolled back.';
        ELSE
            RAISE EXCEPTION 'Test Failed: %', SQLERRM;
        END IF;
END $$;

ROLLBACK;

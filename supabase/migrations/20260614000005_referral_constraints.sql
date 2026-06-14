-- Add server-side constraints to strictly prevent self-referrals and duplicate reward payouts

-- 1. Prevent self-referrals on the profiles table
ALTER TABLE public.profiles
ADD CONSTRAINT check_no_self_referred_by CHECK (id != referred_by);

-- 2. Prevent self-referrals on the referrals table
ALTER TABLE public.referrals
ADD CONSTRAINT check_no_self_referral CHECK (referrer_id != referred_id);

-- 3. Prevent duplicate reward payouts for the same reference event
-- A single investment/payment (reference_id) should only yield one 'credit' reward per referral.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_referral_reward
ON public.referral_rewards (referral_id, reference_id)
WHERE type = 'credit' AND reference_id IS NOT NULL;

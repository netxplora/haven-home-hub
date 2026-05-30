-- Create the payment_receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_receipts', 'payment_receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for payment_receipts
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'payment_receipts');

CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'payment_receipts' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own receipts" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'payment_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own receipts" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'payment_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

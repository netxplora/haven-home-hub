CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_target_check CHECK (property_id IS NOT NULL OR agent_id IS NOT NULL),
  CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX reviews_unique_user_property ON public.reviews(user_id, property_id) WHERE property_id IS NOT NULL;
CREATE UNIQUE INDEX reviews_unique_user_agent ON public.reviews(user_id, agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX reviews_property_idx ON public.reviews(property_id);
CREATE INDEX reviews_agent_idx ON public.reviews(agent_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews: public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Reviews: own insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Reviews: own update" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Reviews: own delete" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for property-media so admins can upload, agents can upload to their assigned properties
CREATE POLICY "PropertyMedia: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-media');

CREATE POLICY "PropertyMedia: admin write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "PropertyMedia: admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'property-media' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'property-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "PropertyMedia: admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "PropertyMedia: agent write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-media'
  AND EXISTS (SELECT 1 FROM public.agents a WHERE a.user_id = auth.uid())
);
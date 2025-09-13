-- Allow saving standalone synthesis facts without a petition
ALTER TABLE public.facts ALTER COLUMN petition_id DROP NOT NULL;



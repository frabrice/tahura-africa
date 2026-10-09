-- Photos on listings are sourced from Wikimedia Commons (CC BY / CC BY-SA /
-- CC0). CC-BY and CC-BY-SA legally require visible attribution, so each
-- listing carries the credit line shown under its photos.
ALTER TABLE public.partner_listings ADD COLUMN IF NOT EXISTS image_credit text;

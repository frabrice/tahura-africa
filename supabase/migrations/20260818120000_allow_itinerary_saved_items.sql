/*
  Saved itineraries currently fail to save at all: saved_items.listing_type has
  a CHECK constraint of ('experience', 'homestay') only, but the app has always
  inserted 'itinerary' too (ExplorePage.tsx handleToggleSave, ItineraryDetailPage.tsx
  handleSave) — every such insert has been silently rejected with a 400.
  Widen the constraint to match what the app actually writes.
*/

ALTER TABLE saved_items DROP CONSTRAINT IF EXISTS saved_items_listing_type_check;

ALTER TABLE saved_items
  ADD CONSTRAINT saved_items_listing_type_check
  CHECK (listing_type IN ('experience', 'homestay', 'itinerary'));

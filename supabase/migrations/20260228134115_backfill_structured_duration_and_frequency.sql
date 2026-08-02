/*
  # Backfill structured duration and frequency for all existing listings

  1. Modified Tables
    - `partner_listings` - Updates the `details` JSONB column for all 20 existing listings

  2. Experience Updates (10 listings)
    - Adds `duration_value` (numeric) and `duration_unit` (text: hours/days) parsed from existing free-text duration
    - Adds `frequency_type` (text: once_daily/twice_daily/three_daily) based on listing context
    - Preserves all existing JSONB keys (duration, difficulty, group_size)

  3. Homestay Updates (10 listings)
    - Adds `duration_value` = 1, `duration_unit` = 'days' (standard minimum stay)
    - Adds `frequency_type` = 'once_daily' (one check-in per day)
    - Preserves all existing JSONB keys (bedrooms, bathrooms, max_guests)

  4. Notes
    - Uses JSONB concatenation (||) to merge new keys without losing existing data
    - Each listing is updated individually for precise control over frequency assignment
*/

-- Experiences backfill

-- Sunrise with the Hills: duration "2" -> 2 hours, twice_daily (morning/evening nature activity)
UPDATE partner_listings SET details = details || '{"duration_value": 2, "duration_unit": "hours", "frequency_type": "twice_daily"}'::jsonb
WHERE id = '00fcfa70-7429-4c3c-8f1e-ee493b813903';

-- The Drum Awakening: duration "2" -> 2 hours, three_daily (group cultural activity)
UPDATE partner_listings SET details = details || '{"duration_value": 2, "duration_unit": "hours", "frequency_type": "three_daily"}'::jsonb
WHERE id = '6f326765-d082-488c-a4f7-6008d3fc55cb';

-- Kigali Night Pulse: duration "3" -> 3 hours, once_daily (evening-only activity)
UPDATE partner_listings SET details = details || '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "once_daily"}'::jsonb
WHERE id = '3c384d17-ad9b-4b35-8f97-1c6388053492';

-- Farm-to-Fire Cooking: duration "3 hours" -> 3 hours, twice_daily (morning/evening cooking)
UPDATE partner_listings SET details = details || '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "twice_daily"}'::jsonb
WHERE id = '98b58267-a95f-492e-b9de-5ce946a03180';

-- The Banana Journey: duration "4" -> 4 hours, once_daily (long half-day activity)
UPDATE partner_listings SET details = details || '{"duration_value": 4, "duration_unit": "hours", "frequency_type": "once_daily"}'::jsonb
WHERE id = '35c1742b-ed16-4c55-ab4f-fad489ac9574';

-- Lake Kivu Fisher's Morning: duration "2 hours" -> 2 hours, twice_daily (morning/evening fishing)
UPDATE partner_listings SET details = details || '{"duration_value": 2, "duration_unit": "hours", "frequency_type": "twice_daily"}'::jsonb
WHERE id = 'dd41f009-7f14-4e92-82c1-21a1f5bbabc4';

-- Village Game Day: duration "2 hours" -> 2 hours, three_daily (high-energy group activity)
UPDATE partner_listings SET details = details || '{"duration_value": 2, "duration_unit": "hours", "frequency_type": "three_daily"}'::jsonb
WHERE id = '2e9743d7-2409-47a0-8eba-a54939d9e1c9';

-- The Artisan's Touch: duration "3 hours" -> 3 hours, three_daily (workshop-style, runs multiple sessions)
UPDATE partner_listings SET details = details || '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "three_daily"}'::jsonb
WHERE id = '537b9cb7-6329-44fa-b4d5-08ec80e76c11';

-- Coffee from Seed to Sip: duration "2.5 hours" -> 2.5 hours, twice_daily
UPDATE partner_listings SET details = details || '{"duration_value": 2.5, "duration_unit": "hours", "frequency_type": "twice_daily"}'::jsonb
WHERE id = '57c76d40-5c62-45db-8538-643e8437198b';

-- Market Stories: duration "3 hours" -> 3 hours, twice_daily
UPDATE partner_listings SET details = details || '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "twice_daily"}'::jsonb
WHERE id = 'd2cca495-3713-4dd7-a332-ee57e282c688';

-- Homestays backfill: all get 1 day duration, once_daily frequency

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'ee1b0610-8558-49f0-b844-733fd987ec35';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = '1d8a01e9-b7c6-443a-a7d3-5d87046d6e3b';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'a03908a7-8c83-4111-904b-89018477c4c8';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = '3fb8778c-ecc0-4c95-a8db-d244cf338ecb';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = '599aa29b-7249-4941-9f4c-9437684ba44e';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'da31f1f8-68b5-47ab-81ad-35f6c1d7932a';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'e97559ba-0679-4d35-a9d8-17e48c12070a';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'b35cbb8f-1120-47b1-9d3c-bb2a2f8e7b04';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = '2ca73674-c34c-4936-a2a7-4ed2f1b8068f';

UPDATE partner_listings SET details = details || '{"duration_value": 1, "duration_unit": "days", "frequency_type": "once_daily"}'::jsonb
WHERE id = 'c1b723b5-ef40-430e-9882-512e2113c618';

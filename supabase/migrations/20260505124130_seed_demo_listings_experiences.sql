/*
  # Seed Demo Listings — Experiences (10)

  Inserts 10 active experience listings assigned to the existing partner
  (NIYIGENA Fabrice, id: 2ed54b4d-0b70-456f-a0cc-3ac13079cfc4) and host
  (NIYIGENA Fab, id: 2ee271c0-879d-4bf5-a207-07e1dd45990b).

  All images are public Pexels URLs. Pricing is in USD.
*/

INSERT INTO partner_listings
  (partner_id, host_id, listing_type, title, description, status, location, pricing, media, details, whats_included, what_to_bring, tags)
VALUES

-- 1. Kigali City Cultural Walk
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Kigali City Cultural Walk',
  'Explore Kigali''s vibrant neighbourhoods on foot with a local guide who grew up in the city. From the hilltop parliament to the bustling Kimironko market, this half-day walk brings Rwanda''s capital to life through stories, street food, and hidden gems most tourists never find.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 35, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "hours", "frequency_type": "twice_daily", "difficulty": "Easy", "group_size": 10}',
  ARRAY['Expert local guide', 'Street food tasting (3 stops)', 'Market visit', 'Hilltop viewpoint stop', 'Bottled water'],
  ARRAY['Comfortable walking shoes', 'Light jacket', 'Small cash for souvenirs'],
  ARRAY['cultural', 'walking', 'city', 'food', 'kigali']
),

-- 2. Nyungwe Forest Canopy Walk
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Nyungwe Forest Canopy Walk',
  'Walk 90 metres above the ancient rainforest floor on one of Africa''s only canopy walkways. Nyungwe is home to 13 primate species and over 300 birds — your naturalist guide will help you spot chimpanzees, colobus monkeys, and rare orchids along the trail.',
  'active',
  '{"name": "Nyungwe Forest", "region": "Western Province"}',
  '{"base_price": 75, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1571442/pexels-photo-1571442.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/776656/pexels-photo-776656.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1670187/pexels-photo-1670187.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 6, "duration_unit": "hours", "frequency_type": "once_daily", "difficulty": "Moderate", "group_size": 8}',
  ARRAY['Certified naturalist guide', 'Park entry fees', 'Canopy walk permit', 'Packed lunch', 'Rainforest snacks'],
  ARRAY['Waterproof hiking boots', 'Rain jacket', 'Insect repellent', 'Binoculars (optional)'],
  ARRAY['nature', 'hiking', 'wildlife', 'forest', 'primates']
),

-- 3. Inema Arts Centre Workshop
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Inema Arts Centre Workshop',
  'Create your own piece of contemporary Rwandan art alongside resident artists at the celebrated Inema Arts Centre in Kigali. Choose from painting, sculpture or textile work, guided by an artist whose work has been exhibited internationally. Your finished piece is yours to take home.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 45, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1812960/pexels-photo-1812960.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3771127/pexels-photo-3771127.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/102127/pexels-photo-102127.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "twice_daily", "difficulty": "Easy", "group_size": 8}',
  ARRAY['All art materials included', 'Resident artist instruction', 'Gallery tour', 'Finished artwork to keep', 'Tea & coffee'],
  ARRAY['Old clothes or apron', 'Enthusiasm'],
  ARRAY['art', 'culture', 'workshop', 'creative', 'kigali']
),

-- 4. Volcanoes Gorilla Tracking
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Volcanoes National Park Gorilla Tracking',
  'Trek through misty bamboo forests to spend one magical hour with a habituated mountain gorilla family in their natural habitat. With only a handful of permits issued daily, this is one of the most exclusive wildlife encounters on earth — a truly once-in-a-lifetime morning.',
  'active',
  '{"name": "Musanze", "region": "Northern Province"}',
  '{"base_price": 600, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1437521/pexels-photo-1437521.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 8, "duration_unit": "hours", "frequency_type": "once_daily", "difficulty": "Challenging", "group_size": 8}',
  ARRAY['Official gorilla tracking permit ($500)', 'Licensed RDB ranger guide', 'Park entry fee', 'Certificate of participation', 'Porter available (optional, tip-based)'],
  ARRAY['Sturdy waterproof hiking boots', 'Long-sleeve shirt and trousers', 'Gardening gloves', 'Rain jacket', 'Camera (no flash)'],
  ARRAY['gorillas', 'wildlife', 'trekking', 'conservation', 'bucket-list']
),

-- 5. Lake Kivu Sunset Kayak
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Lake Kivu Sunset Kayak Tour',
  'Paddle across the glittering surface of Lake Kivu as the sun drops behind the Congo Nile Ridge, painting the water in shades of amber and rose. Your guide will lead you past floating fishing villages, islands dotted with papyrus, and secret coves for a sundowner swim.',
  'active',
  '{"name": "Rubavu (Gisenyi)", "region": "Western Province"}',
  '{"base_price": 40, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1497541/pexels-photo-1497541.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "once_daily", "difficulty": "Easy", "group_size": 12}',
  ARRAY['Kayak and paddle', 'Life jacket', 'Certified water guide', 'Sundowner drink on the lake', 'Waterproof phone pouch'],
  ARRAY['Swimwear', 'Sunscreen', 'Change of clothes', 'Towel'],
  ARRAY['lake', 'kayaking', 'sunset', 'water', 'nature']
),

-- 6. Traditional Rwandan Cooking Class
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Traditional Rwandan Cooking Class',
  'Learn to cook authentic Rwandan dishes from scratch in a family home kitchen. Your host will take you to the local market to choose fresh ingredients before guiding you through recipes for isombe, brochettes, and the beloved Rwandan milk porridge. Feast on everything you make together.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 55, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "hours", "frequency_type": "twice_daily", "difficulty": "Easy", "group_size": 6}',
  ARRAY['Market visit with host', 'All ingredients', 'Hands-on cooking instruction', 'Full shared meal', 'Recipe booklet to take home'],
  ARRAY['Comfortable clothes', 'Good appetite'],
  ARRAY['food', 'cooking', 'cultural', 'local', 'kigali']
),

-- 7. Kimironko Market & Craft Tour
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Kimironko Market & Craft Tour',
  'Dive deep into the colour and chaos of Kigali''s largest market with a guide who knows every vendor by name. Learn to spot quality imigongo geometric art, haggle for hand-woven baskets, and understand the stories behind Rwanda''s extraordinary craft traditions.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 30, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "hours", "frequency_type": "twice_daily", "difficulty": "Easy", "group_size": 8}',
  ARRAY['Expert market guide', 'Craft identification lesson', 'Vendor introductions', 'Small craft gift included', 'Refreshing juice stop'],
  ARRAY['Comfortable shoes', 'Small backpack', 'Cash for personal shopping'],
  ARRAY['shopping', 'crafts', 'culture', 'market', 'kigali']
),

-- 8. Akagera National Park Game Drive
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Akagera National Park Game Drive',
  'Rwanda''s only Big Five savanna park is a conservation success story unlike any other. Home to the only lions in the country (reintroduced in 2015) and a growing herd of black rhino, Akagera offers sunrise game drives through acacia savanna and papyrus wetlands teeming with hippos and elephants.',
  'active',
  '{"name": "Akagera", "region": "Eastern Province"}',
  '{"base_price": 120, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 8, "duration_unit": "hours", "frequency_type": "once_daily", "difficulty": "Easy", "group_size": 6}',
  ARRAY['4WD safari vehicle', 'Certified wildlife guide', 'Park entry fees', 'Picnic breakfast in the park', 'Binoculars provided'],
  ARRAY['Neutral-coloured clothing', 'Wide-brim hat', 'Sunscreen', 'Camera with zoom lens'],
  ARRAY['safari', 'wildlife', 'big-five', 'savanna', 'nature']
),

-- 9. Coffee Farm & Cupping Experience
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Coffee Farm & Cupping Experience',
  'Rwanda produces some of the world''s finest specialty coffee, and this half-day farm tour shows you why. Walk through terraced hillside plantations, learn the full wet-processing journey from cherry to cup, and sit down with the farmer for a guided cupping of five single-origin roasts with a trained Q-grader.',
  'active',
  '{"name": "Huye", "region": "Southern Province"}',
  '{"base_price": 50, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "hours", "frequency_type": "once_daily", "difficulty": "Easy", "group_size": 8}',
  ARRAY['Farm tour with farmer', 'Processing station walkthrough', 'Professional cupping session (5 coffees)', '250g bag of specialty coffee to take home', 'Transport from Huye town'],
  ARRAY['Comfortable walking shoes', 'Light jacket for highlands', 'Notebook if you like taking tasting notes'],
  ARRAY['coffee', 'farm', 'agriculture', 'tasting', 'culture']
),

-- 10. Kigali Genocide Memorial & History Tour
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'experience',
  'Kigali Genocide Memorial & History Tour',
  'A deeply moving and profoundly important half-day guided tour of the Kigali Genocide Memorial, built over the mass graves of 250,000 victims of the 1994 genocide. Your guide — a survivor — shares personal testimony and walks you through Rwanda''s extraordinary journey of reconciliation and healing, giving context to the modern nation you see today.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 25, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "hours", "frequency_type": "twice_daily", "difficulty": "Easy", "group_size": 12}',
  ARRAY['Survivor guide', 'Memorial entry fees', 'Guided reflection garden visit', 'Post-tour dialogue session', 'Memorial book included'],
  ARRAY['Modest dress (shoulders and knees covered)', 'Respectful, reflective mindset'],
  ARRAY['history', 'memorial', 'education', 'reconciliation', 'kigali']
);

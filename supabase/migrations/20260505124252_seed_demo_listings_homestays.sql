/*
  # Seed Demo Listings — Homestays (10)

  Inserts 10 active homestay listings assigned to the existing partner
  (NIYIGENA Fabrice, id: 2ed54b4d-0b70-456f-a0cc-3ac13079cfc4) and host
  (NIYIGENA Fab, id: 2ee271c0-879d-4bf5-a207-07e1dd45990b).
*/

INSERT INTO partner_listings
  (partner_id, host_id, listing_type, title, description, status, location, pricing, media, details, whats_included, what_to_bring, tags)
VALUES

-- 1. Musanze Farmer's Family Homestay
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Musanze Farmer''s Family Homestay',
  'Live alongside a farming family in the shadow of the Virunga volcanoes for three nights. Wake at dawn to help tend the shambas, share three home-cooked meals a day, and spend your evenings by a wood fire hearing stories of rural Rwandan life. This is the most authentic countryside experience in the Northern Province.',
  'active',
  '{"name": "Musanze", "region": "Northern Province"}',
  '{"base_price": 90, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/2132008/pexels-photo-2132008.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Private room", "Hot shower", "3 meals/day", "Farm activities", "Evening fire"]}',
  ARRAY['Private room with bedding', 'All meals (3/day, home-cooked)', 'Farm orientation tour', 'Evening storytelling session', 'Morning farm activities'],
  ARRAY['Warm layers for cool highland evenings', 'Sturdy shoes', 'Small gift for host family (optional but appreciated)'],
  ARRAY['homestay', 'farm', 'family', 'rural', 'volcanoes', 'authentic']
),

-- 2. Gisenyi Lakeside Family Retreat
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Gisenyi Lakeside Family Retreat',
  'Two magical nights with a welcoming family whose home sits steps from the shores of Lake Kivu. Watch the sun rise over the lake from your private veranda, join the family''s morning fish market run, and spend afternoons swimming, paddling, or simply reading in the garden. Evenings are for shared Primus beer and sunset conversations.',
  'active',
  '{"name": "Rubavu (Gisenyi)", "region": "Western Province"}',
  '{"base_price": 80, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2132008/pexels-photo-2132008.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 2, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Lake views", "Private veranda", "Breakfast & dinner", "Beach access", "Kayak hire available"]}',
  ARRAY['Lakeside room with veranda', 'Breakfast and dinner daily', 'Morning fish market visit', 'Beach access', 'Welcome fruit basket'],
  ARRAY['Swimwear', 'Sunscreen', 'Light layers for evenings'],
  ARRAY['lakeside', 'family', 'lake-kivu', 'western', 'relaxation']
),

-- 3. Nyamata Rural Community Stay
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Nyamata Rural Community Stay',
  'Immerse yourself in the rhythms of rural Bugesera with a community family who have opened their home to travellers for over a decade. Help with daily chores, visit the local cooperative, and learn traditional weaving from the women''s group next door. A humbling and enriching two-night experience.',
  'active',
  '{"name": "Nyamata", "region": "Eastern Province"}',
  '{"base_price": 65, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 2, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Private room", "All meals", "Weaving lesson", "Cooperative visit", "Community walk"]}',
  ARRAY['Private room', 'All meals included', 'Traditional weaving lesson', 'Women''s cooperative visit', 'Community orientation walk'],
  ARRAY['Modest clothing', 'Comfortable shoes', 'Notebook'],
  ARRAY['rural', 'community', 'crafts', 'authentic', 'eastern']
),

-- 4. Butare Cultural Heritage Home
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Butare Cultural Heritage Home',
  'Stay three nights with an academic family in Butare (Huye), Rwanda''s intellectual capital and home to the national university. Visit the exceptional National Museum together, explore the royal palace at Nyanza, and enjoy long evening conversations about Rwandan history, culture and identity over home-cooked meals.',
  'active',
  '{"name": "Huye (Butare)", "region": "Southern Province"}',
  '{"base_price": 75, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2132008/pexels-photo-2132008.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Private room", "All meals", "Museum visits", "Library access", "Cultural discussions"]}',
  ARRAY['Private room with study desk', 'All meals home-cooked', 'National Museum guided visit', 'Nyanza Royal Palace excursion', 'Evening cultural Q&A sessions'],
  ARRAY['Reading material about Rwandan history', 'Notebook', 'Smart casual dress for museum'],
  ARRAY['culture', 'history', 'southern', 'intellectual', 'museum']
),

-- 5. Ruhengeri Mountain Family Lodge
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Ruhengeri Mountain Family Lodge',
  'Four nights in a beautifully kept mountain home just outside Musanze, with jaw-dropping views of Karisimbi and Bisoke volcanoes from every window. Your host family operates a small vegetable farm and beekeeping enterprise — join the harvest, taste wild honey straight from the comb, and wake each morning to misty mountain air.',
  'active',
  '{"name": "Musanze (Ruhengeri)", "region": "Northern Province"}',
  '{"base_price": 95, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1670187/pexels-photo-1670187.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 2, "bathrooms": 1, "max_guests": 4, "amenities": ["Volcano views", "Beekeeping", "Farm harvesting", "3 meals/day", "Fire pit"]}',
  ARRAY['Private room(s) with volcano views', 'All meals fresh from the farm', 'Beekeeping experience', 'Vegetable harvest activity', 'Evening bonfire with hot chocolate'],
  ARRAY['Very warm layers (can drop to 10°C at night)', 'Hiking boots', 'Camera with wide lens for panoramas'],
  ARRAY['mountains', 'farm', 'volcanoes', 'nature', 'northern', 'family']
),

-- 6. Huye University District Guesthouse
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Huye University District Guesthouse',
  'Two nights in a lively family home in Huye''s university quarter, where the smell of fresh mandazi and coffee fills every morning. Your hosts'' eldest children are students who love practising their English and showing guests the best student spots in town — lively cafes, art walls, and rooftop bars with southern Rwanda views.',
  'active',
  '{"name": "Huye", "region": "Southern Province"}',
  '{"base_price": 60, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 2, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Private room", "Breakfast & dinner", "Student town tour", "Cafe guide", "Free WiFi"]}',
  ARRAY['Private room', 'Breakfast and dinner daily', 'Student quarter walking tour', 'Local cafe guide', 'Free WiFi'],
  ARRAY['Casual clothes', 'Good walking shoes', 'Open mind'],
  ARRAY['urban', 'student', 'affordable', 'southern', 'social']
),

-- 7. Nyamirambo Neighbourhood Immersion
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Nyamirambo Neighbourhood Immersion',
  'Kigali''s most vibrant and characterful neighbourhood is best experienced from within. Three nights with a Muslim family in the heart of Nyamirambo means early morning calls to prayer echoing across rooftops, the smell of mishkaki grilling at dusk, and the warmth of a tight-knit community welcoming you as one of their own.',
  'active',
  '{"name": "Kigali — Nyamirambo", "region": "Kigali Province"}',
  '{"base_price": 70, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Private room", "All meals halal", "Neighbourhood walk", "Market visit", "Evening street food"]}',
  ARRAY['Private room', 'All halal home-cooked meals', 'Nyamirambo neighbourhood walk', 'Local mosque visit (respectful dress required)', 'Evening street food tour with host'],
  ARRAY['Modest clothing (shoulders and knees covered)', 'Comfortable walking shoes', 'Cash for street food'],
  ARRAY['urban', 'neighbourhood', 'cultural', 'food', 'kigali', 'community']
),

-- 8. Lake Burera Fishing Village Stay
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Lake Burera Fishing Village Stay',
  'Three nights with a fishing family on the dramatic banks of Lake Burera, one of Rwanda''s twin lakes set among steep volcanic hills. Go out on the dugout canoe at dawn as fishermen cast their nets in the mist, help prepare the catch for breakfast, and spend your afternoons swimming or hiking the trails above the lake.',
  'active',
  '{"name": "Lake Burera", "region": "Northern Province"}',
  '{"base_price": 85, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 3, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Lakefront room", "All meals", "Canoe fishing trip", "Swimming", "Lakeside fire"]}',
  ARRAY['Lakefront private room', 'All meals including fresh fish breakfast', 'Dawn canoe fishing trip', 'Afternoon lake swimming', 'Lakeside campfire evenings'],
  ARRAY['Swimwear', 'Light rain jacket', 'Sturdy sandals', 'Insect repellent'],
  ARRAY['fishing', 'lake', 'rural', 'northern', 'nature', 'family']
),

-- 9. Rubavu Fisherman''s Home Experience
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Rubavu Fisherman''s Home Experience',
  'Two nights with a Lake Kivu fishing family in Rubavu, where the Democratic Republic of Congo is visible across the water. Learn to mend nets, visit the cooperative fish-smoking facility, and eat the freshest tilapia you''ve ever tasted — grilled over charcoal with cassava and plantain, right on the beach.',
  'active',
  '{"name": "Rubavu", "region": "Western Province"}',
  '{"base_price": 72, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1497541/pexels-photo-1497541.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2132008/pexels-photo-2132008.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 2, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Beach proximity", "Fresh fish meals", "Net mending lesson", "Cooperative tour", "Sunset swim"]}',
  ARRAY['Private room near the lake', 'All meals (fresh fish speciality)', 'Net mending lesson with the family', 'Fish cooperative tour', 'Sunset beach barbecue'],
  ARRAY['Swimwear', 'Sunscreen', 'Casual clothes', 'Sandals'],
  ARRAY['fishing', 'beach', 'lake-kivu', 'western', 'food', 'authentic']
),

-- 10. Cyangugu Border Town Home
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'homestay',
  'Cyangugu Border Town Home',
  'Two nights in the southern tip of Lake Kivu, where the border town of Rusizi (Cyangugu) meets the DRC across a narrow bridge. Your host family knows everyone in this fascinating frontier town and will show you the border market, introduce you to Congolese traders, and take you to the hilltop monastery with its sweeping lake views.',
  'active',
  '{"name": "Rusizi (Cyangugu)", "region": "Western Province"}',
  '{"base_price": 68, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 2, "duration_unit": "days", "frequency_type": "once_daily", "bedrooms": 1, "bathrooms": 1, "max_guests": 2, "amenities": ["Lake views", "All meals", "Border market visit", "Monastery trip", "Local guide"]}',
  ARRAY['Private room with lake views', 'All meals included', 'Border market exploration', 'Monastery hilltop visit', 'Local guide for town tour'],
  ARRAY['Passport (for border area walking)', 'Comfortable shoes', 'Light layers'],
  ARRAY['border', 'lake-kivu', 'western', 'unique', 'monastery', 'culture']
);

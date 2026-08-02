/*
  # Seed Demo Listings — Journeys / Itineraries (10)

  Inserts 10 active itinerary listings assigned to the existing partner
  (NIYIGENA Fabrice, id: 2ed54b4d-0b70-456f-a0cc-3ac13079cfc4) and host
  (NIYIGENA Fab, id: 2ee271c0-879d-4bf5-a207-07e1dd45990b).

  Each journey includes full itinerary_days and budget_breakdown JSON.
*/

INSERT INTO partner_listings
  (partner_id, host_id, listing_type, title, description, status, location, pricing, media, details,
   whats_included, what_to_bring, tags, itinerary_days, budget_breakdown, duration_days, pricing_type, group_size_min, group_size_max)
VALUES

-- 1. Rwanda Gorilla & Cultural Discovery (7 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Rwanda Gorilla & Cultural Discovery',
  'The definitive Rwanda journey. Seven days combining mountain gorilla tracking in Volcanoes National Park, chimpanzee trekking in Nyungwe Forest, a full cultural immersion in rural communities, and two nights in Kigali to bookend the adventure. This is Rwanda in full — wilderness, culture, history and heart.',
  'active',
  '{"name": "Rwanda (Multi-region)", "region": "Northern & Western Province"}',
  '{"base_price": 1800, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 7, "duration_unit": "days", "difficulty": "Moderate", "group_size": 8}',
  ARRAY['All accommodation (lodge & homestay)', 'All meals', 'Gorilla tracking permit', 'Chimpanzee permit', 'All park fees', 'Private 4WD vehicle & driver-guide', 'Kigali airport transfers'],
  ARRAY['Waterproof hiking boots', 'Lightweight rain jacket', 'Long trousers and sleeves', 'Sunscreen', 'Camera'],
  ARRAY['gorillas', 'wildlife', 'cultural', 'multi-day', 'bucket-list', 'best-of-rwanda'],
  '[
    {"day": 1, "title": "Arrival in Kigali", "place_name": "Kigali", "description": "Arrive at Kigali International Airport. Transfer to your boutique guesthouse in the Nyamirambo neighbourhood. Evening welcome dinner with your guide, briefing for the journey ahead."},
    {"day": 2, "title": "Kigali City & Genocide Memorial", "place_name": "Kigali", "description": "Morning guided tour of the Kigali Genocide Memorial and Kimironko Market. Afternoon visit to Inema Arts Centre. Evening departure drive north to Musanze."},
    {"day": 3, "title": "Gorilla Tracking Day", "place_name": "Volcanoes National Park", "description": "Early morning briefing at park headquarters. Trek through bamboo forest to spend one hour with a habituated gorilla family. Afternoon rest and debrief at lodge. Celebrate with dinner."},
    {"day": 4, "title": "Twin Lakes & Community", "place_name": "Musanze / Lake Burera", "description": "Morning canoe on Lake Burera surrounded by volcanic hills. Afternoon community visit to a Batwa cultural group for traditional dance and storytelling. Night in village homestay."},
    {"day": 5, "title": "Drive South to Nyungwe", "place_name": "Nyungwe Forest", "description": "Scenic drive south through Rwanda''s green hills and tea plantations. Arrive Nyungwe by midday. Afternoon canopy walk among the treetops. Night at forest lodge."},
    {"day": 6, "title": "Chimpanzee Trekking", "place_name": "Nyungwe Forest", "description": "Early morning chimpanzee tracking with a naturalist guide. Nyungwe holds over 500 chimpanzees — one of Africa''s largest habituated communities. Afternoon rest. Drive to Lake Kivu."},
    {"day": 7, "title": "Lake Kivu Kayak & Departure", "place_name": "Rubavu / Kigali", "description": "Morning kayak on Lake Kivu at sunrise. Transfer to Kigali airport for departures. Optional city lunch if time allows."}
  ]',
  '[
    {"label": "Gorilla permit (RDB)", "amount": 500, "currency": "USD"},
    {"label": "Chimpanzee permit (RDB)", "amount": 90, "currency": "USD"},
    {"label": "Accommodation (6 nights)", "amount": 480, "currency": "USD"},
    {"label": "All meals", "amount": 210, "currency": "USD"},
    {"label": "Driver-guide (7 days)", "amount": 280, "currency": "USD"},
    {"label": "Vehicle & fuel", "amount": 180, "currency": "USD"},
    {"label": "Park fees & transfers", "amount": 60, "currency": "USD"}
  ]',
  7, 'per_person', 2, 8
),

-- 2. East Africa Safari Triangle (10 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'East Africa Safari Triangle',
  'The ultimate East Africa safari spanning Rwanda, Uganda and Tanzania. Gorilla tracking in Volcanoes, chimpanzees in Kibale Forest, and the great migration on the Serengeti plains — three countries, three ecosystems, three once-in-a-lifetime wildlife encounters in one extraordinary ten-day journey.',
  'active',
  '{"name": "Rwanda, Uganda & Tanzania", "region": "East Africa"}',
  '{"base_price": 2400, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 10, "duration_unit": "days", "difficulty": "Moderate", "group_size": 6}',
  ARRAY['All cross-border transfers', 'All accommodation', 'All meals', 'Gorilla tracking permit (Rwanda)', 'Chimpanzee permit (Uganda)', 'Serengeti game drives', 'All park and conservation fees'],
  ARRAY['Waterproof hiking boots', 'Neutral safari clothes', 'Wide-brim hat', 'Binoculars', 'Yellow fever certificate (required)'],
  ARRAY['multi-country', 'safari', 'gorillas', 'serengeti', 'wildlife', 'premium'],
  '[
    {"day": 1, "title": "Arrive Kigali", "place_name": "Kigali, Rwanda", "description": "Arrive Kigali, transfer to city guesthouse. Welcome dinner and trip briefing."},
    {"day": 2, "title": "Kigali & Drive North", "place_name": "Musanze, Rwanda", "description": "Morning Kigali city highlights. Afternoon drive north to Musanze. Gorilla briefing at lodge."},
    {"day": 3, "title": "Gorilla Tracking", "place_name": "Volcanoes National Park", "description": "Full-day gorilla trek in Volcanoes National Park. One magical hour with the mountain gorillas."},
    {"day": 4, "title": "Cross to Uganda", "place_name": "Kabale / Bwindi, Uganda", "description": "Morning drive to Katuna border. Continue to Kabale and onwards to Bwindi Impenetrable Forest."},
    {"day": 5, "title": "Kibale Forest Chimps", "place_name": "Kibale Forest, Uganda", "description": "Full-day chimpanzee tracking in Kibale. Uganda holds the highest density of chimps anywhere on earth."},
    {"day": 6, "title": "Queen Elizabeth Park", "place_name": "Queen Elizabeth NP, Uganda", "description": "Morning boat safari on the Kazinga Channel. Afternoon game drive. Tree-climbing lions sightings common."},
    {"day": 7, "title": "Fly to Serengeti", "place_name": "Serengeti, Tanzania", "description": "Morning flight from Entebbe to Kilimanjaro/Serengeti. Afternoon game drive on arrival."},
    {"day": 8, "title": "Great Migration", "place_name": "Serengeti National Park", "description": "Full day on the Serengeti plains following the wildebeest migration. Sundowner on the savanna."},
    {"day": 9, "title": "Ngorongoro Crater", "place_name": "Ngorongoro, Tanzania", "description": "Full-day descent into the Ngorongoro Crater — the world''s largest intact caldera and home to the Big Five."},
    {"day": 10, "title": "Depart", "place_name": "Kilimanjaro Airport", "description": "Morning game drive. Transfer to Kilimanjaro International Airport for international departures."}
  ]',
  '[
    {"label": "Gorilla permit (Rwanda)", "amount": 500, "currency": "USD"},
    {"label": "Chimp permit (Uganda)", "amount": 150, "currency": "USD"},
    {"label": "Accommodation (9 nights)", "amount": 720, "currency": "USD"},
    {"label": "Internal flight (UG→TZ)", "amount": 280, "currency": "USD"},
    {"label": "All meals", "amount": 270, "currency": "USD"},
    {"label": "Guides & drivers (10 days)", "amount": 320, "currency": "USD"},
    {"label": "Park fees & conservation levies", "amount": 160, "currency": "USD"}
  ]',
  10, 'per_person', 2, 6
),

-- 3. Volcanoes & Lakes Circuit (5 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Volcanoes & Lakes Circuit',
  'Five days weaving between Rwanda''s dramatic volcanic north and the serene shores of Lakes Kivu and Burera. Gorilla tracking on day two, a sunrise volcano hike on day three, and two twilight evenings on the water make this the perfect compact adventure for travellers who want maximum impact in minimum time.',
  'active',
  '{"name": "Northern & Western Province", "region": "Rwanda"}',
  '{"base_price": 1100, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 5, "duration_unit": "days", "difficulty": "Challenging", "group_size": 8}',
  ARRAY['All accommodation', 'All meals', 'Gorilla tracking permit', 'Bisoke volcano climb permit', 'Lake Kivu kayak session', 'All transfers in 4WD'],
  ARRAY['Waterproof hiking boots (essential)', 'Warm layers for volcano summit', 'Rain jacket', 'Walking poles (recommended)', 'Swimwear for lake'],
  ARRAY['volcanoes', 'lakes', 'gorillas', 'hiking', 'adventure', 'compact'],
  '[
    {"day": 1, "title": "Arrive & Drive North", "place_name": "Kigali / Musanze", "description": "Arrive Kigali, collect by driver and head north to Musanze. Check in to lodge, volcano views from the terrace."},
    {"day": 2, "title": "Gorilla Tracking", "place_name": "Volcanoes National Park", "description": "The main event. Trek through mist and bamboo to encounter a gorilla family. Return to lodge for a well-earned dinner."},
    {"day": 3, "title": "Climb Mount Bisoke", "place_name": "Bisoke Volcano (3711m)", "description": "Early start for the crater rim hike to Mount Bisoke. The summit crater lake is one of Rwanda''s most spectacular sights. Descend by afternoon."},
    {"day": 4, "title": "Twin Lakes & Lake Kivu", "place_name": "Lake Burera / Rubavu", "description": "Morning canoe on Lake Burera. Afternoon drive west to Lake Kivu. Sunset kayak on the lake, dinner by the water."},
    {"day": 5, "title": "Lake Kivu Morning & Kigali", "place_name": "Rubavu / Kigali", "description": "Slow morning on the lake. Drive back to Kigali for airport transfers or city exploration."}
  ]',
  '[
    {"label": "Gorilla permit (RDB)", "amount": 500, "currency": "USD"},
    {"label": "Bisoke climb permit", "amount": 75, "currency": "USD"},
    {"label": "Accommodation (4 nights)", "amount": 280, "currency": "USD"},
    {"label": "All meals", "amount": 140, "currency": "USD"},
    {"label": "Driver-guide (5 days)", "amount": 200, "currency": "USD"},
    {"label": "Kayak & canoe fees", "amount": 55, "currency": "USD"},
    {"label": "Fuel & transfers", "amount": 150, "currency": "USD"}
  ]',
  5, 'per_person', 2, 8
),

-- 4. Rwandan Heritage & History Tour (5 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Rwandan Heritage & History Tour',
  'Five thoughtful days tracing Rwanda''s extraordinary story — from the royal palace at Nyanza to the genocide memorials, from the ancient Batwa communities of the forest to the forward-thinking streets of contemporary Kigali. For travellers seeking depth, context and genuine understanding of this remarkable country.',
  'active',
  '{"name": "Rwanda (South & Kigali)", "region": "Kigali & Southern Province"}',
  '{"base_price": 950, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 5, "duration_unit": "days", "difficulty": "Easy", "group_size": 10}',
  ARRAY['All accommodation', 'All meals', 'All museum and memorial entry fees', 'Expert historian guide', 'All transfers'],
  ARRAY['Modest clothing for memorial visits', 'Notebook', 'Comfortable walking shoes'],
  ARRAY['history', 'heritage', 'culture', 'education', 'memorial', 'kigali'],
  '[
    {"day": 1, "title": "Arrive Kigali — Modern Rwanda", "place_name": "Kigali", "description": "Arrive and check in. Evening walk through Kigali''s design district with your historian guide — Rwanda''s remarkable rebirth visible on every clean, green street."},
    {"day": 2, "title": "Genocide Memorial & Reconciliation", "place_name": "Kigali", "description": "Morning at the Kigali Genocide Memorial, guided by a survivor. Afternoon visit to Village Urugwiro and the Parliament. Evening dialogue session with a reconciliation leader."},
    {"day": 3, "title": "Drive South — Nyamata & Ntarama", "place_name": "Nyamata, Bugesera", "description": "Drive to Bugesera district, site of some of the most significant genocide memorial churches. Afternoon community visit with a reconciliation cooperative."},
    {"day": 4, "title": "Royal Palace & National Museum", "place_name": "Nyanza / Huye", "description": "Morning at the Nyanza Royal Palace, reconstructed in the traditional style with the legendary royal cattle. Afternoon at the exceptional National Museum of Rwanda."},
    {"day": 5, "title": "Kigali Arts & Departure", "place_name": "Kigali", "description": "Final morning at Inema Arts Centre and the Kigali Cultural Village. Transfer to airport."}
  ]',
  '[
    {"label": "Historian guide (5 days)", "amount": 250, "currency": "USD"},
    {"label": "Accommodation (4 nights)", "amount": 260, "currency": "USD"},
    {"label": "All meals", "amount": 150, "currency": "USD"},
    {"label": "Entry fees (memorials, museums, palace)", "amount": 80, "currency": "USD"},
    {"label": "Transport & fuel", "amount": 210, "currency": "USD"}
  ]',
  5, 'per_person', 1, 10
),

-- 5. Rwanda Green Season Adventure (6 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Rwanda Green Season Adventure',
  'Rwanda''s long rains transform the country into a lush emerald paradise. This six-day itinerary is crafted specifically for the April–May and October–November green seasons — lower prices, fewer crowds, and landscapes so vivid they look almost unreal. Perfect for photographers, hikers and anyone who hates tourist queues.',
  'active',
  '{"name": "Rwanda (Multi-region)", "region": "Rwanda"}',
  '{"base_price": 1350, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1670187/pexels-photo-1670187.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 6, "duration_unit": "days", "difficulty": "Moderate", "group_size": 8}',
  ARRAY['All accommodation', 'All meals', 'Gorilla tracking permit', 'Photography guide', 'Canopy walk permit', 'All transfers'],
  ARRAY['Quality waterproofs (top and bottom)', 'Waterproof boots', 'Camera with weather sealing', 'Dry bags for electronics'],
  ARRAY['photography', 'green-season', 'gorillas', 'nature', 'off-peak', 'value'],
  '[
    {"day": 1, "title": "Arrive — Kigali in the Rain", "place_name": "Kigali", "description": "Arrive Kigali. Evening photography walk with your guide — rain-washed streets and puddle reflections make Kigali spectacular after dark."},
    {"day": 2, "title": "Drive North — Misty Volcanoes", "place_name": "Musanze", "description": "Scenic drive through terraced hills draped in cloud. Afternoon community visit and traditional dance performance."},
    {"day": 3, "title": "Gorilla Tracking", "place_name": "Volcanoes National Park", "description": "Gorilla trek in the bamboo forest. Green season means the gorillas are often at lower elevations — shorter trek times."},
    {"day": 4, "title": "Canopy Walk & Forest", "place_name": "Nyungwe Forest", "description": "Drive south to Nyungwe. Afternoon canopy walk — the forest is at its most alive after rain, birds calling from every branch."},
    {"day": 5, "title": "Birding & Tea Country", "place_name": "Nyungwe / Huye", "description": "Dawn birding walk in Nyungwe (best birding in Africa). Drive through the tea estates of Gisakura. Afternoon free in Huye."},
    {"day": 6, "title": "Return to Kigali", "place_name": "Kigali", "description": "Morning market visit in Huye. Return to Kigali with final lunch. Airport transfer."}
  ]',
  '[
    {"label": "Gorilla permit (RDB)", "amount": 500, "currency": "USD"},
    {"label": "Accommodation (5 nights, green season rates)", "amount": 325, "currency": "USD"},
    {"label": "All meals", "amount": 165, "currency": "USD"},
    {"label": "Photography guide (6 days)", "amount": 180, "currency": "USD"},
    {"label": "Canopy walk permit", "amount": 40, "currency": "USD"},
    {"label": "Transport & fuel", "amount": 140, "currency": "USD"}
  ]',
  6, 'per_person', 2, 8
),

-- 6. Primate & Wildlife Trail (7 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Primate & Wildlife Trail',
  'Seven days dedicated entirely to Rwanda''s spectacular wildlife. Gorillas in the north, chimpanzees in Nyungwe, the Big Five in Akagera — and golden monkeys, colobus, olive baboons, hippos and elephants along the way. The most wildlife-dense route possible within Rwanda''s borders, guided by a certified wildlife biologist.',
  'active',
  '{"name": "Rwanda (Multi-region)", "region": "Rwanda"}',
  '{"base_price": 1650, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3608263/pexels-photo-3608263.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/247431/pexels-photo-247431.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 7, "duration_unit": "days", "difficulty": "Moderate", "group_size": 6}',
  ARRAY['Wildlife biologist guide (7 days)', 'All accommodation', 'All meals', 'Gorilla tracking permit', 'Chimpanzee permit', 'Golden monkey permit', 'Akagera game drives', 'All park fees'],
  ARRAY['Neutral wildlife-coloured clothing', 'Waterproof hiking boots', 'Binoculars (8x42 recommended)', 'Long lens camera', 'Insect repellent'],
  ARRAY['primates', 'wildlife', 'gorillas', 'big-five', 'birding', 'expert-guided'],
  '[
    {"day": 1, "title": "Arrive & Kigali Briefing", "place_name": "Kigali", "description": "Arrive Kigali. Evening wildlife briefing with your biologist guide. What to expect, what to look for."},
    {"day": 2, "title": "Golden Monkeys & Drive North", "place_name": "Volcanoes National Park", "description": "Morning golden monkey tracking in the bamboo zones of Volcanoes — these endemic primates are delightful and endangered. Drive to Musanze lodge."},
    {"day": 3, "title": "Gorilla Tracking", "place_name": "Volcanoes National Park", "description": "The centrepiece: gorilla tracking with your wildlife biologist guide narrating every behaviour and interaction."},
    {"day": 4, "title": "Drive to Nyungwe", "place_name": "Nyungwe Forest", "description": "Scenic drive south. Afternoon Nyungwe canopy walk and bird identification session."},
    {"day": 5, "title": "Chimpanzee Tracking", "place_name": "Nyungwe Forest", "description": "Full-day chimpanzee tracking in one of Africa''s most biodiverse forests. Evening colobus monkey spotlight walk."},
    {"day": 6, "title": "Drive to Akagera", "place_name": "Akagera National Park", "description": "Cross-country drive to Akagera. Afternoon game drive targeting elephant, hippo, giraffe and the reintroduced lions and rhinos."},
    {"day": 7, "title": "Akagera Dawn Drive & Kigali", "place_name": "Akagera / Kigali", "description": "Sunrise game drive on the savanna. Return to Kigali. Final debrief and airport transfer."}
  ]',
  '[
    {"label": "Gorilla permit (RDB)", "amount": 500, "currency": "USD"},
    {"label": "Chimpanzee permit", "amount": 90, "currency": "USD"},
    {"label": "Golden monkey permit", "amount": 100, "currency": "USD"},
    {"label": "Akagera park fees & game drives", "amount": 120, "currency": "USD"},
    {"label": "Accommodation (6 nights)", "amount": 420, "currency": "USD"},
    {"label": "All meals", "amount": 210, "currency": "USD"},
    {"label": "Wildlife biologist guide & vehicle", "amount": 210, "currency": "USD"}
  ]',
  7, 'per_person', 2, 6
),

-- 7. Great Lakes Explorer (9 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Great Lakes Explorer',
  'Nine days tracing the string of great lakes along the Albertine Rift — Lake Kivu, Lake Burera, Lake Ruhondo and the twin lakes of the north. Part cultural journey, part water adventure, this route immerses you in fishing communities, lakeside homestays, kayak dawn paddles, and the extraordinary landscapes of Africa''s Great Rift Valley.',
  'active',
  '{"name": "Western & Northern Province", "region": "Rwanda"}',
  '{"base_price": 2100, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1497541/pexels-photo-1497541.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1559827/pexels-photo-1559827.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 9, "duration_unit": "days", "difficulty": "Easy", "group_size": 8}',
  ARRAY['All accommodation (mix of lodges and lakeside homestays)', 'All meals with fresh lake fish specialities', 'Kayak hire (3 sessions)', 'Canoe fishing trip', 'All water guides', 'All road transfers', 'Island boat excursion'],
  ARRAY['Swimwear', 'Quick-dry clothes', 'Waterproof sandals', 'Sunscreen', 'Light rain jacket'],
  ARRAY['lakes', 'water', 'kayaking', 'community', 'nature', 'relaxed-pace'],
  '[
    {"day": 1, "title": "Kigali Arrival", "place_name": "Kigali", "description": "Arrive Kigali. Transfer to lakeside guesthouse in Nyamirambo."},
    {"day": 2, "title": "Drive to Lake Kivu — Rubavu", "place_name": "Rubavu (Gisenyi)", "description": "Drive west to Lake Kivu''s northern shore. Afternoon kayak introduction session on the lake."},
    {"day": 3, "title": "Lake Kivu Islands", "place_name": "Lake Kivu, Rubavu", "description": "Full-day boat excursion to Napoleon Island (home to vast fruit bat colony) and fishing village islands. Sunset kayak."},
    {"day": 4, "title": "South along Kivu — Kibuye", "place_name": "Karongi (Kibuye)", "description": "Drive south along the lake''s scenic peninsula road. Afternoon free on the beach at Kibuye."},
    {"day": 5, "title": "Kibuye to Cyangugu", "place_name": "Rusizi (Cyangugu)", "description": "Continue south to Cyangugu. Visit the border market. Evening at the lakeside monastery."},
    {"day": 6, "title": "Drive North to Twin Lakes", "place_name": "Lake Burera", "description": "Drive north to the twin volcanic lakes. Check in to lakeside homestay with fishing family."},
    {"day": 7, "title": "Dawn Canoe & Burera", "place_name": "Lake Burera", "description": "4am canoe fishing with the family as the volcanoes glow behind the mist. Morning free, afternoon hike."},
    {"day": 8, "title": "Lake Ruhondo & Community", "place_name": "Lake Ruhondo", "description": "Cross to Lake Ruhondo by small boat. Community visit and traditional weaving cooperative."},
    {"day": 9, "title": "Return to Kigali", "place_name": "Kigali", "description": "Morning kayak farewell paddle. Drive back to Kigali. Lunch with lake fish. Airport transfer."}
  ]',
  '[
    {"label": "Accommodation (8 nights, mixed lodge/homestay)", "amount": 560, "currency": "USD"},
    {"label": "All meals", "amount": 252, "currency": "USD"},
    {"label": "Water activities (kayak, canoe, boat trips)", "amount": 280, "currency": "USD"},
    {"label": "Driver-guide (9 days)", "amount": 360, "currency": "USD"},
    {"label": "Vehicle & fuel (long route)", "amount": 468, "currency": "USD"},
    {"label": "Community visits & entry fees", "amount": 180, "currency": "USD"}
  ]',
  9, 'per_person', 2, 8
),

-- 8. Coffee & Culture Road Trip (4 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Coffee & Culture Road Trip',
  'Four days celebrating the two things Rwanda does better than almost anywhere on earth: specialty coffee and rich living culture. From washing stations in the Southern Province to rooftop cafes in Kigali, this road trip pairs farm visits and cuppings with art galleries, craft markets and traditional dance performances.',
  'active',
  '{"name": "Kigali & Southern Province", "region": "Rwanda"}',
  '{"base_price": 780, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "days", "difficulty": "Easy", "group_size": 8}',
  ARRAY['All accommodation', 'All meals (featuring coffee-paired menus)', '3 coffee farm visits with cupping', '250g specialty coffee to take home', 'Inema Arts Centre private workshop', 'All transfers'],
  ARRAY['Comfortable casual clothing', 'Good walking shoes', 'Notebook for tasting notes'],
  ARRAY['coffee', 'culture', 'arts', 'food', 'road-trip', 'relaxed'],
  '[
    {"day": 1, "title": "Kigali — Coffee Capital", "place_name": "Kigali", "description": "Start in Kigali with a specialty coffee bar deep-dive — your guide knows every barista in the city. Evening Inema Arts Centre workshop."},
    {"day": 2, "title": "Drive South — Huye Coffee Farms", "place_name": "Huye, Southern Province", "description": "Morning drive to Huye. Afternoon visit to two washing stations at harvest altitude. Q-Grader cupping session with the farm owner."},
    {"day": 3, "title": "Nyamagabe Highlands Farm", "place_name": "Nyamagabe", "description": "Visit Rwanda''s highest-altitude coffee cooperative in the Nyamagabe highlands. Taste the difference elevation makes. Lunch at cooperative canteen."},
    {"day": 4, "title": "Kimironko Market & Departure", "place_name": "Kigali", "description": "Return to Kigali. Morning at Kimironko Market for crafts and goodbye shopping. Airport transfer after lunch."}
  ]',
  '[
    {"label": "Accommodation (3 nights)", "amount": 195, "currency": "USD"},
    {"label": "All meals", "amount": 120, "currency": "USD"},
    {"label": "Coffee experiences & permits", "amount": 165, "currency": "USD"},
    {"label": "Arts workshop (Inema)", "amount": 45, "currency": "USD"},
    {"label": "Driver-guide (4 days)", "amount": 160, "currency": "USD"},
    {"label": "Fuel & transport", "amount": 95, "currency": "USD"}
  ]',
  4, 'per_person', 1, 8
),

-- 9. Kigali Design & Arts Week (4 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Kigali Design & Arts Week',
  'Four days deep-diving into Kigali''s extraordinary creative scene — arguably the most vibrant design and arts capital on the continent. Studio visits, gallery openings, a fashion atelier tour, street art walks, and dinners at the restaurants shaping modern Rwandan cuisine. For travellers who care about culture as much as landscape.',
  'active',
  '{"name": "Kigali", "region": "Kigali Province"}',
  '{"base_price": 720, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1812960/pexels-photo-1812960.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3771127/pexels-photo-3771127.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3737572/pexels-photo-3737572.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 4, "duration_unit": "days", "difficulty": "Easy", "group_size": 6}',
  ARRAY['Boutique guesthouse in Kigali (4 nights)', 'All breakfasts and two dinners', 'Inema Arts Centre private session', 'Fashion atelier guided tour', 'Street art walking tour', 'Gallery curator evening talk', 'All city transport'],
  ARRAY['Smart casual clothing', 'Comfortable walking shoes', 'Camera or sketchbook'],
  ARRAY['arts', 'design', 'kigali', 'urban', 'food', 'fashion', 'creative'],
  '[
    {"day": 1, "title": "Arrive — Kigali Design District", "place_name": "Kigali", "description": "Arrive and walk the KG9 design strip with your curator guide. Evening cocktails at a rooftop bar overlooking the city."},
    {"day": 2, "title": "Inema Arts & Studio Tours", "place_name": "Kigali", "description": "Morning private session at Inema Arts Centre — create your own piece. Afternoon studio visits to three independent artists. Evening gallery opening."},
    {"day": 3, "title": "Fashion & Street Art", "place_name": "Kigali", "description": "Morning at a Kigali fashion atelier — Rwandan designers are dressing the continent. Afternoon street art walking tour in Nyamirambo. Dinner at a modern Rwandan restaurant."},
    {"day": 4, "title": "Market, Coffee & Departure", "place_name": "Kigali", "description": "Final morning at Kimironko Market for craft shopping. Specialty coffee farewell. Airport transfer."}
  ]',
  '[
    {"label": "Boutique guesthouse (4 nights)", "amount": 280, "currency": "USD"},
    {"label": "Breakfasts & 2 dinners", "amount": 96, "currency": "USD"},
    {"label": "Arts and studio access fees", "amount": 120, "currency": "USD"},
    {"label": "Fashion atelier tour", "amount": 60, "currency": "USD"},
    {"label": "Curator guide (4 days)", "amount": 164, "currency": "USD"}
  ]',
  4, 'per_person', 1, 6
),

-- 10. Kigali to Zanzibar Cultural Route (8 days)
(
  '2ed54b4d-0b70-456f-a0cc-3ac13079cfc4',
  '2ee271c0-879d-4bf5-a207-07e1dd45990b',
  'itinerary',
  'Kigali to Zanzibar Cultural Route',
  'Eight days tracing East Africa''s cultural spine from Rwanda''s hills to Zanzibar''s ancient Swahili coast. Gorilla tracking in Volcanoes National Park, a night in a Kigali art homestay, three nights exploring Stone Town''s UNESCO-listed labyrinth, and a final two days on Zanzibar''s powder-white beaches. Culture, wildlife and coast in one unforgettable arc.',
  'active',
  '{"name": "Rwanda to Zanzibar", "region": "East Africa"}',
  '{"base_price": 1950, "currency": "USD"}',
  ARRAY[
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1430676/pexels-photo-1430676.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1497541/pexels-photo-1497541.jpeg?auto=compress&cs=tinysrgb&w=800'
  ],
  '{"duration_value": 8, "duration_unit": "days", "difficulty": "Easy", "group_size": 8}',
  ARRAY['Kigali to Zanzibar flights', 'All accommodation', 'All meals in Rwanda', 'Breakfast in Zanzibar', 'Gorilla tracking permit', 'Stone Town guided walk', 'Spice farm tour', 'Dhow sunset cruise'],
  ARRAY['Light tropical clothing', 'Modest dress for Stone Town mosques', 'Swimwear', 'Sunscreen SPF 50+', 'Waterproof boots for gorilla day'],
  ARRAY['multi-country', 'beach', 'gorillas', 'zanzibar', 'culture', 'coast'],
  '[
    {"day": 1, "title": "Arrive Kigali", "place_name": "Kigali, Rwanda", "description": "Arrive Kigali. Art homestay in the hills above the city. Sunset rooftop dinner."},
    {"day": 2, "title": "Drive North & Gorillas", "place_name": "Volcanoes National Park", "description": "Drive north to Musanze. Evening gorilla briefing."},
    {"day": 3, "title": "Gorilla Tracking", "place_name": "Volcanoes National Park", "description": "Gorilla tracking in the morning mist. Return to Kigali in the afternoon."},
    {"day": 4, "title": "Kigali — Culture & Craft", "place_name": "Kigali", "description": "Full day in Kigali: Genocide Memorial, Inema Arts Centre, evening farewell dinner at top Kigali restaurant."},
    {"day": 5, "title": "Fly to Zanzibar — Stone Town", "place_name": "Stone Town, Zanzibar", "description": "Morning flight to Zanzibar. Afternoon arrival and guided walk through Stone Town''s UNESCO labyrinth."},
    {"day": 6, "title": "Stone Town Deep Dive", "place_name": "Stone Town, Zanzibar", "description": "Spice farm morning tour. Afternoon Old Fort and Palace Museum. Evening Forodhani Night Market feast."},
    {"day": 7, "title": "Beach Day — North Zanzibar", "place_name": "Nungwi, Zanzibar", "description": "Transfer to Nungwi beach. Full free day on the turquoise Indian Ocean. Sunset dhow cruise."},
    {"day": 8, "title": "Departure", "place_name": "Zanzibar Airport", "description": "Final morning on the beach. Transfer to Zanzibar International Airport for departures."}
  ]',
  '[
    {"label": "Gorilla permit (RDB)", "amount": 500, "currency": "USD"},
    {"label": "Flights (Kigali to Zanzibar)", "amount": 380, "currency": "USD"},
    {"label": "Accommodation (7 nights)", "amount": 490, "currency": "USD"},
    {"label": "Meals (full board Rwanda, breakfast Zanzibar)", "amount": 210, "currency": "USD"},
    {"label": "Stone Town tours & spice farm", "amount": 80, "currency": "USD"},
    {"label": "Dhow cruise", "amount": 60, "currency": "USD"},
    {"label": "Guides & transfers", "amount": 230, "currency": "USD"}
  ]',
  8, 'per_person', 2, 8
);

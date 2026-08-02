# TAHURA PLATFORM — OVERVIEW AND IMPLEMENTATION PLAN

## PART ONE: WHAT TAHURA IS

Tahura is East Africa's first unified tourism operating system — a full-stack marketplace and B2B management platform connecting travelers, tour operators, cultural institutions, homestay hosts, and local guides within a single shared infrastructure. Rooted in Rwanda, built to scale across East Africa.

Unlike global competitors (GetYourGuide, Viator, Airbnb Experiences) that treat African operators as simple listing providers, Tahura treats them as independent businesspeople whose daily operations — scheduling, payroll, customer management, itinerary building, analytics — deserve world-class software. The platform's long-term defensibility comes not from commission revenue alone, but from becoming so embedded in the daily operations of every tour operator and cultural institution it serves that leaving is operationally impossible.

The core exchange:
- Travelers discover, book, and experience authentic East African tourism
- Partners (tour operators) manage their listings, hosts, bookings, CRM, and earnings
- Institutions (museums, parks, heritage sites) run their visitor operations, guides, programs, and payroll
- Hosts and Guides manage their individual schedules, bookings, and earnings through simplified dashboards
- Operations manages the entire platform — users, moderation, finances, disputes, and health
- Government views anonymized national tourism intelligence for policy planning

## PART TWO: COMPLETE PLATFORM STRUCTURE (POST-IMPLEMENTATION)

### Portal 1: Traveler Experience
The consumer-facing travel discovery and booking application.

**Pages and Features:**
- **Home / Explore** — Categorized horizontal scroll rows of experiences, homestays, journeys, and attractions. AI-personalized after first booking (tag matching). Seasonal and trending sections. Offline-readable saved state.
- **Search & Filter** — Full-text search with faceted filters: category, price range, duration, group size, guide language, availability date, location radius, rating threshold. Live-updating results.
- **Map Browse** — Interactive map with pins for all listings and institutions. Click-to-preview. Filter panel overlays the map. Clusters at high zoom-out.
- **Detail Pages** — Experience, Homestay, Host, Attraction, Itinerary — with full gallery, pricing, availability calendar, guide/host profile, verified reviews with photos, and booking CTA.
- **Booking Flow** — Select date, guests, add-ons, enter payment. Mobile money (M-Pesa, MTN MoMo) and card. Booking confirmation with PDF voucher download.
- **Post-Trip Review** — Triggered after booking completion. Inline star rating + text + photo upload. Verified purchase badge. One-tap rating option for speed.
- **Saved / Wishlist** — Heart any listing. Wishlist evolves into a Trip Planner: select saved items, enter travel dates, get a suggested day-by-day arrangement with total cost.
- **Bookings** — Upcoming and past trips. Status tracking. Cancel with policy display. Message host. Write review. Download voucher.
- **Messages** — All booking-linked conversations. Unread badge. Real-time delivery.
- **Profile** — Photo, name, bio, nationality, date of birth, preferred language. Traveler stats (trips taken, countries visited, reviews written).
- **Support** — Help article browser, submit ticket, track ticket status.
- **Auth** — Email/password with verification, Google OAuth, forgot/reset password.
- **Community Trip Reports** — After completing a trip, travelers can publish a 3-5 photo trip report that appears on the listing and destination pages.

### Portal 2: Partner Console (Tour Operator CRM)
The full business operating system for Rwanda's tourism entrepreneurs.

**Pages and Features:**
- **Home Dashboard** — Business health score (listing completeness, review volume, cancellation rate, conversion rate), monthly revenue, forecast for next 30 days, upcoming bookings widget, top-performing listings, priority action items. At-a-glance state of the whole business.
- **Listings Manager** — Create/edit/publish experiences, homestays, and itineraries. Drag-and-drop media upload. Tag management. Status (draft/active/paused). Per-listing health score with improvement checklist.
- **Itinerary Builder** — Day-by-day drag-and-drop builder for multi-day packages. Each day has time-slotted activities (from own listings or linked institution programs), accommodation assignment, transport notes, meal markers. Price calculator that sums all components. Preview mode. Publish as a bookable listing.
- **Availability Calendar** — Per-listing and per-host visual calendar. Block dates, set minimum advance booking, manage blackout periods. Drag to extend or shorten availability. Conflict detection.
- **Dynamic Pricing Rules** — Set base price then layer: seasonal multipliers (e.g., July-August +25%), last-minute discounts (0-48h before -15%), group size tiers (10+ people -10%), early bird promotions. Rules preview shows projected earnings impact.
- **Customer CRM** — Every traveler who has booked with this partner gets a profile: booking history, nationality, notes added by partner, repeat visit flag, upcoming trip. Search and filter the customer base. Send a custom message to any customer. Segment by: first-time vs. repeat, nationality, booking type.
- **Lead Management** — When a traveler saves a listing, sends a pre-booking inquiry, or abandons a booking partway through, they appear as a lead. Partner sees them with a "Send Offer" button. Custom message with optional discount code. Converts warm intent into confirmed bookings.
- **Booking Pipeline** — Kanban view: New Booking → Confirmed → Ongoing → Completed → Reviewed. Drag bookings between stages. See operational load per day. Filter by listing, host, status.
- **Hosts Manager** — Full team directory. Add, edit, deactivate hosts. Assign hosts to specific listings on specific dates. View host performance (booking count, avg review, cancellation rate). Message any host through the platform.
- **Group Bookings** — Dedicated flow for corporate and large-group requests. Client submits a group inquiry, partner quotes a price, client approves, partner confirms. Payment schedule (deposit + balance). Per-head pricing calculations.
- **Partner-to-Partner Collaboration** — Browse other partners' open listings (marked as distributable). Add to your own itinerary with pre-agreed revenue split. Revenue split configurable per listing. View collaborative bookings separately.
- **Earnings & Payouts** — Gross revenue, platform fee (10%), net earnings. Breakdown by listing, booking type, time period. Transaction ledger with export. Payout request history and status. Bank account management.
- **Reviews Console** — All reviews across all listings in one feed. Respond publicly to any review (one response per review). Review sentiment summary (AI-tagged positive/neutral/negative keywords). Flag review for ops if inappropriate.
- **Automated Guest Communications** — Template library: booking confirmation, pre-trip reminder (48h before), post-trip thank-you with review request. Partner edits templates once. Platform fires them automatically at the right trigger.
- **Document Generator** — Auto-generate branded PDF vouchers and booking confirmations. Partner can customize with their logo, contact info, and signature. Voucher includes: booking reference, itinerary summary, host contact, emergency numbers, access instructions.
- **Messaging** — All booking-linked conversations. Unread badges. Message search.
- **Analytics** — Revenue over time (daily/weekly/monthly). Booking volume by type. Lead time analysis. Repeat customer rate. Day-of-week demand heatmap. Conversion funnel (views → saves → inquiries → bookings). Top listings by revenue vs. volume.
- **Content Studio** — AI-assisted description generation. Photo audit (flag dark/blurry/non-representative images). Tag suggestions. Title A/B variants. SEO keyword recommendations. Full listing health audit with specific improvement actions.
- **Notifications** — Real-time alerts: new booking, new message, cancellation, new review, lead generated. Clickable to relevant section.
- **Support** — Submit and track support tickets. Priority escalation for active booking issues.
- **Settings** — Business info, contact details, payout bank account, commission visibility, notification preferences, account security (password change, 2FA readiness).

### Portal 3: Institution Platform (Attraction Operations Center)
Full daily operations management for museums, national parks, and heritage sites.

**Pages and Features:**
- **Home Dashboard** — Today view: expected visitors, checked-in visitors, active programs right now, guides currently on tour. This week's booking count and revenue. Setup progress checklist. Profile publish status. Quick-action buttons (new booking, assign guide, update capacity).
- **Profile & Discovery** — Publish the institution to the traveler-facing platform. Attraction type, description, entry fee, visiting hours, guidelines, cover images, contact details. Publication gate: unpublished = invisible to travelers.
- **Programs & Scheduling** — Create programs with time-slot scheduling: "Gorilla Trek: Mon/Wed/Fri, 7am, 8 slots max." Multiple slots per day per program. Each slot shows fill rate. Publish/unpublish individual slots. Time-aware capacity enforcement (two programs can't exceed venue capacity simultaneously).
- **Guide Assignment Engine** — When a booking arrives for a program, the system suggests available guides based on specialization match, language, and remaining daily capacity (max_engagements_per_day). Institution confirms or manually overrides. Assigned guide gets notified automatically in their Guide Dashboard.
- **Staff & Certification Manager** — Full guide roster: name, bio, photo, specializations, languages, certifications, certification expiry dates, total tours completed, active days worked. Add/edit/deactivate guides. Red alerts for expiring certifications. Training history log.
- **Capacity Command Center** — Visual weekly grid showing each program slot, its max capacity, current bookings, and fill rate with traffic-light coloring (green <50%, amber 50-80%, red 80%+). One-click to increase capacity, open waitlist, or close a slot. Daily capacity ceiling enforced across all programs.
- **Waitlist Management** — When a program slot fills, subsequent bookings go to a waitlist. If a cancellation opens a slot, the next waitlisted traveler is automatically notified and given 24h to confirm.
- **Visitor Intelligence** — Today's full visitor list: name, booking type, program, assigned guide, arrival time, group size. Weekly and monthly visitor counts with trend lines. Visitor nationality breakdown. Repeat visitor identification. School/corporate group tracking.
- **Institutional CRM** — Organizations that visit regularly (schools, travel agencies, corporate groups): each gets a client profile with full visit history, preferred programs, assigned contact person, notes. Send a message directly to the organization's contact. See revenue contribution per client.
- **Walk-In Kiosk Mode** — Tablet-friendly UI for front-desk staff. Select program and available time slot, enter group size, choose payment method (mobile money or cash-recorded), print receipt. All recorded instantly in the same system. No separate till or spreadsheet.
- **Package Builder** — Combine multiple programs into a day package: "Rwanda Cultural Full Day" = Morning Museum Tour + Craft Workshop + Traditional Lunch + Afternoon History Walk. One price, one booking. Components tracked separately for guide assignment.
- **Partner Distribution Layer** — Open specific programs to partner tour operators. Partners browse available institutional programs and include them in their itineraries at the listed price. Institution sees partner-generated bookings tagged separately. Revenue flows through normal booking engine.
- **Tips & Payroll** — Record tips per booking, distribute by configured split rule (e.g., 70% lead guide / 30% assistant). Salary/wage payments per pay period. Generate payslip PDFs. Track payment method (cash, mobile money, bank). Guide-facing earnings statements visible in Guide Dashboard. Payment status (pending/paid/cancelled).
- **Bookings** — Full booking history. Filter by program, guide, date, status. Confirm pending, mark completed, initiate refund. Bulk actions.
- **Reports & Exports** — Monthly visitor volume chart, program performance (revenue, fill rate, guide score), guide rankings (bookings, ratings, tips earned), booking completion rate. Export any report as CSV or PDF. Scheduled weekly email digest to institution manager.
- **Notifications** — Real-time: new booking, guide message, capacity breach alert, certification expiry warning.
- **Support & Settings** — Same as Partner Console.

### Portal 4: Host Dashboard
Simplified interface for individual homestay providers who are traveler-account holders.

**Pages and Features:**
- **Home** — Earnings summary, upcoming bookings count, unread messages, listing status. Guest prep card for next arrival (checklist, guest name, special requests). Achievement badges (verified host, 5 bookings, first 5-star review, superhost).
- **Bookings** — Upcoming and past stays. Guest details, dates, party size, special requests. Confirm/cancel with reason. Message guest.
- **Listings** — Create and manage homestay profiles. Photos, amenities, house rules, access instructions, pricing, availability. Listing health score.
- **Availability Calendar** — Weekly view. Block days off. Set minimum stay length. Drag to update availability.
- **Messages** — Conversations with guests and partner (partner manages this host).
- **Wallet** — Earnings breakdown, pending and completed payouts, transaction history.
- **Profile** — Personal photo, bio, languages, expertise, host rating, response time.

### Portal 5: Guide Dashboard
Management interface for institutional guides who also have traveler accounts.

**Pages and Features:**
- **Home** — Upcoming tours, monthly earnings, unread messages, program assignments. Certification status and expiry alerts.
- **My Tours** — Assigned tour bookings with date, time, program, group size, traveler names, meeting location. Mark as started and completed.
- **Programs** — Programs I am assigned to. Schedule view of when I'm leading which program. Availability to accept/decline new assignments.
- **Schedule** — Weekly calendar view of all assigned tours. Block personal leave days. Max engagements setting.
- **Messages** — Conversations about bookings with travelers and institution.
- **Wallet** — Tips received per tour, salary records, payment status, payout history. Earnings statement download.
- **Profile** — Photo, bio, specializations, languages, certifications, years of experience, total tours, rating.

### Portal 6: Government Portal
Read-only tourism intelligence dashboard for the Rwanda Tourism Board and national policy authorities.

**Pages and Features:**
- **Overview** — National snapshot: total bookings, active travelers, attractions, programs, partners, guides, platform revenue. Period comparison (month-over-month, year-over-year).
- **Tourism Activity** — Booking volume trends by month. Seasonal patterns. Booking type breakdown (experience vs homestay vs attraction vs itinerary). Geographic origin of travelers (nationality data). Peak travel periods.
- **Attraction Usage** — Popular institutions by visitor count. Capacity utilization rates. Geographic distribution of attraction bookings. Entry fee revenue by institution type.
- **Economic Signals** — Platform gross booking value. Average booking value trend. Estimated direct employment (guides, hosts). Estimated tourism revenue contribution. Regional economic output comparison.
- **Regional Insights** — Bookings by province. Attractions per region. Revenue contribution by region. Infrastructure gap indicators (regions with high search volume but low supply).
- **Policy Direction** — AI-generated recommendations based on data: underserved regions, guide shortages, capacity expansion needs, seasonal imbalances.
- **Reports** — Export any view as PDF/CSV. Schedule automated monthly delivery by email.

### Portal 7: Operations Control Room
Internal platform administration for the Tahura operations team.

**Pages and Features:**
- **Control Room** — Real-time platform health: total bookings, open support tickets, revenue, commission, active listings, system status. Attention signals (capacity breaches, unresolved tickets, flagged content). Recent bookings feed.
- **Finances** — Full P&L: gross booking value, platform commission (10%), processing costs, refunds, net revenue. Revenue by sector (experience/homestay/attraction/itinerary). Revenue by partner. Transaction ledger. Payout tracking.
- **Analytics** — Booking volume over time. Geographic heatmaps. Guide and host performance metrics. Traveler cohort analysis. Seasonal patterns. Conversion funnel analytics.
- **Manage (Partners, Institutions, Government)** — View and edit all portal users. Listing drill-down per partner. Onboarding progress tracker: where each new partner is in their setup. Activate, deactivate, or suspend users.
- **Users** — Full user directory: travelers, partners, institutions, guides, hosts. Activation, deactivation, user code management. Filter by portal type, status, location.
- **Onboarding Tracker** — Per-partner and per-institution onboarding completion percentage: profile filled, first listing created, first booking received, first payout. Ops can intervene if someone stalls.
- **Capacity Monitor** — Daily capacity breaches by institution. Guide over-assignment alerts. Host double-booking detection. Conflict resolution tools.
- **Quality & Moderation** — Flagged listings and reviews queue. Approve, reject, or request edit. Bulk moderation. Review authenticity checks. Automated spam signal feed.
- **Dispute Resolution** — Structured case workflow for traveler disputes (no-show, quality, fraud). Both sides of conversation visible. Issue partial or full refund. Close with notes. Full case history log.
- **Cases & Support** — All support tickets from all portal types. Assign to ops staff. Internal notes. SLA tracking. Escalation management.
- **Revenue Intelligence** — Review sentiment feed (all new reviews, AI-tagged). Fraud/trust score alerts for suspicious bookings. Platform health metrics (avg booking confirmation time, message response time, payment success rate).
- **System Rules** — Commission percentage, cancellation policy, review thresholds, booking grace period, refund rules. Editable by ops admin.
- **Audit Logs** — Every significant action logged: who, what, when, before/after. User logins, data edits, payment transactions, admin actions. Exportable for compliance.

### Gateway (Public Homepage)
The traveler-facing landing page and entry portal to the entire ecosystem.

**Pages and Features:**
- Hero section with search bar (what + where + when)
- Curated category tiles (Gorilla Trekking, Cultural Experiences, Homestays, Itineraries, Attractions)
- Featured listings horizontal scroll rows
- How it works section (Discover → Book → Experience)
- Featured hosts and guides spotlight
- Trust signals (verified reviews, secure payment, local expertise)
- Partner recruitment CTA ("Are you a tour operator?")
- Institution CTA ("Register your attraction")
- Footer with portal switcher, legal links, social

## PART THREE: DATABASE SCHEMA ADDITIONS REQUIRED

### New Tables:

- **partner_customers** — CRM profiles per partner (partner_id, traveler_id, notes, is_repeat, last_booking_date, total_bookings, total_spent)
- **partner_leads** — Saved/abandoned intent (partner_id, traveler_id, listing_id, lead_source, status, offer_sent, offer_message, discount_code, created_at)
- **partner_pricing_rules** — Dynamic pricing (listing_id, rule_type, condition_json, multiplier, active)
- **partner_communication_templates** — Auto-message templates (partner_id, trigger, subject, body, active)
- **partner_collaborations** — Partner-to-partner listing shares (owner_partner_id, distributor_partner_id, listing_id, revenue_split_pct, status)
- **group_bookings** — Group inquiry and quote flow (partner_id, client_name, client_email, client_phone, program_description, group_size, requested_date, quoted_price, deposit_amount, status)
- **institution_clients** — Institutional CRM (institution_id, client_name, client_type, contact_name, contact_email, visit_count, last_visit_date, notes)
- **program_slots** — Time-slotted program availability (program_id, slot_date, start_time, capacity, booked_count, status)
- **guide_assignments** — Link guide to specific booking/slot (booking_id, guide_id, institution_id, assigned_by, status, notified_at)
- **waitlist_entries** — Waitlist for full program slots (program_id, slot_id, traveler_id, traveler_name, traveler_email, position, status, notified_at)
- **trip_reports** — Traveler community content (traveler_id, booking_id, listing_id, institution_id, photos, caption, is_published, created_at)
- **vouchers** — Booking voucher records (booking_id, voucher_code, generated_at, downloaded_at)
- **gift_cards** — Gift experience cards (purchaser_id, recipient_email, amount, code, redeemed_booking_id, status, expires_at)
- **referral_links** — Affiliate/referral tracking (traveler_id, code, total_referrals, total_earned, created_at)
- **partner_subscriptions** — SaaS tier tracking (partner_id, tier, price_monthly, features_json, started_at, next_billing_at, status)

### New Columns on Existing Tables:

- **partner_listings**: pricing_rules_enabled boolean, allow_distribution boolean, distributor_price numeric
- **bookings**: voucher_generated boolean, group_booking_id uuid, lead_id uuid, distribution_partner_id uuid
- **guides**: certifications jsonb (array of {name, issued, expires}), leave_days date[]
- **institution_profiles**: kiosk_enabled boolean, partner_distribution_open boolean
- **travelers**: preferred_language text, trip_count integer, countries_visited text[]

## PART FOUR: IMPLEMENTATION PHASES

### PHASE 1 — Core Flows & Foundation Fixes
**Objective:** Everything that exists should work completely and correctly end-to-end. Travelers can discover, book, pay, review, and message. Partners and institutions see real data.

**Tasks:**
1. Fix MapPage: integrate a real map (Leaflet/OpenStreetMap, no paid API required), place pins from real listings and institution data, cluster markers, click-to-preview sidebar, filter overlay
2. Complete the post-booking review submission flow: after booking is marked completed, trigger a review prompt in the traveler's BookingsPage; in-line review form (star + text + optional photo); save to reviews table; show on listing detail page
3. Wire Supabase Realtime to messages: conversations and messages subscribe to live updates — no page refresh needed to see new messages across all portals (traveler, host, guide, partner, institution)
4. Wire Supabase Realtime to notifications: all portals receive live notification badge increments without polling
5. Complete payment confirmation flow: after Pesapal callback, show a proper success/failure page; update booking status in real-time; send booking confirmation email via the send-email edge function
6. Add booking confirmation emails using the existing send-email edge function: traveler receives confirmation, partner/institution receives new booking alert
7. Export functionality: implement CSV export for partner earnings, institution reports, and operations finances (replace all alert() stubs with real file generation)
8. Advanced search filters: add price range slider, duration filter, rating filter, and availability date picker to ExplorePage; filter bar should collapse on mobile into a drawer
9. Traveler profile enhancement: add trip count, countries visited, preferred language, and profile completion percentage
10. Review display on all detail pages: currently queries exist but verify reviews are properly rendered on ExperienceDetailPage, HomestayDetailPage, AttractionDetailPage with average rating and individual review cards

### PHASE 2 — Partner CRM Transformation
**Objective:** The Partner Console becomes a genuine business operating system. Tour operators manage their entire operation without leaving Tahura.

**Tasks:**
1. Build Customer CRM page: query all travelers who have booked with this partner; display as searchable/filterable profile cards; add partner notes per traveler; flag repeat customers; show full booking history per customer
2. Build Lead Management page: track saved listings and abandoned bookings as leads; "Send Offer" action opens a compose modal; save sent offer to lead record; show lead pipeline (new, contacted, converted, lost)
3. Build Availability Calendar page: visual monthly/weekly calendar per listing and per host; drag-to-block dates; minimum advance booking setting; blackout period creation; conflict highlight if a host is double-assigned
4. Build Dynamic Pricing Rules page: rule creation form (rule type, condition, multiplier); rule list with enable/disable toggles; projected earnings preview for current bookings if rule is applied
5. Build Automated Guest Communications page: template editor for 3 triggers (booking confirmed, pre-trip reminder, post-trip thank-you with review link); preview rendered template; enable/disable per template; link templates to the send-email edge function
6. Build Document Generator: auto-generate PDF vouchers on booking confirmation; voucher includes booking reference, dates, listing summary, host contact, emergency number; partner can upload their logo; download button on booking detail
7. Build Reviews Console page: all reviews across all partner listings in a single feed; sentiment tag display (positive/neutral/negative); public response composer (one response per review, character-limited); flag to ops button
8. Build Group Bookings page: group inquiry form; quote creation with pricing breakdown; deposit and balance split; approval/confirmation workflow; group booking shows distinctly in the bookings pipeline
9. Migrate BookingsPipeline: replace simple list with Kanban board view (New → Confirmed → Ongoing → Completed → Reviewed); drag cards between stages; day-load indicator column headers
10. Add database schema: partner_customers, partner_leads, partner_pricing_rules, partner_communication_templates, group_bookings tables and migration

### PHASE 3 — Institution CRM Transformation
**Objective:** Institutions run their full daily operations from the dashboard. Visitor management, guide scheduling, payroll, and partner distribution all happen inside Tahura.

**Tasks:**
1. Build Program Scheduling: add time-slot structure to programs (program_slots table); slot creation form (date, start time, capacity, recurrence pattern); calendar view of all slots; fill-rate progress bars; open/close individual slots
2. Build Guide Assignment Engine: when a booking is confirmed for a program, display an "Assign Guide" panel suggesting available guides (by specialization match, language, current daily load vs. max_engagements_per_day); confirm assignment; guide receives notification in their dashboard
3. Build Staff & Certification Manager: extend GuidesPage to show certification records (name, issue date, expiry date); add certification entry form; red/amber badge for expiring certs; training history log; filter guides by certification status
4. Build Visitor Intelligence page: today's full visitor list (name, program, guide, group size, arrival time); weekly visitor volume chart; nationality breakdown; repeat visitor flag; corporate/school group segmentation
5. Build Institutional CRM page: institution_clients table; client profile cards (organization name, contact, visit count, last visit, notes); visit history timeline; direct message button; revenue contribution per client
6. Build Walk-In Kiosk Mode: route /institution/kiosk; full-screen tablet-friendly UI; program selector → time slot → group size → payment method (mobile money or cash); print/email receipt; auto-creates a confirmed booking record
7. Build Package Builder: multi-program bundle creator; drag-and-drop program sequence; total price calculator; publish as a bookable package visible to travelers on the institution's profile page
8. Expand Tips & Payroll: add split rule configuration (percentage per guide role); automatic tip distribution calculation; payslip PDF generation per guide per period; payment tracking by method (cash, mobile, bank); guide-visible earnings statements in Guide Dashboard
9. Build Partner Distribution Layer: institution settings toggle to open programs to partner distribution; partner browse endpoint to discover open institutional programs; partner adds program to itinerary; booking tagged with distribution_partner_id; revenue flows to institution
10. Build Waitlist: when a program slot is full, route subsequent bookings to waitlist_entries; cancellation trigger automatically notifies next waitlisted traveler with 24h confirmation window
11. Add database schema: program_slots, guide_assignments, waitlist_entries, institution_clients tables and migration

### PHASE 4 — Itinerary Builder & Multi-Component Bookings
**Objective:** Partners can build and sell complex multi-day packages. Travelers can plan and book full trips. Institutional programs can be embedded in partner itineraries.

**Tasks:**
1. Build Itinerary Builder for Partners: route /partner/listings/itinerary/builder; day-by-day structure; each day has a timeline of activity slots; activities can be added from partner's own listings, open institutional programs (via distribution layer), freeform text entries (transport, meals); drag to reorder days and activities; add/remove days; price calculator that sums all bookable components; preview traveler-facing view; publish as a listing
2. Update CreateListingForm: add itinerary-specific fields (number of days, daily structure import from builder, difficulty level, what to pack, physical requirements)
3. Build Trip Planner in Traveler SavedPage: "Plan a Trip" button on SavedPage; wizard prompts for travel dates and group size; arranges saved items across available days; shows total cost; each component has "Book" button; optional "Request Partner to Bundle" CTA that sends all saved items as a group inquiry to matched partners
4. Build Corporate & Group Sales Portal: separate lightweight route /groups; inquiry form (company name, travel dates, group size, preferred experiences, budget, contact info); submitted as a lead in partner portals with the highest-matching listings; ops team assigns to best-fit partner; formal proposal and approval flow
5. Build ItineraryDetailPage fully: day-by-day accordion view; map showing all stop locations; included meals/transport indicators; guide assignments shown per day; booking CTA with full itinerary price
6. Add Partner-to-Partner Collaboration: partner can mark any of their listings as "open for distribution"; other partners browse a "Supply Marketplace" tab; add distributed listing to their own itinerary at listed price; configure revenue split in settings; collaborative booking tracked in earnings
7. Add database schema: partner_collaborations table; update partner_listings with allow_distribution, distributor_price columns

### PHASE 5 — Intelligence, AI, and Analytics Depth
**Objective:** Every portal user gets smart, data-driven recommendations. The platform starts thinking ahead, not just reporting what happened.

**Tasks:**
1. Expand Listing Health Score: current score only covers basics; expand to include photo quality signal (count >=5, has cover image, has at least 1 action shot), response time score, review velocity, booking conversion rate from views, and pricing competitiveness vs. similar listings; show detailed breakdown with exact improvement actions
2. Build AI Content Studio (ContentStudio overhaul): live listing editor where changes immediately preview; AI-powered description generator (takes title, tags, location, price as input, outputs 3 description variants the partner picks from); tag recommender (suggests 5 additional relevant tags); title scorer (A/B title suggestions with estimated impact); photo audit (flag images that are too dark, too small, or landscape vs. portrait); all changes save directly to the listing
3. Build Demand Forecasting for Partners: based on historical booking patterns by month and by listing type; show a 90-day forward forecast with confidence band; flag upcoming high-demand weeks ("Based on last year, gorilla treks fill up 3 weeks in July -- consider raising prices or adding slots now"); surfaced in Partner Home Dashboard
4. Build Smart Guide Scheduling Assistant for Institutions: when the institution manager opens the week's schedule, the system runs a conflict check -- guides booked beyond max_engagements_per_day, guides with overlapping assignments, slots without any guide assigned; shows a prioritized issue list with one-click reassignment suggestions
5. Build Review Sentiment Analysis for Operations: all new reviews (platform-wide) are tagged with a sentiment label and extracted keywords on save; Operations Quality page shows a live feed with sentiment + keyword tags; surface recurring keywords across negative reviews as operational alerts ("5 reviews in the last 30 days mention 'late start time' for Volcanoes National Park tours")
6. Build Fraud & Trust Scoring: at booking creation, score each booking against risk signals (first-time user, high-value booking, mismatched location, unusual payment pattern, multiple failed attempts); score 0-100; bookings above threshold flagged for ops review before confirmation; partner can see a "Trust Level" badge on each booking
7. Add Personalized Homepage: after a traveler's first completed booking, tag their preferences based on booking history; homepage shows a "For You" row prioritizing listings with matching tags; simple collaborative filter (other travelers who booked X also liked Y)

### PHASE 6 — Traveler Discovery & Community
**Objective:** The traveler experience becomes delightful, personalized, and social enough to drive organic word-of-mouth.

**Tasks:**
1. Complete Map Browse: full interactive map with Leaflet; all listings and institutions as clickable pins; cluster markers at low zoom; filter panel slides over map; sidebar preview on pin click with quick-book CTA; last-searched location remembered in session
2. Build Community Trip Reports: after completing a booking, traveler is invited to post a trip report (3-5 photos + short caption); reports appear on the associated listing detail page and on a new "Community" section of the destination explore page; reports are moderated (ops approval before display); most-engaged reports featured in homepage rows
3. Build Real-Time Availability Display: on listing cards in browse view, show availability label: "Only 2 spots left this weekend", "Next available: July 12", "Sold out -- join waitlist"; powered by real program_slots and host_schedule data
4. Add Multi-Currency Price Display: detect traveler's browser locale; display prices in local equivalent (USD, EUR, GBP, KES, UGX, TZS); conversions use a refreshed daily rate stored in a currency_rates table; settlement always in platform base currency
5. Build Wishlist-to-Trip Planner evolution: "Start Planning" flow on SavedPage; date + group size inputs; auto-arranges saved items into a logical day sequence based on listing duration and location; show total trip cost; "Book All" initiates sequential booking flow; "Request a Guide to Build This" sends all items as a partner lead
6. Add Traveler Community Profile: public traveler profile page (visible to hosts, guides, partners on booking); shows trip count, countries visited, trip reports published, reviews written, member since date; builds trust on both sides of the booking

### PHASE 7 — Monetization & Market Expansion
**Objective:** Revenue streams beyond the 10% commission. Platform stickiness increases. Distribution multiplies without multiplying the sales team.

**Tasks:**
1. Build Partner/Institution SaaS Subscription Tier: partner_subscriptions table; Free tier (up to 5 listings, no CRM, no dynamic pricing); Pro tier ($39/month: full CRM, dynamic pricing, automated communications, analytics depth, document generator); Enterprise tier ($89/month: all Pro features + partner-to-partner collaboration, group bookings, distribution network, priority support); gate features behind tier in portal UI with upgrade prompts
2. Build Agent/Reseller Portal: simplified booking interface for travel agencies and corporate travel managers; browse all listings and institutional programs; book on behalf of their clients; optional markup on base price; commission paid to Tahura from base price regardless of agent markup; agent portal login separate from traveler auth
3. Build Gift Experiences: gift_cards table; purchase flow for travelers: select amount, enter recipient email, optional personal message; recipient gets email with unique code; redemption at checkout deducts balance; ops can see all gift card issuances and redemptions
4. Build Referral & Affiliate Engine: referral_links table; every traveler gets a unique referral link in their profile; when a referred user completes their first booking, both traveler and referrer get platform credit applied to next booking; viral coefficient tracking in operations analytics
5. Build Mobile Money Native Checkout: M-Pesa (Kenya), MTN Mobile Money (Uganda/Rwanda), Airtel Money integration via existing Pesapal gateway (Pesapal supports mobile money); present as a primary payment option at checkout (not a footnote); confirmation flow adapted to mobile money's asynchronous confirmation pattern (show "awaiting payment confirmation" state; update on IPN callback)
6. Add Insurance Integration: at checkout, offer optional trip protection (cancellation, interruption, emergency evacuation); partner with a regional insurance provider via their API; Tahura takes an affiliation fee; insurance certificate delivered with booking confirmation email; claim initiation link included in post-trip emails

### PHASE 8 — Infrastructure, Performance & Scale
**Objective:** The platform performs reliably at scale, works across connectivity conditions, and is ready for Francophone expansion.

**Tasks:**
1. PWA Implementation: add Web App Manifest and Service Worker; make traveler app installable on Android and iOS home screens; cache SavedPage, active BookingsPage, and current conversations for offline access; background sync for messages composed offline
2. Multi-Language Foundation: install react-i18next; extract all hardcoded UI strings into translation keys; create English (en) and French (fr) translation files; language toggle in traveler profile and portal settings; auto-detect browser language on first visit; partner listing descriptions get a French translation field (optional, falls back to original language)
3. Image Optimization Pipeline: configure Vite image plugin for WebP conversion; implement lazy loading on all listing image grids; serve responsive image sizes (thumbnail 400px, card 800px, full 1600px) from Supabase storage with transformation parameters; significant improvement on mobile data connections
4. Comprehensive Audit Logging: create audit_logs table; write a Supabase trigger that logs INSERT/UPDATE/DELETE on: bookings, partner_listings, portal_users, travelers, payments, guide_assignments; log includes: table, operation, record_id, actor_id, actor_type, timestamp, old_values_json, new_values_json; visible in Operations Audit page with full search
5. Performance & Caching: expand existing queryCache.ts patterns to cover the most expensive queries (partner dashboard aggregations, institution visitor stats, operations control room metrics); add stale-while-revalidate pattern; target dashboard load time under 1.5 seconds on a 4G connection
6. Error Monitoring & System Health: add structured error boundaries around every portal page; errors surface in Operations Control Room as a system health feed; critical payment or booking creation errors trigger an email alert to ops team via the send-email edge function

## PART FIVE: PHASE PRIORITY ORDER AND RATIONALE

| Phase | Name | Why First |
|-------|------|-----------|
| 1 | Core Flows & Foundation | Nothing else matters if the basic booking loop is broken |
| 2 | Partner CRM | Partners are the primary supply-side clients; stickiness starts here |
| 3 | Institution CRM | Institutions are the second supply-side pillar; unlocks distribution |
| 4 | Itinerary Builder | Highest average order value product; core traveler differentiation |
| 5 | Intelligence & AI | Differentiates from any competitor entering the market |
| 6 | Traveler Discovery | Consumer-side growth after supply side is solid |
| 7 | Monetization | Unlock revenue beyond commission once retention is high |
| 8 | Infrastructure | Continuous improvement; Phase 8 tasks run in parallel with others |

This document defines the complete target state of the Tahura platform and the ordered implementation path to reach it. Each phase is designed to deliver standalone value while building toward the complete vision.
